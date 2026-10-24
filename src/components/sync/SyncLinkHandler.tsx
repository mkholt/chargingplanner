import React, { useEffect, useState } from 'react';

import { CarImportResultDialog, ImportPreviewDialog, SkodaAccessImportDialog } from '@/components/sync';
import { useSyncImport } from '@/hooks';
import { parseShareableUrl, type SyncData } from '@/utils';

export const SyncLinkHandler: React.FC = () => {
  const {
    existingCarNames,
    confirmImport,
    importResult,
    closeResult,
    pendingAccess,
    completeAccess,
    skipAccess,
  } = useSyncImport();

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

  const handleConfirmImport = (selectedCarIndices: number[], importSettings: boolean) => {
    if (!dataToImport) return;
    confirmImport(dataToImport, selectedCarIndices, importSettings);
    setDataToImport(null);
  };

  const handleClosePreview = () => {
    setDataToImport(null);
  };

  return (
    <>
      <ImportPreviewDialog
        open={dataToImport !== null}
        onClose={handleClosePreview}
        onConfirm={handleConfirmImport}
        syncData={dataToImport}
        existingCarNames={existingCarNames}
      />

      <SkodaAccessImportDialog
        open={pendingAccess.count > 0}
        needsExportPassword={pendingAccess.needsExportPassword}
        needsLocalPassword={pendingAccess.needsLocalPassword}
        onSubmit={completeAccess}
        onSkip={skipAccess}
      />

      <CarImportResultDialog
        open={importResult !== null && pendingAccess.count === 0}
        onClose={closeResult}
        result={importResult}
      />
    </>
  );
};
