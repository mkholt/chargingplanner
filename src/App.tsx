import React, { useCallback, useState } from 'react';

import {
  FluentProvider,
  Title3,
  tokens,
  webDarkTheme,
} from '@fluentui/react-components';

import { ErrorBoundary, InputForm, Results } from '@/components';
import {
  buildTimeline,
  findOptimalChargingWindow,
  MS_PER_HOUR,
  type ChargingResult,
} from '@/utils';

const App: React.FC = () => {
  const [result, setResult] = useState<ChargingResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [intervalPrices, setIntervalPrices] = useState<number[]>([]);
  const [intervalStart, setIntervalStart] = useState<Date | null>(null);
  const [chargingSpeed, setChargingSpeed] = useState<number | undefined>(undefined);

  const handleSubmit = useCallback((input: {
    startPercent: number;
    endPercent: number;
    batterySize: number;
    chargingSpeed: number;
    earliest: string;
    latest: string;
  }) => {
    setChargingSpeed(input.chargingSpeed);

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
            <Title3 as="h1" style={{ margin: 0, fontSize: 'clamp(1rem, 4vw, 1.25rem)' }}>
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
              <InputForm onSubmit={handleSubmit} />
            </div>
            <div style={{ flex: '2 1 400px' }}>
              <Results
                result={result}
                date={selectedDate}
                intervalPrices={intervalPrices}
                intervalStart={intervalStart}
                chargingSpeed={chargingSpeed}
              />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </FluentProvider>
  );
};

export default App;
