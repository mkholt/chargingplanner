import React from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import type { MergeResult } from '@/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  result: MergeResult | null;
};

export const CarImportResultDialog: React.FC<Props> = ({
  open,
  onClose,
  result,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('importResult.title')}</DialogTitle>
          <DialogContent>
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.added.length > 0 && (
                  <Text>
                    {t('importResult.addedCars', {
                      count: result.added.length,
                      names: result.added.map(c => c.name).join(', '),
                    })}
                  </Text>
                )}
                {result.skipped.length > 0 && (
                  <Text style={{ color: tokens.colorNeutralForeground3 }}>
                    {t('importResult.skippedDuplicates', {
                      count: result.skipped.length,
                      names: result.skipped.map(c => c.name).join(', '),
                    })}
                  </Text>
                )}
                {result.added.length === 0 && result.skipped.length === 0 && (
                  <Text>{t('importResult.noCarsImported')}</Text>
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>
              {t('common.done')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
