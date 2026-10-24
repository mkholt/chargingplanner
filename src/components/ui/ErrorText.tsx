import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

type Props = {
  /** Nothing is shown while null */
  message: string | null;
  testId?: string;
};

/** Error message below a form */
export const ErrorText: React.FC<Props> = ({ message, testId }) =>
  message === null ? null : (
    <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }} data-testid={testId}>
      {message}
    </Text>
  );
