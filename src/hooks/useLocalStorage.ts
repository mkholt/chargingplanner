import { useCallback, useEffect, useRef, useState } from 'react';

import { LS_KEYS } from '@/utils';

type LSKey = (typeof LS_KEYS)[keyof typeof LS_KEYS];

export type UseLocalStorageReturn<T> = {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  clearValue: () => void;
};

/**
 * Hook for persisting state in localStorage with type safety.
 * Returns an object with { value, setValue, clearValue }.
 * Syncs across browser tabs via the storage event.
 */
export function useLocalStorage<T>(key: LSKey, initialValue: T): UseLocalStorageReturn<T> {
  // Keep initialValue in ref to avoid stale closures
  const initialValueRef = useRef(initialValue);

  // Update ref when initialValue changes (must be in effect, not during render)
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // Get initial value from localStorage or use the provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Sync state when localStorage changes in another tab
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue !== null) {
          try {
            setStoredValue(JSON.parse(e.newValue) as T);
          } catch {
            // Invalid JSON, ignore
          }
        } else {
          // Key was removed, reset to initial value
          setStoredValue(initialValueRef.current);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  // Setter that updates both state and localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch {
          // Ignore localStorage errors (e.g., quota exceeded)
        }
        return valueToStore;
      });
    },
    [key]
  );

  // Remove the key from localStorage and reset to initial value
  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage errors
    }
    setStoredValue(initialValueRef.current);
  }, [key]);

  return { value: storedValue, setValue, clearValue };
}
