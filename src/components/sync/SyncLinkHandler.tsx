import React, { useMemo, useState } from 'react';

import { CarImportResultDialog, ImportPreviewDialog } from '@/components/sync';
import { useCars, usePriceSettings } from '@/contexts';
import { mergeCars, parseShareableUrl, type MergeResult, type SyncData } from '@/utils';

/** Check URL hash for sync data and clear it */
function getInitialDataFromUrl(): SyncData | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#sync=')) return null;

  const parsed = parseShareableUrl(window.location.href);
  if (parsed && (parsed.cars.length > 0 || parsed.settings)) {
    // Clear the hash from URL without triggering a reload
    window.history.replaceState(null, '', window.location.pathname);
    return parsed;
  }
  return null;
}

export const SyncLinkHandler: React.FC = () => {
  const { cars, addCar } = useCars();
  const { applySettings } = usePriceSettings();

  // Use lazy initialization to read URL on first render
  const [dataToImport, setDataToImport] = useState<SyncData | null>(getInitialDataFromUrl);
  const [importResult, setImportResult] = useState<MergeResult | null>(null);

  const handleConfirmImport = (selectedCarIndices: number[], importSettings: boolean) => {
    if (!dataToImport) return;

    // Filter cars by selected indices
    const selectedCars = selectedCarIndices.map(i => dataToImport.cars[i]);

    // Generate IDs for new cars
    const generateId = () => Math.random().toString(36).slice(2);

    // Merge cars
    const result = mergeCars(cars, selectedCars, generateId);

    // Add new cars
    result.added.forEach(car => {
      addCar({ name: car.name, batterySize: car.batterySize, maxPower: car.maxPower });
    });

    // Apply settings if requested
    if (importSettings && dataToImport.settings) {
      applySettings(dataToImport.settings);
    }

    setImportResult(result);
    setDataToImport(null);
  };

  const handleClosePreview = () => {
    setDataToImport(null);
  };

  const handleCloseResult = () => {
    setImportResult(null);
  };

  // Memoize existing car names for duplicate detection
  const existingCarNames = useMemo(
    () => new Set(cars.map(c => c.name.toLowerCase().trim())),
    [cars]
  );

  return (
    <>
      <ImportPreviewDialog
        open={dataToImport !== null}
        onClose={handleClosePreview}
        onConfirm={handleConfirmImport}
        syncData={dataToImport}
        existingCarNames={existingCarNames}
      />

      <CarImportResultDialog
        open={importResult !== null}
        onClose={handleCloseResult}
        result={importResult}
      />
    </>
  );
};
