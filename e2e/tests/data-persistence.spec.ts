import { test, expect } from '../fixtures/test-fixtures';
import { seedCars, seedSelectedCar, seedPriceSettings, createTestCar, TEST_CARS, POSTAL_CODES, clearAllStorage } from '../fixtures/localStorage';

test.describe('Data Persistence', () => {
  test('cars persist across page reloads', async ({ page, appPage }) => {
    // Clear storage and add cars
    await clearAllStorage(page);
    const car1 = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
    const car2 = createTestCar('car-2', TEST_CARS.VW_ID4);
    await seedCars(page, [car1, car2]);
    await seedSelectedCar(page, 'car-1');

    // Load and verify
    await page.goto('/');
    await appPage.waitForAppReady();

    const selectedText = await appPage.getSelectedCarText();
    expect(selectedText).toContain('Tesla Model 3');

    // Reload the page
    await page.reload();
    await appPage.waitForAppReady();

    // Verify cars still exist
    const selectedTextAfterReload = await appPage.getSelectedCarText();
    expect(selectedTextAfterReload).toContain('Tesla Model 3');

    // Verify we can switch to the other car
    await appPage.selectCar('VW ID.4');
    const newSelection = await appPage.getSelectedCarText();
    expect(newSelection).toContain('VW ID.4');
  });

  test('price settings persist across page reloads', async ({ page, appPage, settingsDialogPage }) => {
    // Clear storage and set price settings
    await clearAllStorage(page);
    const car = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
    await seedCars(page, [car]);
    await seedSelectedCar(page, 'car-1');
    await seedPriceSettings(page, {
      postalCode: POSTAL_CODES.COPENHAGEN,
      priceArea: 'DK2',
    });

    // Load and verify via settings dialog
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsDialogPage.switchToElectricityTab();

    // Check postal code is preserved
    const postalCode = await settingsDialogPage.getPostalCodeValue();
    expect(postalCode).toBe(String(POSTAL_CODES.COPENHAGEN));

    // Close and reload
    await settingsDialogPage.close();
    await page.reload();
    await appPage.waitForAppReady();

    // Verify settings persisted
    await appPage.openSettings();
    await settingsDialogPage.switchToElectricityTab();
    const postalCodeAfterReload = await settingsDialogPage.getPostalCodeValue();
    expect(postalCodeAfterReload).toBe(String(POSTAL_CODES.COPENHAGEN));
  });

  test('clearing localStorage resets app to initial state', async ({ page, appPage }) => {
    // First seed some data
    const car = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
    await seedCars(page, [car]);
    await seedSelectedCar(page, 'car-1');

    await page.goto('/');
    await appPage.waitForAppReady();

    // Verify car exists
    const selectedText = await appPage.getSelectedCarText();
    expect(selectedText).toContain('Tesla Model 3');

    // Clear storage and reload
    await clearAllStorage(page);
    await page.reload();
    await appPage.waitForAppReady();

    // Should show "Add Car" button since no cars exist
    await expect(page.getByRole('button', { name: /add.*car/i })).toBeVisible();
  });

  test('selected car ID is validated against existing cars', async ({ page, appPage }) => {
    // Seed a car but set selected ID to a non-existent car
    await clearAllStorage(page);
    const car = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
    await seedCars(page, [car]);
    await seedSelectedCar(page, 'non-existent-car-id');

    await page.goto('/');
    await appPage.waitForAppReady();

    // App should fall back to showing the existing car or the add button
    // The exact behavior depends on the implementation - it should either:
    // 1. Show the first available car, or
    // 2. Show the "Add Car" button
    const hasAddButton = await page.getByRole('button', { name: /add.*car/i }).isVisible().catch(() => false);
    const hasCarSelector = await page.getByTestId('car-selector').isVisible().catch(() => false);

    // At least one of these should be true (app handles invalid ID gracefully)
    expect(hasAddButton || hasCarSelector).toBe(true);
  });
});
