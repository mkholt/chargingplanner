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

import type { Car } from '@/hooks';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cars: Omit<Car, 'id'>[] | null;
  existingCarNames: Set<string>;
  title?: string;
  description?: string;
};

export const CarImportPreviewDialog: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  cars,
  existingCarNames,
  title = 'Import Cars',
  description,
}) => {
  const carCount = cars?.length ?? 0;
  const defaultDescription = `Found ${carCount} car${carCount !== 1 ? 's' : ''} to import:`;
  const allDuplicates = cars?.every(c => existingCarNames.has(c.name.toLowerCase().trim()));

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <Text size={300} style={{ marginBottom: 12, display: 'block' }}>
              {description ?? defaultDescription}
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cars?.map((car, i) => {
                const isDuplicate = existingCarNames.has(car.name.toLowerCase().trim());
                return (
                  <div
                    key={i}
                    style={{
                      padding: 8,
                      background: isDuplicate
                        ? tokens.colorPaletteYellowBackground1
                        : tokens.colorNeutralBackground3,
                      borderRadius: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <Text weight="semibold">{car.name}</Text>
                      <Text
                        size={200}
                        style={{ display: 'block', color: tokens.colorNeutralForeground3 }}
                      >
                        {car.batterySize} kWh · {car.maxPower} kW
                      </Text>
                    </div>
                    {isDuplicate && (
                      <Text
                        size={200}
                        style={{ color: tokens.colorPaletteYellowForeground2 }}
                      >
                        Duplicate
                      </Text>
                    )}
                  </div>
                );
              })}
            </div>
            {allDuplicates && (
              <Text
                size={200}
                style={{
                  display: 'block',
                  marginTop: 12,
                  color: tokens.colorPaletteYellowForeground2,
                }}
              >
                All cars already exist and will be skipped.
              </Text>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={onConfirm}>
              Import
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
