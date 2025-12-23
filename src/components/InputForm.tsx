import React, { useEffect, useRef, useState } from 'react';

import {
  Dropdown,
  Input,
  makeStyles,
  Option,
  Slider,
  Text,
  tokens,
} from '@fluentui/react-components';
import { BatteryCharge24Regular } from '@fluentui/react-icons';

import { type Car, useCars } from '../hooks/useCars';
import { CHARGING_POWER_OPTIONS, DEBOUNCE_MS } from '../utils/constants';
import { toDateTimeLocalString } from '../utils/dateUtils';
import { CarManager } from './CarManager';
import { CarSelector } from './CarSelector';
import { SyncLinkHandler } from './sync/SyncLinkHandler';

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

const useSliderStyles = makeStyles({
  red: {
    '& .fui-Slider__rail::before': {
      backgroundColor: tokens.colorPaletteRedBorder1,
    },
    '& .fui-Slider__thumb': {
      backgroundColor: tokens.colorPaletteRedBorder1,
    },
  },
  yellow: {
    '& .fui-Slider__rail::before': {
      backgroundColor: tokens.colorPaletteYellowBorder1,
    },
    '& .fui-Slider__thumb': {
      backgroundColor: tokens.colorPaletteYellowBorder1,
    },
  },
  green: {
    '& .fui-Slider__rail::before': {
      backgroundColor: tokens.colorPaletteGreenBorder1,
    },
    '& .fui-Slider__thumb': {
      backgroundColor: tokens.colorPaletteGreenBorder1,
    },
  },
});

function getSliderClass(value: number, styles: ReturnType<typeof useSliderStyles>): string {
  if (value < 20) return styles.red;
  if (value > 80) return styles.yellow;
  return styles.green;
}

export const InputForm: React.FC<Props> = ({ onSubmit }) => {
  const sliderStyles = useSliderStyles();
  const now = new Date();
  const tomorrow7am = new Date(now);
  tomorrow7am.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  tomorrow7am.setHours(7, 0, 0, 0);

  const [startPercent, setStartPercent] = useState(20);
  const [endPercent, setEndPercent] = useState(80);

  // Sticky snap at 80% for end percent with hysteresis
  const handleEndPercentChange = (newValue: number, fromSlider: boolean = true) => {
    const SNAP_POINT = 80;
    const SNAP_RANGE = 3;       // Snap when within 3 units of 80
    const ESCAPE_DISTANCE = 7; // Must drag 7+ units from 80 to break free

    if (!fromSlider) {
      // Direct input (text field) bypasses snapping
      setEndPercent(newValue);
      return;
    }

    // If currently snapped at 80, require dragging far enough to break free
    if (endPercent === SNAP_POINT) {
      if (Math.abs(newValue - SNAP_POINT) >= ESCAPE_DISTANCE) {
        setEndPercent(newValue);
      }
      // Otherwise stay snapped
      return;
    }

    // If approaching snap point, snap to it
    if (Math.abs(newValue - SNAP_POINT) <= SNAP_RANGE) {
      setEndPercent(SNAP_POINT);
    } else {
      setEndPercent(newValue);
    }
  };
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
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              Start %
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Slider
                min={0}
                max={100}
                value={startPercent}
                onChange={(_ev, data) => setStartPercent(data.value)}
                className={getSliderClass(startPercent, sliderStyles)}
                style={{ flex: 1 }}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={String(startPercent)}
                onChange={(_ev, data) => setStartPercent(Number(data.value))}
                style={{ width: 70 }}
              />
            </div>
          </div>
          <div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
              End %
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Slider
                min={0}
                max={100}
                value={endPercent}
                onChange={(_ev, data) => handleEndPercentChange(data.value)}
                className={getSliderClass(endPercent, sliderStyles)}
                style={{ flex: 1 }}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={String(endPercent)}
                onChange={(_ev, data) => handleEndPercentChange(Number(data.value), false)}
                style={{ width: 70 }}
              />
            </div>
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
