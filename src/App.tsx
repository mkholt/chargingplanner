import React, { useCallback, useState } from 'react';

import {
  FluentProvider,
  Title3,
  tokens,
  webDarkTheme,
} from '@fluentui/react-components';

import { AppFooter, ErrorBoundary, InputForm, PriceAreaToggle, PullToRefresh, RefreshButton, Results } from '@/components';
import { SettingsDialog } from '@/components/settings';
import { SyncLinkHandler } from '@/components/sync';
import {
  CarsProvider,
  ChargingFormProvider,
  PriceSettingsProvider,
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
  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Get aggregation settings from context
  const { resolved: priceSettings } = usePriceSettings();

  // Fetch price data using TanStack Query
  const { data: priceData, dataUpdatedAt, isFetching, refresh } = usePricesQuery();

  // Track form input
  const [formInput, setFormInput] = useState<FormInput | null>(null);

  const handleSubmit = useCallback((input: FormInput) => {
    setFormInput(input);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      // Error is handled by React Query's error state
      console.error('Failed to refresh prices:', error);
    }
  }, [refresh]);

  return (
    <FluentProvider theme={webDarkTheme}>
      <ErrorBoundary>
        <PullToRefresh onRefresh={handleRefresh}>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              width: '100vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', margin: '16px', gap: 12 }}>
              <img
                src="/ev-charging-logo.svg"
                alt="EV Charging Logo"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: tokens.colorNeutralBackground2
                }}
              />
              <Title3 as="h1" style={{ margin: 0, fontSize: 'clamp(1rem, 4vw, 1.25rem)', flex: 1 }}>
                EV Charging Planner
              </Title3>
              <RefreshButton
                onRefresh={handleRefresh}
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
                gap: 16,
                width: '100%',
                alignItems: 'flex-start',
                padding: '0 16px 16px 16px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flex: '1 1 320px' }}>
                <InputForm
                  onSettingsClick={() => setSettingsOpen(true)}
                  onSubmit={handleSubmit}
                />
              </div>
              <div style={{ flex: '2 1 400px' }}>
                {/* Show price area toggle only when no supplier is selected */}
                {priceSettings.priceAreaSource === 'manual' && (
                  <div style={{ marginBottom: 12 }}>
                    <PriceAreaToggle />
                  </div>
                )}
                <Results
                  formInput={formInput}
                  priceData={priceData}
                />
              </div>
            </div>
            <AppFooter />
          </div>
        </PullToRefresh>
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
      <ChargingFormProvider>
        <AppContent />
      </ChargingFormProvider>
    </PriceSettingsProvider>
  </CarsProvider>
);

export default App;
