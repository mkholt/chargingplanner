import type { PricesApiResponse, PriceEntry } from '@/types';

import { MS_PER_DAY } from './constants';
import { getLocalDateString } from './dateUtils';
import { mapApiResponseToPrices } from './priceMapper';

// Seeded random for consistent mock data per day
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate a realistic hourly price based on time of day.
 * Prices range from ~1.50-2.50 kr/kWh with:
 * - Lower prices at night (00:00-06:00)
 * - Higher prices during peak hours (17:00-20:00)
 */
function generateHourlyPrice(hour: number, daySeed: number): number {
  const basePrice = 2.0; // Base price in kr/kWh

  // Time-of-day adjustment
  let adjustment = 0;
  if (hour >= 0 && hour < 6) {
    // Night: cheaper (-0.30 to -0.50)
    adjustment = -0.40;
  } else if (hour >= 6 && hour < 9) {
    // Morning ramp-up
    adjustment = -0.10;
  } else if (hour >= 9 && hour < 17) {
    // Daytime: moderate
    adjustment = 0.10;
  } else if (hour >= 17 && hour < 21) {
    // Peak evening: expensive (+0.30 to +0.50)
    adjustment = 0.40;
  } else {
    // Late evening: settling down
    adjustment = 0.05;
  }

  // Add some random variation (-0.15 to +0.15)
  const randomVariation = (seededRandom(daySeed + hour) - 0.5) * 0.30;

  const price = basePrice + adjustment + randomVariation;

  // Clamp to realistic range and round to 6 decimal places
  return Math.round(Math.max(1.50, Math.min(2.50, price)) * 1000000) / 1000000;
}

/**
 * Generate mock API response with 48 hours of price data (today + tomorrow).
 */
export function getMockApiResponse(): PricesApiResponse {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + MS_PER_DAY);

  const prices: PriceEntry[] = [];

  // Generate prices for today
  const todaySeed = today.getTime();
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(today);
    date.setHours(hour, 0, 0, 0);

    prices.push({
      date: date.toISOString(),
      price: {
        total: generateHourlyPrice(hour, todaySeed),
        unit: 'kr/kWh',
      },
      forecast: false,
      resolution: '1h',
    });
  }

  // Generate prices for tomorrow
  const tomorrowSeed = tomorrow.getTime();
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(tomorrow);
    date.setHours(hour, 0, 0, 0);

    prices.push({
      date: date.toISOString(),
      price: {
        total: generateHourlyPrice(hour, tomorrowSeed),
        unit: 'kr/kWh',
      },
      forecast: false,
      resolution: '1h',
    });
  }

  return {
    priceArea: 'DK1',
    prices,
  };
}

// Cache the mapped prices
let cachedPrices: Map<string, number[]> | null = null;
let cacheDate: string | null = null;

function getCachedPrices(): Map<string, number[]> {
  const today = getLocalDateString(new Date());

  // Invalidate cache if day changed
  if (cacheDate !== today) {
    cachedPrices = null;
    cacheDate = today;
  }

  if (!cachedPrices) {
    cachedPrices = mapApiResponseToPrices(getMockApiResponse());
  }

  return cachedPrices;
}

/**
 * Get available dates based on current time.
 * Prices for tomorrow are available after 13:00.
 */
export function getAvailableDates(now: Date): string[] {
  const today = getLocalDateString(now);
  const tomorrow = getLocalDateString(new Date(now.getTime() + MS_PER_DAY));

  // Prices for tomorrow are available after 13:00
  if (now.getHours() >= 13) {
    return [today, tomorrow];
  }
  return [today];
}

/**
 * Get price data for a given date as an array of 24 hourly prices.
 */
export function getPricesForDate(date: string): number[] | undefined {
  const prices = getCachedPrices();
  return prices.get(date);
}
