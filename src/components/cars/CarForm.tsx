import React from 'react';

import {
  Button,
  Card,
  Combobox,
  Field,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Checkmark20Regular,
  Dismiss20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { useIsMobile } from '@/hooks';
import { CHARGING_POWER_OPTIONS } from '@/utils';

import type { CarFormState } from './carFormState';

type Props = {
  state: CarFormState;
  onChange: (state: CarFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  autoFocus?: boolean;
};

/** Shared form layout for editing and adding cars */
export const CarForm: React.FC<Props> = ({
  state,
  onChange,
  onSave,
  onCancel,
  saveLabel,
  autoFocus,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <Card
      style={{
        background: tokens.colorNeutralBackground3,
        border: `2px solid ${tokens.colorBrandStroke1}`,
        borderRadius: tokens.borderRadiusLarge,
        padding: tokens.spacingHorizontalL,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingHorizontalM,
      }}
    >
      <Field label={t('cars.carName')}>
        <Input
          value={state.name}
          onChange={(_e, d) => onChange({ ...state, name: d.value })}
          autoFocus={autoFocus}
          data-testid="car-name-input"
        />
      </Field>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: tokens.spacingHorizontalM }}>
        <Field label={t('input.batterySize')} style={{ flex: 1 }}>
          <Input
            type="number"
            min={10}
            max={200}
            value={String(state.batterySize)}
            onChange={(_e, d) => onChange({ ...state, batterySize: Number(d.value) })}
            contentAfter={<Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>kWh</Text>}
            data-testid="car-battery-input"
          />
        </Field>
        <Field label={t('input.chargingPower')} style={{ flex: 1 }}>
          <Combobox
            freeform
            value={`${state.maxPower} kW`}
            onOptionSelect={(_e, data) => {
              if (data.optionValue) {
                onChange({ ...state, maxPower: Number(data.optionValue) });
              }
            }}
            onChange={(e) => {
              const val = Number(e.target.value.replace(/[^0-9.]/g, ''));
              if (!isNaN(val) && val > 0) {
                onChange({ ...state, maxPower: val });
              }
            }}
            data-testid="car-power-dropdown"
          >
            {CHARGING_POWER_OPTIONS.map((opt) => (
              <Option key={opt.value} value={String(opt.value)}>
                {opt.label}
              </Option>
            ))}
          </Combobox>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, justifyContent: 'flex-end', marginTop: tokens.spacingHorizontalXS }}>
        <Button
          appearance="subtle"
          icon={<Dismiss20Regular />}
          onClick={onCancel}
          aria-label={t('common.cancel')}
        >
          {t('common.cancel')}
        </Button>
        <Button
          appearance="primary"
          icon={<Checkmark20Regular />}
          onClick={onSave}
          aria-label={saveLabel}
          data-testid="save-car-button"
        >
          {saveLabel}
        </Button>
      </div>
    </Card>
  );
};
