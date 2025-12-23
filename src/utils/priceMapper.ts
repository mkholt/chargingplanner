import type { PricesApiResponse } from '@/types';

import { getLocalDateString } from './dateUtils';

/**
 * Convert API response to a map of date -> hourly prices.
 * Groups prices by local date and extracts the total price for each hour.
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

    if (!pricesByDate.has(dateKey)) {
      // Initialize with 24 slots (undefined becomes 0)
      pricesByDate.set(dateKey, new Array(24).fill(0));
    }

    const prices = pricesByDate.get(dateKey)!;
    prices[hour] = entry.price.total;
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
