import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { skodaQueryKeys, useIdleTimeout, useLocalStorage } from '@/hooks';
import {
  assertPasswordLength,
  LS_KEYS,
  MS_PER_MINUTE,
  openWithPassword,
  sealWithPassword,
} from '@/utils';

import { type Car, useCars } from './CarsContext';
import { useSkodaProxy } from './SkodaProxyContext';

// ============ Types ============

/** Decrypted vault contents, keyed by car id */
type VaultTokens = Record<string, { vin: string; token: string }>;

/** Minutes of inactivity before the vault locks again; null keeps it unlocked until the tab is closed */
export type AutoLockMinutes = 5 | 15 | 60 | null;

type VaultState = {
  /** Compact JWE (PBES2) holding VaultTokens; null when password protection is off */
  jwe: string | null;
  autoLockMinutes: AutoLockMinutes;
};

type SkodaVaultContextType = {
  isProtected: boolean;
  isUnlocked: boolean;
  /** The user chose to continue without unlocking for this session */
  unlockSkipped: boolean;
  autoLockMinutes: AutoLockMinutes;
  setAutoLockMinutes: (minutes: AutoLockMinutes) => void;
  /**
   * The usable token for a car: plain from the profile, or from the unlocked vault.
   * Null if not available, or if the token was issued by another proxy than the configured one.
   */
  getToken: (car: Car | null) => string | null;
  /** Turn on protection: moves all plain tokens into a new vault. Throws PasswordTooShortError. */
  enable: (password: string) => Promise<void>;
  /** Throws WrongPasswordError */
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  skipUnlock: () => void;
  /** Decrypt, change and re-encrypt the vault. Throws WrongPasswordError before `change` runs. */
  updateVault: (password: string, change: (tokens: VaultTokens) => VaultTokens | Promise<VaultTokens>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Turn off protection: moves the tokens back to the car profiles */
  disable: (password: string) => Promise<void>;
  /** Forgot password: delete the vault. Linked cars keep their VIN and need to be linked again. */
  reset: () => Promise<void>;
};

// ============ Context ============

const SkodaVaultContext = createContext<SkodaVaultContextType | null>(null);

const DEFAULT_STATE: VaultState = { jwe: null, autoLockMinutes: 15 };

// ============ Provider ============

export const SkodaVaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { cars, updateAllCars } = useCars();
  const { proxyUrl } = useSkodaProxy();
  const { value: vault, setValue: setVault } = useLocalStorage<VaultState>(LS_KEYS.SKODA_VAULT, DEFAULT_STATE);
  // Decrypted tokens live only in memory and are never written back to storage
  const [tokens, setTokens] = useState<VaultTokens | null>(null);
  const [unlockSkipped, setUnlockSkipped] = useState(false);

  // Changes are encrypted asynchronously. They run one after another, and always start from the latest
  // vault (not the one of the render that started them), so two changes can't overwrite each other.
  const jweRef = useRef(vault.jwe);
  const carIdsRef = useRef(new Set(cars.map(car => car.id)));
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  // Increased by every lock: tokens decrypted before a lock are not put back in memory after it
  const lockEpochRef = useRef(0);

  useEffect(() => {
    jweRef.current = vault.jwe;
  }, [vault.jwe]);

  useEffect(() => {
    carIdsRef.current = new Set(cars.map(car => car.id));
  }, [cars]);

  const isProtected = vault.jwe !== null;
  const isUnlocked = isProtected && tokens !== null;

  const serialize = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const result = queueRef.current.then(task);
    queueRef.current = result.catch(() => undefined);
    return result;
  }, []);

  const lock = useCallback(() => {
    lockEpochRef.current++;
    setTokens(null);
    // Vehicle data read with the vault tokens is hidden again as well
    queryClient.removeQueries({ queryKey: skodaQueryKeys.all });
  }, [queryClient]);

  const writeJwe = useCallback((jwe: string | null) => {
    jweRef.current = jwe;
    setVault(prev => ({ ...prev, jwe }));
  }, [setVault]);

  /** Show decrypted tokens, unless the vault was locked since `epoch` */
  const showTokens = useCallback((next: VaultTokens, epoch: number) => {
    if (epoch !== lockEpochRef.current) return;
    setTokens(next);
    setUnlockSkipped(false);
  }, []);

  const openVault = useCallback((password: string) => {
    if (!jweRef.current) throw new Error('Password protection is off');
    return openWithPassword<VaultTokens>(jweRef.current, password);
  }, []);

  const getToken = useCallback((car: Car | null) => {
    const link = car?.skoda;
    if (!car || !link || link.proxyUrl !== proxyUrl) return null;
    if (!isProtected) return link.token ?? null;
    const entry = tokens?.[car.id];
    return entry && entry.vin === link.vin ? entry.token : null;
  }, [isProtected, proxyUrl, tokens]);

  const enable = useCallback((password: string) => serialize(async () => {
    assertPasswordLength(password);
    const epoch = lockEpochRef.current;
    const next: VaultTokens = {};
    for (const car of cars) {
      if (car.skoda?.token) next[car.id] = { vin: car.skoda.vin, token: car.skoda.token };
    }
    writeJwe(await sealWithPassword(next, password));
    showTokens(next, epoch);
    updateAllCars(car => {
      if (!car.skoda) return car;
      const link = { ...car.skoda };
      delete link.token;
      return { ...car, skoda: link };
    });
  }), [cars, serialize, showTokens, updateAllCars, writeJwe]);

  const unlock = useCallback(async (password: string) => {
    const epoch = lockEpochRef.current;
    showTokens(await openVault(password), epoch);
  }, [openVault, showTokens]);

  const updateVault = useCallback((
    password: string,
    change: (current: VaultTokens) => VaultTokens | Promise<VaultTokens>,
  ) => serialize(async () => {
    const epoch = lockEpochRef.current;
    const current = await openVault(password);
    const changed = await change(current);
    // Drop tokens of cars that were deleted since they were stored. Entries added by this change are kept,
    // even for a car that was added so recently that it isn't in `cars` yet.
    const next = Object.fromEntries(
      Object.entries(changed).filter(([id]) => carIdsRef.current.has(id) || !(id in current))
    );
    writeJwe(await sealWithPassword(next, password));
    showTokens(next, epoch);
  }), [openVault, serialize, showTokens, writeJwe]);

  const changePassword = useCallback((currentPassword: string, newPassword: string) => serialize(async () => {
    assertPasswordLength(newPassword);
    const epoch = lockEpochRef.current;
    const current = await openVault(currentPassword);
    writeJwe(await sealWithPassword(current, newPassword));
    showTokens(current, epoch);
  }), [openVault, serialize, showTokens, writeJwe]);

  const disable = useCallback((password: string) => serialize(async () => {
    const current = await openVault(password);
    updateAllCars(car => {
      const entry = current[car.id];
      return car.skoda && entry?.vin === car.skoda.vin ? { ...car, skoda: { ...car.skoda, token: entry.token } } : car;
    });
    writeJwe(null);
    lock();
  }), [lock, openVault, serialize, updateAllCars, writeJwe]);

  const reset = useCallback(() => serialize(async () => {
    writeJwe(null);
    lock();
  }), [lock, serialize, writeJwe]);

  const setAutoLockMinutes = useCallback((autoLockMinutes: AutoLockMinutes) => {
    setVault(prev => ({ ...prev, autoLockMinutes }));
  }, [setVault]);

  useIdleTimeout(lock, isUnlocked && vault.autoLockMinutes !== null ? vault.autoLockMinutes * MS_PER_MINUTE : null);

  return (
    <SkodaVaultContext.Provider
      value={{
        isProtected,
        isUnlocked,
        unlockSkipped,
        autoLockMinutes: vault.autoLockMinutes,
        setAutoLockMinutes,
        getToken,
        enable,
        unlock,
        lock,
        skipUnlock: () => setUnlockSkipped(true),
        updateVault,
        changePassword,
        disable,
        reset,
      }}
    >
      {children}
    </SkodaVaultContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function useSkodaVault(): SkodaVaultContextType {
  const context = useContext(SkodaVaultContext);
  if (!context) {
    throw new Error('useSkodaVault must be used within a SkodaVaultProvider');
  }
  return context;
}
