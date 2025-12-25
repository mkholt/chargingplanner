import React, { useEffect, useRef, useState } from 'react';

import {
  Button,
  Dropdown,
  Input,
  Option,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  Battery024Regular,
  Battery1024Regular,
  BatteryCharge24Regular,
  Flash24Regular,
  Settings20Regular,
  VehicleCarProfileLtr24Regular,
} from '@fluentui/react-icons';

import { CarSelector } from '@/components';
import { BatteryPercentageSlider, TimeWindowSelector } from '@/components/form';
import { LabeledFormField } from '@/components/ui';
import { type Car, useChargingForm } from '@/hooks';
import { CHARGING_POWER_OPTIONS, DEBOUNCE_MS, toDateTimeLocalString } from '@/utils';

type Props = {
  cars: Car[];
  selectedCarId: string | null;
  onSelectCar: (car: Car) => void;
  onSettingsClick: () => void;
  onSubmit: (input: {
    startPercent: number;
    endPercent: number;
    batterySize: number;
    chargingSpeed: number;
    earliest: string; // ISO string
    latest: string;   // ISO string
  }) => void;
};

export const InputForm: React.FC<Props> = ({
  cars,
  selectedCarId,
  onSelectCar,
  onSettingsClick,
  onSubmit,
}) => {
  const { batterySize, chargingSpeed, setBatterySize, setChargingSpeed } = useChargingForm();
  const now = new Date();
  const tomorrow7am = new Date(now);
  tomorrow7am.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  tomorrow7am.setHours(7, 0, 0, 0);

  const [startPercent, setStartPercent] = useState(20);
  const [endPercent, setEndPercent] = useState(80);
  const [earliest, setEarliest] = useState(toDateTimeLocalString(now));
  const [latest, setLatest] = useState(toDateTimeLocalString(tomorrow7am));

  // Handle car selection - update form values via context
  const handleCarSelect = (car: Car) => {
    onSelectCar(car);
    setBatterySize(car.batterySize);
    setChargingSpeed(car.maxPower);
  };

  // Auto-select first car if none selected
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (cars.length > 0 && !selectedCarId && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      const firstCar = cars[0];
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        onSelectCar(firstCar);
        setBatterySize(firstCar.batterySize);
        setChargingSpeed(firstCar.maxPower);
      });
    }
  }, [cars, selectedCarId, onSelectCar, setBatterySize, setChargingSpeed]);

  // Store callback in ref to avoid resetting debounce when callback identity changes
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // Auto-calculate on input change with stable debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSubmitRef.current({ startPercent, endPercent, batterySize, chargingSpeed, earliest, latest });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [startPercent, endPercent, batterySize, chargingSpeed, earliest, latest]);

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
          <Text weight="semibold" size={400} style={{ flex: 1 }}>Charging Settings</Text>
          <Tooltip content="Settings" relationship="label">
            <Button
              appearance="subtle"
              icon={<Settings20Regular />}
              onClick={onSettingsClick}
              aria-label="Settings"
            />
          </Tooltip>
        </div>
        <CarSelector
          cars={cars}
          selectedCarId={selectedCarId}
          onSelect={handleCarSelect}
          onAddCarClick={onSettingsClick}
        />
        <form
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
          onSubmit={e => {
            e.preventDefault();
          }}
        >
          <LabeledFormField icon={<Battery024Regular />} label="Start %">
            <BatteryPercentageSlider
              value={startPercent}
              onChange={(value) => setStartPercent(value)}
            />
          </LabeledFormField>
          <LabeledFormField icon={<Battery1024Regular />} label="End %">
            <BatteryPercentageSlider
              value={endPercent}
              onChange={(value) => setEndPercent(value)}
              snapPoint={80}
            />
          </LabeledFormField>
          <LabeledFormField icon={<VehicleCarProfileLtr24Regular />} label="Battery Size (kWh)">
            <Input
              type="number"
              min={10}
              max={150}
              value={String(batterySize)}
              onChange={(_ev, data) => setBatterySize(Number(data.value))}
              style={{ width: "100%" }}
            />
          </LabeledFormField>
          <LabeledFormField icon={<Flash24Regular />} label="Charging Power">
            <Dropdown
              value={CHARGING_POWER_OPTIONS.find(p => p.value === chargingSpeed)?.label}
              onOptionSelect={(_ev, data) => setChargingSpeed(Number(data.optionValue))}
              style={{ width: "100%" }}
            >
              {CHARGING_POWER_OPTIONS.map(power => (
                <Option key={power.value} value={String(power.value)}>
                  {power.label}
                </Option>
              ))}
            </Dropdown>
          </LabeledFormField>
          <TimeWindowSelector
            earliest={earliest}
            latest={latest}
            onEarliestChange={setEarliest}
            onLatestChange={setLatest}
          />
        </form>
      </div>
    </div>
  );
};
