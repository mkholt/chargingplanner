import React, { useState } from 'react';

import { Text, tokens } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SelectableCard } from '@/components/ui';
import { useCars } from '@/contexts';

import { CarForm } from './CarForm';
import { DEFAULT_CAR_FORM, type CarFormState } from './carFormState';

export const AddCarCard: React.FC = () => {
  const { t } = useTranslation();
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
        saveLabel={t('cars.addCar')}
        autoFocus
      />
    );
  }

  return (
    <SelectableCard
      variant="add"
      centered
      onClick={() => setFormState(DEFAULT_CAR_FORM)}
      data-testid="add-car-card"
      style={{ minHeight: 72 }}
    >
      <Add24Regular style={{ color: tokens.colorNeutralForeground3 }} />
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        {t('cars.addCar')}
      </Text>
    </SelectableCard>
  );
};
