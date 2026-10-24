import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { fetchSkodaVehicle, issueSkodaToken, SkodaProxyError, type SkodaToken, type SkodaVehicle } from '@/api';
import { type Car, type SkodaLink, useCars, useSkodaProxy, useSkodaVault } from '@/contexts';
import { getSkodaLinkStatus, type SkodaLinkStatus } from '@/utils';

import { skodaQueryKeys, useSkodaVehicleQuery } from './useSkodaVehicleQuery';

/** A token issued for a car that isn't added yet, with the vehicle data read with it */
export type SkodaLookup = {
  issued: SkodaToken;
  vehicle: SkodaVehicle;
};

/**
 * Link and unlink cars to Škoda vehicles.
 * The Škoda API key is only sent to the proxy to issue a token; it is never stored.
 * With password protection on, `password` is required and the token goes into the vault.
 */
export function useSkodaLink() {
  const queryClient = useQueryClient();
  const { addCar, updateCar } = useCars();
  const { baseUrl } = useSkodaProxy();
  const { isProtected, unlock, updateVault } = useSkodaVault();

  const requireBaseUrl = useCallback(() => {
    if (!baseUrl) throw new SkodaProxyError(0, 'network-error', 'The Škoda proxy is not configured');
    return baseUrl;
  }, [baseUrl]);

  const clearVehicleData = useCallback((carId: string) => {
    queryClient.removeQueries({ queryKey: skodaQueryKeys.forCar(carId) });
  }, [queryClient]);

  /** Store an issued token for a car: in the vault, or on the car when protection is off */
  const storeToken = useCallback(async (carId: string, issued: SkodaToken, proxyUrl: string, password: string) => {
    const link: SkodaLink = { vin: issued.vin, expiresAt: issued.expiresAt, proxyUrl };
    if (isProtected) {
      await updateVault(password, tokens => ({ ...tokens, [carId]: { vin: issued.vin, token: issued.token } }));
      updateCar(carId, { skoda: link });
    } else {
      updateCar(carId, { skoda: { ...link, token: issued.token } });
    }
    clearVehicleData(carId);
  }, [clearVehicleData, isProtected, updateCar, updateVault]);

  const link = useCallback(async (car: Car, vin: string, apiKey: string, password = '') => {
    const proxyUrl = requireBaseUrl();
    // The password is checked before the key is exchanged, so a typo doesn't use up a token issuance
    if (isProtected) await unlock(password);
    await storeToken(car.id, await issueSkodaToken(proxyUrl, apiKey, vin), proxyUrl, password);
  }, [isProtected, requireBaseUrl, storeToken, unlock]);

  /** Issue a token for a car that isn't added yet and read its name with it */
  const lookUp = useCallback(async (vin: string, apiKey: string, password = ''): Promise<SkodaLookup> => {
    const proxyUrl = requireBaseUrl();
    if (isProtected) await unlock(password);
    const issued = await issueSkodaToken(proxyUrl, apiKey, vin);
    return { issued, vehicle: await fetchSkodaVehicle(proxyUrl, issued.token, issued.vin) };
  }, [isProtected, requireBaseUrl, unlock]);

  /** Add a car linked with the token from `lookUp` */
  const addLinkedCar = useCallback(async (
    car: Omit<Car, 'id' | 'skoda'>,
    { issued }: SkodaLookup,
    password = '',
  ): Promise<Car> => {
    const proxyUrl = requireBaseUrl();
    const added = addCar(car);
    await storeToken(added.id, issued, proxyUrl, password);
    return added;
  }, [addCar, requireBaseUrl, storeToken]);

  const unlink = useCallback(async (car: Car, password = '') => {
    if (isProtected) {
      await updateVault(password, tokens => {
        const next = { ...tokens };
        delete next[car.id];
        return next;
      });
    }
    updateCar(car.id, { skoda: undefined });
    clearVehicleData(car.id);
  }, [clearVehicleData, isProtected, updateCar, updateVault]);

  return { link, lookUp, addLinkedCar, unlink, requiresPassword: isProtected };
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
