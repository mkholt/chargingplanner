import React, { useState } from 'react';

import { Button, Field, Input, Text, tokens } from '@fluentui/react-components';
import { LockOpen20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { useSkodaVault } from '@/contexts';

import { getSkodaErrorMessage } from './skodaErrors';

/** Asks for the vault password, with a Skip option for this session */
export const SkodaUnlockForm: React.FC<{ carName: string }> = ({ carName }) => {
  const { t } = useTranslation();
  const { unlock, skipUnlock } = useSkodaVault();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleUnlock = async () => {
    setPending(true);
    setError(null);
    try {
      await unlock(password);
    } catch (e) {
      setError(getSkodaErrorMessage(e, t));
    } finally {
      setPassword('');
      setPending(false);
    }
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
        <Text size={200}>{t('skoda.vault.unlockPrompt', { name: carName })}</Text>
        <Field
          label={t('skoda.vault.password')}
          validationMessage={error ?? undefined}
          validationState={error ? 'error' : 'none'}
        >
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(_e, d) => setPassword(d.value)}
            data-testid="skoda-unlock-password-input"
          />
        </Field>
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
          <Button appearance="subtle" onClick={skipUnlock} data-testid="skoda-unlock-skip-button">
            {t('skoda.vault.skip')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
};
