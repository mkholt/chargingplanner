import React, { useState } from 'react';

import {
  Badge,
  Button,
  Divider,
  Dropdown,
  Field,
  Input,
  Link,
  Option,
  Spinner,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowSync20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { useAppSettings } from '@/contexts';
import { priceQueryKeys, usePricesQuery } from '@/hooks';
import { ALL_LANGUAGES, LANGUAGES, type LanguageCode } from '@/locales';
import { formatShortDate, formatTime, formatTimeValue } from '@/utils';

/** Format a timestamp for display (e.g., "Mon, Jan 5, 14:30") */
function formatLastSync(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return `${formatShortDate(date)}, ${formatTime(date)}`;
}

export const AppSettingsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: priceResult, dataUpdatedAt, refetch, isFetching } = usePricesQuery();
  const isMockedData = priceResult?.isMocked ?? false;
  const lastSyncTime = formatLastSync(dataUpdatedAt);

  const [cacheCleared, setCacheCleared] = useState(false);

  const {
    earliestMode,
    earliestTime,
    setDefaultEarliest,
    setDefaultLatest,
    setEarliestMode,
    settings,
  } = useAppSettings();

  const currentLangCode = i18n.language as LanguageCode;
  const currentLang = LANGUAGES[currentLangCode] ?? LANGUAGES.en;

  const handleClearCache = () => {
    queryClient.removeQueries({ queryKey: priceQueryKeys.all });
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const handleLanguageChange = (_: unknown, data: { optionValue?: string }) => {
    if (data.optionValue) {
      i18n.changeLanguage(data.optionValue);
    }
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
    <Stack gap={tokens.spacingHorizontalXL}>
      {/* Settings - Language & Time Window */}
      <Stack gap={tokens.spacingHorizontalM} style={{ maxWidth: 600 }}>
        <Text weight="semibold">{t('settings.app.title')}</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {t('settings.defaults.description')}
        </Text>

        {/* Language */}
        <Field label={t('settings.language.title')}>
          <Dropdown
            data-testid="language-selector"
            value={`${currentLang.flag} ${currentLang.nativeName}`}
            selectedOptions={[currentLangCode]}
            onOptionSelect={handleLanguageChange}
          >
            {ALL_LANGUAGES.map(lang => (
              <Option key={lang.code} value={lang.code} text={`${lang.flag} ${lang.nativeName}`}>
                {lang.flag} {lang.nativeName}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Earliest Start */}
        <Field
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{t('settings.defaults.earliestStart')}</span>
              <Switch
                checked={earliestMode === 'now'}
                onChange={handleEarliestModeToggle}
                label={t('settings.defaults.now')}
                labelPosition="after"
                data-testid="earliest-now-toggle"
              />
            </div>
          }
        >
          <Input
            type="time"
            step={900}
            value={formatTimeValue(new Date(`2000-01-01T${earliestTime}`))}
            onChange={handleEarliestTimeChange}
            disabled={earliestMode === 'now'}
            data-testid="earliest-time-input"
          />
        </Field>

        {/* Latest End */}
        <Field label={t('settings.defaults.latestEnd')}>
          <Input
            type="time"
            step={900}
            value={formatTimeValue(new Date(`2000-01-01T${settings.defaultLatest}`))}
            onChange={handleLatestChange}
            data-testid="latest-time-input"
          />
        </Field>
      </Stack>

      <Divider />

      {/* Data Source */}
      <Stack gap={tokens.spacingHorizontalS}>
        <Text weight="semibold">{t('settings.dataSource.title')}</Text>
        <Stack horizontal align="center" gap={tokens.spacingHorizontalS} data-testid="data-source-info">
          <Text size={300}>
            {isMockedData ? (
              t('settings.dataSource.mock')
            ) : (
              <>
                {t('settings.dataSource.live')}{' '}
                <Link href="https://stromligning.dk" target="_blank" rel="noopener noreferrer">
                  Strømligning.dk
                </Link>
              </>
            )}
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
      <Stack gap={tokens.spacingHorizontalS}>
        <Text weight="semibold">{t('settings.cache.title')}</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {t('settings.cache.description')}
        </Text>
        {lastSyncTime && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {t('settings.cache.lastSync', { time: lastSyncTime })}
          </Text>
        )}
        <Stack horizontal gap={tokens.spacingHorizontalS}>
          <Button
            appearance="secondary"
            icon={isFetching ? <Spinner size="tiny" /> : <ArrowSync20Regular />}
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="refresh-cache-button"
          >
            {t('common.refresh')}
          </Button>
          <Button
            appearance="secondary"
            icon={<Delete20Regular />}
            onClick={handleClearCache}
            disabled={cacheCleared}
            data-testid="clear-cache-button"
          >
            {cacheCleared ? t('settings.cache.cleared') : t('settings.cache.clearButton')}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};
