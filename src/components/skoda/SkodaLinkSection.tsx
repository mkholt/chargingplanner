import React, { useState } from 'react';

import { Button, Divider, Text, tokens } from '@fluentui/react-components';
import { Link20Regular, LinkDismiss20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { type Car, useSkodaProxy } from '@/contexts';
import { useAsyncAction, useSkodaLink } from '@/hooks';

import { getSkodaErrorMessage } from './skodaErrors';
import { SkodaKeyFields } from './SkodaKeyFields';
import { isSkodaKeyComplete, type SkodaKeyValues } from './skodaKeyValues';
import { SkodaLinkStatusText } from './SkodaLinkStatusText';

type Mode = 'view' | 'link' | 'unlink';

/** Link a car to its Škoda with a VIN and an API key, or unlink it. Hidden while the proxy is off. */
export const SkodaLinkSection: React.FC<{ car: Car }> = ({ car }) => {
  const { t } = useTranslation();
  const { baseUrl } = useSkodaProxy();
  const { link, unlink, requiresPassword } = useSkodaLink();
  const [mode, setMode] = useState<Mode>('view');
  const [values, setValues] = useState<SkodaKeyValues>({ vin: car.skoda?.vin ?? '', apiKey: '', password: '' });
  const { run, pending, error, reset } = useAsyncAction();

  if (!baseUrl) return null;

  const changeMode = (next: Mode) => {
    setMode(next);
    setValues(prev => ({ ...prev, apiKey: '', password: '' }));
    reset();
  };

  const submit = async (action: () => Promise<void>) => {
    if (await run(action)) changeMode('view');
  };

  const handleLink = () => {
    const { vin, apiKey, password } = values;
    // The key is only needed for this one request, so it doesn't stay in the form
    setValues(prev => ({ ...prev, apiKey: '' }));
    void submit(() => link(car, vin, apiKey.trim(), password));
  };

  const errorText = error !== null && (
    <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid="skoda-link-error">
      {getSkodaErrorMessage(error, t)}
    </Text>
  );

  const formActions = (submitLabel: string, disabled: boolean, testId: string) => (
    <Stack horizontal gap={tokens.spacingHorizontalS} justify="flex-end">
      <Button appearance="subtle" onClick={() => changeMode('view')}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" appearance="primary" disabled={disabled || pending} data-testid={testId}>
        {submitLabel}
      </Button>
    </Stack>
  );

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
        <form onSubmit={e => { e.preventDefault(); handleLink(); }}>
          <Stack gap={tokens.spacingHorizontalS}>
            <SkodaKeyFields values={values} onChange={setValues} requiresPassword={requiresPassword} />
            {errorText}
            {formActions(
              car.skoda ? t('skoda.link.relink') : t('skoda.link.link'),
              !isSkodaKeyComplete(values, requiresPassword),
              'skoda-link-submit-button',
            )}
          </Stack>
        </form>
      )}

      {mode === 'unlink' && (
        <form onSubmit={e => { e.preventDefault(); void submit(() => unlink(car, values.password)); }}>
          <Stack gap={tokens.spacingHorizontalS}>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {t('skoda.link.unlinkHint')}
            </Text>
            <SkodaKeyFields values={values} onChange={setValues} requiresPassword={requiresPassword} passwordOnly />
            {errorText}
            {formActions(t('skoda.link.unlink'), requiresPassword && !values.password, 'skoda-unlink-confirm-button')}
          </Stack>
        </form>
      )}
    </Stack>
  );
};
