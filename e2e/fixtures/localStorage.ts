import { Page } from '@playwright/test';
import { LOCAL_STORAGE_KEYS, type Car, type PriceSettings } from './test-fixtures';

/**
 * Ensures the page is on the app's origin before manipulating localStorage.
 * If not on the origin, navigates to it first.
 */
async function ensureOnOrigin(page: Page): Promise<void> {
  const url = page.url();
  if (!url.startsWith('http://localhost:5173')) {
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
  await setLocalStorageItem(page, LOCAL_STORAGE_KEYS.CARS, cars);
}

export async function seedSelectedCar(page: Page, carId: string): Promise<void> {
  await ensureOnOrigin(page);
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: LOCAL_STORAGE_KEYS.SELECTED_CAR, value: carId }
  );
}

export async function seedPriceSettings(
  page: Page,
  settings: Partial<PriceSettings>
): Promise<void> {
  const defaults: PriceSettings = {
    postalCode: null,
    supplierId: null,
    companyId: null,
    productId: null,
    priceArea: 'DK1',
    aggregationSize: '1h',
    aggregationMethod: 'mean',
  };
  await setLocalStorageItem(
    page,
    LOCAL_STORAGE_KEYS.PRICE_SETTINGS,
    { ...defaults, ...settings }
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
} as const;
