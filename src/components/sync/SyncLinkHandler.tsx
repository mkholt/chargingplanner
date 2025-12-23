import React, { useMemo, useState } from 'react';

import type { Car, MergeResult } from '../../hooks/useCars';
import { parseShareableUrl } from '../../utils/carSyncCodec';
import { CarImportPreviewDialog } from './CarImportPreviewDialog';
import { CarImportResultDialog } from './CarImportResultDialog';

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

  // Memoize existing car names for duplicate detection
  const existingCarNames = useMemo(
    () => new Set(existingCars.map(c => c.name.toLowerCase().trim())),
    [existingCars]
  );

  const carCount = carsToImport?.length ?? 0;

  return (
    <>
      <CarImportPreviewDialog
        open={carsToImport !== null}
        onClose={handleClosePreview}
        onConfirm={handleConfirmImport}
        cars={carsToImport}
        existingCarNames={existingCarNames}
        title="Import Cars from Link"
        description={`This link contains ${carCount} car${carCount !== 1 ? 's' : ''} to import:`}
      />

      <CarImportResultDialog
        open={importResult !== null}
        onClose={handleCloseResult}
        result={importResult}
      />
    </>
  );
};
