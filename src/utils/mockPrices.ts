import type { AggregationMethod, AggregationSize } from '@/contexts';
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
 * Generate a realistic 15-minute price based on time of day.
 * Prices range from ~1.50-2.50 kr/kWh with:
 * - Lower prices at night (00:00-06:00)
 * - Higher prices during peak hours (17:00-20:00)
 */
function generate15mPrice(hour: number, quarter: number, daySeed: number): number {
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

  // Add some random variation (-0.15 to +0.15) - different seed per quarter
  const randomVariation = (seededRandom(daySeed + hour * 4 + quarter) - 0.5) * 0.30;

  const price = basePrice + adjustment + randomVariation;

  // Clamp to realistic range and round to 6 decimal places
  return Math.round(Math.max(1.50, Math.min(2.50, price)) * 1000000) / 1000000;
}

/**
 * Aggregate 15-minute prices to hourly using the specified method.
 */
function aggregate15mToHourly(
  prices15m: number[],
  method: AggregationMethod
): number[] {
  const hourlyPrices: number[] = [];

  for (let i = 0; i < prices15m.length; i += 4) {
    const quarter = prices15m.slice(i, i + 4);
    if (quarter.length === 0) continue;

    let value: number;
    switch (method) {
      case 'min':
        value = Math.min(...quarter);
        break;
      case 'max':
        value = Math.max(...quarter);
        break;
      case 'mean':
      default:
        value = quarter.reduce((sum, p) => sum + p, 0) / quarter.length;
        break;
    }
    hourlyPrices.push(Math.round(value * 1000000) / 1000000);
  }

  return hourlyPrices;
}

/**
 * Generate mock API response with 48 hours of price data (today + tomorrow).
 * Always generates 15-minute resolution data.
 */
export function getMockApiResponse(): PricesApiResponse {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + MS_PER_DAY);

  const prices: PriceEntry[] = [];

  // Generate 15-minute prices for today
  const todaySeed = today.getTime();
  for (let hour = 0; hour < 24; hour++) {
    for (let quarter = 0; quarter < 4; quarter++) {
      const date = new Date(today);
      date.setHours(hour, quarter * 15, 0, 0);

      prices.push({
        date: date.toISOString(),
        price: {
          total: generate15mPrice(hour, quarter, todaySeed),
          unit: 'kr/kWh',
        },
        forecast: false,
        resolution: '15m',
      });
    }
  }

  // Generate 15-minute prices for tomorrow
  const tomorrowSeed = tomorrow.getTime();
  for (let hour = 0; hour < 24; hour++) {
    for (let quarter = 0; quarter < 4; quarter++) {
      const date = new Date(tomorrow);
      date.setHours(hour, quarter * 15, 0, 0);

      prices.push({
        date: date.toISOString(),
        price: {
          total: generate15mPrice(hour, quarter, tomorrowSeed),
          unit: 'kr/kWh',
        },
        forecast: false,
        resolution: '15m',
      });
    }
  }

  return {
    priceArea: 'DK1',
    prices,
  };
}

// Cache for raw 15-minute prices (before aggregation)
let cached15mPrices: Map<string, number[]> | null = null;
let cacheDate: string | null = null;

function getCached15mPrices(): Map<string, number[]> {
  const today = getLocalDateString(new Date());

  // Invalidate cache if day changed
  if (cacheDate !== today) {
    cached15mPrices = null;
    cacheDate = today;
  }

  if (!cached15mPrices) {
    cached15mPrices = mapApiResponseToPrices(getMockApiResponse());
  }

  return cached15mPrices;
}

// Current aggregation settings
let currentAggregationSize: AggregationSize = '1h';
let currentAggregationMethod: AggregationMethod = 'mean';

/**
 * Set the aggregation settings for price data.
 */
export function setAggregationSettings(
  size: AggregationSize,
  method: AggregationMethod
): void {
  currentAggregationSize = size;
  currentAggregationMethod = method;
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
 * Get price data for a given date.
 * Returns 24 hourly prices (if aggregated to 1h) or 96 15-minute prices (if 15m).
 */
export function getPricesForDate(date: string): number[] | undefined {
  const prices15m = getCached15mPrices().get(date);
  if (!prices15m) return undefined;

  if (currentAggregationSize === '15m') {
    return prices15m;
  }

  // Aggregate to hourly
  return aggregate15mToHourly(prices15m, currentAggregationMethod);
}

/**
 * Get the current aggregation size setting.
 */
export function getAggregationSize(): AggregationSize {
  return currentAggregationSize;
}
