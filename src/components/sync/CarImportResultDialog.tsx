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
  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Import Complete</DialogTitle>
          <DialogContent>
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.added.length > 0 && (
                  <Text>
                    Added {result.added.length} car{result.added.length !== 1 ? 's' : ''}:
                    {' '}{result.added.map(c => c.name).join(', ')}
                  </Text>
                )}
                {result.skipped.length > 0 && (
                  <Text style={{ color: tokens.colorNeutralForeground3 }}>
                    Skipped {result.skipped.length} duplicate{result.skipped.length !== 1 ? 's' : ''}:
                    {' '}{result.skipped.map(c => c.name).join(', ')}
                  </Text>
                )}
                {result.added.length === 0 && result.skipped.length === 0 && (
                  <Text>No cars were imported.</Text>
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>
              Done
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
