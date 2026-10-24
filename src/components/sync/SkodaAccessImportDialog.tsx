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

import { getSkodaErrorMessage, SkodaVaultGate } from '@/components/skoda';
import { ErrorText, Stack } from '@/components/ui';
import { useAsyncAction } from '@/hooks';
import { WrongExportCodeError } from '@/utils';

type Props = {
  open: boolean;
  onSubmit: (exportCode: string) => Promise<void>;
  onSkip: () => void;
};

/**
 * Asks for the export code needed to store imported Škoda access.
 * With password protection on, this device's vault is unlocked first.
 */
export const SkodaAccessImportDialog: React.FC<Props> = ({ open, onSubmit, onSkip }) => {
  const { t } = useTranslation();
  const [exportCode, setExportCode] = useState('');
  const { run, pending, error, reset } = useAsyncAction();

  const close = (action: () => void) => {
    setExportCode('');
    reset();
    action();
  };

  const handleSubmit = async () => {
    if (await run(() => onSubmit(exportCode))) close(() => {});
  };

  const message = error ? getSkodaErrorMessage(error, t) : null;
  const codeError = error instanceof WrongExportCodeError ? message : null;
  const skipButton = (
    <Button appearance="secondary" onClick={() => close(onSkip)} data-testid="skoda-import-skip-button">
      {t('skoda.vault.skip')}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && close(onSkip)}>
      <DialogSurface data-testid="skoda-access-import-dialog">
        <SkodaVaultGate
          prompt={t('skoda.sync.unlockToImportPrompt')}
          onCancel={() => close(onSkip)}
        >
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
                    validationMessage={codeError ?? undefined}
                    validationState={codeError ? 'error' : 'none'}
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
                  <ErrorText message={codeError ? null : message} testId="skoda-import-error" />
                </Stack>
              </DialogContent>
              <DialogActions>
                {skipButton}
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={pending || !exportCode.trim()}
                  data-testid="skoda-import-submit-button"
                >
                  {t('skoda.sync.importButton')}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </SkodaVaultGate>
      </DialogSurface>
    </Dialog>
  );
};
