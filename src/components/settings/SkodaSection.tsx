import React, { useState } from 'react';

import { Button, Field, Input, Spinner, Switch, Text, tokens } from '@fluentui/react-components';
import { PlugConnected20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { checkSkodaProxyHealth } from '@/api';
import { Stack } from '@/components/ui';
import { useSkodaProxy } from '@/contexts';

import { SkodaVaultSection } from './SkodaVaultSection';

type ConnectionState = 'idle' | 'checking' | 'ok' | 'failed';

/** Turn the Škoda proxy on, set its URL and manage password protection */
export const SkodaSection: React.FC = () => {
  const { t } = useTranslation();
  const { settings, setEnabled, setUrl, baseUrl, isUrlValid } = useSkodaProxy();
  const [connection, setConnection] = useState<ConnectionState>('idle');

  const handleTest = async () => {
    if (!baseUrl) return;
    setConnection('checking');
    setConnection((await checkSkodaProxyHealth(baseUrl)) ? 'ok' : 'failed');
  };

  const showUrlError = settings.enabled && settings.url !== '' && !isUrlValid;

  return (
    <Stack gap={tokens.spacingHorizontalXL} style={{ maxWidth: 600 }}>
      <Stack gap={tokens.spacingHorizontalM} data-testid="skoda-settings">
        <Text weight="semibold">{t('skoda.settings.title')}</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {t('skoda.settings.description')}
        </Text>
        <Switch
          checked={settings.enabled}
          onChange={(_e, d) => setEnabled(d.checked)}
          label={t('skoda.settings.enable')}
          data-testid="skoda-enable-toggle"
        />
        {settings.enabled && (
          <>
            <Field
              label={t('skoda.settings.url')}
              validationMessage={showUrlError ? t('skoda.settings.urlInvalid') : undefined}
              validationState={showUrlError ? 'error' : 'none'}
            >
              <Input
                type="url"
                value={settings.url}
                placeholder={t('skoda.settings.urlPlaceholder')}
                onChange={(_e, d) => {
                  setUrl(d.value);
                  setConnection('idle');
                }}
                data-testid="skoda-proxy-url-input"
              />
            </Field>
            <Stack horizontal gap={tokens.spacingHorizontalS} align="center" wrap>
              <Button
                icon={connection === 'checking' ? <Spinner size="tiny" /> : <PlugConnected20Regular />}
                onClick={() => void handleTest()}
                disabled={!baseUrl || connection === 'checking'}
                data-testid="skoda-test-connection-button"
              >
                {t('skoda.settings.testConnection')}
              </Button>
              {(connection === 'ok' || connection === 'failed') && (
                <Text
                  size={200}
                  style={{ color: connection === 'ok' ? tokens.colorPaletteGreenForeground1 : tokens.colorPaletteRedForeground1 }}
                  data-testid="skoda-connection-result"
                  data-result={connection}
                >
                  {connection === 'ok' ? t('skoda.settings.connectionOk') : t('skoda.settings.connectionFailed')}
                </Text>
              )}
            </Stack>
          </>
        )}
      </Stack>
      {baseUrl && <SkodaVaultSection />}
    </Stack>
  );
};
