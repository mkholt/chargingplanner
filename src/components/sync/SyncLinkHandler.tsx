import React, { useEffect, useMemo, useState } from 'react';

import { CarImportResultDialog, ImportPreviewDialog } from '@/components/sync';
import { useCars, usePriceSettings } from '@/contexts';
import { mergeCars, parseShareableUrl, type MergeResult, type SyncData } from '@/utils';

export const SyncLinkHandler: React.FC = () => {
  const { cars, addCar } = useCars();
  const { applySettings } = usePriceSettings();

  const [dataToImport, setDataToImport] = useState<SyncData | null>(null);

  // Check URL hash for sync data on mount (async due to compression)
  useEffect(() => {
    async function checkUrl() {
      const hash = window.location.hash;
      if (!hash.startsWith('#sync=')) return;

      const parsed = await parseShareableUrl(window.location.href);
      if (parsed && (parsed.cars.length > 0 || parsed.settings)) {
        // Clear the hash from URL without triggering a reload
        window.history.replaceState(null, '', window.location.pathname);
        setDataToImport(parsed);
      }
    }

    checkUrl();
  }, []);
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
