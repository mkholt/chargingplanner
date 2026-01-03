// Time constants
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// UI constants
export const DEBOUNCE_MS = 300;

// Query cache timing constants
export const QUERY_TIMING = {
  /** Prices: fresh for 1 hour, cached for 24 hours */
  prices: {
    staleTime: MS_PER_HOUR,
    gcTime: MS_PER_DAY,
  },
  /** Static data (suppliers, companies): fresh for 24 hours, cached for 7 days */
  static: {
    staleTime: MS_PER_DAY,
    gcTime: MS_PER_DAY * 7,
  },
} as const;

// Charging efficiency (accounts for charging losses in cable, charger, and battery)
// Typical AC charging efficiency is 85-90%, we use 90% (10% loss)
export const CHARGING_EFFICIENCY = 0.9;

/** Round a number to 2 decimal places (cents precision) */
export const roundToCents = (value: number): number => Math.round(value * 100) / 100;

// Charging power options (shared between InputForm and CarManager)
export const CHARGING_POWER_OPTIONS = [
  { label: "2.3 kW (Level 1)", value: 2.3 },
  { label: "3.7 kW (1-phase)", value: 3.7 },
  { label: "7.4 kW (1-phase)", value: 7.4 },
  { label: "11 kW (3-phase)", value: 11 },
  { label: "22 kW (3-phase)", value: 22 },
] as const;

// LocalStorage keys - centralized to avoid duplication
export const LS_KEYS = {
  CARS: 'ev-cars',
  PRICE_SETTINGS: 'ev-price-settings',
  LANGUAGE: 'ev-language',
  DEFAULT_EARLIEST: 'ev-default-earliest',
  DEFAULT_LATEST: 'ev-default-latest',
  QUERY_CACHE: 'ev-price-query-cache',
} as const;
