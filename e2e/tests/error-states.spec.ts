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
  test('shows error for impossibly short time windows', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set a very short time window (15 minutes) - not enough for any meaningful charging
    await inputFormPage.setRelativeTimeWindow(0, 0.25); // 15 minutes
    await inputFormPage.waitForCalculation();

    // Should show error about insufficient time
    const hasError = await resultsPage.hasError();
    expect(hasError).toBe(true);

    const errorText = await resultsPage.getErrorText();
    expect(errorText.toLowerCase()).toContain('not enough time');
  });

  test('recovers from error when inputs become valid', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // First create an error state with short time window
    await inputFormPage.setRelativeTimeWindow(0, 0.25); // 15 minutes
    await inputFormPage.waitForCalculation();

    // Verify error exists
    const hasError = await resultsPage.hasError();
    expect(hasError).toBe(true);

    // Now extend the time window to make charging possible
    await inputFormPage.setRelativeTimeWindow(0, 8); // 8 hours
    await inputFormPage.waitForCalculation();

    // Error should be gone and results should be visible
    await resultsPage.expectResultsVisible();

    // Verify we have actual result values
    const cost = await resultsPage.getCost();
    expect(cost).toMatch(/\d+(\.\d+)?\s*DKK/);
  });

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

  test('displays timeline even when calculation has error', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Create an error state
    await inputFormPage.setRelativeTimeWindow(0, 0.25); // 15 minutes
    await inputFormPage.waitForCalculation();

    // Timeline should still be visible (shows prices even if charging not possible)
    await resultsPage.expectTimelineVisible();

    // Stromligning attribution should be visible
    await expect(page.getByText('stromligning')).toBeVisible();
  });
});
