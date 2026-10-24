import React from 'react';

import { useSyncImport } from '@/hooks';
import type { SyncData } from '@/utils';

import { CarImportResultDialog } from './CarImportResultDialog';
import { ImportPreviewDialog } from './ImportPreviewDialog';
import { SkodaAccessImportDialog } from './SkodaAccessImportDialog';

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
    pendingAccessCount,
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
        open={pendingAccessCount > 0}
        onSubmit={completeAccess}
        onSkip={skipAccess}
      />

      <CarImportResultDialog
        open={importResult !== null && pendingAccessCount === 0}
        onClose={closeResult}
        result={importResult}
      />
    </>
  );
};
