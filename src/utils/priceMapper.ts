import type { PricesApiResponse } from '@/types';

import { getLocalDateString } from './dateUtils';

export type PriceMapResult = {
  /** Map of date string -> array of prices */
  pricesByDate: Map<string, number[]>;
  /** Resolution of the data: '15m' or '1h' */
  resolution: '15m' | '1h';
  /** Number of intervals per day (96 for 15m, 24 for 1h) */
  intervalsPerDay: number;
};

/**
 * Convert API response to a map of date -> prices.
 * Detects resolution from the API response and returns appropriate arrays.
 * For 15-minute data: 96 entries per day
 * For hourly data: 24 entries per day
 */
export function mapApiResponseToPrices(response: PricesApiResponse): PriceMapResult {
  const pricesByDate = new Map<string, number[]>();

  if (!response.prices || response.prices.length === 0) {
    return { pricesByDate, resolution: '1h', intervalsPerDay: 24 };
  }

  // Detect resolution from first price entry
  const firstResolution = response.prices[0]?.resolution;
  const is15m = firstResolution === '15m';
  const intervalsPerDay = is15m ? 96 : 24;
  const resolution = is15m ? '15m' : '1h';

  for (const entry of response.prices) {
    if (!entry.date || entry.price?.total === undefined) {
      continue;
    }

    const date = new Date(entry.date);
    const dateKey = getLocalDateString(date);
    const hour = date.getHours();
    const minute = date.getMinutes();

    // Calculate interval index based on resolution
    const intervalIndex = is15m
      ? hour * 4 + Math.floor(minute / 15) // 0-95 for 15m
      : hour; // 0-23 for 1h

    if (!pricesByDate.has(dateKey)) {
      pricesByDate.set(dateKey, new Array(intervalsPerDay).fill(0));
    }

    const prices = pricesByDate.get(dateKey)!;
    prices[intervalIndex] = entry.price.total;
  }

  return { pricesByDate, resolution, intervalsPerDay };
}

/**
 * Get the price unit from the API response (e.g., "kr/kWh").
 */
export function getPriceUnit(response: PricesApiResponse): string {
  const firstPrice = response.prices?.[0]?.price;
  return firstPrice?.unit ?? 'kr/kWh';
}
