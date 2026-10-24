import { useCallback, useMemo, useState } from 'react';

import { type SkodaLink, type StoredLink, useCars, usePriceSettings, useSkodaVault } from '@/contexts';
import { mergeCars, type MergeResult, openAccess, type SyncCar, type SyncData } from '@/utils';

/** Sealed Škoda access of an imported car, waiting for the export code */
type PendingAccess = {
  carId: string;
  link: SkodaLink;
  sealedToken: string;
};

/**
 * Import cars and settings from sync data.
 * Škoda access is sealed with the export code shown on the exporting device. It is kept pending until
 * `completeAccess` gets the code; with password protection on, this device's vault must be unlocked first.
 * Skipping it leaves the cars linked without access.
 */
export function useSyncImport() {
  const { cars, addCar } = useCars();
  const { applySettings } = usePriceSettings();
  const { storeLinks } = useSkodaVault();
  const [importResult, setImportResult] = useState<MergeResult<SyncCar> | null>(null);
  const [pendingAccess, setPendingAccess] = useState<PendingAccess[]>([]);

  const existingCarNames = useMemo(
    () => new Set(cars.map(c => c.name.toLowerCase().trim())),
    [cars]
  );

  const confirmImport = useCallback((data: SyncData, selectedCarIndices: number[], importSettings: boolean) => {
    const selectedCars = selectedCarIndices.map(i => data.cars[i]);
    // Ids are only used for the merge; addCar assigns the real ones
    const result = mergeCars(cars, selectedCars, () => '');
    const pending: PendingAccess[] = [];

    result.added.forEach(({ name, batterySize, maxPower, skoda }) => {
      const link = skoda && { vin: skoda.vin, expiresAt: skoda.expiresAt, proxyUrl: skoda.proxyUrl };
      const car = addCar({ name, batterySize, maxPower, skoda: link });
      if (link && skoda.sealedToken) pending.push({ carId: car.id, link, sealedToken: skoda.sealedToken });
    });

    if (importSettings && data.settings) {
      applySettings(data.settings);
    }

    setPendingAccess(pending);
    setImportResult(result);
  }, [addCar, applySettings, cars]);

  /** Throws WrongExportCodeError, or VaultLockedError if this device's vault is locked */
  const completeAccess = useCallback(async (exportCode: string) => {
    const opened: StoredLink[] = [];
    // One at a time, so that a wrong code fails after the first car instead of decrypting all of them
    for (const { carId, link, sealedToken } of pendingAccess) {
      opened.push({ carId, link, token: await openAccess(sealedToken, exportCode, link.vin) });
    }
    await storeLinks(opened);
    setPendingAccess([]);
  }, [pendingAccess, storeLinks]);

  return {
    existingCarNames,
    confirmImport,
    importResult,
    closeResult: useCallback(() => setImportResult(null), []),
    pendingAccessCount: pendingAccess.length,
    completeAccess,
    skipAccess: useCallback(() => setPendingAccess([]), []),
  };
}
