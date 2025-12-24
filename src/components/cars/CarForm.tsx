import React, { useState } from 'react';

import {
  Button,
  Combobox,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';

import type { Car } from '@/hooks';
import { CHARGING_POWER_OPTIONS } from '@/utils';

type Props = {
  car?: Car;
  onSave: (car: Omit<Car, 'id'>) => void;
  onCancel: () => void;
};

export const CarForm: React.FC<Props> = ({ car, onSave, onCancel }) => {
  const [name, setName] = useState(car?.name ?? '');
  const [batterySize, setBatterySize] = useState<number>(car?.batterySize ?? 60);
  const [maxPower, setMaxPower] = useState<number>(car?.maxPower ?? 11);

  const isEditing = !!car;

  const handleSave = () => {
    if (!name.trim() || batterySize <= 0 || maxPower <= 0) return;
    onSave({
      name: name.trim(),
      batterySize,
      maxPower,
    });
  };

  return (
    <div
      style={{
        background: tokens.colorNeutralBackground3,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <Text weight="semibold" size={300} style={{ marginBottom: 12, display: 'block' }}>
        {isEditing ? 'Edit Car' : 'Add New Car'}
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: 'block' }}>
            Car Name
          </Text>
          <Input
            placeholder="e.g. My Tesla Model 3"
            value={name}
            onChange={(_e, d) => setName(d.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: 'block' }}>
            Battery Size (kWh)
          </Text>
          <Input
            type="number"
            min={10}
            max={150}
            value={String(batterySize)}
            onChange={(_e, d) => setBatterySize(Number(d.value))}
            placeholder="e.g. 60"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: 4, display: 'block' }}>
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
            style={{ width: '100%' }}
          >
            {CHARGING_POWER_OPTIONS.map((opt) => (
              <Option key={opt.value} value={String(opt.value)}>
                {opt.label}
              </Option>
            ))}
          </Combobox>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button appearance="primary" onClick={handleSave}>
            {isEditing ? 'Save' : 'Add Car'}
          </Button>
          <Button appearance="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
