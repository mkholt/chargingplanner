import React, { useCallback, useMemo, useState } from 'react';

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
import type { PricesApiResponse } from '@/types';
import {
  buildTimeline,
  findOptimalChargingWindow,
  MS_PER_MINUTE,
  type ChargingResult,
} from '@/utils';

type FormInput = {
  startPercent: number;
  endPercent: number;
  batterySize: number;
  chargingSpeed: number;
  earliest: string;
  latest: string;
};

type CalculationResults = {
  result: ChargingResult | null;
  selectedDate: string;
  intervalPrices: number[];
  intervalStart: Date | null;
  intervalMinutes: number;
  chargingSpeed: number | undefined;
};

function calculateResults(
  input: FormInput | null,
  priceData: PricesApiResponse | undefined
): CalculationResults {
  const emptyResults: CalculationResults = {
    result: null,
    selectedDate: '',
    intervalPrices: [],
    intervalStart: null,
    intervalMinutes: 60,
    chargingSpeed: undefined,
  };

  if (!input || !priceData) {
    return emptyResults;
  }

  const earliestDate = new Date(input.earliest);
  const latestDate = new Date(input.latest);

  // Build timeline of prices from now to end of available data
  // Resolution is determined by the API response (based on aggregation param we sent)
  const timeline = buildTimeline(earliestDate, latestDate, priceData);
  if (!timeline) {
    return { ...emptyResults, chargingSpeed: input.chargingSpeed };
  }

  // Validate interval duration using the timeline's interval size
  const msPerInterval = timeline.intervalMinutes * MS_PER_MINUTE;
  const intervalCount = Math.floor((latestDate.getTime() - earliestDate.getTime()) / msPerInterval) + 1;
  if (intervalCount <= 0) {
    return { ...emptyResults, chargingSpeed: input.chargingSpeed };
  }

  // Extract prices for the charging interval only
  const chargingIntervalPrices = timeline.prices.slice(
    timeline.chargingStartIdx,
    timeline.chargingEndIdx
  );

  // Find optimal charging window
  const calcResult = findOptimalChargingWindow({
    startPercent: input.startPercent,
    endPercent: input.endPercent,
    batterySize: input.batterySize,
    chargingSpeed: input.chargingSpeed,
    prices: chargingIntervalPrices,
    intervalMinutes: timeline.intervalMinutes,
  });

  // Adjust result indices to be relative to the full timeline
  const adjustedResult = calcResult
    ? {
        ...calcResult,
        startIndex: calcResult.startIndex + timeline.chargingStartIdx,
        endIndex: calcResult.endIndex + timeline.chargingStartIdx,
      }
    : null;

  return {
    result: adjustedResult,
    selectedDate: `${earliestDate.toLocaleString()} - ${latestDate.toLocaleString()}`,
    intervalPrices: timeline.prices,
    intervalStart: timeline.startDate,
    intervalMinutes: timeline.intervalMinutes,
    chargingSpeed: input.chargingSpeed,
  };
}

const AppContent: React.FC = () => {
  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Get aggregation settings from context
  const { resolved: priceSettings } = usePriceSettings();

  // Fetch price data using TanStack Query
  const { data: priceData, dataUpdatedAt, isFetching, refresh } = usePricesQuery();

  // Track form input
  const [formInput, setFormInput] = useState<FormInput | null>(null);

  // Calculate results based on current input and price data
  // Aggregation is handled by the API, so we don't need to pass it here
  const calculationResults = useMemo(
    () => calculateResults(formInput, priceData),
    [formInput, priceData]
  );

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
                  result={calculationResults.result}
                  date={calculationResults.selectedDate}
                  intervalPrices={calculationResults.intervalPrices}
                  intervalStart={calculationResults.intervalStart}
                  intervalMinutes={calculationResults.intervalMinutes}
                  chargingSpeed={calculationResults.chargingSpeed}
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
