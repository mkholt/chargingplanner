import { useQuery } from '@tanstack/react-query';

import { fetchSkodaVehicle, SkodaProxyError, type SkodaVehicle } from '@/api';
import { type Car, useSkodaProxy, useSkodaVault } from '@/contexts';
import { QUERY_TIMING } from '@/utils';

// Query key factory for Škoda vehicle data.
// The key never contains the token; these queries are also excluded from the persisted query cache.
export const skodaQueryKeys = {
  all: ['skoda'] as const,
  forCar: (carId: string) => ['skoda', 'vehicle', { carId }] as const,
  vehicle: (baseUrl: string | null, carId: string | null, vin: string | null, expiresAt: string | null) =>
    ['skoda', 'vehicle', { baseUrl, carId, vin, expiresAt }] as const,
};

/** Battery levels to pre-fill the input form with */
export type ChargePrefill = {
  startPercent?: number;
  endPercent?: number;
};

/** Start % from the current state of charge, target % from the car's charge limit */
export function getChargePrefill(vehicle: SkodaVehicle | undefined): ChargePrefill | null {
  const charging = vehicle?.charging;
  const stateOfCharge = charging?.status?.battery?.stateOfChargeInPercent;
  const target = charging?.settings?.targetStateOfChargeInPercent;
  if (stateOfCharge === undefined && target === undefined) return null;
  return { startPercent: stateOfCharge, endPercent: target };
}

/**
 * Live vehicle data for a car linked to Škoda.
 * Disabled when the proxy is off, the car isn't linked, or its token isn't available (e.g. vault locked).
 * With `observeOnly`, no request is made; the hook only reflects data or errors already in the cache.
 */
export function useSkodaVehicleQuery(car: Car | null, { observeOnly = false }: { observeOnly?: boolean } = {}) {
  const { baseUrl } = useSkodaProxy();
  const { getToken } = useSkodaVault();
  const token = getToken(car);
  const link = car?.skoda;

  return useQuery({
    queryKey: skodaQueryKeys.vehicle(baseUrl, car?.id ?? null, link?.vin ?? null, link?.expiresAt ?? null),
    queryFn: () => fetchSkodaVehicle(baseUrl!, token!, link!.vin),
    enabled: !observeOnly && baseUrl !== null && token !== null && link !== undefined,
    staleTime: QUERY_TIMING.skoda.staleTime,
    gcTime: QUERY_TIMING.skoda.gcTime,
    // Client errors (revoked key, wrong VIN, rate limit) won't go away by retrying
    retry: (failureCount, error) =>
      !(error instanceof SkodaProxyError && error.status >= 400 && error.status < 500) && failureCount < 2,
  });
}
