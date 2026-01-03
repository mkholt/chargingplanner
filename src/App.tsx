import React, { useCallback, useState } from 'react';

import {
  Button,
  FluentProvider,
  Title3,
  tokens,
  Tooltip,
  webDarkTheme,
} from '@fluentui/react-components';
import { Settings20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { AppFooter, ErrorBoundary, InputForm, LanguageSelector, PriceAreaToggle, PullToRefresh, Results, Stack } from '@/components';
import { SettingsPane } from '@/components/settings';
import { SyncLinkHandler } from '@/components/sync';
import {
  CarsProvider,
  PriceSettingsProvider,
  SettingsUIProvider,
  useCars,
  usePriceSettings,
  useSettingsUI,
} from '@/contexts';
import { useIsMobile, usePricesQuery } from '@/hooks';

type FormInput = {
  startPercent: number;
  endPercent: number;
  batterySize: number;
  chargingSpeed: number;
  earliest: string;
  latest: string;
};

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  // Settings UI state from context
  const { isOpen: settingsOpen, toggleSettings } = useSettingsUI();

  // Get car selection from context
  const { selectedCarId, selectedCar } = useCars();

  // Get aggregation settings from context
  const { resolved: priceSettings } = usePriceSettings();

  // Fetch price data using TanStack Query
  const { data: priceResult, isError, error, refresh, dataUpdatedAt } = usePricesQuery();
  const priceData = priceResult?.data;
  const priceError = isError ? error : null;

  // Track form input
  const [formInput, setFormInput] = useState<FormInput | null>(null);

  const handleSubmit = useCallback((input: FormInput) => {
    setFormInput(input);
  }, []);

  const mainContent = (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
      }}
    >
      <Stack horizontal align="center" gap={tokens.spacingHorizontalM} style={{ margin: tokens.spacingHorizontalL }}>
        <img
          src="/ev-charging-logo.svg"
          alt={t('logoAlt')}
          style={{
            width: 40,
            height: 40,
            borderRadius: tokens.borderRadiusLarge,
            background: tokens.colorNeutralBackground2
          }}
        />
        <Title3 as="h1" data-testid="app-title" style={{ margin: 0, fontSize: 'clamp(1rem, 4vw, 1.25rem)', flex: 1 }}>
          {t('appTitle')}
        </Title3>
        <LanguageSelector />
        <Tooltip content={t('common.settings')} relationship="label">
          <Button
            appearance="subtle"
            icon={<Settings20Regular />}
            onClick={toggleSettings}
            aria-label={t('common.settings')}
            data-testid="settings-button"
          />
        </Tooltip>
      </Stack>
      <Stack
        horizontal={!isMobile}
        wrap
        gap={tokens.spacingHorizontalM}
        align={isMobile ? 'stretch' : 'flex-start'}
        style={{
          flex: 1,
          width: '100%',
          padding: `0 ${tokens.spacingHorizontalL} ${tokens.spacingHorizontalL} ${tokens.spacingHorizontalL}`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: isMobile ? '0 0 auto' : '1 1 320px', maxWidth: isMobile ? '100%' : 400 }}>
          <InputForm
            key={selectedCarId ?? 'no-car'}
            selectedCar={selectedCar}
            onSubmit={handleSubmit}
          />
        </div>
        <div style={{ flex: isMobile ? '1 1 auto' : '2 1 400px', maxWidth: '100%', minWidth: 0 }}>
          {settingsOpen ? (
            <SettingsPane />
          ) : (
            <>
              {/* Show price area toggle only when no supplier is selected */}
              {priceSettings.priceAreaSource === 'manual' && (
                <div style={{ marginBottom: tokens.spacingHorizontalM }}>
                  <PriceAreaToggle />
                </div>
              )}
              <Results
                formInput={formInput}
                priceData={priceData}
                priceError={priceError}
                dataUpdatedAt={dataUpdatedAt}
              />
            </>
          )}
        </div>
      </Stack>
      <AppFooter />
    </div>
  );

  return (
    <FluentProvider theme={webDarkTheme}>
      <ErrorBoundary>
        <PullToRefresh onRefresh={refresh} disabled={!isMobile}>
          {mainContent}
        </PullToRefresh>
        <SyncLinkHandler />
      </ErrorBoundary>
    </FluentProvider>
  );
};

// Wrap with all providers
const App: React.FC = () => (
  <CarsProvider>
    <PriceSettingsProvider>
      <SettingsUIProvider>
        <AppContent />
      </SettingsUIProvider>
    </PriceSettingsProvider>
  </CarsProvider>
);

export default App;
