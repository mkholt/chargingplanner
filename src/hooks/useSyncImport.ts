import { useCallback, useMemo, useState } from 'react';

import { useCars, usePriceSettings, useSkodaVault } from '@/contexts';
import { mergeCars, type MergeResult, openWithPassword, type SyncCar, type SyncData, WrongPasswordError } from '@/utils';

/** Škoda access of an imported car that still needs a password before it can be stored */
type PendingAccess = {
  carId: string;
  vin: string;
  expiresAt: string;
  token?: string;
  sealedToken?: string;
};

/**
 * A password entered on import is wrong; `field` says which one.
 * Not a subclass of WrongPasswordError: `@/utils` may not be initialised yet when this module loads.
 */
export class SkodaImportPasswordError extends Error {
  readonly field: 'exportPassword' | 'localPassword';

  constructor(field: 'exportPassword' | 'localPassword') {
    super('Wrong password');
    this.name = 'SkodaImportPasswordError';
    this.field = field;
  }
}

/**
 * Import cars and settings from sync data.
 * Škoda access that is password-sealed, or that has to go into this device's vault, is kept
 * pending until `completeAccess` gets the passwords. Skipping it leaves the cars linked without access.
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
      const storeNow = skoda?.token !== undefined && !isProtected;
      const car = addCar({
        name,
        batterySize,
        maxPower,
        skoda: skoda && { vin: skoda.vin, expiresAt: skoda.expiresAt, token: storeNow ? skoda.token : undefined },
      });
      if (skoda && !storeNow && (skoda.token || skoda.sealedToken)) {
        pending.push({ carId: car.id, ...skoda });
      }
    });

    if (importSettings && data.settings) {
      applySettings(data.settings);
    }

    setPendingAccess(pending);
    setImportResult(result);
  }, [addCar, applySettings, cars, isProtected]);

  const completeAccess = useCallback(async (exportPassword: string, localPassword: string) => {
    const resolved = await Promise.all(pendingAccess.map(async entry => {
      if (!entry.sealedToken) return { ...entry, token: entry.token! };
      try {
        const opened = await openWithPassword<{ vin: string; token: string }>(entry.sealedToken, exportPassword);
        // The sealed access must belong to the VIN it was exported with
        if (opened.vin !== entry.vin) throw new WrongPasswordError();
        return { ...entry, token: opened.token };
      } catch {
        throw new SkodaImportPasswordError('exportPassword');
      }
    }));

    if (isProtected) {
      try {
        await updateVault(localPassword, tokens => ({
          ...tokens,
          ...Object.fromEntries(resolved.map(({ carId, vin, token }) => [carId, { vin, token }])),
        }));
      } catch (e) {
        throw e instanceof WrongPasswordError ? new SkodaImportPasswordError('localPassword') : e;
      }
    } else {
      resolved.forEach(({ carId, vin, expiresAt, token }) => updateCar(carId, { skoda: { vin, expiresAt, token } }));
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
      needsExportPassword: pendingAccess.some(entry => entry.sealedToken),
      needsLocalPassword: isProtected,
    },
    completeAccess,
    skipAccess: useCallback(() => setPendingAccess([]), []),
  };
}
