import React, { useState } from 'react';

import {
  Button,
  Dropdown,
  Input,
  Option,
} from '@fluentui/react-components';

import { getAvailableDates } from '../utils/mockPrices';

type Props = {
  onSubmit: (input: {
    startPercent: number;
    endPercent: number;
    batterySize: number;
    chargingSpeed: number;
    date: string;
  }) => void;
};

const chargingSpeeds = [
  { label: "3.7 kW (AC)", value: 3.7 },
  { label: "7.4 kW (AC)", value: 7.4 },
  { label: "11 kW (AC)", value: 11 },
  { label: "22 kW (AC)", value: 22 },
];

export const InputForm: React.FC<Props> = ({ onSubmit }) => {
  const now = new Date();
  const availableDates = getAvailableDates(now);

  const [startPercent, setStartPercent] = useState(20);
  const [endPercent, setEndPercent] = useState(80);
  const [batterySize, setBatterySize] = useState(60);
  const [chargingSpeed, setChargingSpeed] = useState(11);
  const [date, setDate] = useState(availableDates[0]);

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ startPercent, endPercent, batterySize, chargingSpeed, date });
      }}
    >
      <Input
        type="number"
        min={0}
        max={100}
        value={String(startPercent)}
        onChange={(_ev, data) => setStartPercent(Number(data.value))}
        contentBefore="Start %"
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={String(endPercent)}
        onChange={(_ev, data) => setEndPercent(Number(data.value))}
        contentBefore="End %"
      />
      <Input
        type="number"
        min={10}
        max={150}
        value={String(batterySize)}
        onChange={(_ev, data) => setBatterySize(Number(data.value))}
        contentBefore="Battery size (kWh)"
      />
      <Dropdown
        value={chargingSpeeds.find(s => s.value === chargingSpeed)?.label}
        onOptionSelect={(_ev, data) => setChargingSpeed(Number(data.optionValue))}
      >
        {chargingSpeeds.map(speed => (
          <Option key={speed.value} value={String(speed.value)}>
            {speed.label}
          </Option>
        ))}
      </Dropdown>
      <Dropdown
        value={date}
        onOptionSelect={(_ev, data) => setDate(String(data.optionValue))}
      >
        {availableDates.map(d => (
          <Option key={d} value={d}>
            {d}
          </Option>
        ))}
      </Dropdown>
      <Button appearance="primary" type="submit">
        Calculate
      </Button>
    </form>
  );
};
