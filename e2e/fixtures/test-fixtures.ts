import { test as base, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { SettingsDialogPage } from '../pages/settings-dialog.page';
import { InputFormPage } from '../pages/input-form.page';
import { ResultsPage } from '../pages/results.page';

// localStorage keys from the app
export const LOCAL_STORAGE_KEYS = {
  CARS: 'ev-cars',
  SELECTED_CAR: 'ev-selected-car',
  PRICE_SETTINGS: 'ev-price-settings',
  QUERY_CACHE: 'ev-price-query-cache-v2',
} as const;

// Car type matching the app's Car type
export type Car = {
  id: string;
  name: string;
  batterySize: number;
  maxPower: number;
};

// Location can be a postal code (number), GPS coordinates, or null
export type Location = number | { lat: number; long: number } | null;

// Price settings type matching the app
export type PriceSettings = {
  location: Location;
  supplierId: string | null;
  companyId: string | null;
  productId: string | null;
  priceArea: 'DK1' | 'DK2' | null;
  aggregationSize: '15m' | '1h';
  aggregationMethod: 'mean' | 'min' | 'max';
};

type TestFixtures = {
  appPage: AppPage;
  settingsDialogPage: SettingsDialogPage;
  inputFormPage: InputFormPage;
  resultsPage: ResultsPage;
};

export const test = base.extend<TestFixtures>({
  appPage: async ({ page }, use) => {
    const appPage = new AppPage(page);
    await use(appPage);
  },
  settingsDialogPage: async ({ page }, use) => {
    const settingsDialogPage = new SettingsDialogPage(page);
    await use(settingsDialogPage);
  },
  inputFormPage: async ({ page }, use) => {
    const inputFormPage = new InputFormPage(page);
    await use(inputFormPage);
  },
  resultsPage: async ({ page }, use) => {
    const resultsPage = new ResultsPage(page);
    await use(resultsPage);
  },
});

export { expect };
