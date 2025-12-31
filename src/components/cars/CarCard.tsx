import React, { useState } from 'react';

import {
  Button,
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Delete20Regular, Edit20Regular } from '@fluentui/react-icons';

import { type Car, useCars } from '@/contexts';

import { CarForm } from './CarForm';
import type { CarFormState } from './carFormState';

/** Slugify a car name for use in data-testid */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type Props = {
  car: Car;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export const CarCard: React.FC<Props> = ({
  car,
  isSelected,
  onSelect,
  onDelete,
}) => {
  const { updateCar } = useCars();
  const [formState, setFormState] = useState<CarFormState | null>(null);

  const handleStartEdit = () => {
    setFormState({
      name: car.name,
      batterySize: car.batterySize,
      maxPower: car.maxPower,
    });
  };

  const handleSave = () => {
    if (!formState || !formState.name.trim() || formState.batterySize <= 0 || formState.maxPower <= 0) return;
    updateCar(car.id, {
      name: formState.name.trim(),
      batterySize: formState.batterySize,
      maxPower: formState.maxPower,
    });
    setFormState(null);
  };

  if (formState) {
    return (
      <CarForm
        state={formState}
        onChange={setFormState}
        onSave={handleSave}
        onCancel={() => setFormState(null)}
        saveLabel="Save"
      />
    );
  }

  return (
    <Card
      onClick={onSelect}
      data-testid={`car-card-${slugify(car.name)}`}
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
            handleStartEdit();
          }}
          style={{ minWidth: 24, minHeight: 24, padding: 0 }}
          icon={<Edit20Regular />}
          aria-label="Edit car"
          data-testid="edit-car-button"
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
          data-testid="delete-car-button"
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
