import type { Page } from '@playwright/test';
import { test, expect, translations } from '../fixtures/test-fixtures';
import {
  clearAllStorage,
  createLinkedTestCar,
  createTestCar,
  seedCars,
  seedSkodaProxy,
  TEST_CARS,
} from '../fixtures/localStorage';
import { AppPage } from '../pages/app.page';
import { SettingsPanePage } from '../pages/settings-pane.page';
import { SkodaPage } from '../pages/skoda.page';
import { MOCK_SKODA } from '../../src/test/mocks/mockSkoda';

const t = translations.en.skoda;
const VAULT_PASSWORD = 'correct horse battery';

test.describe('Škoda connection', () => {
  test('can enable the proxy and test the connection', async ({ appPage, settingsPanePage, skodaPage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToAppTab();

    await skodaPage.enableProxy();
    // The proxy is set when the app is built
    await expect(skodaPage.proxyUrl).toHaveText(MOCK_SKODA.PROXY_URL);
    await skodaPage.testConnection();

    await expect(skodaPage.connectionResult).toHaveAttribute('data-result', 'ok');
    await expect(skodaPage.connectionResult).toHaveText(t.settings.connectionOk);
  });

  test('linking a car pre-fills the battery levels from the car', async ({ appPage, settingsPanePage, inputFormPage, skodaPage, page }) => {
    await clearAllStorage(page);
    await seedCars(page, [createTestCar('car-1', TEST_CARS.VW_ID4)], 'car-1');
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();

    await skodaPage.linkCar(TEST_CARS.VW_ID4.name, MOCK_SKODA.VIN, MOCK_SKODA.API_KEY);
    await expect(skodaPage.linkSection.getByTestId('skoda-link-status')).toHaveAttribute('data-status', 'linked');
    await expect(page.getByTestId('skoda-api-key-input')).not.toBeVisible();
    await skodaPage.saveCar();
    await expect(skodaPage.carLinkStatus(TEST_CARS.VW_ID4.name)).toHaveAttribute('data-status', 'linked');
    await settingsPanePage.close();

    await inputFormPage.ensureExpanded();
    await expect(skodaPage.vehicleSummary).toContainText(`${MOCK_SKODA.STATE_OF_CHARGE} %`);
    await expect(skodaPage.vehicleChargeLimit).toContainText(`${MOCK_SKODA.TARGET_STATE_OF_CHARGE} %`);
    await expect(inputFormPage.startPercentInput).toHaveValue(String(MOCK_SKODA.STATE_OF_CHARGE));
    await expect(inputFormPage.endPercentInput).toHaveValue(String(MOCK_SKODA.TARGET_STATE_OF_CHARGE));
  });

  test('adds a car from its VIN and API key', async ({ appPage, settingsPanePage, inputFormPage, skodaPage, page }) => {
    await clearAllStorage(page);
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();

    await skodaPage.lookUpNewCar(MOCK_SKODA.VIN, MOCK_SKODA.API_KEY);

    // The name comes from Škoda; battery size and charging power are filled in by the user
    await expect(skodaPage.addCarCheckDetails).toBeVisible();
    await expect(page.getByTestId('car-name-input')).toHaveValue(MOCK_SKODA.VEHICLE_NAME);
    await page.getByTestId('car-battery-input').fill('77');
    await skodaPage.saveCar();

    await expect(skodaPage.carLinkStatus(MOCK_SKODA.VEHICLE_NAME)).toHaveAttribute('data-status', 'linked');
    await settingsPanePage.close();
    await inputFormPage.ensureExpanded();
    await expect(skodaPage.vehicleSummary).toContainText(`${MOCK_SKODA.STATE_OF_CHARGE} %`);
  });

  test('shows an error when the Škoda key is rejected', async ({ appPage, settingsPanePage, skodaPage, page }) => {
    await clearAllStorage(page);
    await seedCars(page, [createTestCar('car-1', TEST_CARS.VW_ID4)], 'car-1');
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();

    await skodaPage.linkCar(TEST_CARS.VW_ID4.name, MOCK_SKODA.VIN, MOCK_SKODA.INVALID_API_KEY);

    await expect(skodaPage.linkError).toHaveText(t.link.errors.invalidApiKey);
    await expect(skodaPage.linkSection.getByTestId('skoda-link-status')).not.toBeVisible();
  });

  test('shows that a revoked key needs a new link', async ({ appPage, inputFormPage, skodaPage, page }) => {
    const car = createLinkedTestCar('car-1', TEST_CARS.VW_ID4);
    car.skoda!.token = `mock-revoked-token.${MOCK_SKODA.VIN}`;
    await clearAllStorage(page);
    await seedCars(page, [car], 'car-1');
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await inputFormPage.ensureExpanded();

    await expect(skodaPage.vehicleError).toHaveText(t.vehicle.relink);
  });

  test('makes no Škoda requests and shows no Škoda UI when the proxy is off', async ({ appPage, settingsPanePage, inputFormPage, skodaPage, page }) => {
    await clearAllStorage(page);
    await seedCars(page, [createLinkedTestCar('car-1', TEST_CARS.VW_ID4)], 'car-1');
    await seedSkodaProxy(page, false);

    const proxyRequests: string[] = [];
    page.on('request', request => {
      if (request.url().startsWith(MOCK_SKODA.PROXY_URL)) proxyRequests.push(request.url());
    });

    await page.goto('/');
    await appPage.waitForAppReady();
    await inputFormPage.ensureExpanded();
    await expect(skodaPage.vehicleStatus).not.toBeVisible();

    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();
    await expect(skodaPage.carLinkStatus(TEST_CARS.VW_ID4.name)).not.toBeVisible();

    expect(proxyRequests).toEqual([]);
  });
});

test.describe('Škoda access in sync', () => {
  async function exportAndReimport(
    page: Page,
    appPage: AppPage,
    settingsPanePage: SettingsPanePage,
    skodaPage: SkodaPage,
    includeAccess: boolean
  ): Promise<void> {
    await clearAllStorage(page);
    await seedCars(page, [createLinkedTestCar('car-1', TEST_CARS.VW_ID4)], 'car-1');
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToSyncTab();

    await expect(skodaPage.exportOptions).toBeVisible();
    const exportCode = includeAccess ? await skodaPage.includeAccess() : undefined;
    const code = await skodaPage.getSyncCode();

    // Import on a "new device"
    await clearAllStorage(page);
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToSyncTab();
    await skodaPage.importSyncCode(code, exportCode);
    await settingsPanePage.switchToCarsTab();
  }

  test('export leaves out the Škoda access by default', async ({ appPage, settingsPanePage, skodaPage, page }) => {
    await exportAndReimport(page, appPage, settingsPanePage, skodaPage, false);

    // The link (VIN) comes along, the token does not
    await expect(skodaPage.carLinkStatus(TEST_CARS.VW_ID4.name)).toHaveAttribute('data-status', 'relink');
  });

  test('export includes the Škoda access when opted in', async ({ appPage, settingsPanePage, skodaPage, page }) => {
    await exportAndReimport(page, appPage, settingsPanePage, skodaPage, true);

    await expect(skodaPage.carLinkStatus(TEST_CARS.VW_ID4.name)).toHaveAttribute('data-status', 'linked');
  });
});

test.describe('Škoda password protection', () => {
  test('locks the access behind a password', async ({ appPage, settingsPanePage, inputFormPage, skodaPage, page }) => {
    await clearAllStorage(page);
    await seedCars(page, [createLinkedTestCar('car-1', TEST_CARS.VW_ID4)], 'car-1');
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToAppTab();

    await skodaPage.turnOnVault(VAULT_PASSWORD);
    await expect(skodaPage.vaultStatus).toHaveText(t.vault.statusUnlocked);
    await settingsPanePage.close();

    // The token is no longer stored in plain text
    const storedCars = await page.evaluate(() => Object.values(localStorage).join('\n'));
    expect(storedCars).not.toContain(`mock-token.${MOCK_SKODA.VIN}`);

    // After a reload, the vault is locked
    await page.reload();
    await appPage.waitForAppReady();
    await inputFormPage.ensureExpanded();
    await expect(skodaPage.unlockForm).toBeVisible();
    await expect(skodaPage.vehicleSummary).not.toBeVisible();

    await skodaPage.unlock('not the password');
    await expect(skodaPage.unlockForm).toContainText(t.vault.wrongPassword);

    await skodaPage.unlock(VAULT_PASSWORD);
    await expect(skodaPage.vehicleSummary).toContainText(`${MOCK_SKODA.STATE_OF_CHARGE} %`);

    // Locking hides the vehicle data again
    await appPage.openSettings();
    await settingsPanePage.switchToAppTab();
    await skodaPage.lockVault();
    await expect(skodaPage.vaultStatus).toHaveText(t.vault.statusLocked);
    await settingsPanePage.close();

    await inputFormPage.ensureExpanded();
    await expect(skodaPage.unlockForm).toBeVisible();
    await expect(skodaPage.vehicleSummary).not.toBeVisible();
  });

  test('asks to unlock before adding a car, then not again', async ({ appPage, settingsPanePage, skodaPage, page }) => {
    await clearAllStorage(page);
    await seedSkodaProxy(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToAppTab();
    await skodaPage.turnOnVault(VAULT_PASSWORD);
    await skodaPage.lockVault();
    await settingsPanePage.switchToCarsTab();

    const addCard = page.getByTestId('add-skoda-car-card');
    await addCard.scrollIntoViewIfNeeded();
    await addCard.click();
    await expect(skodaPage.unlockForm).toBeVisible();
    await expect(skodaPage.addCarForm).not.toBeVisible();
    await skodaPage.unlock(VAULT_PASSWORD);

    // Unlocked: the car is added without asking for the password again
    await skodaPage.addCarForm.getByTestId('skoda-vin-input').fill(MOCK_SKODA.VIN);
    await skodaPage.addCarForm.getByTestId('skoda-api-key-input').fill(MOCK_SKODA.API_KEY);
    await page.getByTestId('add-skoda-car-lookup-button').click();
    await page.getByTestId('car-battery-input').fill('77');
    await skodaPage.saveCar();

    await expect(skodaPage.carLinkStatus(MOCK_SKODA.VEHICLE_NAME)).toHaveAttribute('data-status', 'linked');
    const stored = await page.evaluate(() => Object.values(localStorage).join('\n'));
    expect(stored).not.toContain(`mock-token.${MOCK_SKODA.VIN}`);
  });
});
