import { test, expect } from '../fixtures/test-fixtures';
import { seedCars, seedSelectedCar, createTestCar, TEST_CARS, clearAllStorage } from '../fixtures/localStorage';

async function setupCarAndNavigate(page: import('@playwright/test').Page) {
  await clearAllStorage(page);
  const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
  await seedCars(page, [testCar]);
  await seedSelectedCar(page, 'car-1');
  await page.goto('/');
}

test.describe('Charging Calculation', () => {
  test('displays charging results with default values including cost and energy', async ({ appPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Wait for initial calculation
    await resultsPage.expectResultsVisible();
    await resultsPage.expectTimelineVisible();

    // Should have cost in DKK format
    const cost = await resultsPage.getCost();
    expect(cost).toMatch(/\d+(\.\d+)?\s*DKK/);

    // Should show energy needed
    const energy = await resultsPage.getEnergy();
    expect(energy).toMatch(/\d+(\.\d+)?\s*kWh/);

    // Should show duration
    const duration = await resultsPage.getDuration();
    expect(duration).toMatch(/\d+h|\d+m/);
  });

  test('recalculates when start battery percentage changes', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Get initial energy (20% to 80% = 60% of 60kWh = 36kWh)
    const initialEnergy = await resultsPage.getEnergy();
    const initialEnergyValue = parseFloat(initialEnergy);

    // Change start percent from 20 to 50 (now 50% to 80% = 30% = 18kWh)
    await inputFormPage.setStartPercent(50);
    await inputFormPage.waitForCalculation();

    // Energy should be less
    const newEnergy = await resultsPage.getEnergy();
    const newEnergyValue = parseFloat(newEnergy);
    expect(newEnergyValue).toBeLessThan(initialEnergyValue);
  });

  test('shows error when time window is too short for required charging', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set a very short time window (30 minutes) - not enough for 36kWh at 11kW
    await inputFormPage.setRelativeTimeWindow(0, 0.5); // 30 minutes
    await inputFormPage.waitForCalculation();

    // Should show error about insufficient time
    const hasError = await resultsPage.hasError();
    expect(hasError).toBe(true);

    const errorText = await resultsPage.getErrorText();
    expect(errorText.toLowerCase()).toContain('not enough time');
  });

  test('displays price timeline with stromligning attribution', async ({ appPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    await resultsPage.expectTimelineVisible();

    // Should show stromligning.dk attribution
    await expect(page.getByText('stromligning.dk')).toBeVisible();
  });

  test('updates duration when charging power changes', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Extend time window to 12 hours to accommodate slower charging
    // 36kWh at 3.7kW = ~9.7 hours, so we need at least 10 hours
    await inputFormPage.setRelativeTimeWindow(0, 12);
    await inputFormPage.waitForCalculation();

    // Wait for results to be visible first
    await resultsPage.expectResultsVisible();
    const initialDuration = await resultsPage.getDuration();

    // Change to slower charging (3.7 kW instead of 11 kW)
    await inputFormPage.setChargingPower('3.7');
    await inputFormPage.waitForCalculation();

    // Wait for results again
    await resultsPage.expectResultsVisible();
    const newDuration = await resultsPage.getDuration();

    // Duration should be different (longer with slower charging)
    expect(newDuration).not.toBe(initialDuration);
  });
});
