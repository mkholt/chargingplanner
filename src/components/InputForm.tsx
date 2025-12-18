import React, { useState } from 'react';

import {
  Dropdown,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import { BatteryCharge24Regular } from '@fluentui/react-icons';

import {
  type Car,
  CarManager,
} from './CarManager';

type Props = {
  onSubmit: (input: {
    startPercent: number;
    endPercent: number;
    batterySize: number;
    chargingSpeed: number;
    earliest: string; // ISO string
    latest: string;   // ISO string
  }) => void;
};

const chargingPowers = [
  { label: "2.3 kW (Level 1)", value: 2.3 },
  { label: "3.7 kW (1-phase)", value: 3.7 },
  { label: "7.4 kW (1-phase)", value: 7.4 },
  { label: "11 kW (3-phase)", value: 11 },
  { label: "22 kW (3-phase)", value: 22 },
];

export const InputForm: React.FC<Props> = ({ onSubmit }) => {
  const now = new Date();
  const tomorrow7am = new Date(now);
  tomorrow7am.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  tomorrow7am.setHours(7, 0, 0, 0);

  const [startPercent, setStartPercent] = useState(20);
  const [endPercent, setEndPercent] = useState(80);
  const [batterySize, setBatterySize] = useState(60);
  const [chargingSpeed, setChargingSpeed] = useState(11);
  const [earliest, setEarliest] = useState(now.toISOString().slice(0, 16));
  const [latest, setLatest] = useState(tomorrow7am.toISOString().slice(0, 16));
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  // Auto-calculate on input change with debounce
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onSubmit({ startPercent, endPercent, batterySize, chargingSpeed, earliest, latest });
    }, 300);
    return () => clearTimeout(timeout);
  }, [onSubmit, startPercent, endPercent, batterySize, chargingSpeed, earliest, latest]);

  return (
    <div>
      <div
        style={{
          background: tokens.colorNeutralBackground2,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${tokens.colorNeutralStroke1}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <BatteryCharge24Regular />
          <Text weight="semibold" size={400}>Charging Settings</Text>
        </div>
        <form
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
          onSubmit={e => {
            e.preventDefault();
          }}
        >
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              Start %
            </Text>
            <Input
              type="number"
              min={0}
              max={100}
              value={String(startPercent)}
              onChange={(_ev, data) => setStartPercent(Number(data.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              End %
            </Text>
            <Input
              type="number"
              min={0}
              max={100}
              value={String(endPercent)}
              onChange={(_ev, data) => setEndPercent(Number(data.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              Battery Size (kWh)
            </Text>
            <Input
              type="number"
              min={10}
              max={150}
              value={String(batterySize)}
              onChange={(_ev, data) => setBatterySize(Number(data.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              Charging Power
            </Text>
            <Dropdown
              value={chargingPowers.find(p => p.value === chargingSpeed)?.label}
              onOptionSelect={(_ev, data) => setChargingSpeed(Number(data.optionValue))}
              style={{ width: "100%" }}
            >
              {chargingPowers.map(power => (
                <Option key={power.value} value={String(power.value)}>
                  {power.label}
                </Option>
              ))}
            </Dropdown>
          </div>
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              Earliest Start
            </Text>
            <Input
              type="datetime-local"
              value={earliest}
              onChange={(_ev, data) => setEarliest(data.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              Latest End
            </Text>
            <Input
              type="datetime-local"
              value={latest}
              onChange={(_ev, data) => setLatest(data.value)}
              style={{ width: "100%" }}
            />
          </div>
        </form>
      <CarManager
        selectedCarId={selectedCarId}
        onSelect={(car: Car) => {
          setSelectedCarId(car.id);
          setBatterySize(car.batterySize);
          setChargingSpeed(car.maxPower);
        }}
      />
      </div>
    </div>
  );
};
