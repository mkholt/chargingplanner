import React, { useState } from 'react';

import { Button, Spinner, Switch, Text, tokens } from '@fluentui/react-components';
import { PlugConnected20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { checkSkodaProxyHealth } from '@/api';
import { Stack } from '@/components/ui';
import { useSkodaProxy } from '@/contexts';

import { SkodaVaultSection } from './SkodaVaultSection';

type ConnectionState = 'idle' | 'checking' | 'ok' | 'failed';

/** Turn the Škoda connection on and manage password protection. Hidden when the build has no proxy. */
export const SkodaSection: React.FC = () => {
  const { t } = useTranslation();
  const { proxyUrl, enabled, setEnabled, baseUrl } = useSkodaProxy();
  const [connection, setConnection] = useState<ConnectionState>('idle');

  if (!proxyUrl) return null;

  const handleTest = async () => {
    setConnection('checking');
    setConnection((await checkSkodaProxyHealth(proxyUrl)) ? 'ok' : 'failed');
  };

  return (
    <Stack gap={tokens.spacingHorizontalXL} style={{ maxWidth: 600 }}>
      <Stack gap={tokens.spacingHorizontalM} data-testid="skoda-settings">
        <Text weight="semibold">{t('skoda.settings.title')}</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {t('skoda.settings.description')}
        </Text>
        <Switch
          checked={enabled}
          onChange={(_e, d) => setEnabled(d.checked)}
          label={t('skoda.settings.enable')}
          data-testid="skoda-enable-toggle"
        />
        {enabled && (
          <>
            <Stack gap={tokens.spacingVerticalXXS}>
              <Text size={200} weight="semibold">{t('skoda.settings.proxy')}</Text>
              <Text size={200} style={{ fontFamily: 'monospace', wordBreak: 'break-all' }} data-testid="skoda-proxy-url">
                {proxyUrl}
              </Text>
            </Stack>
            <Stack horizontal gap={tokens.spacingHorizontalS} align="center" wrap>
              <Button
                icon={connection === 'checking' ? <Spinner size="tiny" /> : <PlugConnected20Regular />}
                onClick={() => void handleTest()}
                disabled={connection === 'checking'}
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
