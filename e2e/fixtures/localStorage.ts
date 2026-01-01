import { Page } from '@playwright/test';
import { type Car, type PriceSettings } from './test-fixtures';
import { LS_KEYS } from '../../src/utils/constants';
import type { PriceScenario } from '../../src/test/mocks/mockPrices';

/**
 * Ensures the page is on the app's origin before manipulating localStorage.
 * If not on the origin, navigates to it first.
 */
async function ensureOnOrigin(page: Page): Promise<void> {
  const url = page.url();
  // E2E tests run on port 5174
  if (!url.startsWith('http://localhost:5174')) {
    await page.goto('/');
  }
}

export async function clearAllStorage(page: Page): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(() => localStorage.clear());
}

export async function setLocalStorageItem(
  page: Page,
  key: string,
  value: unknown
): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key, value }
  );
}

export async function seedCars(page: Page, cars: Car[]): Promise<void> {
  await setLocalStorageItem(page, LS_KEYS.CARS, cars);
}

/**
 * Seeds the language preference in localStorage.
 * @param page - Playwright page object
 * @param language - Language code ('en' for English, 'da' for Danish)
 */
export async function seedLanguage(page: Page, language: 'en' | 'da'): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: LS_KEYS.LANGUAGE, value: language }
  );
}

export async function seedSelectedCar(page: Page, carId: string): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: LS_KEYS.SELECTED_CAR, value: carId }
  );
}

export async function seedPriceSettings(
  page: Page,
  settings: Partial<PriceSettings> & { postalCode?: number }
): Promise<void> {
  const defaults: PriceSettings = {
    location: null,
    supplierId: null,
    companyId: null,
    productId: null,
    priceArea: 'DK1',
    aggregationSize: '1h',
    aggregationMethod: 'mean',
  };
  // Support legacy postalCode parameter for backwards compatibility
  const { postalCode, ...rest } = settings;
  const settingsToSave = {
    ...defaults,
    ...rest,
    location: rest.location ?? postalCode ?? null,
  };
  await setLocalStorageItem(
    page,
    LS_KEYS.PRICE_SETTINGS,
    settingsToSave
  );
}

// Test data constants
export const TEST_CARS = {
  TESLA_MODEL_3: {
    name: 'Tesla Model 3',
    batterySize: 60,
    maxPower: 11,
  },
  VW_ID4: {
    name: 'VW ID.4',
    batterySize: 77,
    maxPower: 11,
  },
  PORSCHE_TAYCAN: {
    name: 'Porsche Taycan',
    batterySize: 93,
    maxPower: 22,
  },
} as const;

export function createTestCar(id: string, car: Omit<Car, 'id'>): Car {
  return { id, ...car };
}

// Valid Danish postal codes for different regions
export const POSTAL_CODES = {
  COPENHAGEN: 2100, // DK2 - Radius
  AARHUS: 8000, // DK1 - Norlys
  ODENSE: 5000, // DK1 - Flow
  INVALID: 999, // Invalid (below 1000)
  UNKNOWN: 3850, // Valid format but not in mock data (gap between Vores Elnet 3700-3799 and Cerius 4000-4999)
} as const;

// Price scenarios for testing optimal window selection
// Type-safe mapping that uses PriceScenario from mockPrices
export const PRICE_SCENARIOS: Record<string, PriceScenario> = {
  DEFAULT: 'default',
  FLAT: 'flat',
  CHEAPEST_NIGHT: 'cheapest-night',
  CHEAPEST_MIDDAY: 'cheapest-midday',
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
};

// GPS coordinates for testing geolocation
export const GPS_COORDINATES = {
  COPENHAGEN: { lat: 55.6761, long: 12.5683 }, // DK2 (longitude > 12)
  AARHUS: { lat: 56.1629, long: 10.2039 },     // DK1 (longitude < 12)
} as const;

/**
 * Set the price scenario for mock API responses.
 * The MSW handler reads this from localStorage to determine which price pattern to use.
 * Must be called BEFORE the price API is fetched.
 */
export async function setPriceScenario(page: Page, scenario: PriceScenario): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(
    (s) => localStorage.setItem('mock-price-scenario', s),
    scenario
  );
}

/**
 * Clear the price scenario, reverting to default seeded random prices.
 */
export async function clearPriceScenario(page: Page): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(() => localStorage.removeItem('mock-price-scenario'));
}

/**
 * Seeds the default earliest start preference.
 * @param page - Playwright page object
 * @param value - 'now' for current time or a time string like '08:00' for specific time
 */
export async function seedDefaultEarliest(page: Page, value: 'now' | string): Promise<void> {
  await setLocalStorageItem(page, LS_KEYS.DEFAULT_EARLIEST, value);
}

/**
 * Seeds the default latest end time preference.
 * @param page - Playwright page object
 * @param value - Time string in 'HH:mm' format (e.g., '07:00')
 */
export async function seedDefaultLatest(page: Page, value: string): Promise<void> {
  await setLocalStorageItem(page, LS_KEYS.DEFAULT_LATEST, value);
}
