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
} from '@fluentui/react-components';

import type { Car } from '@/hooks';

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
  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Delete Car</DialogTitle>
          <DialogContent>
            <Text>
              Are you sure you want to delete <strong>{car.name}</strong>? This action cannot be undone.
            </Text>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={onConfirm} style={{ backgroundColor: 'var(--colorPaletteRedBackground3)' }}>
              Delete
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
