import React, { useState } from 'react';

import { Button, Divider, Field, Input, Text, tokens } from '@fluentui/react-components';
import { Link20Regular, LinkDismiss20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { type Car, useSkodaProxy } from '@/contexts';
import { useSkodaLink, useSkodaLinkStatus } from '@/hooks';
import { VIN_PATTERN } from '@/utils';

import { getSkodaErrorMessage } from './skodaErrors';
import { SkodaLinkStatusText } from './SkodaLinkStatusText';

type Mode = 'view' | 'link' | 'unlink';

/** Link a car to its Škoda with a VIN and an API key, or unlink it. Hidden while the proxy is off. */
export const SkodaLinkSection: React.FC<{ car: Car }> = ({ car }) => {
  const { t } = useTranslation();
  const { baseUrl } = useSkodaProxy();
  const { link, unlink, requiresPassword } = useSkodaLink();
  const status = useSkodaLinkStatus(car);
  const [mode, setMode] = useState<Mode>('view');
  const [vin, setVin] = useState(car.skoda?.vin ?? '');
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!baseUrl) return null;

  const vinValid = VIN_PATTERN.test(vin);
  const passwordMissing = requiresPassword && !password;

  const changeMode = (next: Mode) => {
    setMode(next);
    setApiKey('');
    setPassword('');
    setError(null);
  };

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      changeMode('view');
    } catch (e) {
      setError(getSkodaErrorMessage(e, t));
    } finally {
      setPending(false);
    }
  };

  const handleLink = () => {
    const key = apiKey.trim();
    // The key is only needed for this one request, so it doesn't stay in the form
    setApiKey('');
    void run(() => link(car, vin, key, password));
  };

  const passwordField = requiresPassword && (
    <Field label={t('skoda.link.vaultPassword')}>
      <Input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(_e, d) => setPassword(d.value)}
        data-testid="skoda-vault-password-input"
      />
    </Field>
  );

  const errorText = error && (
    <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid="skoda-link-error">
      {error}
    </Text>
  );

  return (
    <Stack gap={tokens.spacingHorizontalS} data-testid="skoda-link-section">
      <Divider />
      <Text weight="semibold">{t('skoda.link.title')}</Text>
      <SkodaLinkStatusText car={car} />

      {mode === 'view' && (
        <Stack horizontal gap={tokens.spacingHorizontalS} wrap>
          <Button
            icon={<Link20Regular />}
            onClick={() => changeMode('link')}
            data-testid={car.skoda ? 'skoda-relink-button' : 'skoda-link-button'}
          >
            {car.skoda ? t('skoda.link.relink') : t('skoda.link.link')}
          </Button>
          {car.skoda && (
            <Button
              appearance="subtle"
              icon={<LinkDismiss20Regular />}
              onClick={() => changeMode('unlink')}
              data-testid="skoda-unlink-button"
            >
              {t('skoda.link.unlink')}
            </Button>
          )}
        </Stack>
      )}

      {mode === 'link' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            handleLink();
          }}
        >
          <Stack gap={tokens.spacingHorizontalS}>
            <Field
              label={t('skoda.link.vin')}
              validationMessage={vin && !vinValid ? t('skoda.link.vinInvalid') : undefined}
              validationState={vin && !vinValid ? 'error' : 'none'}
            >
              <Input
                value={vin}
                onChange={(_e, d) => setVin(d.value.toUpperCase().replace(/\s/g, ''))}
                maxLength={17}
                autoComplete="off"
                spellCheck={false}
                data-testid="skoda-vin-input"
              />
            </Field>
            <Field label={t('skoda.link.apiKey')} hint={t('skoda.link.apiKeyHint')}>
              <Input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(_e, d) => setApiKey(d.value)}
                data-testid="skoda-api-key-input"
              />
            </Field>
            {passwordField}
            {errorText}
            <Stack horizontal gap={tokens.spacingHorizontalS} justify="flex-end">
              <Button appearance="subtle" onClick={() => changeMode('view')}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                appearance="primary"
                disabled={!vinValid || !apiKey.trim() || passwordMissing || pending}
                data-testid="skoda-link-submit-button"
              >
                {status ? t('skoda.link.relink') : t('skoda.link.link')}
              </Button>
            </Stack>
          </Stack>
        </form>
      )}

      {mode === 'unlink' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            void run(() => unlink(car, password));
          }}
        >
          <Stack gap={tokens.spacingHorizontalS}>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {t('skoda.link.unlinkHint')}
            </Text>
            {passwordField}
            {errorText}
            <Stack horizontal gap={tokens.spacingHorizontalS} justify="flex-end">
              <Button appearance="subtle" onClick={() => changeMode('view')}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                appearance="primary"
                disabled={passwordMissing || pending}
                data-testid="skoda-unlink-confirm-button"
              >
                {t('skoda.link.unlink')}
              </Button>
            </Stack>
          </Stack>
        </form>
      )}
    </Stack>
  );
};
