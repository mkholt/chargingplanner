/**
 * Error codes for calculation errors.
 * Uses const object pattern (like LS_KEYS) for consistency.
 */
export const CALCULATION_ERROR_CODES = {
  /** No price data available for the selected time window */
  NO_PRICE_DATA: 'no_price_data',
  /** The time window is too short for any charging */
  WINDOW_TOO_SHORT: 'window_too_short',
  /** Prices not yet published (typically before 13:00 for next day) */
  PRICES_NOT_PUBLISHED: 'prices_not_published',
  /** Unable to calculate optimal window (generic fallback) */
  CALCULATION_FAILED: 'calculation_failed',
  /** End percentage must be greater than start percentage */
  END_LESS_THAN_START: 'end_less_than_start',
  /** Battery size or charging speed must be positive */
  INVALID_POSITIVE_VALUES: 'invalid_positive_values',
} as const;

/** Type for calculation error codes */
export type CalculationErrorCode = (typeof CALCULATION_ERROR_CODES)[keyof typeof CALCULATION_ERROR_CODES];
