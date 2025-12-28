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

  test('shows error when time window is entirely in the past', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set time window in the past
    const pastStart = new Date();
    pastStart.setHours(pastStart.getHours() - 5);
    const pastEnd = new Date();
    pastEnd.setHours(pastEnd.getHours() - 3);

    await inputFormPage.setTimeWindow(
      pastStart.toISOString().slice(0, 16),
      pastEnd.toISOString().slice(0, 16)
    );
    await inputFormPage.waitForCalculation();

    // Should show error about no price data or time window
    const hasError = await resultsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('shows error when time window is far in the future with no price data', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set time window 5 days in the future (beyond available mock data)
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 5);
    const futureEnd = new Date(futureStart.getTime() + 8 * 60 * 60 * 1000);

    await inputFormPage.setTimeWindow(
      futureStart.toISOString().slice(0, 16),
      futureEnd.toISOString().slice(0, 16)
    );
    await inputFormPage.waitForCalculation();

    // Should show error about no price data
    const hasError = await resultsPage.hasError();
    expect(hasError).toBe(true);

    const errorText = await resultsPage.getErrorText();
    expect(errorText).toContain('No price data');
  });
});
