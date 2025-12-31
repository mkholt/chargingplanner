import { test, expect } from '../fixtures/test-fixtures';
import { seedCars, seedSelectedCar, createTestCar, TEST_CARS, clearAllStorage } from '../fixtures/localStorage';
import { roundToNext15Minutes, formatTimeValue } from '../../src/utils';

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

  test('displays price timeline with stromligning attribution', async ({ appPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    await resultsPage.expectTimelineVisible();

    // Should show stromligning.dk attribution
    await expect(resultsPage.timeline).toBeVisible();
  });

  test('updates duration when charging power changes', async ({ appPage, inputFormPage, resultsPage, page }) => {
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Use default time window (now to 07:00 tomorrow) - should be enough for testing
    // Wait for results to be visible first
    await resultsPage.expectResultsVisible();
    const initialDuration = await resultsPage.getDuration();

    // Change to faster charging (22 kW instead of 11 kW)
    // This avoids needing extra time window extension
    await inputFormPage.setChargingPower('22');
    await inputFormPage.waitForCalculation();

    // Wait for results again
    await resultsPage.expectResultsVisible();
    const newDuration = await resultsPage.getDuration();

    // Duration should be different (shorter with faster charging)
    expect(newDuration).not.toBe(initialDuration);
  });

  test('"Set to now" button updates earliest time to current time rounded to next 15 minutes', async ({ appPage, inputFormPage, page, frozenTime }) => {
    // Note: frozenTime fixture freezes browser Date to FIXED_TEST_TIME for consistent results
    await setupCarAndNavigate(page);
    await appPage.waitForAppReady();

    // Set earliest time to something different from "now" (e.g., 2 hours from frozen time)
    await inputFormPage.setRelativeTimeWindow(2, 10);
    const initialTime = await inputFormPage.getEarliestTime();

    // Click "Set to now" button
    await inputFormPage.clickSetToNow();

    // Get the new time
    const newTime = await inputFormPage.getEarliestTime();

    // Time should have changed
    expect(newTime).not.toBe(initialTime);

    // Verify it's the frozen time (rounded to next 15 minutes)
    const expectedTime = formatTimeValue(roundToNext15Minutes(frozenTime));
    expect(newTime).toBe(expectedTime);
  });
});
