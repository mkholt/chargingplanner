import { test, expect } from '../fixtures/test-fixtures';
import { clearAllStorage } from '../fixtures/localStorage';

test.describe('API Error Handling', () => {
  test.describe('Price API errors', () => {
    test('app remains functional when price API returns 500', async ({ page, appPage, settingsDialogPage }) => {
      // Intercept price API calls and return 500 error
      await page.route('**/api/prices**', route =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        })
      );

      await clearAllStorage(page);
      await page.goto('/');

      // App should still load - wait for title to appear
      await expect(appPage.title).toBeVisible({ timeout: 15000 });

      // Settings button should still be accessible
      await expect(appPage.settingsButton).toBeVisible();

      // Can still open settings
      await appPage.openSettings();
      await expect(settingsDialogPage.dialog).toBeVisible();
    });

    test('app handles malformed JSON gracefully without crashing', async ({ page }) => {
      // Intercept price API calls and return malformed response
      await page.route('**/api/prices**', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'not valid json {{{',
        })
      );

      await clearAllStorage(page);
      await page.goto('/');

      // App should not crash - wait a moment then verify page is still there
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Supplier API errors', () => {
    test('handles supplier lookup failure gracefully', async ({ page, appPage, settingsDialogPage }) => {
      // Intercept supplier find API calls and return 500 error
      await page.route('**/api/suppliers/find**', route =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Unavailable' }),
        })
      );

      await clearAllStorage(page);
      await page.goto('/');
      await appPage.waitForAppReady();
      await appPage.openSettings();
      await settingsDialogPage.switchToElectricityTab();

      // Enter a postal code
      const input = page.getByTestId('postal-code-input');
      await input.fill('8000');

      // Should not crash - the app should handle the error gracefully
      // We just verify the dialog is still responsive
      await expect(settingsDialogPage.dialog).toBeVisible();
    });

    test('handles supplier list failure gracefully', async ({ page, appPage, settingsDialogPage }) => {
      // Intercept all supplier API calls and return 500 error
      await page.route('**/api/suppliers**', route =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database Error' }),
        })
      );

      await clearAllStorage(page);
      await page.goto('/');
      await appPage.waitForAppReady();
      await appPage.openSettings();

      // Should still be able to navigate settings even if supplier API fails
      await expect(settingsDialogPage.dialog).toBeVisible();
    });
  });

  test.describe('Company API errors', () => {
    test('handles company list failure gracefully', async ({ page, appPage, settingsDialogPage }) => {
      // Intercept company API calls and return 500 error
      await page.route('**/api/companies**', route =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Error' }),
        })
      );

      await clearAllStorage(page);
      await page.goto('/');
      await appPage.waitForAppReady();
      await appPage.openSettings();

      // Should still be able to access settings
      await expect(settingsDialogPage.dialog).toBeVisible();

      // Tab should still be navigable
      await settingsDialogPage.switchToElectricityTab();
      await expect(page.getByTestId('postal-code-input')).toBeVisible();
    });
  });

  test.describe('Network recovery', () => {
    test('recovers when network is restored after failure', async ({ page, appPage }) => {
      // First, simulate network failure
      await page.route('**/api/prices**', route => route.abort('failed'));

      await clearAllStorage(page);
      await page.goto('/');

      // Wait a moment for the failed request
      await page.waitForTimeout(1000);

      // Now restore network by removing the route
      await page.unroute('**/api/prices**');

      // Reload the page - should work now with MSW mock data
      await page.reload();
      await appPage.waitForAppReady();

      // Should see the timeline/chart now that API works
      await expect(appPage.priceAttribution).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Rate limiting', () => {
    test('app remains functional when rate limited', async ({ page, appPage, settingsDialogPage }) => {
      // Intercept price API and return rate limit error
      await page.route('**/api/prices**', route =>
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Too Many Requests' }),
          headers: {
            'Retry-After': '60',
          },
        })
      );

      await clearAllStorage(page);
      await page.goto('/');

      // App should still load its UI
      await expect(appPage.title).toBeVisible({ timeout: 15000 });

      // User can still interact with settings
      await appPage.openSettings();
      await expect(settingsDialogPage.dialog).toBeVisible();
    });
  });
});
