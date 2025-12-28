import React from 'react';

import {
  Button,
  Card,
  Combobox,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Checkmark20Regular, Dismiss20Regular } from '@fluentui/react-icons';

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
}) => (
  <Card
    style={{
      flex: '1 1 200px',
      maxWidth: '100%',
      background: tokens.colorNeutralBackground3,
      border: `2px solid ${tokens.colorBrandStroke1}`,
      borderRadius: 10,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}
  >
    <Input
      placeholder="Car name"
      value={state.name}
      onChange={(_e, d) => onChange({ ...state, name: d.value })}
      style={{ width: '100%' }}
      size="small"
      autoFocus={autoFocus}
    />
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Input
        type="number"
        min={10}
        max={200}
        value={String(state.batterySize)}
        onChange={(_e, d) => onChange({ ...state, batterySize: Number(d.value) })}
        style={{ flex: 1, minWidth: 0 }}
        size="small"
        contentAfter={<Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>kWh</Text>}
      />
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
        style={{ flex: 1, minWidth: 0 }}
        size="small"
      >
        {CHARGING_POWER_OPTIONS.map((opt) => (
          <Option key={opt.value} value={String(opt.value)}>
            {opt.label}
          </Option>
        ))}
      </Combobox>
    </div>
    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
      <Button
        size="small"
        appearance="subtle"
        icon={<Dismiss20Regular />}
        onClick={onCancel}
        aria-label="Cancel"
      />
      <Button
        size="small"
        appearance="primary"
        icon={<Checkmark20Regular />}
        onClick={onSave}
        aria-label={saveLabel}
      />
    </div>
  </Card>
);
