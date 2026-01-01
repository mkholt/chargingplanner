import React, { createContext, useCallback, useContext } from 'react';

import { useLocalStorage } from '@/hooks';
import { LS_KEYS } from '@/utils';

// ============ Types ============

export type DefaultTimeMode = 'now' | 'specific';

export type AppSettings = {
  /** Default earliest start: 'now' or a time string like '08:00' */
  defaultEarliest: string;
  /** Default latest end: time string like '07:00' */
  defaultLatest: string;
};

type AppSettingsContextType = {
  settings: AppSettings;
  /** Mode for earliest start (derived from defaultEarliest) */
  earliestMode: DefaultTimeMode;
  /** Time value for earliest (returns '08:00' if mode is 'now') */
  earliestTime: string;
  setDefaultEarliest: (value: string) => void;
  setDefaultLatest: (value: string) => void;
  /** Helper to toggle between 'now' and specific time */
  setEarliestMode: (mode: DefaultTimeMode, fallbackTime?: string) => void;
};

// ============ Context ============

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

// ============ Defaults ============

const DEFAULT_EARLIEST = 'now';
const DEFAULT_LATEST = '07:00';
const FALLBACK_TIME = '08:00';

// ============ Provider ============

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [defaultEarliest, setDefaultEarliest] = useLocalStorage<string>(
    LS_KEYS.DEFAULT_EARLIEST,
    DEFAULT_EARLIEST
  );
  const [defaultLatest, setDefaultLatest] = useLocalStorage<string>(
    LS_KEYS.DEFAULT_LATEST,
    DEFAULT_LATEST
  );

  // Derived state
  const earliestMode: DefaultTimeMode = defaultEarliest === 'now' ? 'now' : 'specific';
  const earliestTime = defaultEarliest === 'now' ? FALLBACK_TIME : defaultEarliest;

  const setEarliestMode = useCallback(
    (mode: DefaultTimeMode, fallbackTime = FALLBACK_TIME) => {
      if (mode === 'now') {
        setDefaultEarliest('now');
      } else {
        setDefaultEarliest(fallbackTime);
      }
    },
    [setDefaultEarliest]
  );

  const settings: AppSettings = {
    defaultEarliest,
    defaultLatest,
  };

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        earliestMode,
        earliestTime,
        setDefaultEarliest,
        setDefaultLatest,
        setEarliestMode,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSettings(): AppSettingsContextType {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
