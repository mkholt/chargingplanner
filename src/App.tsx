import React, { useCallback, useState } from 'react';

import {
  FluentProvider,
  Title3,
  tokens,
  webDarkTheme,
} from '@fluentui/react-components';

import { ErrorBoundary } from './components/ErrorBoundary';
import { InputForm } from './components/InputForm';
import { Results } from './components/Results';
import type { ChargingResult } from './utils/chargingCalculator';
import { findOptimalChargingWindow } from './utils/chargingCalculator';
import { getPricesForDate } from './utils/mockPrices';

function getLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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
    // Assume mockPrices covers today and tomorrow, each with 24 hours
    // Find the earliest and latest as Date objects
    const earliestDate = new Date(input.earliest);
    const latestDate = new Date(input.latest);

    // Get all price data for the relevant days
    const allPrices: { date: string; hours: number[] }[] = [];
    for (const p of [getPricesForDate(getLocalDateString(earliestDate)), getPricesForDate(getLocalDateString(latestDate))]) {
      if (p) allPrices.push({ date: '', hours: p });
    }
    if (allPrices.length === 0) {
      setResult(null);
      setSelectedDate('');
      return;
    }

    // Calculate the number of hours in the interval (local time)
    const msPerHour = 60 * 60 * 1000;
    // Add 1 to include the last hour (end time is inclusive)
    const intervalHours = Math.floor((latestDate.getTime() - earliestDate.getTime()) / msPerHour) + 1;
    if (intervalHours <= 0) {
      setResult(null);
      setSelectedDate('');
      setIntervalPrices([]);
      setIntervalStart(null);
      return;
    }
    // Set interval start date
    const intervalStartDate = new Date(earliestDate);
    intervalStartDate.setMinutes(0, 0, 0);

    // For timeline: show all prices from "now" to the end of available price data
    const now = new Date();
    const timelineStartDate = new Date(now);
    timelineStartDate.setMinutes(0, 0, 0);

    // Find the first available price hour >= now
    let timelinePrices: number[] = [];
    let timelineStart: Date | null = null;
    let timelineAllPrices: number[] = [];
    let timelineAllStart: Date | null = null;

    // Gather all future prices from now to the end of available data
    const today = getLocalDateString(now);
    const tomorrowDate = new Date(now.getTime() + 86400000);
    const tomorrow = getLocalDateString(tomorrowDate);
    const todayPrices = getPricesForDate(today) || [];
    const tomorrowPrices = getPricesForDate(tomorrow) || [];
    timelineAllPrices = [...todayPrices, ...tomorrowPrices];
    timelineAllStart = new Date(now);
    timelineAllStart.setHours(0, 0, 0, 0);

    // Find the index in timelineAllPrices that matches the current hour
    const nowHourIdx =
      (now.getDate() - timelineAllStart.getDate()) * 24 + now.getHours();
    timelinePrices = timelineAllPrices.slice(nowHourIdx);
    timelineStart = new Date(timelineAllStart);
    timelineStart.setHours(timelineStart.getHours() + nowHourIdx, 0, 0, 0);

    setIntervalPrices(timelinePrices);
    setIntervalStart(timelineStart);

    // Calculate the charging window relative to the timeline
    // Find the index of the charging interval's start in the timeline
    const chargingStartIdx =
      Math.max(
        Math.floor((earliestDate.getTime() - timelineStart.getTime()) / (60 * 60 * 1000)),
        0
      );
    const chargingEndIdx =
      Math.max(
        Math.floor((latestDate.getTime() - timelineStart.getTime()) / (60 * 60 * 1000)) + 1,
        chargingStartIdx
      );

    // Only pass the prices for the charging interval to the optimizer
    const chargingIntervalPrices = timelinePrices.slice(
      chargingStartIdx,
      chargingEndIdx
    );

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
          startHour: calcResult.startHour + chargingStartIdx,
          endHour: calcResult.endHour + chargingStartIdx,
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
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 24px 32px', gap: 16 }}>
            <img
              src="/ev-charging-logo.svg"
              alt="EV Charging Logo"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: tokens.colorNeutralBackground2
              }}
            />
            <Title3 as="h1" style={{ margin: 0 }}>
              EV Charging Optimizer
            </Title3>
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              gap: 32,
              width: '100%',
              alignItems: 'flex-start',
              padding: '0 32px 32px 32px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flex: 1, maxWidth: 420 }}>
              <InputForm onSubmit={handleSubmit} />
            </div>
            <div style={{ flex: 2 }}>
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
