import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { skodaQueryKeys, useLocalStorage } from '@/hooks';
import {
  LS_KEYS,
  MS_PER_MINUTE,
  openWithPassword,
  sealWithPassword,
  VAULT_MIN_PASSWORD_LENGTH,
} from '@/utils';

import { type Car, useCars } from './CarsContext';

// ============ Types ============

/** Decrypted vault contents, keyed by car id */
export type VaultTokens = Record<string, { vin: string; token: string }>;

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
  /** The usable token for a car: plain from the profile, or from the unlocked vault. Null if not available. */
  getToken: (car: Car | null) => string | null;
  /** Turn on protection: moves all plain tokens into a new vault */
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
  reset: () => void;
  /** Encrypt each car's token on its own with the vault password, for sync export */
  sealTokensForExport: (password: string, carIds: string[]) => Promise<Record<string, string>>;
};

// ============ Context ============

const SkodaVaultContext = createContext<SkodaVaultContextType | null>(null);

const DEFAULT_STATE: VaultState = { jwe: null, autoLockMinutes: 15 };

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

function assertPasswordLength(password: string): void {
  if (password.length < VAULT_MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${VAULT_MIN_PASSWORD_LENGTH} characters`);
  }
}

// ============ Provider ============

export const SkodaVaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { cars, updateAllCars } = useCars();
  const { value: vault, setValue: setVault } = useLocalStorage<VaultState>(LS_KEYS.SKODA_VAULT, DEFAULT_STATE);
  // Decrypted tokens live only in memory and are never written back to storage
  const [tokens, setTokens] = useState<VaultTokens | null>(null);
  const [unlockSkipped, setUnlockSkipped] = useState(false);

  const isProtected = vault.jwe !== null;
  const isUnlocked = isProtected && tokens !== null;

  const lock = useCallback(() => {
    setTokens(null);
    // Vehicle data read with the vault tokens is hidden again as well
    queryClient.removeQueries({ queryKey: skodaQueryKeys.all });
  }, [queryClient]);

  const saveVault = useCallback((next: VaultTokens, jwe: string) => {
    setVault(prev => ({ ...prev, jwe }));
    setTokens(next);
    setUnlockSkipped(false);
  }, [setVault]);

  const openVault = useCallback((password: string) => {
    if (!vault.jwe) throw new Error('Password protection is off');
    return openWithPassword<VaultTokens>(vault.jwe, password);
  }, [vault.jwe]);

  const getToken = useCallback((car: Car | null) => {
    if (!car?.skoda) return null;
    if (!isProtected) return car.skoda.token ?? null;
    const entry = tokens?.[car.id];
    return entry && entry.vin === car.skoda.vin ? entry.token : null;
  }, [isProtected, tokens]);

  const enable = useCallback(async (password: string) => {
    assertPasswordLength(password);
    const next: VaultTokens = {};
    for (const car of cars) {
      if (car.skoda?.token) next[car.id] = { vin: car.skoda.vin, token: car.skoda.token };
    }
    saveVault(next, await sealWithPassword(next, password));
    updateAllCars(car => (car.skoda ? { ...car, skoda: { vin: car.skoda.vin, expiresAt: car.skoda.expiresAt } } : car));
  }, [cars, saveVault, updateAllCars]);

  const unlock = useCallback(async (password: string) => {
    setTokens(await openVault(password));
    setUnlockSkipped(false);
  }, [openVault]);

  const updateVault = useCallback(async (
    password: string,
    change: (current: VaultTokens) => VaultTokens | Promise<VaultTokens>,
  ) => {
    const changed = await change(await openVault(password));
    // Drop tokens of cars that were deleted since they were stored
    const carIds = new Set(cars.map(car => car.id));
    const next = Object.fromEntries(Object.entries(changed).filter(([id]) => carIds.has(id)));
    saveVault(next, await sealWithPassword(next, password));
  }, [cars, openVault, saveVault]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    assertPasswordLength(newPassword);
    const current = await openVault(currentPassword);
    saveVault(current, await sealWithPassword(current, newPassword));
  }, [openVault, saveVault]);

  const disable = useCallback(async (password: string) => {
    const current = await openVault(password);
    updateAllCars(car => {
      const entry = current[car.id];
      return car.skoda && entry?.vin === car.skoda.vin ? { ...car, skoda: { ...car.skoda, token: entry.token } } : car;
    });
    setVault(prev => ({ ...prev, jwe: null }));
    setTokens(null);
  }, [openVault, setVault, updateAllCars]);

  const reset = useCallback(() => {
    setVault(prev => ({ ...prev, jwe: null }));
    lock();
  }, [lock, setVault]);

  const sealTokensForExport = useCallback(async (password: string, carIds: string[]) => {
    const current = await openVault(password);
    const sealed: Record<string, string> = {};
    for (const id of carIds) {
      if (current[id]) sealed[id] = await sealWithPassword(current[id], password);
    }
    return sealed;
  }, [openVault]);

  const setAutoLockMinutes = useCallback((autoLockMinutes: AutoLockMinutes) => {
    setVault(prev => ({ ...prev, autoLockMinutes }));
  }, [setVault]);

  // Auto-lock after a period without user activity. A hidden tab has no activity, and browsers may
  // delay timers in background tabs, so the elapsed time is also checked when the tab becomes visible.
  useEffect(() => {
    if (!isUnlocked || vault.autoLockMinutes === null) return;

    const timeoutMs = vault.autoLockMinutes * MS_PER_MINUTE;
    let lastActivity = Date.now();
    let timer = setTimeout(lock, timeoutMs);

    const onActivity = () => {
      lastActivity = Date.now();
      clearTimeout(timer);
      timer = setTimeout(lock, timeoutMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity >= timeoutMs) lock();
    };

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, onActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isUnlocked, vault.autoLockMinutes, lock]);

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
        sealTokensForExport,
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
