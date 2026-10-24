import React, { useState } from 'react';

import { Button, Card, Text, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { getSkodaErrorMessage, isSkodaKeyComplete, SkodaKeyFields, type SkodaKeyValues } from '@/components/skoda';
import { Stack } from '@/components/ui';
import { useCars } from '@/contexts';
import { type SkodaLookup, useAsyncAction, useSkodaLink } from '@/hooks';

import { CarForm } from './CarForm';
import { type CarFormState, DEFAULT_CAR_FORM, isCarFormValid } from './carFormState';

const cardStyle: React.CSSProperties = {
  background: tokens.colorNeutralBackground3,
  border: `2px solid ${tokens.colorBrandStroke1}`,
  borderRadius: tokens.borderRadiusLarge,
  padding: tokens.spacingHorizontalL,
};

/**
 * Add a car from its VIN and Škoda API key: the key is exchanged for a token, the car's name is read with it,
 * and the user completes the rest. Battery size and charging power aren't available from Škoda.
 */
export const AddSkodaCarForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useTranslation();
  const { setSelectedCarId } = useCars();
  const { lookUp, addLinkedCar, requiresPassword } = useSkodaLink();
  const [values, setValues] = useState<SkodaKeyValues>({ vin: '', apiKey: '', password: '' });
  const [lookup, setLookup] = useState<SkodaLookup | null>(null);
  const [formState, setFormState] = useState<CarFormState>(DEFAULT_CAR_FORM);
  const { run, pending, error } = useAsyncAction();

  const errorText = error !== null && (
    <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid="skoda-link-error">
      {getSkodaErrorMessage(error, t)}
    </Text>
  );

  const handleLookUp = () => {
    const { vin, apiKey, password } = values;
    // The key is only needed for this one request, so it doesn't stay in the form
    setValues(prev => ({ ...prev, apiKey: '' }));
    void run(async () => {
      const result = await lookUp(vin, apiKey.trim(), password);
      setLookup(result);
      setFormState({ ...DEFAULT_CAR_FORM, name: result.vehicle.name ?? '' });
    });
  };

  const handleSave = () => {
    if (!lookup || !isCarFormValid(formState)) return;
    void run(async () => {
      const car = await addLinkedCar({ ...formState, name: formState.name.trim() }, lookup, values.password);
      setSelectedCarId(car.id);
      onDone();
    });
  };

  if (lookup) {
    return (
      <CarForm
        state={formState}
        onChange={setFormState}
        onSave={handleSave}
        onCancel={onDone}
        saveLabel={t('cars.addCar')}
        autoFocus
      >
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} data-testid="add-skoda-car-check-details">
          {t('skoda.addCar.checkDetails', { vin: lookup.issued.vin })}
        </Text>
        {errorText}
      </CarForm>
    );
  }

  return (
    <Card style={cardStyle} data-testid="add-skoda-car-form">
      <form onSubmit={e => { e.preventDefault(); handleLookUp(); }}>
        <Stack gap={tokens.spacingHorizontalM}>
          <Text weight="semibold">{t('skoda.addCar.title')}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{t('skoda.addCar.description')}</Text>
          <SkodaKeyFields values={values} onChange={setValues} requiresPassword={requiresPassword} />
          {errorText}
          <Stack horizontal gap={tokens.spacingHorizontalS} justify="flex-end">
            <Button appearance="subtle" onClick={onDone}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              appearance="primary"
              disabled={!isSkodaKeyComplete(values, requiresPassword) || pending}
              data-testid="add-skoda-car-lookup-button"
            >
              {t('skoda.addCar.lookUp')}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Card>
  );
};
