import { test, expect } from '../fixtures/test-fixtures';
import { seedPriceSettings, POSTAL_CODES, clearAllStorage } from '../fixtures/localStorage';

test.describe('Price Settings', () => {
  test('entering valid Copenhagen postal code shows Radius as supplier', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();

    await settingsPanePage.setPostalCode(POSTAL_CODES.COPENHAGEN);

    // Should show Radius as the supplier for Copenhagen area
    await expect(page.getByText(/Radius/).first()).toBeVisible();
  });

  test('entering invalid postal code below 1000 shows validation message', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToElectricityTab();

    const input = page.getByTestId('postal-code-input');
    await input.fill('999');

    // Should show validation error
    await expect(page.getByTestId('postal-code-error')).toBeVisible();
  });

  test('can select company and product after entering postal code', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();

    // Enter Aarhus postal code (DK1 region)
    // setPostalCode already waits for supplier to appear
    await settingsPanePage.setPostalCode(POSTAL_CODES.AARHUS);

    // Should be able to see company options for DK1
    // The mock data includes companies like NRGi for DK1
    await expect(page.getByText(/NRGi|Norlys|EWII/i).first()).toBeVisible();
  });

  test('price settings persist across page reloads', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await seedPriceSettings(page, {
      postalCode: POSTAL_CODES.COPENHAGEN,
      priceArea: 'DK2',
    });
    await page.goto('/');
    await appPage.waitForAppReady();

    await appPage.openSettings();
    await settingsPanePage.switchToElectricityTab();

    // Postal code should be pre-filled
    const postalCode = await settingsPanePage.getPostalCodeValue();
    expect(postalCode).toBe(String(POSTAL_CODES.COPENHAGEN));
  });

  test('shows "No grid operator found" for unknown postal code in valid range', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToElectricityTab();

    // Use a valid format postal code that's not in mock data
    const input = page.getByTestId('postal-code-input');
    await input.fill(String(POSTAL_CODES.UNKNOWN));

    // Wait for lookup to complete
    await page.waitForTimeout(500);

    // Should show "No grid operator found" message
    const notFoundMsg = await settingsPanePage.getSupplierNotFoundMessage();
    expect(notFoundMsg).toContain('No grid operator found');
  });

  test('entering postal code above 9999 shows validation message', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToElectricityTab();

    const input = page.getByTestId('postal-code-input');
    await input.fill('10000');

    // Should show validation error
    await expect(page.getByTestId('postal-code-error')).toBeVisible();
  });

  test('clears postal code input when GPS location is used', async ({ appPage, settingsPanePage, page }) => {
    // Mock geolocation to return Copenhagen coordinates
    await page.addInitScript(() => {
      const mockGeolocation = {
        getCurrentPosition: (success: PositionCallback) => {
          setTimeout(() => success({
            coords: {
              latitude: 55.6761,
              longitude: 12.5683,
              accuracy: 100,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition), 100);
        },
        watchPosition: () => 0,
        clearWatch: () => {},
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });
    });

    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToElectricityTab();

    // First enter a postal code
    const input = page.getByTestId('postal-code-input');
    await input.fill('8000');
    await page.waitForTimeout(200);

    // Click GPS button
    await settingsPanePage.clickGpsButton();
    await page.waitForTimeout(300);

    // Postal code should be cleared
    const postalValue = await settingsPanePage.getPostalCodeValue();
    expect(postalValue).toBe('');
  });
});
