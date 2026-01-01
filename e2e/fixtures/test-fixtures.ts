import { test as base, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { SettingsDialogPage } from '../pages/settings-dialog.page';
import { InputFormPage } from '../pages/input-form.page';
import { ResultsPage } from '../pages/results.page';
import { freezeTime, FIXED_TEST_TIME } from './time';
import { LS_KEYS } from '../../src/utils/constants';
import { en } from '../../src/locales/en';
import { da } from '../../src/locales/da';

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
  frozenTime: Date;
};

export const test = base.extend<TestFixtures>({
  // Fixture to freeze time in browser - available to tests that need it
  // Uses Playwright's Clock API: https://playwright.dev/docs/clock
  // Note: This is NOT an auto-fixture. Tests that need frozen time must include frozenTime in their destructured args.
  frozenTime: async ({ page }, use) => {
    // Freeze time in the browser context BEFORE any navigation
    // This affects both the app (new Date()) and the MSW handlers
    await freezeTime(page, FIXED_TEST_TIME);
    await use(FIXED_TEST_TIME);
  },

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
export { FIXED_TEST_TIME } from './time';
export { LS_KEYS };

// Translation strings for type-safe E2E assertions
export const translations = {
  en: en.translation,
  da: da.translation,
} as const;
