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
  const { run, pending, error, reset } = useAsyncAction();

  // Not while the access is being stored: it would be stored anyway after the dialog is gone
  const skip = () => {
    if (pending) return;
    reset();
    onSkip();
  };

  const handleSubmit = async (exportCode: string) => {
    if (await run(() => onSubmit(exportCode))) reset();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && skip()}>
      {/* Named here too, as the unlock form that replaces the body while locked has no title */}
      <DialogSurface aria-label={t('skoda.sync.importTitle')} data-testid="skoda-access-import-dialog">
        <SkodaVaultGate prompt={t('skoda.sync.unlockToImportPrompt')} onCancel={skip}>
          <ExportCodeForm pending={pending} error={error} onSubmit={handleSubmit} onSkip={skip} />
        </SkodaVaultGate>
      </DialogSurface>
    </Dialog>
  );
};

type FormProps = {
  pending: boolean;
  error: unknown;
  onSubmit: (exportCode: string) => Promise<void>;
  onSkip: () => void;
};

/** Holds the export code below the vault gate, so locking the vault drops it */
const ExportCodeForm: React.FC<FormProps> = ({ pending, error, onSubmit, onSkip }) => {
  const { t } = useTranslation();
  const [exportCode, setExportCode] = useState('');

  const message = error ? getSkodaErrorMessage(error, t) : null;
  const codeError = error instanceof WrongExportCodeError ? message : null;

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        void onSubmit(exportCode);
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
          <Button appearance="secondary" onClick={onSkip} disabled={pending} data-testid="skoda-import-skip-button">
            {t('skoda.vault.skip')}
          </Button>
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
  );
};
