import React from 'react';

import { Checkbox, Spinner, Text, tokens } from '@fluentui/react-components';
import { Warning20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import type { SkodaAccessExportState } from '@/hooks';

import { SkodaUnlockForm } from './SkodaUnlockForm';

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: tokens.fontSizeBase400,
  letterSpacing: '0.05em',
  padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
  borderRadius: tokens.borderRadiusMedium,
  background: tokens.colorNeutralBackground3,
  wordBreak: 'break-all',
};

/** Opt in to Škoda access in the export, and show the export code that protects it */
export const SkodaExportOptions: React.FC<{ state: SkodaAccessExportState }> = ({ state }) => {
  const { t } = useTranslation();
  if (!state.available) return null;

  const count = Object.keys(state.access).length;

  return (
    <Stack gap={tokens.spacingHorizontalS} data-testid="skoda-export-options">
      <Checkbox
        checked={state.included}
        onChange={(_, data) => state.setIncluded(!!data.checked)}
        label={t('skoda.sync.includeAccess')}
        data-testid="skoda-include-access-checkbox"
      />
      {state.needsUnlock && <SkodaUnlockForm prompt={t('skoda.sync.unlockToExport')} />}
      {state.sealing && <Spinner size="tiny" label={t('skoda.sync.sealing')} labelPosition="after" />}
      {state.included && !state.needsUnlock && !state.sealing && (
        count === 0 ? (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} data-testid="skoda-export-no-access">
            {t('skoda.sync.noAccessToExport')}
          </Text>
        ) : (
          <Stack gap={tokens.spacingHorizontalS}>
            <Text size={200} weight="semibold">{t('skoda.sync.exportCode')}</Text>
            <Text style={codeStyle} data-testid="skoda-export-code">{state.exportCode}</Text>
            <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
              <Warning20Regular style={{ verticalAlign: 'middle' }} /> {t('skoda.sync.exportCodeWarning', { count })}
            </Text>
          </Stack>
        )
      )}
    </Stack>
  );
};
