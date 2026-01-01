import { useCallback, useState } from 'react';

import { LS_KEYS } from '@/utils';

type LSKey = (typeof LS_KEYS)[keyof typeof LS_KEYS];

/**
 * Hook for persisting state in localStorage with type safety.
 * Returns a tuple of [value, setValue] similar to useState.
 */
export function useLocalStorage<T>(
  key: LSKey,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use the provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

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

  return [storedValue, setValue];
}
