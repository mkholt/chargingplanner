import { useCallback, useMemo, useState } from 'react';

import { type SkodaLink, useCars, usePriceSettings, useSkodaVault } from '@/contexts';
import { mergeCars, type MergeResult, openAccess, type SyncCar, type SyncData, WrongPasswordError } from '@/utils';

/** Sealed Škoda access of an imported car, waiting for the export code */
type PendingAccess = {
  carId: string;
  link: SkodaLink;
  sealedToken: string;
};

/**
 * Import cars and settings from sync data.
 * Škoda access is sealed with the export code shown on the exporting device. It is kept pending until
 * `completeAccess` gets the code (and this device's vault password, if protected). Skipping it leaves
 * the cars linked without access.
 */
export function useSyncImport() {
  const { cars, addCar, updateCar } = useCars();
  const { applySettings } = usePriceSettings();
  const { isProtected, updateVault } = useSkodaVault();
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

  /** Throws WrongPasswordError with `field` set to the password that is wrong */
  const completeAccess = useCallback(async (exportCode: string, localPassword: string) => {
    const opened = await Promise.all(pendingAccess.map(async entry => ({
      ...entry,
      token: await openAccess(entry.sealedToken, exportCode, entry.link.vin),
    })));

    if (isProtected) {
      try {
        await updateVault(localPassword, tokens => ({
          ...tokens,
          ...Object.fromEntries(opened.map(({ carId, link, token }) => [carId, { vin: link.vin, token }])),
        }));
      } catch (e) {
        throw e instanceof WrongPasswordError ? new WrongPasswordError('localPassword') : e;
      }
    } else {
      opened.forEach(({ carId, link, token }) => updateCar(carId, { skoda: { ...link, token } }));
    }
    setPendingAccess([]);
  }, [isProtected, pendingAccess, updateCar, updateVault]);

  return {
    existingCarNames,
    confirmImport,
    importResult,
    closeResult: useCallback(() => setImportResult(null), []),
    pendingAccess: {
      count: pendingAccess.length,
      needsLocalPassword: isProtected,
    },
    completeAccess,
    skipAccess: useCallback(() => setPendingAccess([]), []),
  };
}
