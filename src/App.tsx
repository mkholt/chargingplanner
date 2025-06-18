import React, { useState } from 'react';

import {
  FluentProvider,
  Title3,
  webLightTheme,
} from '@fluentui/react-components';

import { InputForm } from './components/InputForm';
import { Results } from './components/Results';
import type {
  ChargingInput,
  ChargingResult,
} from './utils/chargingCalculator';
import { findOptimalChargingWindow } from './utils/chargingCalculator';
import { getPricesForDate } from './utils/mockPrices';

const App: React.FC = () => {
  const [result, setResult] = useState<ChargingResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleSubmit = (input: Omit<ChargingInput, 'prices'> & { date: string }) => {
    const prices = getPricesForDate(input.date);
    setSelectedDate(input.date);
    if (!prices) {
      setResult(null);
      return;
    }
    const calcResult = findOptimalChargingWindow({
      ...input,
      prices,
    });
    setResult(calcResult);
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ padding: 32, minHeight: '100vh', background: '#f6f8fa' }}>
        <Title3 as="h1" style={{ marginBottom: 24 }}>
          EV Charging Optimizer
        </Title3>
        <InputForm onSubmit={handleSubmit} />
        <div style={{ marginTop: 32 }}>
          <Results result={result} date={selectedDate} />
        </div>
      </div>
    </FluentProvider>
  );
};

export default App;
