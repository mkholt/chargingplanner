import React, { useState } from 'react';

import {
  Button,
  Card,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Input,
  Option,
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
  maxPower: number;
};

const LS_KEY = "ev-cars";

const powerOptions = [
  { label: "2.3 kW (Level 1)", value: 2.3 },
  { label: "3.7 kW (1-phase)", value: 3.7 },
  { label: "7.4 kW (1-phase)", value: 7.4 },
  { label: "11 kW (3-phase)", value: 11 },
  { label: "22 kW (3-phase)", value: 22 },
];

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
  const [maxPower, setMaxPower] = useState<number>(11);
  const [showAdd, setShowAdd] = useState(false);

  // Auto-select first car if none selected
  React.useEffect(() => {
    if (cars.length > 0 && !selectedCarId) {
      onSelect(cars[0]);
    }
  }, [cars, selectedCarId, onSelect]);

  function handleAdd() {
    if (!name.trim() || batterySize <= 0 || maxPower <= 0) return;
    const newCar: Car = {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      batterySize,
      maxPower,
    };
    const updated = [...cars, newCar];
    setCars(updated);
    saveCars(updated);
    setName("");
    setBatterySize(60);
    setMaxPower(11);
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
        {cars.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "24px 16px",
              width: "100%",
              color: tokens.colorNeutralForeground3,
            }}
          >
            <Text size={300}>No saved cars yet. Save your car's specs for quick access.</Text>
            <Button
              appearance="primary"
              icon={<Add24Regular />}
              onClick={() => setShowAdd(true)}
            >
              Add Your Car
            </Button>
          </div>
        )}
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
              Max Power: <b>{car.maxPower} kW</b>
            </div>
            </Card>
          );
        })}
      </div>
      <Dialog open={showAdd} onOpenChange={(_e, data) => setShowAdd(data.open)}>
        <DialogSurface>
          <form onSubmit={e => {
            e.preventDefault();
            handleAdd();
            setShowAdd(false);
          }}>
            <DialogBody>
              <DialogTitle>Add New Car</DialogTitle>
              <DialogContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
                      Car Name
                    </Text>
                    <Input
                      placeholder="e.g. My Tesla Model 3"
                      value={name}
                      onChange={(_e, d) => setName(d.value)}
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
                      onChange={(_e, d) => setBatterySize(Number(d.value))}
                      placeholder="e.g. 60"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: "block" }}>
                      Max Power (kW)
                    </Text>
                    <Combobox
                      freeform
                      placeholder="Select or type power"
                      value={String(maxPower)}
                      onOptionSelect={(_e, data) => {
                        if (data.optionValue) {
                          setMaxPower(Number(data.optionValue));
                        }
                      }}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setMaxPower(val);
                        }
                      }}
                      style={{ width: "100%" }}
                    >
                      {powerOptions.map((opt) => (
                        <Option key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </Option>
                      ))}
                    </Combobox>
                  </div>
                </div>
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button type="submit" appearance="primary">Add Car</Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
