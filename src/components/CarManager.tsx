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
} from '@fluentui/react-icons';

import type { Car, MergeResult } from '../hooks/useCars';
import { CHARGING_POWER_OPTIONS } from '../utils/constants';
import { SyncPanel } from './sync/SyncPanel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cars: Car[];
  selectedCarId: string | null;
  onSelect: (car: Car) => void;
  onAdd: (car: Omit<Car, 'id'>) => void;
  onDelete: (id: string) => void;
  onMergeCars: (cars: Omit<Car, 'id'>[]) => MergeResult;
};

export const CarManager: React.FC<Props> = ({
  open,
  onOpenChange,
  cars,
  selectedCarId,
  onSelect,
  onAdd,
  onDelete,
  onMergeCars,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [batterySize, setBatterySize] = useState<number>(60);
  const [maxPower, setMaxPower] = useState<number>(11);

  function handleAdd() {
    if (!name.trim() || batterySize <= 0 || maxPower <= 0) return;
    onAdd({
      name: name.trim(),
      batterySize,
      maxPower,
    });
    setName("");
    setBatterySize(60);
    setMaxPower(11);
    setShowAddForm(false);
  }

  function handleDelete(id: string) {
    onDelete(id);
  }

  return (
    <Dialog open={open} onOpenChange={(_e, data) => onOpenChange(data.open)}>
      <DialogSurface style={{ maxWidth: 500 }}>
        <DialogBody>
          <DialogTitle>Manage Cars</DialogTitle>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Car list */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {cars.length === 0 && !showAddForm && (
                  <div
                    style={{
                      padding: "24px 16px",
                      width: "100%",
                      textAlign: "center",
                      color: tokens.colorNeutralForeground3,
                    }}
                  >
                    <Text size={300}>No saved cars yet.</Text>
                  </div>
                )}
                {cars.map((car) => {
                  const isSelected = selectedCarId === car.id;
                  return (
                    <Card
                      key={car.id}
                      onClick={() => {
                        onSelect(car);
                        onOpenChange(false);
                      }}
                      style={{
                        flex: "1 1 200px",
                        maxWidth: "100%",
                        background: isSelected ? tokens.colorBrandBackground2 : tokens.colorNeutralBackground3,
                        border: isSelected
                          ? `2px solid ${tokens.colorBrandStroke1}`
                          : `1px solid ${tokens.colorNeutralStroke1}`,
                        borderRadius: 10,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        cursor: "pointer",
                        position: "relative",
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
                        }}
                        icon={<Delete24Regular />}
                        aria-label="Delete car"
                      />
                      <div style={{ fontWeight: 600, fontSize: 15, color: tokens.colorNeutralForeground1 }}>
                        {car.name}
                      </div>
                      <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                        {car.batterySize} kWh • {car.maxPower} kW
                      </Text>
                    </Card>
                  );
                })}
              </div>

              {/* Add car form */}
              {showAddForm ? (
                <div
                  style={{
                    background: tokens.colorNeutralBackground3,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <Text weight="semibold" size={300} style={{ marginBottom: 12, display: "block" }}>
                    Add New Car
                  </Text>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                        {CHARGING_POWER_OPTIONS.map((opt) => (
                          <Option key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </Option>
                        ))}
                      </Combobox>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <Button appearance="primary" onClick={handleAdd}>
                        Add Car
                      </Button>
                      <Button appearance="secondary" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  appearance="subtle"
                  icon={<Add24Regular />}
                  onClick={() => setShowAddForm(true)}
                  style={{ alignSelf: "flex-start" }}
                >
                  Add Car
                </Button>
              )}

              {/* Sync panel */}
              <SyncPanel cars={cars} onImport={onMergeCars} />
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
