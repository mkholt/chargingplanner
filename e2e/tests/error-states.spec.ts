import { test, expect } from '../fixtures/test-fixtures';
import { seedCars, seedSelectedCar, createTestCar, TEST_CARS, clearAllStorage } from '../fixtures/localStorage';

async function setupCarAndNavigate(page: import('@playwright/test').Page) {
  await clearAllStorage(page);
  const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
  await seedCars(page, [testCar]);
  await seedSelectedCar(page, 'car-1');
  await page.goto('/');
}

test.describe('Error States', () => {
  test('handles small energy requirement gracefully', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set a very small charge requirement (1% to 2% = 0.6 kWh on 60kWh battery)
    await inputFormPage.setStartPercent(50);
    await inputFormPage.setEndPercent(51);
    await inputFormPage.waitForCalculation();

    // Should still show valid results (small but valid charge)
    await resultsPage.expectResultsVisible();

    const energy = await resultsPage.getEnergy();
    expect(energy).toMatch(/\d+(\.\d+)?\s*kWh/);

    // Energy should be very small
    const energyValue = parseFloat(energy);
    expect(energyValue).toBeLessThan(5);
  });

  test('form enforces start percent less than end percent', async ({ appPage, inputFormPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set end to 50, then try to set start to 80
    // Form should cap start at (end - 1) = 49
    await inputFormPage.setEndPercent(50);
    await inputFormPage.setStartPercent(80); // Should be capped at 49

    // Verify the form enforces the constraint
    const startValue = await inputFormPage.getStartPercent();
    const endValue = await inputFormPage.getEndPercent();

    // Start should be less than end (form enforces this)
    expect(startValue).toBeLessThan(endValue);
  });

  test('shows error when battery size is set to zero', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set battery size to 0
    await inputFormPage.setBatterySize(0);
    await inputFormPage.waitForCalculation();

    // Should show error
    const hasError = await resultsPage.hasError();
    expect(hasError).toBe(true);

    const errorText = await resultsPage.getErrorText();
    expect(errorText).toContain('Battery size and charging speed must be positive');
  });
});
