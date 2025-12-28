import { test, expect } from '../fixtures/test-fixtures';

/**
 * Helper to set up geolocation mock with specific behavior.
 * Must be called before navigating to the page.
 */
type GeoMockMode = 'success-copenhagen' | 'success-aarhus' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

async function setupGeolocationMock(page: import('@playwright/test').Page, mode: GeoMockMode) {
  await page.addInitScript((mockMode: GeoMockMode) => {
    const coords = {
      'success-copenhagen': { latitude: 55.6761, longitude: 12.5683 }, // DK2
      'success-aarhus': { latitude: 56.1629, longitude: 10.2039 },     // DK1
    };

    if (mockMode === 'unsupported') {
      // Remove geolocation API entirely
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
      });
      return;
    }

    const mockGeolocation = {
      getCurrentPosition: (
        successCallback: PositionCallback,
        errorCallback?: PositionErrorCallback,
      ) => {
        if (mockMode === 'success-copenhagen' || mockMode === 'success-aarhus') {
          const position = {
            coords: {
              ...coords[mockMode],
              accuracy: 100,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          };
          // Simulate async behavior
          setTimeout(() => successCallback(position as GeolocationPosition), 100);
        } else if (errorCallback) {
          const errorCodes = {
            'denied': 1,      // PERMISSION_DENIED
            'unavailable': 2, // POSITION_UNAVAILABLE
            'timeout': 3,     // TIMEOUT
          };
          const error = {
            code: errorCodes[mockMode as keyof typeof errorCodes],
            message: mockMode,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          };
          setTimeout(() => errorCallback(error as GeolocationPositionError), 100);
        }
      },
      watchPosition: () => 0,
      clearWatch: () => {},
    };

    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });
  }, mode);
}

/**
 * Clear storage after navigation (for geolocation tests where we need initScript first)
 */
async function clearStorageAfterNav(page: import('@playwright/test').Page) {
  await page.evaluate(() => localStorage.clear());
}

test.describe('Geolocation', () => {
  test.describe('GPS Success Scenarios', () => {
    test('GPS location in Copenhagen resolves to DK2/Radius supplier', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      // Setup geolocation mock BEFORE any navigation
      await setupGeolocationMock(page, 'success-copenhagen');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      await settingsDialogPage.clickGpsButton();

      // Wait for "Using GPS location" indicator to appear (waits for GPS + supplier query)
      await expect(page.getByText('Using GPS location')).toBeVisible({ timeout: 5000 });

      // Should show DK2 supplier (Radius)
      await expect(page.getByText(/Radius/i).first()).toBeVisible();
    });

    test('GPS location in Aarhus resolves to DK1/Norlys supplier', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'success-aarhus');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      await settingsDialogPage.clickGpsButton();

      // Wait for "Using GPS location" indicator to appear (waits for GPS + supplier query)
      await expect(page.getByText('Using GPS location')).toBeVisible({ timeout: 5000 });

      // Should show DK1 supplier (Norlys or similar)
      await expect(page.getByText(/Norlys|N1|Flow/i).first()).toBeVisible();
    });
  });

  test.describe('GPS Error Scenarios', () => {
    test('shows "Location access was denied" when user denies permission', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'denied');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      await settingsDialogPage.clickGpsButton();

      // Wait for error text to appear
      await expect(page.getByText('Location access was denied')).toBeVisible({ timeout: 5000 });
    });

    test('shows "Location information is unavailable" when position unavailable', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'unavailable');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      await settingsDialogPage.clickGpsButton();

      // Wait for error text to appear
      await expect(page.getByText('Location information is unavailable')).toBeVisible({ timeout: 5000 });
    });

    test('shows "Location request timed out" when geolocation times out', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'timeout');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      await settingsDialogPage.clickGpsButton();

      // Wait for error text to appear
      await expect(page.getByText('Location request timed out')).toBeVisible({ timeout: 5000 });
    });

    test('shows "Geolocation is not supported by your browser" when API unavailable', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'unsupported');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      await settingsDialogPage.clickGpsButton();

      // Wait for error text to appear
      await expect(page.getByText('Geolocation is not supported by your browser')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('GPS UI Behavior', () => {
    test('GPS button clears postal code input when clicked', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'success-copenhagen');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();
      await settingsDialogPage.switchToElectricityTab();

      // First enter a postal code
      const input = page.getByPlaceholder(/postal code/i);
      await input.fill('8000');

      // Click GPS button
      await settingsDialogPage.clickGpsButton();

      // Wait for GPS to complete (indicated by "Using GPS location" appearing)
      await expect(page.getByText('Using GPS location')).toBeVisible({ timeout: 5000 });

      // Postal code input should be cleared
      const postalValue = await settingsDialogPage.getPostalCodeValue();
      expect(postalValue).toBe('');
    });

    test('switching from GPS to postal code clears GPS state', async ({
      appPage,
      settingsDialogPage,
      page,
    }) => {
      await setupGeolocationMock(page, 'success-copenhagen');
      await page.goto('/');
      await clearStorageAfterNav(page);
      await page.reload();
      await appPage.waitForAppReady();
      await appPage.openSettings();

      // First use GPS
      await settingsDialogPage.clickGpsButton();

      // Verify GPS is active (wait for indicator to appear)
      await expect(page.getByText('Using GPS location')).toBeVisible({ timeout: 5000 });

      // Now enter a postal code
      const input = page.getByPlaceholder(/postal code/i);
      await input.fill('8000');

      // GPS indicator should disappear (postal code takes precedence)
      await expect(page.getByText('Using GPS location')).not.toBeVisible({ timeout: 5000 });
    });
  });
});
