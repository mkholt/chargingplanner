import React, { useState } from 'react';

import {
  Badge,
  Button,
  Divider,
  Input,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Clock20Regular,
  Database20Regular,
  Delete20Regular,
} from '@fluentui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { useAppSettings } from '@/contexts';
import { priceQueryKeys, usePricesQuery } from '@/hooks';
import { formatTimeValue } from '@/utils';

import { LanguageSection } from './LanguageSection';

export const AppSettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: priceResult } = usePricesQuery();
  const isMockedData = priceResult?.isMocked ?? false;

  const [cacheCleared, setCacheCleared] = useState(false);

  const {
    earliestMode,
    earliestTime,
    setDefaultEarliest,
    setDefaultLatest,
    setEarliestMode,
    settings,
  } = useAppSettings();

  const handleClearCache = () => {
    queryClient.removeQueries({ queryKey: priceQueryKeys.all });
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const handleEarliestModeToggle = (_: unknown, data: { checked: boolean }) => {
    setEarliestMode(data.checked ? 'now' : 'specific', earliestTime);
  };

  const handleEarliestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultEarliest(e.target.value);
  };

  const handleLatestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultLatest(e.target.value);
  };

  return (
    <Stack gap={20}>
      {/* Language */}
      <LanguageSection />

      <Divider />

      {/* Data Source */}
      <Stack gap={8}>
        <Text weight="semibold">{t('settings.dataSource.title')}</Text>
        <Stack horizontal align="center" gap={8} data-testid="data-source-info">
          <Database20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
          <Text size={300}>
            {isMockedData ? t('settings.dataSource.mock') : t('settings.dataSource.live')}
          </Text>
          {isMockedData && (
            <Badge appearance="filled" color="warning" size="small" data-testid="mock-data-badge">
              Mock
            </Badge>
          )}
        </Stack>
      </Stack>

      <Divider />

      {/* Cache */}
      <Stack gap={8}>
        <Text weight="semibold">{t('settings.cache.title')}</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {t('settings.cache.description')}
        </Text>
        <div>
          <Button
            appearance="secondary"
            size="small"
            icon={<Delete20Regular />}
            onClick={handleClearCache}
            disabled={cacheCleared}
            data-testid="clear-cache-button"
          >
            {cacheCleared ? t('settings.cache.cleared') : t('settings.cache.clearButton')}
          </Button>
        </div>
      </Stack>

      <Divider />

      {/* Default Time Window */}
      <Stack gap={12}>
        <Text weight="semibold">{t('settings.defaults.title')}</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {t('settings.defaults.description')}
        </Text>

        <Stack horizontal gap={16}>
          {/* Earliest Start */}
          <Stack gap={4} style={{ flex: 1 }}>
            <Stack horizontal align="center" gap={8}>
              <Clock20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
              <Text size={200}>{t('settings.defaults.earliestStart')}</Text>
            </Stack>
            <Stack horizontal align="center" gap={8}>
              <Switch
                checked={earliestMode === 'now'}
                onChange={handleEarliestModeToggle}
                label={t('settings.defaults.now')}
                data-testid="earliest-now-toggle"
              />
              <Input
                type="time"
                step={900}
                value={formatTimeValue(new Date(`2000-01-01T${earliestTime}`))}
                onChange={handleEarliestTimeChange}
                disabled={earliestMode === 'now'}
                style={{ width: 100 }}
                data-testid="earliest-time-input"
              />
            </Stack>
          </Stack>

          {/* Latest End */}
          <Stack gap={4} style={{ flex: 1 }}>
            <Stack horizontal align="center" gap={8}>
              <Clock20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
              <Text size={200}>{t('settings.defaults.latestEnd')}</Text>
            </Stack>
            <Input
              type="time"
              step={900}
              value={formatTimeValue(new Date(`2000-01-01T${settings.defaultLatest}`))}
              onChange={handleLatestChange}
              data-testid="latest-time-input"
            />
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
};
