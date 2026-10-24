import { useEffect, useState } from 'react';

import { type Car, useSkodaProxy, useSkodaVault } from '@/contexts';
import { generateExportCode, sealAccess, type SkodaAccessExport } from '@/utils';

const NO_ACCESS: SkodaAccessExport = {};

async function sealAll(cars: Car[], getToken: (car: Car) => string | null, exportCode: string) {
  const entries = await Promise.all(cars.map(async car => {
    const token = getToken(car);
    return car.skoda && token ? [[car.id, await sealAccess({ vin: car.skoda.vin, token }, exportCode)] as const] : [];
  }));
  return Object.fromEntries(entries.flat()) as SkodaAccessExport;
}

/** Result of sealing the access with an export code: the sealed access, or why it failed */
type Sealed = { exportCode: string; access: SkodaAccessExport | null; error: unknown };

/**
 * Optional Škoda access for sync export. Including it creates a new one-time export code,
 * and every available token is sealed with that code. A locked vault must be unlocked first.
 */
export function useSkodaAccessExport(cars: Car[]) {
  const { baseUrl } = useSkodaProxy();
  const { isProtected, isUnlocked, getToken } = useSkodaVault();
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [sealed, setSealed] = useState<Sealed | null>(null);

  const needsUnlock = exportCode !== null && isProtected && !isUnlocked;

  useEffect(() => {
    if (!exportCode || needsUnlock) return;
    let cancelled = false;
    void sealAll(cars, getToken, exportCode).then(
      access => !cancelled && setSealed({ exportCode, access, error: null }),
      (error: unknown) => !cancelled && setSealed({ exportCode, access: null, error }),
    );
    return () => { cancelled = true; };
  }, [cars, exportCode, getToken, needsUnlock]);

  const current = exportCode !== null && !needsUnlock && sealed?.exportCode === exportCode ? sealed : null;
  const access = current?.access ?? null;

  return {
    /** There are linked cars whose access could be exported */
    available: baseUrl !== null && cars.some(car => car.skoda),
    included: exportCode !== null,
    setIncluded: (included: boolean) => setExportCode(included ? generateExportCode() : null),
    exportCode,
    needsUnlock,
    sealing: exportCode !== null && !needsUnlock && current === null,
    /** Sealing failed; including the access again retries with a new code */
    error: current?.error ?? null,
    /** The access is included and sealed, or not included at all: the export can be shown */
    ready: exportCode === null || access !== null,
    /** Sealed tokens by car id; empty until they are sealed */
    access: access ?? NO_ACCESS,
  };
}

export type SkodaAccessExportState = ReturnType<typeof useSkodaAccessExport>;
