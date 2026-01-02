import { test, expect } from '../fixtures/test-fixtures';
import { seedCars, seedSelectedCar, createTestCar, TEST_CARS, clearAllStorage } from '../fixtures/localStorage';

test.describe('Car Management', () => {
  test('shows "Add Car" button and message when no cars exist', async ({ appPage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();

    await expect(appPage.addCarButton).toBeVisible();
    await expect(appPage.noCarMessage).toBeVisible();
  });

  test('can add a new car from settings dialog and it becomes selected', async ({ appPage, settingsPanePage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();
    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();

    await settingsPanePage.addCar('Tesla Model 3', 60, 11);

    // Verify car appears in list
    const carNames = await settingsPanePage.getCarCardNames();
    expect(carNames).toContain('Tesla Model 3');

    await settingsPanePage.close();

    // Verify car is now shown in the selector
    const selectorText = await appPage.getSelectedCarText();
    expect(selectorText).toContain('Tesla Model 3');
    expect(selectorText).toContain('60');
  });

  test('can edit an existing car name and battery size', async ({ appPage, settingsPanePage, page }) => {
    const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
    await clearAllStorage(page);
    await seedCars(page, [testCar]);
    await seedSelectedCar(page, 'car-1');
    await page.goto('/');
    await appPage.waitForAppReady();

    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();

    await settingsPanePage.editCar('Tesla Model 3', {
      name: 'Tesla Model 3 LR',
      batterySize: 75,
    });

    // Verify updated name appears
    const carNames = await settingsPanePage.getCarCardNames();
    expect(carNames).toContain('Tesla Model 3 LR');
    expect(carNames).not.toContain('Tesla Model 3');
  });

  test('can delete a car with confirmation dialog', async ({ appPage, settingsPanePage, page }) => {
    const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
    await clearAllStorage(page);
    await seedCars(page, [testCar]);
    await page.goto('/');
    await appPage.waitForAppReady();

    await appPage.openSettings();
    await settingsPanePage.switchToCarsTab();

    await settingsPanePage.deleteCar('Tesla Model 3');

    // Car should be removed
    const carNames = await settingsPanePage.getCarCardNames();
    expect(carNames).not.toContain('Tesla Model 3');

    await settingsPanePage.close();

    // Should show "No car saved" again
    await expect(appPage.addCarButton).toBeVisible();
    await expect(appPage.noCarMessage).toBeVisible();
  });

  test('selecting a different car updates the form values', async ({ appPage, inputFormPage, page }) => {
    const cars = [
      createTestCar('car-1', TEST_CARS.TESLA_MODEL_3), // 60 kWh, 11 kW
      createTestCar('car-2', TEST_CARS.VW_ID4), // 77 kWh, 11 kW
    ];
    await clearAllStorage(page);
    await seedCars(page, cars);
    await seedSelectedCar(page, 'car-1');
    await page.goto('/');
    await appPage.waitForAppReady();

    // Initially Tesla values (60 kWh)
    let batterySize = await inputFormPage.getBatterySize();
    expect(batterySize).toBe(60);

    // Select VW ID.4
    await appPage.selectCar('VW ID.4');

    // Battery size should update to 77 kWh
    // Need to expand vehicle settings again since InputForm remounts when car changes
    batterySize = await inputFormPage.getBatterySize();
    expect(batterySize).toBe(77);
  });
});
