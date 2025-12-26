import type { PriceArea } from '@/contexts';
import type { PricesApiResponse, PriceEntry } from '@/types';
import { MS_PER_DAY } from '@/utils';

// Seeded random for consistent mock data per day
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate a realistic 15-minute price based on time of day and price area.
 * Prices range from ~1.50-2.50 kr/kWh with:
 * - Lower prices at night (00:00-06:00)
 * - Higher prices during peak hours (17:00-20:00)
 * - DK2 (East Denmark) is typically ~5-10% more expensive than DK1 (West Denmark)
 */
function generate15mPrice(hour: number, quarter: number, daySeed: number, priceArea: PriceArea = 'DK1'): number {
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
  // Use different seed offset for DK2 to get different random pattern
  const areaSeedOffset = priceArea === 'DK2' ? 1000000 : 0;
  const randomVariation = (seededRandom(daySeed + hour * 4 + quarter + areaSeedOffset) - 0.5) * 0.30;

  // DK2 is typically ~8% more expensive than DK1
  const areaMultiplier = priceArea === 'DK2' ? 1.08 : 1.0;

  const price = (basePrice + adjustment + randomVariation) * areaMultiplier;

  // Clamp to realistic range and round to 6 decimal places
  return Math.round(Math.max(1.50, Math.min(2.70, price)) * 1000000) / 1000000;
}

/**
 * Generate mock API response with 48 hours of price data (today + tomorrow).
 * Always generates 15-minute resolution data.
 */
export function getMockApiResponse(priceArea: PriceArea = 'DK1'): PricesApiResponse {
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
          total: generate15mPrice(hour, quarter, todaySeed, priceArea),
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
          total: generate15mPrice(hour, quarter, tomorrowSeed, priceArea),
          unit: 'kr/kWh',
        },
        forecast: false,
        resolution: '15m',
      });
    }
  }

  return {
    priceArea,
    prices,
  };
}
