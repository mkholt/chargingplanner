import React, { useEffect, useRef, useState } from 'react';

import {
  Dropdown,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Battery024Regular,
  Battery1024Regular,
  BatteryCharge24Regular,
  Flash24Regular,
  VehicleCarProfileLtr24Regular,
} from '@fluentui/react-icons';

import { CarManager, CarSelector } from '@/components';
import { BatteryPercentageSlider, TimeWindowSelector } from '@/components/form';
import { SyncLinkHandler } from '@/components/sync';
import { LabeledFormField } from '@/components/ui';
import { type Car, useCars } from '@/hooks';
import { CHARGING_POWER_OPTIONS, DEBOUNCE_MS, toDateTimeLocalString } from '@/utils';

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

export const InputForm: React.FC<Props> = ({ onSubmit }) => {
  const now = new Date();
  const tomorrow7am = new Date(now);
  tomorrow7am.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  tomorrow7am.setHours(7, 0, 0, 0);

  const [startPercent, setStartPercent] = useState(20);
  const [endPercent, setEndPercent] = useState(80);
  const [batterySize, setBatterySize] = useState(60);
  const [chargingSpeed, setChargingSpeed] = useState(11);
  const [earliest, setEarliest] = useState(toDateTimeLocalString(now));
  const [latest, setLatest] = useState(toDateTimeLocalString(tomorrow7am));
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [carManagerOpen, setCarManagerOpen] = useState(false);

  // Car management
  const { cars, addCar, deleteCar, mergeCars } = useCars();

  // Auto-select first car if none selected
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (cars.length > 0 && !selectedCarId && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      const firstCar = cars[0];
      // Use queueMicrotask to make setState asynchronous (satisfies react-hooks/set-state-in-effect)
      queueMicrotask(() => {
        setSelectedCarId(firstCar.id);
        setBatterySize(firstCar.batterySize);
        setChargingSpeed(firstCar.maxPower);
      });
    }
  }, [cars, selectedCarId]);

  const handleCarSelect = (car: Car) => {
    setSelectedCarId(car.id);
    setBatterySize(car.batterySize);
    setChargingSpeed(car.maxPower);
  };

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
          <Text weight="semibold" size={400}>Charging Settings</Text>
        </div>
        <CarSelector
          cars={cars}
          selectedCarId={selectedCarId}
          onSelect={handleCarSelect}
          onManageClick={() => setCarManagerOpen(true)}
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
      <CarManager
        open={carManagerOpen}
        onOpenChange={setCarManagerOpen}
        cars={cars}
        selectedCarId={selectedCarId}
        onSelect={handleCarSelect}
        onAdd={addCar}
        onDelete={deleteCar}
        onMergeCars={mergeCars}
      />
      <SyncLinkHandler
        existingCars={cars}
        onImport={mergeCars}
      />
    </div>
  );
};
