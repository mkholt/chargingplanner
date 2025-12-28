import { test, expect } from '../fixtures/test-fixtures';
import { seedPriceSettings, POSTAL_CODES, clearAllStorage } from '../fixtures/localStorage';

test.describe('Price Settings', () => {
  test('entering valid Copenhagen postal code shows Radius as supplier', async ({ appPage, settingsDialogPage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();

    await settingsDialogPage.setPostalCode(POSTAL_CODES.COPENHAGEN);

    // Should show Radius as the supplier for Copenhagen area
    await expect(page.getByText(/Radius/).first()).toBeVisible();
  });

  test('entering invalid postal code below 1000 shows validation message', async ({ appPage, settingsDialogPage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsDialogPage.switchToElectricityTab();

    const input = page.getByPlaceholder(/postal code/i);
    await input.fill('999');

    // Should show validation error
    await expect(page.getByText(/1000-9999/i)).toBeVisible();
  });

  test('can select company and product after entering postal code', async ({ appPage, settingsDialogPage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();

    // Enter Aarhus postal code (DK1 region)
    // setPostalCode already waits for supplier to appear
    await settingsDialogPage.setPostalCode(POSTAL_CODES.AARHUS);

    // Should be able to see company options for DK1
    // The mock data includes companies like NRGi for DK1
    await expect(page.getByText(/NRGi|Norlys|EWII/i).first()).toBeVisible();
  });

  test('price settings persist across page reloads', async ({ appPage, settingsDialogPage, page }) => {
    await clearAllStorage(page);
    await seedPriceSettings(page, {
      postalCode: POSTAL_CODES.COPENHAGEN,
      priceArea: 'DK2',
    });
    await page.goto('/');
    await appPage.waitForAppReady();

    await appPage.openSettings();
    await settingsDialogPage.switchToElectricityTab();

    // Postal code should be pre-filled
    const postalCode = await settingsDialogPage.getPostalCodeValue();
    expect(postalCode).toBe(String(POSTAL_CODES.COPENHAGEN));
  });
});
