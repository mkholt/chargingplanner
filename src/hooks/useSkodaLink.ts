import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { issueSkodaToken, SkodaProxyError, type SkodaToken } from '@/api';
import { type Car, useCars, useSkodaProxy, useSkodaVault } from '@/contexts';
import { getSkodaLinkStatus, type SkodaLinkStatus } from '@/utils';

import { skodaQueryKeys, useSkodaVehicleQuery } from './useSkodaVehicleQuery';

/**
 * Link and unlink cars to Škoda vehicles.
 * The Škoda API key is only sent to the proxy to issue a token; it is never stored.
 * With password protection on, `password` is required and the token goes into the vault.
 */
export function useSkodaLink() {
  const queryClient = useQueryClient();
  const { updateCar } = useCars();
  const { baseUrl } = useSkodaProxy();
  const { isProtected, updateVault } = useSkodaVault();

  const clearVehicleData = useCallback((carId: string) => {
    queryClient.removeQueries({ queryKey: skodaQueryKeys.forCar(carId) });
  }, [queryClient]);

  const link = useCallback(async (car: Car, vin: string, apiKey: string, password = '') => {
    if (!baseUrl) throw new SkodaProxyError(0, 'network-error', 'The Škoda proxy is not configured');

    if (isProtected) {
      let issued: SkodaToken | undefined;
      // The password is checked before the key is exchanged, so a typo doesn't use up a token issuance
      await updateVault(password, async tokens => {
        issued = await issueSkodaToken(baseUrl, apiKey, vin);
        return { ...tokens, [car.id]: { vin: issued.vin, token: issued.token } };
      });
      updateCar(car.id, { skoda: { vin: issued!.vin, expiresAt: issued!.expiresAt } });
    } else {
      const issued = await issueSkodaToken(baseUrl, apiKey, vin);
      updateCar(car.id, { skoda: { vin: issued.vin, expiresAt: issued.expiresAt, token: issued.token } });
    }
    clearVehicleData(car.id);
  }, [baseUrl, clearVehicleData, isProtected, updateCar, updateVault]);

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

  return { link, unlink, requiresPassword: isProtected };
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
