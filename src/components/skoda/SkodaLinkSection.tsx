import React, { useState } from 'react';

import { Button, Divider, Text, tokens } from '@fluentui/react-components';
import { Link20Regular, LinkDismiss20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { ErrorText, FormActions, Stack } from '@/components/ui';
import { type Car, useSkodaProxy } from '@/contexts';
import { useAsyncAction, useSkodaLink } from '@/hooks';

import { getSkodaErrorMessage } from './skodaErrors';
import { SkodaKeyFields } from './SkodaKeyFields';
import { isSkodaKeyComplete, type SkodaKeyValues } from './skodaKeyValues';
import { SkodaLinkStatusText } from './SkodaLinkStatusText';
import { SkodaVaultGate } from './SkodaVaultGate';

type Mode = 'view' | 'link' | 'unlink';

/** Link a car to its Škoda with a VIN and an API key, or unlink it. Hidden while the proxy is off. */
export const SkodaLinkSection: React.FC<{ car: Car }> = ({ car }) => {
  const { t } = useTranslation();
  const { baseUrl } = useSkodaProxy();
  const { link, unlink } = useSkodaLink();
  const [mode, setMode] = useState<Mode>('view');
  const { run, pending, error, reset } = useAsyncAction();

  if (!baseUrl) return null;

  const changeMode = (next: Mode) => {
    setMode(next);
    reset();
  };

  const submit = async (action: () => Promise<void>) => {
    if (await run(action)) changeMode('view');
  };

  const errorText = <ErrorText message={error ? getSkodaErrorMessage(error, t) : null} testId="skoda-link-error" />;
  const cancel = () => changeMode('view');

  return (
    <Stack gap={tokens.spacingHorizontalS} data-testid="skoda-link-section">
      <Divider />
      <Text weight="semibold">{t('skoda.link.title')}</Text>
      <SkodaLinkStatusText car={car} />

      {mode === 'view' && (
        <Stack horizontal gap={tokens.spacingHorizontalS} wrap>
          <Button
            icon={<Link20Regular />}
            onClick={() => changeMode('link')}
            data-testid={car.skoda ? 'skoda-relink-button' : 'skoda-link-button'}
          >
            {car.skoda ? t('skoda.link.relink') : t('skoda.link.link')}
          </Button>
          {car.skoda && (
            <Button
              appearance="subtle"
              icon={<LinkDismiss20Regular />}
              onClick={() => changeMode('unlink')}
              data-testid="skoda-unlink-button"
            >
              {t('skoda.link.unlink')}
            </Button>
          )}
        </Stack>
      )}

      {mode === 'link' && (
        <SkodaVaultGate prompt={t('skoda.vault.unlockToLinkPrompt')} onCancel={cancel}>
          <SkodaLinkForm
            car={car}
            pending={pending}
            errorText={errorText}
            onSubmit={values => submit(() => link(car, values.vin, values.apiKey.trim()))}
            onCancel={cancel}
          />
        </SkodaVaultGate>
      )}

      {mode === 'unlink' && (
        <SkodaVaultGate prompt={t('skoda.vault.unlockToLinkPrompt')} onCancel={cancel}>
          <form onSubmit={e => { e.preventDefault(); void submit(() => unlink(car)); }}>
            <Stack gap={tokens.spacingHorizontalS}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {t('skoda.link.unlinkHint')}
              </Text>
              {errorText}
              <FormActions
                submitLabel={t('skoda.link.unlink')}
                disabled={pending}
                testId="skoda-unlink-confirm-button"
                onCancel={cancel}
              />
            </Stack>
          </form>
        </SkodaVaultGate>
      )}
    </Stack>
  );
};

type LinkFormProps = {
  car: Car;
  pending: boolean;
  errorText: React.ReactNode;
  onSubmit: (values: SkodaKeyValues) => Promise<void>;
  onCancel: () => void;
};

/** Holds the API key below the vault gate, so locking the vault drops it */
const SkodaLinkForm: React.FC<LinkFormProps> = ({ car, pending, errorText, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<SkodaKeyValues>({ vin: car.skoda?.vin ?? '', apiKey: '' });

  return (
    <form onSubmit={e => { e.preventDefault(); void onSubmit(values); }}>
      <Stack gap={tokens.spacingHorizontalS}>
        <SkodaKeyFields values={values} onChange={setValues} />
        {errorText}
        <FormActions
          submitLabel={car.skoda ? t('skoda.link.relink') : t('skoda.link.link')}
          disabled={pending || !isSkodaKeyComplete(values)}
          testId="skoda-link-submit-button"
          onCancel={onCancel}
        />
      </Stack>
    </form>
  );
};
