import { useEffect, useRef, useState } from 'react';

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
 * Locking the vault drops the code and the sealed access; unlocking seals again with a new code.
 */
export function useSkodaAccessExport(cars: Car[]) {
  const { baseUrl } = useSkodaProxy();
  const { isProtected, isUnlocked, getToken } = useSkodaVault();
  const [included, setIncluded] = useState(false);
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const codeRef = useRef<string | null>(null);

  const locked = isProtected && !isUnlocked;
  const active = included && !locked;

  // Together, the code and the sealed access give the tokens, so neither outlives a lock
  if (!active && sealed !== null) setSealed(null);

  useEffect(() => {
    if (!active) {
      codeRef.current = null;
      return;
    }
    codeRef.current ??= generateExportCode();
    const exportCode = codeRef.current;
    let cancelled = false;
    void sealAll(cars, getToken, exportCode).then(
      access => !cancelled && setSealed({ exportCode, access, error: null }),
      (error: unknown) => !cancelled && setSealed({ exportCode, access: null, error }),
    );
    return () => { cancelled = true; };
  }, [active, cars, getToken]);

  const current = active ? sealed : null;
  const access = current?.access ?? null;

  return {
    /** There are linked cars whose access could be exported */
    available: baseUrl !== null && cars.some(car => car.skoda),
    included,
    setIncluded,
    exportCode: current?.exportCode ?? null,
    needsUnlock: included && locked,
    sealing: active && current === null,
    /** Sealing failed; including the access again retries with a new code */
    error: current?.error ?? null,
    /** The access is included and sealed, or not included at all: the export can be shown */
    ready: !included || access !== null,
    /** Sealed tokens by car id; empty until they are sealed */
    access: access ?? NO_ACCESS,
  };
}

export type SkodaAccessExportState = ReturnType<typeof useSkodaAccessExport>;
