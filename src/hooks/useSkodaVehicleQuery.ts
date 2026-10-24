import { useQuery } from '@tanstack/react-query';

import { fetchSkodaVehicle, SkodaProxyError, type SkodaVehicle } from '@/api';
import { type Car, useSkodaProxy, useSkodaVault } from '@/contexts';
import { QUERY_TIMING } from '@/utils';

// Query key factory for Škoda vehicle data.
// The key never contains the token; these queries are also excluded from the persisted query cache.
export const skodaQueryKeys = {
  all: ['skoda'] as const,
  forCar: (carId: string | null) => ['skoda', 'vehicle', carId] as const,
  vehicle: (carId: string | null, link: { baseUrl: string | null; vin?: string; expiresAt?: string }) =>
    ['skoda', 'vehicle', carId, link] as const,
};

/** Battery levels to pre-fill the input form with */
export type ChargePrefill = {
  startPercent?: number;
  endPercent?: number;
  /** The car is already charged to its charge limit, so there is no useful start % */
  atChargeLimit: boolean;
};

/** Start % from the current state of charge, target % from the car's charge limit */
export function getChargePrefill(vehicle: SkodaVehicle | undefined): ChargePrefill | null {
  const charging = vehicle?.charging;
  const stateOfCharge = charging?.status?.battery?.stateOfChargeInPercent;
  const target = charging?.settings?.targetStateOfChargeInPercent;
  if (stateOfCharge === undefined && target === undefined) return null;
  if (stateOfCharge !== undefined && target !== undefined && stateOfCharge >= target) {
    return { endPercent: target, atChargeLimit: true };
  }
  return { startPercent: stateOfCharge, endPercent: target, atChargeLimit: false };
}

/**
 * Live vehicle data for a car linked to Škoda.
 * Disabled when the proxy is off, the car isn't linked, its access has expired, or its token isn't available
 * (e.g. vault locked).
 * With `observeOnly`, no request is made; the hook only reflects data or errors already in the cache.
 */
export function useSkodaVehicleQuery(car: Car | null, { observeOnly = false }: { observeOnly?: boolean } = {}) {
  const { baseUrl } = useSkodaProxy();
  const { getToken } = useSkodaVault();
  const token = getToken(car);
  const link = car?.skoda;

  return useQuery({
    queryKey: skodaQueryKeys.vehicle(car?.id ?? null, { baseUrl, vin: link?.vin, expiresAt: link?.expiresAt }),
    queryFn: () => fetchSkodaVehicle(baseUrl!, token!, link!.vin),
    // A function, so the expiry is checked when the query would run rather than during render
    enabled: () => !observeOnly && baseUrl !== null && token !== null && link !== undefined
      && Date.parse(link.expiresAt) > Date.now(),
    staleTime: QUERY_TIMING.skoda.staleTime,
    gcTime: QUERY_TIMING.skoda.gcTime,
    // Client errors (revoked key, wrong VIN, rate limit) won't go away by retrying
    retry: (failureCount, error) =>
      !(error instanceof SkodaProxyError && error.status >= 400 && error.status < 500) && failureCount < 2,
  });
}
