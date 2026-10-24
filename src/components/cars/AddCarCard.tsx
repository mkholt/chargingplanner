import React, { useState } from 'react';

import { Text, tokens } from '@fluentui/react-components';
import { Add24Regular, VehicleCar24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SelectableCard, Stack } from '@/components/ui';
import { useCars, useSkodaProxy } from '@/contexts';

import { AddSkodaCarForm } from './AddSkodaCarForm';
import { CarForm } from './CarForm';
import { type CarFormState, DEFAULT_CAR_FORM, isCarFormValid } from './carFormState';

type AddCarCardButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
};

const AddCarCardButton: React.FC<AddCarCardButtonProps> = ({ icon, label, onClick, testId }) => (
  <SelectableCard
    variant="add"
    centered
    horizontal
    onClick={onClick}
    data-testid={testId}
    padding={`${tokens.spacingHorizontalS} ${tokens.spacingHorizontalM}`}
    gap={tokens.spacingHorizontalS}
    style={{ flex: 'none' }}
  >
    {icon}
    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
      {label}
    </Text>
  </SelectableCard>
);

/** Add a car by hand, or from a Škoda when the Škoda connection is on */
export const AddCarCard: React.FC = () => {
  const { t } = useTranslation();
  const { addCar, setSelectedCarId } = useCars();
  const { baseUrl } = useSkodaProxy();
  const [formState, setFormState] = useState<CarFormState | null>(null);
  const [addingSkodaCar, setAddingSkodaCar] = useState(false);

  const handleSave = () => {
    if (!formState || !isCarFormValid(formState)) return;
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

  if (addingSkodaCar && baseUrl) return <AddSkodaCarForm onDone={() => setAddingSkodaCar(false)} />;

  const iconStyle = { color: tokens.colorNeutralForeground3 };
  return (
    <Stack gap={tokens.spacingHorizontalS}>
      <AddCarCardButton
        icon={<Add24Regular style={iconStyle} />}
        label={t('cars.addCar')}
        onClick={() => setFormState(DEFAULT_CAR_FORM)}
        testId="add-car-card"
      />
      {baseUrl && (
        <AddCarCardButton
          icon={<VehicleCar24Regular style={iconStyle} />}
          label={t('skoda.addCar.title')}
          onClick={() => setAddingSkodaCar(true)}
          testId="add-skoda-car-card"
        />
      )}
    </Stack>
  );
};
