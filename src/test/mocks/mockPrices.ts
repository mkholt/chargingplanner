import type { PriceArea } from '@/contexts';
import type { PricesApiResponse, PriceEntry } from '@/types';
import { MS_PER_DAY } from '@/utils';

/**
 * Price scenarios for E2E testing.
 * These allow tests to verify optimal window selection with predictable price patterns.
 */
export type PriceScenario =
  | 'default'         // Current seeded random prices
  | 'flat'            // All hours same price (2.50 kr/kWh total)
  | 'cheapest-night'  // Cheapest at 03:00-04:00 (1.50 kr), rest 3.00 kr
  | 'cheapest-midday' // Cheapest at 12:00-13:00 (1.50 kr), rest 3.00 kr
  | 'ascending'       // Prices increase each hour (1.50 → 4.00)
  | 'descending';     // Prices decrease each hour (4.00 → 1.50)

// Seeded random for consistent mock data per day
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Fixed tariff values (based on real data from prices.json)
const FIXED_TARIFFS = {
  surcharge: { value: 0.096, vat: 0.024, total: 0.12 },
  systemTariff: { value: 0.074, vat: 0.0185, total: 0.0925 },
  netTariff: { value: 0.061, vat: 0.01525, total: 0.07625 },
  electricityTax: { value: 0.72, vat: 0.18, total: 0.9 },
};

// Distribution tariffs vary by time of day (based on real data)
const DISTRIBUTION_TARIFFS = {
  night: { value: 0.068049, vat: 0.017012, total: 0.085061 },   // 00:00-06:00, 21:00-00:00
  day: { value: 0.204148, vat: 0.051037, total: 0.255185 },     // 06:00-17:00, 20:00-21:00
  peak: { value: 0.612445, vat: 0.153111, total: 0.765556 },    // 17:00-20:00
};

function getDistributionTariff(hour: number): typeof DISTRIBUTION_TARIFFS.night {
  if (hour >= 0 && hour < 6) return DISTRIBUTION_TARIFFS.night;
  if (hour >= 6 && hour < 17) return DISTRIBUTION_TARIFFS.day;
  if (hour >= 17 && hour < 20) return DISTRIBUTION_TARIFFS.peak;
  if (hour >= 20 && hour < 21) return DISTRIBUTION_TARIFFS.day;
  return DISTRIBUTION_TARIFFS.night; // 21:00-00:00
}

/**
 * Generate a realistic spot price (electricity) based on time of day.
 */
function generateSpotPrice(hour: number, quarter: number, daySeed: number, priceArea: PriceArea = 'DK1'): { value: number; vat: number; total: number } {
  const basePrice = 0.65; // Base spot price in kr/kWh (excluding VAT)

  // Time-of-day adjustment
  let adjustment = 0;
  if (hour >= 0 && hour < 6) {
    adjustment = -0.10;
  } else if (hour >= 6 && hour < 9) {
    adjustment = 0.05;
  } else if (hour >= 9 && hour < 17) {
    adjustment = 0.10;
  } else if (hour >= 17 && hour < 21) {
    adjustment = 0.20;
  } else {
    adjustment = 0.05;
  }

  // Random variation
  const areaSeedOffset = priceArea === 'DK2' ? 1000000 : 0;
  const randomVariation = (seededRandom(daySeed + hour * 4 + quarter + areaSeedOffset) - 0.5) * 0.20;

  // DK2 is typically ~8% more expensive
  const areaMultiplier = priceArea === 'DK2' ? 1.08 : 1.0;

  const value = Math.max(0.40, Math.min(1.10, (basePrice + adjustment + randomVariation) * areaMultiplier));
  const vat = value * 0.25;
  const total = value + vat;

  return {
    value: Math.round(value * 1000000) / 1000000,
    vat: Math.round(vat * 1000000) / 1000000,
    total: Math.round(total * 1000000) / 1000000,
  };
}

type PriceDetails = NonNullable<PriceEntry['details']>;

/**
 * Generate full price breakdown for an interval.
 */
