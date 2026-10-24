import React, { useState } from 'react';

import { Card, Text, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import {
  getSkodaErrorMessage,
  isSkodaKeyComplete,
  SkodaKeyFields,
  type SkodaKeyValues,
  SkodaVaultGate,
} from '@/components/skoda';
import { ErrorText, FormActions, Stack } from '@/components/ui';
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

type Props = { onDone: () => void };

/**
 * Add a car from its VIN and Škoda API key: the key is exchanged for a token, the car's name is read with it,
 * and the user completes the rest. Battery size and charging power aren't available from Škoda.
 * With password protection on, the vault must be unlocked; locking it drops the issued token and the form.
 */
export const AddSkodaCarForm: React.FC<Props> = ({ onDone }) => {
  const { t } = useTranslation();
  return (
    <SkodaVaultGate prompt={t('skoda.vault.unlockToLinkPrompt')} onCancel={onDone}>
      <AddSkodaCarSteps onDone={onDone} />
    </SkodaVaultGate>
  );
};

const AddSkodaCarSteps: React.FC<Props> = ({ onDone }) => {
  const { t } = useTranslation();
  const { setSelectedCarId } = useCars();
  const { lookUp, addLinkedCar } = useSkodaLink();
  const [values, setValues] = useState<SkodaKeyValues>({ vin: '', apiKey: '' });
  const [lookup, setLookup] = useState<SkodaLookup | null>(null);
  const [formState, setFormState] = useState<CarFormState>(DEFAULT_CAR_FORM);
  const { run, pending, error } = useAsyncAction();

  const errorText = <ErrorText message={error ? getSkodaErrorMessage(error, t) : null} testId="skoda-link-error" />;

  const handleLookUp = () => {
    void run(async () => {
      const result = await lookUp(values.vin, values.apiKey.trim());
      // The key is only needed for this one request, so it doesn't stay in the form
      setValues(prev => ({ ...prev, apiKey: '' }));
      setLookup(result);
      setFormState({ ...DEFAULT_CAR_FORM, name: result.vehicle?.name ?? '' });
    });
  };

  const handleSave = () => {
    if (pending || !lookup || !isCarFormValid(formState)) return;
    void run(async () => {
      const car = await addLinkedCar({ ...formState, name: formState.name.trim() }, lookup);
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
        saving={pending}
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
          <SkodaKeyFields values={values} onChange={setValues} />
          {errorText}
          <FormActions
            submitLabel={t('skoda.addCar.lookUp')}
            disabled={pending || !isSkodaKeyComplete(values)}
            testId="add-skoda-car-lookup-button"
            onCancel={onDone}
          />
        </Stack>
      </form>
    </Card>
  );
};
