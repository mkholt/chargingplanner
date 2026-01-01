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
import { Warning24Regular } from '@fluentui/react-icons';
import { Trans, useTranslation } from 'react-i18next';

import type { Car } from '@/contexts';

type Props = {
  car: Car | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const DeleteCarDialog: React.FC<Props> = ({
  car,
  open,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()} modalType="alert">
      <DialogSurface
        style={{
          maxWidth: 400,
          border: `1px solid ${tokens.colorPaletteRedBorder2}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4)`,
        }}
      >
        <DialogBody>
          <DialogTitle
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Warning24Regular style={{ color: tokens.colorPaletteRedForeground1 }} />
            {t('deleteCar.title')}
          </DialogTitle>
          <DialogContent>
            <Text>
              <Trans i18nKey="deleteCar.confirmMessage" values={{ name: car.name }}>
                Are you sure you want to delete <strong>{{ name: car.name } as unknown as string}</strong>?
              </Trans>
            </Text>
            <Text
              size={200}
              style={{ display: 'block', marginTop: 8, color: tokens.colorNeutralForeground3 }}
            >
              {t('deleteCar.warning')}
            </Text>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button appearance="primary" onClick={onConfirm} data-testid="confirm-delete-button" style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}>
              {t('common.delete')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
