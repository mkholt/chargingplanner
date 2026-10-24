import React from 'react';

import { Button, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { Stack } from './Stack';

type Props = {
  submitLabel: string;
  disabled: boolean;
  testId: string;
  onCancel: () => void;
};

/** Cancel and submit buttons at the end of a form */
export const FormActions: React.FC<Props> = ({ submitLabel, disabled, testId, onCancel }) => {
  const { t } = useTranslation();
  return (
    <Stack horizontal gap={tokens.spacingHorizontalS} justify="flex-end">
      <Button appearance="subtle" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" appearance="primary" disabled={disabled} data-testid={testId}>
        {submitLabel}
      </Button>
    </Stack>
  );
};
