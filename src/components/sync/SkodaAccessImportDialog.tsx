import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { getSkodaErrorMessage } from '@/components/skoda';
import { PasswordInput, Stack } from '@/components/ui';
import { useAsyncAction } from '@/hooks';
import { type PasswordField, WrongPasswordError } from '@/utils';

type Props = {
  open: boolean;
  needsLocalPassword: boolean;
  onSubmit: (exportCode: string, localPassword: string) => Promise<void>;
  onSkip: () => void;
};

/** Asks for the export code (and this device's vault password) needed to store imported Škoda access */
export const SkodaAccessImportDialog: React.FC<Props> = ({ open, needsLocalPassword, onSubmit, onSkip }) => {
  const { t } = useTranslation();
  const [exportCode, setExportCode] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const { run, pending, error, reset } = useAsyncAction();

  const close = (action: () => void) => {
    setExportCode('');
    setLocalPassword('');
    reset();
    action();
  };

  const handleSubmit = async () => {
    if (await run(() => onSubmit(exportCode, localPassword))) close(() => {});
  };

  const message = error ? getSkodaErrorMessage(error, t) : null;
  const errorField: PasswordField | null = error instanceof WrongPasswordError ? error.field ?? null : null;
  const fieldError = (field: PasswordField) => (errorField === field ? message : null);

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && close(onSkip)}>
      <DialogSurface data-testid="skoda-access-import-dialog">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <DialogBody>
            <DialogTitle>{t('skoda.sync.importTitle')}</DialogTitle>
            <DialogContent>
              <Stack gap={tokens.spacingHorizontalM}>
                <Text>{t('skoda.sync.importDescription')}</Text>
                <Field
                  label={t('skoda.sync.exportCode')}
                  validationMessage={fieldError('exportCode') ?? undefined}
                  validationState={fieldError('exportCode') ? 'error' : 'none'}
                >
                  <Input
                    autoComplete="off"
                    spellCheck={false}
                    value={exportCode}
                    onChange={(_e, d) => setExportCode(d.value)}
                    style={{ fontFamily: 'monospace' }}
                    data-testid="skoda-import-export-code-input"
                  />
                </Field>
                {needsLocalPassword && (
                  <PasswordInput
                    label={t('skoda.sync.localPassword')}
                    value={localPassword}
                    onChange={setLocalPassword}
                    autoComplete="current-password"
                    testId="skoda-import-local-password-input"
                    error={fieldError('localPassword')}
                  />
                )}
                {message && errorField === null && (
                  <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>{message}</Text>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => close(onSkip)} data-testid="skoda-import-skip-button">
                {t('skoda.vault.skip')}
              </Button>
              <Button
                type="submit"
                appearance="primary"
                disabled={pending || !exportCode.trim() || (needsLocalPassword && !localPassword)}
                data-testid="skoda-import-submit-button"
              >
                {t('skoda.sync.importButton')}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
