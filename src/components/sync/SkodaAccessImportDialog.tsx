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
import { Stack } from '@/components/ui';
import { SkodaImportPasswordError } from '@/hooks';

type Props = {
  open: boolean;
  needsExportPassword: boolean;
  needsLocalPassword: boolean;
  onSubmit: (exportPassword: string, localPassword: string) => Promise<void>;
  onSkip: () => void;
};

/** Asks for the passwords needed to store imported Škoda access */
export const SkodaAccessImportDialog: React.FC<Props> = ({
  open,
  needsExportPassword,
  needsLocalPassword,
  onSubmit,
  onSkip,
}) => {
  const { t } = useTranslation();
  const [exportPassword, setExportPassword] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [error, setError] = useState<{ field: 'exportPassword' | 'localPassword' | null; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  const close = (action: () => void) => {
    setExportPassword('');
    setLocalPassword('');
    setError(null);
    action();
  };

  const handleSubmit = async () => {
    setPending(true);
    setError(null);
    try {
      await onSubmit(exportPassword, localPassword);
      close(() => {});
    } catch (e) {
      setError({ field: e instanceof SkodaImportPasswordError ? e.field : null, message: getSkodaErrorMessage(e, t) });
    } finally {
      setPending(false);
    }
  };

  const fieldError = (field: 'exportPassword' | 'localPassword') =>
    error?.field === field ? { validationMessage: error.message, validationState: 'error' as const } : {};

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
                <Text>{needsExportPassword ? t('skoda.sync.importDescription') : t('skoda.sync.importLocalPrompt')}</Text>
                {needsExportPassword && (
                  <Field label={t('skoda.sync.exportPassword')} {...fieldError('exportPassword')}>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={exportPassword}
                      onChange={(_e, d) => setExportPassword(d.value)}
                      data-testid="skoda-import-export-password-input"
                    />
                  </Field>
                )}
                {needsLocalPassword && (
                  <Field label={t('skoda.sync.localPassword')} {...fieldError('localPassword')}>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={localPassword}
                      onChange={(_e, d) => setLocalPassword(d.value)}
                      data-testid="skoda-import-local-password-input"
                    />
                  </Field>
                )}
                {error && error.field === null && (
                  <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>{error.message}</Text>
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
                disabled={
                  pending || (needsExportPassword && !exportPassword) || (needsLocalPassword && !localPassword)
                }
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
