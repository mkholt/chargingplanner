import { useMemo } from 'react';

import type { PricesApiResponse } from '@/types';
import {
  buildTimeline,
  CALCULATION_ERROR_CODES,
  findOptimalChargingWindow,
  MS_PER_MINUTE,
  type CalculationErrorCode,
  type ChargingResult,
  type PriceSlot,
} from '@/utils';

// ============ Types ============

export type FormInput = {
  startPercent: number;
  endPercent: number;
  batterySize: number;
  chargingSpeed: number;
  earliest: string;
  latest: string;
};

export type CalculationError =
  | { type: 'no_input' }
  | { type: 'no_timeline'; code: CalculationErrorCode }
  | { type: 'time_too_short'; availableHours: number; requiredHours: number }
  | { type: 'invalid_params'; code: CalculationErrorCode }
  | { type: 'incomplete_data'; validUntil: Date };

export type CalculationResults = {
  result: ChargingResult | null;
  slots: PriceSlot[];
  intervalMinutes: number;
  chargingSpeed: number | undefined;
  error: CalculationError | null;
  /** Warning when user's window extends beyond available data */
  warning: { type: 'partial_data'; validUntil: Date } | null;
};

// ============ Calculation Logic ============

function calculateResults(
  input: FormInput | null,
  priceData: PricesApiResponse | undefined
): CalculationResults {
  const emptyResults: CalculationResults = {
    result: null,
    slots: [],
    intervalMinutes: 60,
    chargingSpeed: undefined,
    error: null,
    warning: null,
  };

  if (!input || !priceData) {
    return { ...emptyResults, error: { type: 'no_input' } };
  }

  const earliestDate = new Date(input.earliest);
  const latestDate = new Date(input.latest);

  // Build timeline of prices from now to end of available data
  // Resolution is determined by the API response (based on aggregation param we sent)
  const timeline = buildTimeline(earliestDate, latestDate, priceData);
  if (!timeline) {
    return {
      ...emptyResults,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'no_timeline', code: CALCULATION_ERROR_CODES.NO_PRICE_DATA },
    };
  }

  // Validate interval duration using the timeline's interval size
  const msPerInterval = timeline.intervalMinutes * MS_PER_MINUTE;
  const intervalCount = Math.floor((latestDate.getTime() - earliestDate.getTime()) / msPerInterval) + 1;
  if (intervalCount <= 0) {
    return {
      ...emptyResults,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'no_timeline', code: CALCULATION_ERROR_CODES.WINDOW_TOO_SHORT },
    };
  }

  // Check if we have valid price data using timestamp comparison
  const hasValidData = timeline.slots.some(s => s.hasData);
  if (!hasValidData) {
    return {
      ...emptyResults,
      slots: timeline.slots,
      intervalMinutes: timeline.intervalMinutes,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'no_timeline', code: CALCULATION_ERROR_CODES.PRICES_NOT_PUBLISHED },
    };
  }

  // Use timestamp-based validDataEndTime from timeline
  const validDataEndTime = timeline.validDataEndTime;

  // Check if user's window extends beyond available data (using timestamps)
  let warning: CalculationResults['warning'] = null;
  if (latestDate > validDataEndTime && earliestDate < validDataEndTime) {
    warning = { type: 'partial_data', validUntil: validDataEndTime };
  }

  // If the entire charging window is beyond valid data, show error
  if (earliestDate >= validDataEndTime) {
    return {
      ...emptyResults,
      slots: timeline.slots,
      intervalMinutes: timeline.intervalMinutes,
      chargingSpeed: input.chargingSpeed,
      error: { type: 'incomplete_data', validUntil: validDataEndTime },
    };
  }

  // Calculate required charging duration for error messages
  const kWhNeeded = ((input.endPercent - input.startPercent) / 100) * input.batterySize;
  const requiredHours = kWhNeeded / input.chargingSpeed;

  // Calculate available hours using timestamps
  const effectiveLatestEnd = new Date(Math.min(latestDate.getTime(), validDataEndTime.getTime()));
  const availableMs = effectiveLatestEnd.getTime() - earliestDate.getTime();
  const availableHours = availableMs / (60 * 60 * 1000);

  // Find optimal charging window using timestamp-based interface
  const calcResult = findOptimalChargingWindow({
    startPercent: input.startPercent,
    endPercent: input.endPercent,
    batterySize: input.batterySize,
    chargingSpeed: input.chargingSpeed,
    slots: timeline.slots,
    intervalMinutes: timeline.intervalMinutes,
    earliestStart: earliestDate,
    latestEnd: effectiveLatestEnd,
  });

  // Determine error if calculation failed
  let error: CalculationError | null = null;
  if (!calcResult) {
    if (input.endPercent <= input.startPercent) {
      error = { type: 'invalid_params', code: CALCULATION_ERROR_CODES.END_LESS_THAN_START };
    } else if (input.chargingSpeed <= 0 || input.batterySize <= 0) {
      error = { type: 'invalid_params', code: CALCULATION_ERROR_CODES.INVALID_POSITIVE_VALUES };
    } else if (requiredHours > availableHours) {
      error = { type: 'time_too_short', availableHours, requiredHours };
    } else {
      error = { type: 'no_timeline', code: CALCULATION_ERROR_CODES.CALCULATION_FAILED };
    }
  }

  return {
    result: calcResult,
    slots: timeline.slots,
    intervalMinutes: timeline.intervalMinutes,
    chargingSpeed: input.chargingSpeed,
    error,
    warning,
  };
}

// ============ Hook ============

/**
 * Hook that calculates optimal charging results from form input and price data.
 * Memoizes the expensive calculation to avoid recomputing on every render.
 */
export function useChargingResults(
  formInput: FormInput | null,
  priceData: PricesApiResponse | undefined
): CalculationResults {
  return useMemo(
    () => calculateResults(formInput, priceData),
    [formInput, priceData]
  );
}
