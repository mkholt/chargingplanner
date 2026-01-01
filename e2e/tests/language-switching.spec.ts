import { test, expect, translations } from '../fixtures/test-fixtures';
import { seedLanguage } from '../fixtures/localStorage';

test.describe('Language Switching', () => {
  test('defaults to English when no preference is set', async ({ page, appPage }) => {
    await appPage.goto();

    // Check that the app title is in English
    await expect(page.getByText(translations.en.appTitle)).toBeVisible();

    // Check that the settings button is present using test id
    await expect(page.getByTestId('settings-button')).toBeVisible();
  });

  test('respects seeded Danish language preference', async ({ page, appPage }) => {
    // Seed Danish language before navigating
    await seedLanguage(page, 'da');
    // Navigate and wait for page to load
    await page.goto('/');
    // Wait for app title (may be in English or Danish depending on i18n load timing)
    await expect(page.getByTestId('app-title')).toBeVisible();
    await expect(page.getByTestId('price-attribution')).toBeVisible();

    // Check that the app title is in Danish
    await expect(page.getByText(translations.da.appTitle)).toBeVisible();

    // Check that the settings button is present
    await expect(page.getByTestId('settings-button')).toBeVisible();
  });

  test('can switch language to Danish via settings', async ({
    page,
    appPage,
    settingsDialogPage,
  }) => {
    await appPage.goto();

    // Verify initial English state
    await expect(page.getByText(translations.en.appTitle)).toBeVisible();

    // Open settings and switch to Danish
    await appPage.openSettings();
    await settingsDialogPage.selectLanguage('da');
    await settingsDialogPage.close();

    // Verify the app is now in Danish
    await expect(page.getByText(translations.da.appTitle)).toBeVisible();
  });

  test('can switch language to English via settings', async ({
    page,
    appPage,
    settingsDialogPage,
  }) => {
    // Start with Danish
    await seedLanguage(page, 'da');
    await appPage.goto();

    // Verify initial Danish state
    await expect(page.getByText(translations.da.appTitle)).toBeVisible();

    // Open settings and switch to English
    await appPage.openSettings();
    await settingsDialogPage.selectLanguage('en');
    await settingsDialogPage.close();

    // Verify the app is now in English
    await expect(page.getByText(translations.en.appTitle)).toBeVisible();
  });

  test('language preference persists across page reloads', async ({
    page,
    appPage,
    settingsDialogPage,
  }) => {
    await appPage.goto();

    // Switch to Danish
    await appPage.openSettings();
    await settingsDialogPage.selectLanguage('da');
    await settingsDialogPage.close();

    // Verify Danish
    await expect(page.getByText(translations.da.appTitle)).toBeVisible();

    // Reload the page
    await page.reload();
    await appPage.waitForReady();

    // Verify Danish persists
    await expect(page.getByText(translations.da.appTitle)).toBeVisible();
  });

  test('settings dialog labels update when language changes', async ({
    page,
    appPage,
    settingsDialogPage,
  }) => {
    await appPage.goto();
    await appPage.openSettings();

    // Verify English tab labels
    await expect(settingsDialogPage.carsTab).toContainText(translations.en.settings.tabs.cars);
    await expect(settingsDialogPage.electricityTab).toContainText(translations.en.settings.tabs.electricity);
    await expect(settingsDialogPage.appTab).toContainText(translations.en.settings.tabs.app);

    // Switch to Danish
    await settingsDialogPage.selectLanguage('da');

    // Verify Danish tab labels
    await expect(settingsDialogPage.carsTab).toContainText(translations.da.settings.tabs.cars);
    await expect(settingsDialogPage.electricityTab).toContainText(translations.da.settings.tabs.electricity);
    await expect(settingsDialogPage.appTab).toContainText(translations.da.settings.tabs.app);
  });

  test('input form labels update when language changes', async ({
    page,
    appPage,
    settingsDialogPage,
  }) => {
    await appPage.goto();

    // Verify English labels in input form
    await expect(page.getByText(translations.en.input.chargingSettings)).toBeVisible();
    await expect(page.getByText(translations.en.input.startPercent)).toBeVisible();
    await expect(page.getByText(translations.en.input.endPercent)).toBeVisible();

    // Switch to Danish
    await appPage.openSettings();
    await settingsDialogPage.selectLanguage('da');
    await settingsDialogPage.close();

    // Verify Danish labels in input form
    await expect(page.getByText(translations.da.input.chargingSettings)).toBeVisible();
    await expect(page.getByText(translations.en.input.startPercent)).toBeVisible(); // Same in Danish
    await expect(page.getByText(translations.da.input.endPercent)).toBeVisible();
  });

  test('car management labels update when language changes', async ({
    page,
    appPage,
    settingsDialogPage,
  }) => {
    await appPage.goto();

    // Verify English "No car saved" message
    await expect(page.getByTestId('no-car-message')).toContainText(translations.en.cars.noCarSaved);

    // Switch to Danish
    await appPage.openSettings();
    await settingsDialogPage.selectLanguage('da');
    await settingsDialogPage.close();

    // Verify Danish message
    await expect(page.getByTestId('no-car-message')).toContainText(translations.da.cars.noCarSaved);
  });
});
