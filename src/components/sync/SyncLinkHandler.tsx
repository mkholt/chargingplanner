import React, { useMemo, useState } from 'react';

import { CarImportResultDialog, ImportPreviewDialog } from '@/components/sync';
import type { Car, PriceSettings } from '@/hooks';
import { type MergeResult, parseShareableUrl, type SyncData } from '@/utils';

type Props = {
  existingCars: Car[];
  onImport: (data: SyncData, selectedCarIndices: number[], importSettings: boolean) => MergeResult;
  onApplyPriceSettings?: (settings: PriceSettings) => void;
};

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

export const SyncLinkHandler: React.FC<Props> = ({
  existingCars,
  onImport,
  onApplyPriceSettings,
}) => {
  // Use lazy initialization to read URL on first render
  const [dataToImport, setDataToImport] = useState<SyncData | null>(getInitialDataFromUrl);
  const [importResult, setImportResult] = useState<MergeResult | null>(null);

  const handleConfirmImport = (selectedCarIndices: number[], importSettings: boolean) => {
    if (!dataToImport) return;

    const result = onImport(dataToImport, selectedCarIndices, importSettings);

    // Apply settings if requested
    if (importSettings && dataToImport.settings && onApplyPriceSettings) {
      onApplyPriceSettings(dataToImport.settings);
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
    () => new Set(existingCars.map(c => c.name.toLowerCase().trim())),
    [existingCars]
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