function generatePriceDetails(hour: number, quarter: number, daySeed: number, priceArea: PriceArea = 'DK1'): { total: number; details: PriceDetails } {
  const electricity = generateSpotPrice(hour, quarter, daySeed, priceArea);
  const distribution = getDistributionTariff(hour);

  // Calculate total (sum of all components)
  const totalValue =
    electricity.value +
    FIXED_TARIFFS.surcharge.value +
    FIXED_TARIFFS.systemTariff.value +
    FIXED_TARIFFS.netTariff.value +
    FIXED_TARIFFS.electricityTax.value +
    distribution.value;

  const totalVat =
    electricity.vat +
    FIXED_TARIFFS.surcharge.vat +
    FIXED_TARIFFS.systemTariff.vat +
    FIXED_TARIFFS.netTariff.vat +
    FIXED_TARIFFS.electricityTax.vat +
    distribution.vat;

  const total = totalValue + totalVat;

  const details: PriceDetails = {
    electricity: { ...electricity, unit: 'kr/kWh' },
    surcharge: { ...FIXED_TARIFFS.surcharge, unit: 'kr/kWh' },
    transmission: {
      systemTariff: { ...FIXED_TARIFFS.systemTariff, unit: 'kr/kWh' },
      netTariff: { ...FIXED_TARIFFS.netTariff, unit: 'kr/kWh' },
    },
    electricityTax: { ...FIXED_TARIFFS.electricityTax, unit: 'kr/kWh' },
    distribution: { ...distribution, unit: 'kr/kWh' },
  };

  return {
    total: Math.round(total * 1000000) / 1000000,
    details,
  };
}

/**
 * Generate mock API response with 48 hours of price data (today + tomorrow).
 * Always generates 15-minute resolution data with full price breakdown.
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

      const { total, details } = generatePriceDetails(hour, quarter, todaySeed, priceArea);

      prices.push({
        date: date.toISOString(),
        price: {
          total,
          unit: 'kr/kWh',
        },
        details,
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

      const { total, details } = generatePriceDetails(hour, quarter, tomorrowSeed, priceArea);

      prices.push({
        date: date.toISOString(),
        price: {
          total,
          unit: 'kr/kWh',
        },
        details,
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

/**
 * Generate a scenario-based total price for a given hour.
 * Returns a simplified total price without detailed breakdown.
 */
function getScenarioPrice(scenario: PriceScenario, hour: number, totalHours: number): number {
  switch (scenario) {
    case 'flat':
      return 2.50; // Fixed price for all hours

    case 'cheapest-night':
      // 03:00-04:00 is cheapest (hours 3-4 of day = indices 3,4,27,28 for 48h)
      if (hour % 24 === 3) return 1.50;
      return 3.00;

    case 'cheapest-midday':
      // 12:00-13:00 is cheapest
      if (hour % 24 === 12) return 1.50;
      return 3.00;

    case 'ascending':
      // Prices go from 1.50 to 4.00 over totalHours
      return 1.50 + (hour / (totalHours - 1)) * 2.50;

    case 'descending':
      // Prices go from 4.00 to 1.50 over totalHours
      return 4.00 - (hour / (totalHours - 1)) * 2.50;

    default:
      return 2.50;
  }
}

/**
 * Generate mock API response with a specific price scenario for testing.
 * Unlike the default response, this creates predictable price patterns.
 */
export function getMockApiResponseWithScenario(
  scenario: PriceScenario,
  priceArea: PriceArea = 'DK1'
): PricesApiResponse {
  // For 'default', use the regular generator
  if (scenario === 'default') {
    return getMockApiResponse(priceArea);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + MS_PER_DAY);

  const prices: PriceEntry[] = [];
  const totalHours = 48;

  // Generate 15-minute prices for today (24 hours = 96 intervals)
  for (let hour = 0; hour < 24; hour++) {
    const basePrice = getScenarioPrice(scenario, hour, totalHours);

    for (let quarter = 0; quarter < 4; quarter++) {
      const date = new Date(today);
      date.setHours(hour, quarter * 15, 0, 0);

      // Simplified price entry for scenario testing
      prices.push({
        date: date.toISOString(),
        price: {
          total: basePrice,
          unit: 'kr/kWh',
        },
        forecast: false,
        resolution: '15m',
      });
    }
  }

  // Generate 15-minute prices for tomorrow
  for (let hour = 0; hour < 24; hour++) {
    const basePrice = getScenarioPrice(scenario, hour + 24, totalHours);

    for (let quarter = 0; quarter < 4; quarter++) {
      const date = new Date(tomorrow);
      date.setHours(hour, quarter * 15, 0, 0);

      prices.push({
        date: date.toISOString(),
        price: {
          total: basePrice,
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
