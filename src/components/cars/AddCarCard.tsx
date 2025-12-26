import React, { useState } from 'react';

import {
  Button,
  Card,
  Combobox,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add24Regular, Checkmark20Regular, Dismiss20Regular } from '@fluentui/react-icons';

import type { Car } from '@/contexts';
import { CHARGING_POWER_OPTIONS } from '@/utils';

type Props = {
  isAdding: boolean;
  onStartAdd: () => void;
  onAdd: (car: Omit<Car, 'id'>) => void;
  onCancel: () => void;
};

export const AddCarCard: React.FC<Props> = ({
  isAdding,
  onStartAdd,
  onAdd,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [batterySize, setBatterySize] = useState(60);
  const [maxPower, setMaxPower] = useState(11);

  const handleSave = () => {
    if (!name.trim() || batterySize <= 0 || maxPower <= 0) return;
    onAdd({ name: name.trim(), batterySize, maxPower });
    // Reset form
    setName('');
    setBatterySize(60);
    setMaxPower(11);
  };

  const handleCancel = () => {
    setName('');
    setBatterySize(60);
    setMaxPower(11);
    onCancel();
  };

  if (isAdding) {
    return (
      <Card
        style={{
          flex: '1 1 200px',
          maxWidth: '100%',
          background: tokens.colorNeutralBackground3,
          border: `2px solid ${tokens.colorBrandStroke1}`,
          borderRadius: 10,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Input
          placeholder="Car name"
          value={name}
          onChange={(_e, d) => setName(d.value)}
          style={{ width: '100%' }}
          size="small"
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            type="number"
            min={10}
            max={200}
            value={String(batterySize)}
            onChange={(_e, d) => setBatterySize(Number(d.value))}
            style={{ flex: 1, minWidth: 0 }}
            size="small"
            contentAfter={<Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>kWh</Text>}
          />
          <Combobox
            freeform
            value={`${maxPower} kW`}
            onOptionSelect={(_e, data) => {
              if (data.optionValue) setMaxPower(Number(data.optionValue));
            }}
            onChange={(e) => {
              const val = Number(e.target.value.replace(/[^0-9.]/g, ''));
              if (!isNaN(val) && val > 0) setMaxPower(val);
            }}
            style={{ flex: 1, minWidth: 0 }}
            size="small"
          >
            {CHARGING_POWER_OPTIONS.map((opt) => (
              <Option key={opt.value} value={String(opt.value)}>
                {opt.label}
              </Option>
            ))}
          </Combobox>
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            appearance="subtle"
            icon={<Dismiss20Regular />}
            onClick={handleCancel}
            aria-label="Cancel"
          />
          <Button
            size="small"
            appearance="primary"
            icon={<Checkmark20Regular />}
            onClick={handleSave}
            aria-label="Add car"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card
      onClick={onStartAdd}
      style={{
        flex: '1 1 200px',
        maxWidth: '100%',
        background: 'transparent',
        border: `2px dashed ${tokens.colorNeutralStroke1}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        minHeight: 72,
      }}
    >
      <Add24Regular style={{ color: tokens.colorNeutralForeground3 }} />
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Add Car
      </Text>
    </Card>
  );
};
