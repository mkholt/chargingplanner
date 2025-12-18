import React, { useState } from 'react';

import {
  Button,
  Card,
  Input,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Delete24Regular,
  VehicleCar24Regular,
} from '@fluentui/react-icons';

export type Car = {
  id: string;
  name: string;
  batterySize: number;
  chargingSpeed: number;
};

const LS_KEY = "ev-cars";

function loadCars(): Car[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCars(cars: Car[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(cars));
}

type Props = {
  onSelect: (car: Car) => void;
  selectedCarId?: string | null;
};

export const CarManager: React.FC<Props> = ({ onSelect, selectedCarId }) => {
  const [cars, setCars] = useState<Car[]>(() => loadCars());
  const [name, setName] = useState("");
  const [batterySize, setBatterySize] = useState<number>(60);
  const [chargingSpeed, setChargingSpeed] = useState<number>(11);
  const [showAdd, setShowAdd] = useState(false);

  function handleAdd() {
    if (!name.trim() || batterySize <= 0 || chargingSpeed <= 0) return;
    const newCar: Car = {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      batterySize,
      chargingSpeed,
    };
    const updated = [...cars, newCar];
    setCars(updated);
    saveCars(updated);
    setName("");
    setBatterySize(60);
    setChargingSpeed(11);
  }

  function handleDelete(id: string) {
    const updated = cars.filter((c) => c.id !== id);
    setCars(updated);
    saveCars(updated);
  }

  return (
    <div style={{ marginTop: 32, background: tokens.colorNeutralBackground2, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <VehicleCar24Regular />
        <Text weight="semibold" size={400}>Saved Cars</Text>
        <Button
          appearance="subtle"
          size="small"
          icon={<Add24Regular />}
          onClick={() => setShowAdd((v) => !v)}
          aria-label="Add new car"
          style={{ marginLeft: 4 }}
        />
      </div>
      <div style={{ margin: "12px 0", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cars.map((car) => {
          const isSelected = selectedCarId === car.id;
          return (
            <Card
              key={car.id}
              onClick={() => onSelect(car)}
              style={{
                minWidth: 220,
                maxWidth: 260,
                background: isSelected ? tokens.colorBrandBackground2 : tokens.colorNeutralBackground3,
                border: isSelected
                  ? `2px solid ${tokens.colorBrandStroke1}`
                  : `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: tokens.shadow2,
                cursor: "pointer",
                position: "relative",
                transition: "border 0.2s, background 0.2s",
              }}
            >
              <Button
                size="small"
                appearance="subtle"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete(car.id);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  minWidth: 24,
                  minHeight: 24,
                  padding: 0,
                  zIndex: 2,
                }}
                icon={<Delete24Regular />}
                aria-label="Delete car"
              />
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 2, color: tokens.colorNeutralForeground1 }}>
              {car.name}
            </div>
            <div style={{ fontSize: 14, color: tokens.colorNeutralForeground2 }}>
              Battery: <b>{car.batterySize} kWh</b>
            </div>
            <div style={{ fontSize: 14, color: tokens.colorNeutralForeground2 }}>
              Max speed: <b>{car.chargingSpeed} kW</b>
            </div>
            </Card>
          );
        })}
      </div>
      {showAdd && (
        <form
          style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}
          onSubmit={e => {
            e.preventDefault();
            handleAdd();
            setShowAdd(false);
          }}
        >
          <Input
            placeholder="Car name"
            value={name}
            onChange={(_e, d) => setName(d.value)}
            style={{ minWidth: 120 }}
          />
          <Input
            type="number"
            min={10}
            max={150}
            value={String(batterySize)}
            onChange={(_e, d) => setBatterySize(Number(d.value))}
            contentBefore="Battery (kWh)"
            style={{ width: 120 }}
          />
          <Input
            type="number"
            min={1}
            max={350}
            value={String(chargingSpeed)}
            onChange={(_e, d) => setChargingSpeed(Number(d.value))}
            contentBefore="Max kW"
            style={{ width: 100 }}
          />
          <Button type="submit" appearance="primary">Add Car</Button>
          <Button type="button" appearance="subtle" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
};
