import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { fetchSkodaVehicle, issueSkodaToken, SkodaProxyError, type SkodaToken, type SkodaVehicle } from '@/api';
import { type Car, useCars, useSkodaProxy, useSkodaVault } from '@/contexts';
import { getSkodaLinkStatus, type SkodaLinkStatus, VaultLockedError } from '@/utils';

import { skodaQueryKeys, useSkodaVehicleQuery } from './useSkodaVehicleQuery';

/** A token issued for a car that isn't added yet, with the vehicle data read with it */
export type SkodaLookup = {
  issued: SkodaToken;
  /** The proxy that issued the token */
  proxyUrl: string;
  /** Null if the vehicle couldn't be read; the token is still usable */
  vehicle: SkodaVehicle | null;
};

/**
 * Link and unlink cars to Škoda vehicles.
 * The Škoda API key is only sent to the proxy to issue a token; it is never stored.
 * With password protection on, the vault must be unlocked first (VaultLockedError otherwise).
 */
export function useSkodaLink() {
  const queryClient = useQueryClient();
  const { addCar, deleteCar, updateCar } = useCars();
  const { baseUrl } = useSkodaProxy();
  const { isProtected, isUnlocked, storeLinks, removeToken } = useSkodaVault();

  const clearVehicleData = useCallback((carId: string) => {
    queryClient.removeQueries({ queryKey: skodaQueryKeys.forCar(carId) });
  }, [queryClient]);

  const issue = useCallback(async (vin: string, apiKey: string) => {
    if (!baseUrl) throw new SkodaProxyError(0, 'network-error', 'The Škoda proxy is not configured');
    // Checked before the key is exchanged, so that a locked vault doesn't use up a token issuance
    if (isProtected && !isUnlocked) throw new VaultLockedError();
    return { proxyUrl: baseUrl, issued: await issueSkodaToken(baseUrl, apiKey, vin) };
  }, [baseUrl, isProtected, isUnlocked]);

  const store = useCallback(async (carId: string, { issued, proxyUrl }: Omit<SkodaLookup, 'vehicle'>) => {
    await storeLinks([{ carId, link: { vin: issued.vin, expiresAt: issued.expiresAt, proxyUrl }, token: issued.token }]);
    clearVehicleData(carId);
  }, [clearVehicleData, storeLinks]);

  const link = useCallback(async (car: Car, vin: string, apiKey: string) => {
    await store(car.id, await issue(vin, apiKey));
  }, [issue, store]);

  /** Issue a token for a car that isn't added yet and read its name with it */
  const lookUp = useCallback(async (vin: string, apiKey: string): Promise<SkodaLookup> => {
    const { proxyUrl, issued } = await issue(vin, apiKey);
    // The token is kept even if the vehicle can't be read: issuing another one would need the key again
    const vehicle = await fetchSkodaVehicle(proxyUrl, issued.token, issued.vin).catch(() => null);
    return { issued, proxyUrl, vehicle };
  }, [issue]);

  /** Add a car linked with the token from `lookUp`. The car isn't kept if the token can't be stored. */
  const addLinkedCar = useCallback(async (car: Omit<Car, 'id' | 'skoda'>, lookup: SkodaLookup): Promise<Car> => {
    const added = addCar(car);
    try {
      await store(added.id, lookup);
    } catch (e) {
      deleteCar(added.id);
      throw e;
    }
    return added;
  }, [addCar, deleteCar, store]);

  const unlink = useCallback(async (car: Car) => {
    await removeToken(car.id);
    updateCar(car.id, { skoda: undefined });
    clearVehicleData(car.id);
  }, [clearVehicleData, removeToken, updateCar]);

  return { link, lookUp, addLinkedCar, unlink };
}

/**
 * Link status of a car, including revocation detected by an earlier vehicle request.
 * Null if the car isn't linked or the Škoda connection is turned off.
 */
export function useSkodaLinkStatus(car: Car | null): SkodaLinkStatus | null {
  const { baseUrl } = useSkodaProxy();
  const { isProtected, isUnlocked, getToken } = useSkodaVault();
  // Observe only: showing the status never triggers a request
  const { error } = useSkodaVehicleQuery(car, { observeOnly: true });
  if (!baseUrl || !car?.skoda) return null;
  return getSkodaLinkStatus(car.skoda, {
    hasToken: getToken(car) !== null,
    isLocked: isProtected && !isUnlocked,
    isRevoked: error instanceof SkodaProxyError && error.requiresRelink,
  });
}
