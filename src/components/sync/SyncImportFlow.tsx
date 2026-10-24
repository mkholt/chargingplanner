import React from 'react';

import { CarImportResultDialog, ImportPreviewDialog, SkodaAccessImportDialog } from '@/components/sync';
import { useSyncImport } from '@/hooks';
import type { SyncData } from '@/utils';

type Props = {
  /** Parsed sync data to import; null while there is nothing to import */
  data: SyncData | null;
  /** The preview was confirmed or dismissed */
  onDone: () => void;
};

/** Import preview, Škoda access and result dialogs for one import */
export const SyncImportFlow: React.FC<Props> = ({ data, onDone }) => {
  const {
    existingCarNames,
    confirmImport,
    importResult,
    closeResult,
    pendingAccess,
    completeAccess,
    skipAccess,
  } = useSyncImport();

  const handleConfirm = (selectedCarIndices: number[], importSettings: boolean) => {
    if (!data) return;
    confirmImport(data, selectedCarIndices, importSettings);
    onDone();
  };

  return (
    <>
      <ImportPreviewDialog
        open={data !== null}
        onClose={onDone}
        onConfirm={handleConfirm}
        syncData={data}
        existingCarNames={existingCarNames}
      />

      <SkodaAccessImportDialog
        open={pendingAccess.count > 0}
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
