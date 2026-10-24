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

/**
 * Optional Škoda access for sync export. Including it creates a new one-time export code,
 * and every available token is sealed with that code. A locked vault must be unlocked first.
 */
export function useSkodaAccessExport(cars: Car[]) {
  const { baseUrl } = useSkodaProxy();
  const { isProtected, isUnlocked, getToken } = useSkodaVault();
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [sealed, setSealed] = useState<{ exportCode: string; access: SkodaAccessExport } | null>(null);

  const needsUnlock = exportCode !== null && isProtected && !isUnlocked;

  useEffect(() => {
    if (!exportCode || needsUnlock) return;
    let cancelled = false;
    void sealAll(cars, getToken, exportCode).then(access => {
      if (!cancelled) setSealed({ exportCode, access });
    });
    return () => { cancelled = true; };
  }, [cars, exportCode, getToken, needsUnlock]);

  const ready = exportCode !== null && !needsUnlock && sealed?.exportCode === exportCode;

  return {
    /** There are linked cars whose access could be exported */
    available: baseUrl !== null && cars.some(car => car.skoda),
    included: exportCode !== null,
    setIncluded: (included: boolean) => setExportCode(included ? generateExportCode() : null),
    exportCode,
    needsUnlock,
    sealing: exportCode !== null && !needsUnlock && !ready,
    /** Sealed tokens by car id; empty until they are sealed */
    access: ready ? sealed.access : NO_ACCESS,
  };
}

export type SkodaAccessExportState = ReturnType<typeof useSkodaAccessExport>;
