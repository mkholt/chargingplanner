import React from 'react';

import { Field, Input } from '@fluentui/react-components';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password' | 'off';
  testId: string;
  error?: string | null;
  hint?: string;
};

/** Password field with an optional validation message */
export const PasswordInput: React.FC<Props> = ({ label, value, onChange, autoComplete, testId, error, hint }) => (
  <Field label={label} hint={hint} validationMessage={error ?? undefined} validationState={error ? 'error' : 'none'}>
    <Input
      type="password"
      autoComplete={autoComplete}
      value={value}
      onChange={(_e, d) => onChange(d.value)}
      data-testid={testId}
    />
  </Field>
);
