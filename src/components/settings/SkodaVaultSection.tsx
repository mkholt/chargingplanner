import React, { useState } from 'react';

import { Badge, Button, Dropdown, Field, Input, Option, Text, tokens } from '@fluentui/react-components';
import { LockClosed20Regular, LockOpen20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { getSkodaErrorMessage } from '@/components/skoda';
import { Stack } from '@/components/ui';
import { type AutoLockMinutes, useSkodaVault } from '@/contexts';
import { VAULT_MIN_PASSWORD_LENGTH } from '@/utils';

type Panel = 'enable' | 'unlock' | 'change' | 'disable' | 'reset' | null;

const AUTO_LOCK_OPTIONS: AutoLockMinutes[] = [5, 15, 60, null];

type PasswordInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  testId: string;
  error?: string | null;
};

const PasswordInput: React.FC<PasswordInputProps> = ({ label, value, onChange, autoComplete, testId, error }) => (
  <Field label={label} validationMessage={error ?? undefined} validationState={error ? 'error' : 'none'}>
    <Input
      type="password"
      autoComplete={autoComplete}
      value={value}
      onChange={(_e, d) => onChange(d.value)}
      data-testid={testId}
    />
  </Field>
);

/** Optional password protection of the Škoda tokens stored in this browser */
export const SkodaVaultSection: React.FC = () => {
  const { t } = useTranslation();
  const vault = useSkodaVault();
  const [panel, setPanel] = useState<Panel>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const openPanel = (next: Panel) => {
    setPanel(next);
    setPassword('');
    setNewPassword('');
    setConfirm('');
    setError(null);
  };

  const run = async (action: () => Promise<void> | void) => {
    setPending(true);
    setError(null);
    try {
      await action();
      openPanel(null);
    } catch (e) {
      setError(getSkodaErrorMessage(e, t));
    } finally {
      setPending(false);
    }
  };

  /** Validation message for a new password and its confirmation, or null if they're fine */
  const newPasswordError = (value: string): string | null => {
    if (value.length < VAULT_MIN_PASSWORD_LENGTH) return t('skoda.vault.passwordTooShort', { count: VAULT_MIN_PASSWORD_LENGTH });
    if (value !== confirm) return t('skoda.vault.passwordMismatch');
    return null;
  };

  const autoLockLabel = (minutes: AutoLockMinutes) =>
    minutes === null ? t('skoda.vault.autoLockNever') : t('skoda.vault.autoLockMinutes', { count: minutes });

  const actions = (submitLabel: string, disabled: boolean, testId: string) => (
    <Stack horizontal gap={tokens.spacingHorizontalS} justify="flex-end">
      <Button appearance="subtle" onClick={() => openPanel(null)}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" appearance="primary" disabled={disabled || pending} data-testid={testId}>
        {submitLabel}
      </Button>
    </Stack>
  );

  const renderPanel = () => {
    switch (panel) {
      case 'enable': {
        const validation = newPasswordError(password);
        return (
          <form onSubmit={e => { e.preventDefault(); void run(() => vault.enable(password)); }}>
            <Stack gap={tokens.spacingHorizontalS}>
              <PasswordInput label={t('skoda.vault.password')} value={password} onChange={setPassword} autoComplete="new-password" testId="skoda-vault-new-password-input" />
              <PasswordInput
                label={t('skoda.vault.confirmPassword')}
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                testId="skoda-vault-confirm-password-input"
                error={confirm ? validation ?? error : error}
              />
              {actions(t('skoda.vault.turnOn'), validation !== null, 'skoda-vault-turn-on-button')}
            </Stack>
          </form>
        );
      }
      case 'unlock':
      case 'disable':
        return (
          <form
            onSubmit={e => {
              e.preventDefault();
              void run(() => (panel === 'unlock' ? vault.unlock(password) : vault.disable(password)));
            }}
          >
            <Stack gap={tokens.spacingHorizontalS}>
              {panel === 'disable' && (
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {t('skoda.vault.turnOffDescription')}
                </Text>
              )}
              <PasswordInput
                label={t('skoda.vault.password')}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                testId="skoda-vault-password-input"
                error={error}
              />
              {panel === 'unlock'
                ? actions(t('skoda.vault.unlock'), !password, 'skoda-vault-unlock-submit-button')
                : actions(t('skoda.vault.turnOff'), !password, 'skoda-vault-turn-off-submit-button')}
            </Stack>
          </form>
        );
      case 'change': {
        const validation = newPasswordError(newPassword);
        return (
          <form onSubmit={e => { e.preventDefault(); void run(() => vault.changePassword(password, newPassword)); }}>
            <Stack gap={tokens.spacingHorizontalS}>
              <PasswordInput
                label={t('skoda.vault.currentPassword')}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                testId="skoda-vault-password-input"
                error={error}
              />
              <PasswordInput label={t('skoda.vault.newPassword')} value={newPassword} onChange={setNewPassword} autoComplete="new-password" testId="skoda-vault-new-password-input" />
              <PasswordInput
                label={t('skoda.vault.confirmPassword')}
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                testId="skoda-vault-confirm-password-input"
                error={confirm ? validation : null}
              />
              {actions(t('skoda.vault.changePassword'), !password || validation !== null, 'skoda-vault-change-submit-button')}
            </Stack>
          </form>
        );
      }
      case 'reset':
        return (
          <form onSubmit={e => { e.preventDefault(); void run(vault.reset); }}>
            <Stack gap={tokens.spacingHorizontalS}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {t('skoda.vault.resetDescription')}
              </Text>
              {actions(t('skoda.vault.resetConfirm'), false, 'skoda-vault-reset-confirm-button')}
            </Stack>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <Stack gap={tokens.spacingHorizontalM} data-testid="skoda-vault-settings">
      <Stack horizontal gap={tokens.spacingHorizontalS} align="center">
        <Text weight="semibold">{t('skoda.vault.title')}</Text>
        {vault.isProtected && (
          <Badge appearance="tint" color={vault.isUnlocked ? 'success' : 'informative'} data-testid="skoda-vault-status">
            {vault.isUnlocked ? t('skoda.vault.statusUnlocked') : t('skoda.vault.statusLocked')}
          </Badge>
        )}
      </Stack>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        {t('skoda.vault.description')} {t('skoda.vault.recommendation')}
      </Text>

      {panel === null && !vault.isProtected && (
        <Stack horizontal>
          <Button icon={<LockClosed20Regular />} onClick={() => openPanel('enable')} data-testid="skoda-vault-enable-button">
            {t('skoda.vault.enable')}
          </Button>
        </Stack>
      )}

      {panel === null && vault.isProtected && (
        <>
          <Stack horizontal gap={tokens.spacingHorizontalS} wrap>
            {vault.isUnlocked ? (
              <Button icon={<LockClosed20Regular />} onClick={vault.lock} data-testid="skoda-vault-lock-button">
                {t('skoda.vault.lock')}
              </Button>
            ) : (
              <Button icon={<LockOpen20Regular />} onClick={() => openPanel('unlock')} data-testid="skoda-vault-unlock-button">
                {t('skoda.vault.unlock')}
              </Button>
            )}
            <Button appearance="subtle" onClick={() => openPanel('change')} data-testid="skoda-vault-change-button">
              {t('skoda.vault.changePassword')}
            </Button>
            <Button appearance="subtle" onClick={() => openPanel('disable')} data-testid="skoda-vault-turn-off-button">
              {t('skoda.vault.turnOff')}
            </Button>
            <Button appearance="subtle" onClick={() => openPanel('reset')} data-testid="skoda-vault-reset-button">
              {t('skoda.vault.reset')}
            </Button>
          </Stack>
          <Field label={t('skoda.vault.autoLock')}>
            <Dropdown
              value={autoLockLabel(vault.autoLockMinutes)}
              selectedOptions={[String(vault.autoLockMinutes)]}
              onOptionSelect={(_e, d) =>
                vault.setAutoLockMinutes(d.optionValue === 'null' ? null : (Number(d.optionValue) as AutoLockMinutes))
              }
              data-testid="skoda-vault-auto-lock-dropdown"
            >
              {AUTO_LOCK_OPTIONS.map(minutes => (
                <Option key={String(minutes)} value={String(minutes)}>
                  {autoLockLabel(minutes)}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </>
      )}

      {renderPanel()}
    </Stack>
  );
};
