import React, { useCallback, useState } from 'react';

import {
  FluentProvider,
  Title3,
  tokens,
  webDarkTheme,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { AppFooter, ErrorBoundary, InputForm, PriceAreaToggle, RefreshButton, Results } from '@/components';
import { SettingsDialog } from '@/components/settings';
import { SyncLinkHandler } from '@/components/sync';
import {
  CarsProvider,
  PriceSettingsProvider,
  useCars,
  usePriceSettings,
} from '@/contexts';
import { usePricesQuery } from '@/hooks';

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
  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Get car selection from context
  const { selectedCarId, selectedCar } = useCars();

  // Get aggregation settings from context
  const { resolved: priceSettings } = usePriceSettings();

  // Fetch price data using TanStack Query
  const { data: priceResult, dataUpdatedAt, isFetching, isError, error, refresh } = usePricesQuery();
  const priceData = priceResult?.data;
  const priceError = isError ? error : null;

  // Track form input
  const [formInput, setFormInput] = useState<FormInput | null>(null);

  const handleSubmit = useCallback((input: FormInput) => {
    setFormInput(input);
  }, []);

  return (
    <FluentProvider theme={webDarkTheme}>
      <ErrorBoundary>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              width: '100vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', margin: tokens.spacingHorizontalL, gap: tokens.spacingHorizontalM }}>
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
              <RefreshButton
                onRefresh={refresh}
                isRefreshing={isFetching}
                lastUpdated={dataUpdatedAt}
              />
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: tokens.spacingHorizontalL,
                width: '100%',
                alignItems: 'flex-start',
                padding: `0 ${tokens.spacingHorizontalL} ${tokens.spacingHorizontalL} ${tokens.spacingHorizontalL}`,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flex: '1 1 320px', maxWidth: 400 }}>
                <InputForm
                  key={selectedCarId ?? 'no-car'}
                  selectedCar={selectedCar}
                  onSettingsClick={() => setSettingsOpen(true)}
                  onSubmit={handleSubmit}
                />
              </div>
              <div style={{ flex: '2 1 400px' }}>
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
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </div>
            </div>
            <AppFooter />
          </div>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
        <SyncLinkHandler />
      </ErrorBoundary>
    </FluentProvider>
  );
};

// Wrap with all providers
const App: React.FC = () => (
  <CarsProvider>
    <PriceSettingsProvider>
      <AppContent />
    </PriceSettingsProvider>
  </CarsProvider>
);

export default App;
