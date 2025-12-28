import React, { useState } from 'react';

import {
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';

import { useCars } from '@/contexts';

import { CarForm } from './CarForm';
import { DEFAULT_CAR_FORM, type CarFormState } from './carFormState';

export const AddCarCard: React.FC = () => {
  const { addCar, setSelectedCarId } = useCars();
  const [formState, setFormState] = useState<CarFormState | null>(null);

  const handleSave = () => {
    if (!formState || !formState.name.trim() || formState.batterySize <= 0 || formState.maxPower <= 0) return;
    const newCar = addCar({
      name: formState.name.trim(),
      batterySize: formState.batterySize,
      maxPower: formState.maxPower,
    });
    setSelectedCarId(newCar.id);
    setFormState(null);
  };

  if (formState) {
    return (
      <CarForm
        state={formState}
        onChange={setFormState}
        onSave={handleSave}
        onCancel={() => setFormState(null)}
        saveLabel="Add car"
        autoFocus
      />
    );
  }

  return (
    <Card
      onClick={() => setFormState(DEFAULT_CAR_FORM)}
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
