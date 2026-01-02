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

import { AppFooter, ErrorBoundary, InputForm, LanguageSelector, PriceAreaToggle, Results } from '@/components';
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
  // Settings UI state from context
  const { isOpen: settingsOpen, toggleSettings } = useSettingsUI();

  // Get car selection from context
  const { selectedCarId, selectedCar } = useCars();

  // Get aggregation settings from context
  const { resolved: priceSettings } = usePriceSettings();

  // Fetch price data using TanStack Query
  const { data: priceResult, isError, error } = usePricesQuery();
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
                  onSubmit={handleSubmit}
                />
              </div>
              <div style={{ flex: '2 1 400px' }}>
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
                    />
                  </>
                )}
              </div>
            </div>
            <AppFooter />
          </div>
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
