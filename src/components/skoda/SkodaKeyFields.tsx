import React from 'react';

import { Field, Input } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { PasswordInput } from '@/components/ui';
import { VIN_PATTERN } from '@/utils';

import type { SkodaKeyValues } from './skodaKeyValues';

type Props = {
  values: SkodaKeyValues;
  onChange: (values: SkodaKeyValues) => void;
};

/** VIN and Škoda API key */
export const SkodaKeyFields: React.FC<Props> = ({ values, onChange }) => {
  const { t } = useTranslation();
  const vinInvalid = values.vin !== '' && !VIN_PATTERN.test(values.vin);

  return (
    <>
      <Field
        label={t('skoda.link.vin')}
        validationMessage={vinInvalid ? t('skoda.link.vinInvalid') : undefined}
        validationState={vinInvalid ? 'error' : 'none'}
      >
        <Input
          value={values.vin}
          onChange={(_e, d) => onChange({ ...values, vin: d.value.toUpperCase().replace(/\s/g, '') })}
          maxLength={17}
          autoComplete="off"
          spellCheck={false}
          data-testid="skoda-vin-input"
        />
      </Field>
      <PasswordInput
        label={t('skoda.link.apiKey')}
        hint={t('skoda.link.apiKeyHint')}
        value={values.apiKey}
        onChange={apiKey => onChange({ ...values, apiKey })}
        autoComplete="off"
        testId="skoda-api-key-input"
      />
    </>
  );
};
