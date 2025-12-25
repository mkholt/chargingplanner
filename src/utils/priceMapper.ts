import type { PricesApiResponse } from '@/types';

import { getLocalDateString } from './dateUtils';

/**
 * Convert API response to a map of date -> 15-minute prices.
 * Groups prices by local date and extracts the total price for each 15-minute interval.
 * Returns 96 entries per day (4 per hour).
 */
export function mapApiResponseToPrices(
  response: PricesApiResponse
): Map<string, number[]> {
  const pricesByDate = new Map<string, number[]>();

  if (!response.prices) {
    return pricesByDate;
  }

  for (const entry of response.prices) {
    if (!entry.date || entry.price?.total === undefined) {
      continue;
    }

    const date = new Date(entry.date);
    const dateKey = getLocalDateString(date);
    const hour = date.getHours();
    const minute = date.getMinutes();
    // Calculate the 15-minute interval index (0-95)
    const intervalIndex = hour * 4 + Math.floor(minute / 15);

    if (!pricesByDate.has(dateKey)) {
      // Initialize with 96 slots for 15-minute intervals
      pricesByDate.set(dateKey, new Array(96).fill(0));
    }

    const prices = pricesByDate.get(dateKey)!;
    prices[intervalIndex] = entry.price.total;
  }

  return pricesByDate;
}

/**
 * Get the price unit from the API response (e.g., "kr/kWh").
 */
export function getPriceUnit(response: PricesApiResponse): string {
  const firstPrice = response.prices?.[0]?.price;
  return firstPrice?.unit ?? 'kr/kWh';
}
