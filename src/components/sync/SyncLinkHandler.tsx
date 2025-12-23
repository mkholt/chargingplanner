import React, { useState } from 'react';

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

import type { Car, MergeResult } from '../../hooks/useCars';
import { parseShareableUrl } from '../../utils/carSyncCodec';

type Props = {
  existingCars: Car[];
  onImport: (cars: Omit<Car, 'id'>[]) => MergeResult;
};

/** Check URL hash for sync data and clear it */
function getInitialCarsFromUrl(): Omit<Car, 'id'>[] | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#sync=')) return null;

  const parsed = parseShareableUrl(window.location.href);
  if (parsed && parsed.length > 0) {
    // Clear the hash from URL without triggering a reload
    window.history.replaceState(null, '', window.location.pathname);
    return parsed;
  }
  return null;
}

export const SyncLinkHandler: React.FC<Props> = ({ existingCars, onImport }) => {
  // Use lazy initialization to read URL on first render
  const [carsToImport, setCarsToImport] = useState<Omit<Car, 'id'>[] | null>(getInitialCarsFromUrl);
  const [importResult, setImportResult] = useState<MergeResult | null>(null);

  const handleConfirmImport = () => {
    if (!carsToImport) return;

    const result = onImport(carsToImport);
    setImportResult(result);
    setCarsToImport(null);
  };

  const handleClosePreview = () => {
    setCarsToImport(null);
  };

  const handleCloseResult = () => {
    setImportResult(null);
  };

  // Check which cars are duplicates
  const existingNames = new Set(existingCars.map(c => c.name.toLowerCase().trim()));

  return (
    <>
      {/* Import Preview Dialog */}
      <Dialog open={carsToImport !== null} onOpenChange={(_, data) => !data.open && handleClosePreview()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Import Cars from Link</DialogTitle>
            <DialogContent>
              <Text size={300} style={{ marginBottom: 12, display: 'block' }}>
                This link contains {carsToImport?.length} car{carsToImport?.length !== 1 ? 's' : ''} to import:
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {carsToImport?.map((car, i) => {
                  const isDuplicate = existingNames.has(car.name.toLowerCase().trim());
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
              {carsToImport?.every(c => existingNames.has(c.name.toLowerCase().trim())) && (
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
              <Button appearance="secondary" onClick={handleClosePreview}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmImport}>
                Import
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={importResult !== null} onOpenChange={(_, data) => !data.open && handleCloseResult()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Import Complete</DialogTitle>
            <DialogContent>
              {importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {importResult.added.length > 0 && (
                    <Text>
                      Added {importResult.added.length} car{importResult.added.length !== 1 ? 's' : ''}:
                      {' '}{importResult.added.map(c => c.name).join(', ')}
                    </Text>
                  )}
                  {importResult.skipped.length > 0 && (
                    <Text style={{ color: tokens.colorNeutralForeground3 }}>
                      Skipped {importResult.skipped.length} duplicate{importResult.skipped.length !== 1 ? 's' : ''}:
                      {' '}{importResult.skipped.map(c => c.name).join(', ')}
                    </Text>
                  )}
                  {importResult.added.length === 0 && importResult.skipped.length === 0 && (
                    <Text>No cars were imported.</Text>
                  )}
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handleCloseResult}>
                Done
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
