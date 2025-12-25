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
import { ChargingFormProvider, type Car, useChargingForm, useCars, usePriceSettings } from '@/hooks';
import {
  buildTimeline,
  findOptimalChargingWindow,
  mergeCars as mergeCarData,
  MS_PER_HOUR,
  setAggregationSettings,
  type ChargingResult,
  type MergeResult,
  type SyncData,
} from '@/utils';

// Inner component that uses the charging form context
const AppContent: React.FC = () => {
  const [result, setResult] = useState<ChargingResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [intervalPrices, setIntervalPrices] = useState<number[]>([]);
  const [intervalStart, setIntervalStart] = useState<Date | null>(null);
  const [resultsChargingSpeed, setResultsChargingSpeed] = useState<number | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  // Charging form context - used to sync form when car is edited
  const { syncWithCar } = useChargingForm();

  // Car management
  const { cars, addCar, updateCar: updateCarInStore, deleteCar } = useCars();

  // Wrap updateCar to sync form state when the selected car is edited
  const updateCar = useCallback((id: string, updates: Partial<Omit<Car, 'id'>>) => {
    updateCarInStore(id, updates);
    // If updating the currently selected car, sync form values
    if (id === selectedCarId) {
      const car = cars.find(c => c.id === id);
      if (car) {
        syncWithCar(
          updates.batterySize ?? car.batterySize,
          updates.maxPower ?? car.maxPower
        );
      }
    }
  }, [updateCarInStore, selectedCarId, cars, syncWithCar]);

  // Price settings
  const {
    settings: rawPriceSettings,
    resolved: priceSettings,
    setPostalCode,
    setCompanyId,
    setProductId,
    setAggregationSize,
    setAggregationMethod,
    clearAll: clearPriceSettings,
    applySettings: applyPriceSettings,
  } = usePriceSettings();

  // Sync aggregation settings to the mock prices module
  useEffect(() => {
    setAggregationSettings(
      priceSettings.aggregationSize,
      priceSettings.aggregationMethod
    );
  }, [priceSettings.aggregationSize, priceSettings.aggregationMethod]);

  // Handle car selection
  const handleSelectCar = useCallback((car: Car) => {
    setSelectedCarId(car.id);
  }, []);

  // Handle import from sync
  const handleImport = useCallback((
    data: SyncData,
    selectedCarIndices: number[],
    importSettings: boolean
  ): MergeResult => {
    // Filter cars by selected indices
    const selectedCars = selectedCarIndices.map(i => data.cars[i]);

    // Generate IDs for new cars
    const generateId = () => Math.random().toString(36).slice(2);

    // Merge cars
    const result = mergeCarData(cars, selectedCars, generateId);

    // Add new cars
    result.added.forEach(car => {
      addCar({ name: car.name, batterySize: car.batterySize, maxPower: car.maxPower });
    });

    // Apply settings if requested
    if (importSettings && data.settings) {
      applyPriceSettings(data.settings);
    }

    return result;
  }, [cars, addCar, applyPriceSettings]);

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
                cars={cars}
                selectedCarId={selectedCarId}
                onSelectCar={handleSelectCar}
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
          cars={cars}
          selectedCarId={selectedCarId}
          onSelectCar={handleSelectCar}
          onAddCar={addCar}
          onUpdateCar={updateCar}
          onDeleteCar={deleteCar}
          priceSettings={priceSettings}
          rawPriceSettings={rawPriceSettings}
          onPostalCodeChange={setPostalCode}
          onCompanyChange={setCompanyId}
          onProductChange={setProductId}
          onAggregationSizeChange={setAggregationSize}
          onAggregationMethodChange={setAggregationMethod}
          onClearPriceSettings={clearPriceSettings}
          onApplyPriceSettings={applyPriceSettings}
          onImport={handleImport}
        />
        <SyncLinkHandler
          existingCars={cars}
          onImport={handleImport}
          onApplyPriceSettings={applyPriceSettings}
        />
      </ErrorBoundary>
    </FluentProvider>
  );
};

// Wrap with ChargingFormProvider so context is available
const App: React.FC = () => (
  <ChargingFormProvider>
    <AppContent />
  </ChargingFormProvider>
);

export default App;
