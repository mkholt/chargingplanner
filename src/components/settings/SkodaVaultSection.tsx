import React, { useState } from 'react';

import { Badge, Button, Dropdown, Field, Option, Text, tokens } from '@fluentui/react-components';
import { LockClosed20Regular, LockOpen20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { getSkodaErrorMessage, SkodaUnlockForm } from '@/components/skoda';
import { FormActions, PasswordInput, Stack } from '@/components/ui';
import { type AutoLockMinutes, useSkodaVault } from '@/contexts';
import { useAsyncAction } from '@/hooks';
import { VAULT_MIN_PASSWORD_LENGTH } from '@/utils';

type Panel = 'enable' | 'unlock' | 'change' | 'disable' | 'reset' | null;

const AUTO_LOCK_OPTIONS: AutoLockMinutes[] = [5, 15, 60, null];

type PasswordFormProps = {
  /** Ask for the current password as well */
  current: boolean;
  /** Ask for a new password, with confirmation */
  next: boolean;
  description?: string;
  submitLabel: string;
  submitTestId: string;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  onDone: () => void;
};

/** Current and/or new vault password, submitted together */
const PasswordForm: React.FC<PasswordFormProps> = ({
  current,
  next,
  description,
  submitLabel,
  submitTestId,
  onSubmit,
  onDone,
}) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { run, pending, error } = useAsyncAction();
  const errorMessage = error ? getSkodaErrorMessage(error, t) : null;

  const newPasswordError = (() => {
    if (!next) return null;
    if (newPassword.length < VAULT_MIN_PASSWORD_LENGTH) {
      return t('skoda.vault.passwordTooShort', { count: VAULT_MIN_PASSWORD_LENGTH });
    }
    if (newPassword !== confirm) return t('skoda.vault.passwordMismatch');
    return null;
  })();

  const handleSubmit = async () => {
    if (await run(() => onSubmit(currentPassword, newPassword))) onDone();
  };

  return (
    <form onSubmit={e => { e.preventDefault(); void handleSubmit(); }}>
      <Stack gap={tokens.spacingHorizontalS}>
        {description && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{description}</Text>
        )}
        {current && (
          <PasswordInput
            label={next ? t('skoda.vault.currentPassword') : t('skoda.vault.password')}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            testId="skoda-vault-password-input"
            error={errorMessage}
          />
        )}
        {next && (
          <>
            <PasswordInput
              label={current ? t('skoda.vault.newPassword') : t('skoda.vault.password')}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              testId="skoda-vault-new-password-input"
            />
            <PasswordInput
              label={t('skoda.vault.confirmPassword')}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              testId="skoda-vault-confirm-password-input"
              error={(confirm ? newPasswordError : null) ?? (current ? null : errorMessage)}
            />
          </>
        )}
        <FormActions
          submitLabel={submitLabel}
          disabled={pending || (current && !currentPassword) || newPasswordError !== null}
          testId={submitTestId}
          onCancel={onDone}
        />
      </Stack>
    </form>
  );
};

/** Optional password protection of the Škoda tokens stored in this browser */
export const SkodaVaultSection: React.FC = () => {
  const { t } = useTranslation();
  const vault = useSkodaVault();
  const [panel, setPanel] = useState<Panel>(null);
  const reset = useAsyncAction();
  const close = () => setPanel(null);

  const autoLockLabel = (minutes: AutoLockMinutes) =>
    minutes === null ? t('skoda.vault.autoLockNever') : t('skoda.vault.autoLockMinutes', { count: minutes });

  const renderPanel = () => {
    switch (panel) {
      case 'enable':
        return (
          <PasswordForm
            current={false}
            next
            submitLabel={t('skoda.vault.turnOn')}
            submitTestId="skoda-vault-turn-on-button"
            onSubmit={(_current, password) => vault.enable(password)}
            onDone={close}
          />
        );
      case 'unlock':
        return <SkodaUnlockForm prompt={t('skoda.vault.unlockSettingsPrompt')} onCancel={close} onUnlocked={close} />;
      case 'change':
        return (
          <PasswordForm
            current
            next
            submitLabel={t('skoda.vault.changePassword')}
            submitTestId="skoda-vault-change-submit-button"
            onSubmit={vault.changePassword}
            onDone={close}
          />
        );
      case 'disable':
        return (
          <PasswordForm
            current
            next={false}
            description={t('skoda.vault.turnOffDescription')}
            submitLabel={t('skoda.vault.turnOff')}
            submitTestId="skoda-vault-turn-off-submit-button"
            onSubmit={password => vault.disable(password)}
            onDone={close}
          />
        );
      case 'reset':
        return (
          <form onSubmit={e => { e.preventDefault(); void reset.run(vault.reset).then(done => done && close()); }}>
            <Stack gap={tokens.spacingHorizontalS}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {t('skoda.vault.resetDescription')}
              </Text>
              <FormActions
                submitLabel={t('skoda.vault.resetConfirm')}
                disabled={reset.pending}
                testId="skoda-vault-reset-confirm-button"
                onCancel={close}
              />
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
          <Button icon={<LockClosed20Regular />} onClick={() => setPanel('enable')} data-testid="skoda-vault-enable-button">
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
              <Button icon={<LockOpen20Regular />} onClick={() => setPanel('unlock')} data-testid="skoda-vault-unlock-button">
                {t('skoda.vault.unlock')}
              </Button>
            )}
            <Button appearance="subtle" onClick={() => setPanel('change')} data-testid="skoda-vault-change-button">
              {t('skoda.vault.changePassword')}
            </Button>
            <Button appearance="subtle" onClick={() => setPanel('disable')} data-testid="skoda-vault-turn-off-button">
              {t('skoda.vault.turnOff')}
            </Button>
            <Button appearance="subtle" onClick={() => setPanel('reset')} data-testid="skoda-vault-reset-button">
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
