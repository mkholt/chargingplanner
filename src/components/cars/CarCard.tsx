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
import { Checkmark20Regular, Delete20Regular, Dismiss20Regular, Edit20Regular } from '@fluentui/react-icons';

import type { Car } from '@/contexts';
import { CHARGING_POWER_OPTIONS } from '@/utils';

type Props = {
  car: Car;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (updates: Omit<Car, 'id'>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
};

export const CarCard: React.FC<Props> = ({
  car,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
}) => {
  const [name, setName] = useState(car.name);
  const [batterySize, setBatterySize] = useState(car.batterySize);
  const [maxPower, setMaxPower] = useState(car.maxPower);

  // Reset form when entering edit mode
  const handleEdit = () => {
    setName(car.name);
    setBatterySize(car.batterySize);
    setMaxPower(car.maxPower);
    onEdit();
  };

  const handleSave = () => {
    if (!name.trim() || batterySize <= 0 || maxPower <= 0) return;
    onSave({ name: name.trim(), batterySize, maxPower });
  };

  const handleCancel = () => {
    setName(car.name);
    setBatterySize(car.batterySize);
    setMaxPower(car.maxPower);
    onCancelEdit();
  };

  if (isEditing) {
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
            aria-label="Save"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card
      onClick={onSelect}
      style={{
        flex: '1 1 200px',
        maxWidth: '100%',
        background: isSelected ? tokens.colorBrandBackground2 : tokens.colorNeutralBackground3,
        border: isSelected
          ? `2px solid ${tokens.colorBrandStroke1}`
          : `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2 }}>
        <Button
          size="small"
          appearance="subtle"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
          style={{ minWidth: 24, minHeight: 24, padding: 0 }}
          icon={<Edit20Regular />}
          aria-label="Edit car"
        />
        <Button
          size="small"
          appearance="subtle"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ minWidth: 24, minHeight: 24, padding: 0 }}
          icon={<Delete20Regular />}
          aria-label="Delete car"
        />
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, color: tokens.colorNeutralForeground1, paddingRight: 50 }}>
        {car.name}
      </div>
      <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
        {car.batterySize} kWh • {car.maxPower} kW
      </Text>
    </Card>
  );
};
