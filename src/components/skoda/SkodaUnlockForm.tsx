import React, { useState } from 'react';

import { Button, Text, tokens } from '@fluentui/react-components';
import { LockOpen20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { PasswordInput, Stack } from '@/components/ui';
import { useSkodaVault } from '@/contexts';
import { useAsyncAction } from '@/hooks';

import { getSkodaErrorMessage } from './skodaErrors';

type Props = {
  prompt: string;
  /** Shows a Skip button */
  onSkip?: () => void;
  /** Shows a Cancel button */
  onCancel?: () => void;
  onUnlocked?: () => void;
};

/** Asks for the vault password and unlocks the vault */
export const SkodaUnlockForm: React.FC<Props> = ({ prompt, onSkip, onCancel, onUnlocked }) => {
  const { t } = useTranslation();
  const { unlock } = useSkodaVault();
  const [password, setPassword] = useState('');
  const { run, pending, error } = useAsyncAction();

  const handleUnlock = async () => {
    const unlocked = await run(() => unlock(password));
    setPassword('');
    if (unlocked) onUnlocked?.();
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        void handleUnlock();
      }}
      data-testid="skoda-unlock-form"
    >
      <Stack gap={tokens.spacingHorizontalS}>
        <Text size={200}>{prompt}</Text>
        <PasswordInput
          label={t('skoda.vault.password')}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          testId="skoda-unlock-password-input"
          error={error ? getSkodaErrorMessage(error, t) : null}
        />
        <Stack horizontal gap={tokens.spacingHorizontalS}>
          <Button
            type="submit"
            appearance="primary"
            icon={<LockOpen20Regular />}
            disabled={!password || pending}
            data-testid="skoda-unlock-button"
          >
            {t('skoda.vault.unlock')}
          </Button>
          {onSkip && (
            <Button appearance="subtle" onClick={onSkip} data-testid="skoda-unlock-skip-button">
              {t('skoda.vault.skip')}
            </Button>
          )}
          {onCancel && (
            <Button appearance="subtle" onClick={onCancel} data-testid="skoda-unlock-cancel-button">
              {t('common.cancel')}
            </Button>
          )}
        </Stack>
      </Stack>
    </form>
  );
};
