import React, { useCallback, useEffect, useState } from 'react';

import {
  FluentProvider,
  Title3,
  tokens,
  webDarkTheme,
} from '@fluentui/react-components';

import { ErrorBoundary, InputForm, Results } from '@/components';
import { SettingsDialog } from '@/components/settings';
import { SyncLinkHandler } from '@/components/sync';
import {
  CarsProvider,
  ChargingFormProvider,
  PriceSettingsProvider,
  usePriceSettings,
} from '@/contexts';
import {
  buildTimeline,
  findOptimalChargingWindow,
  MS_PER_HOUR,
  setAggregationSettings,
  type ChargingResult,
} from '@/utils';

const AppContent: React.FC = () => {
  // Calculation results state
  const [result, setResult] = useState<ChargingResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [intervalPrices, setIntervalPrices] = useState<number[]>([]);
  const [intervalStart, setIntervalStart] = useState<Date | null>(null);
  const [resultsChargingSpeed, setResultsChargingSpeed] = useState<number | undefined>(undefined);

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Get aggregation settings from context to sync with mock prices module
  const { resolved: priceSettings } = usePriceSettings();

  useEffect(() => {
    setAggregationSettings(
      priceSettings.aggregationSize,
      priceSettings.aggregationMethod
    );
  }, [priceSettings.aggregationSize, priceSettings.aggregationMethod]);

  const handleSubmit = useCallback((input: {
    startPercent: number;
    endPercent: number;
    batterySize: number;
    chargingSpeed: number;
    earliest: string;
    latest: string;
  }) => {
    setResultsChargingSpeed(input.chargingSpeed);

    const earliestDate = new Date(input.earliest);
    const latestDate = new Date(input.latest);

    // Validate interval duration
    const intervalHours = Math.floor((latestDate.getTime() - earliestDate.getTime()) / MS_PER_HOUR) + 1;
    if (intervalHours <= 0) {
      setResult(null);
      setSelectedDate('');
      setIntervalPrices([]);
      setIntervalStart(null);
      return;
    }

    // Build timeline of prices from now to end of available data
    const timeline = buildTimeline(earliestDate, latestDate);
    if (!timeline) {
      setResult(null);
      setSelectedDate('');
      setIntervalPrices([]);
      setIntervalStart(null);
      return;
    }

    setIntervalPrices(timeline.prices);
    setIntervalStart(timeline.startDate);

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
    });

    // Adjust result indices to be relative to the full timeline
    const adjustedResult = calcResult
      ? {
          ...calcResult,
          startHour: calcResult.startHour + timeline.chargingStartIdx,
          endHour: calcResult.endHour + timeline.chargingStartIdx,
        }
      : null;

    setResult(adjustedResult);
    setSelectedDate(
      `${earliestDate.toLocaleString()} - ${latestDate.toLocaleString()}`
    );
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
              EV Charging Optimizer
            </Title3>
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
              <Results
                result={result}
                date={selectedDate}
                intervalPrices={intervalPrices}
                intervalStart={intervalStart}
                chargingSpeed={resultsChargingSpeed}
              />
            </div>
          </div>
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
      <ChargingFormProvider>
        <AppContent />
      </ChargingFormProvider>
    </PriceSettingsProvider>
  </CarsProvider>
);

export default App;
