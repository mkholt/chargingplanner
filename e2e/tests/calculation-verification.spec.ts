import { test, expect } from '../fixtures/test-fixtures';
import {
  seedCars,
  seedSelectedCar,
  createTestCar,
  TEST_CARS,
  clearAllStorage,
  setPriceScenario,
  PRICE_SCENARIOS,
} from '../fixtures/localStorage';
import { InputFormPage } from '../pages/input-form.page';

async function setupCarAndNavigate(
  page: import('@playwright/test').Page,
  car: (typeof TEST_CARS)[keyof typeof TEST_CARS] = TEST_CARS.TESLA_MODEL_3,
  carId = 'car-1'
) {
  await clearAllStorage(page);
  const testCar = createTestCar(carId, car);
  await seedCars(page, [testCar]);
  await seedSelectedCar(page, carId);
  await page.goto('/');
}

test.describe('Calculation Verification', () => {
  test.describe('Hard-coded Value Tests', () => {
    test('20% to 80% on 60 kWh battery = 40 kWh energy from grid (includes 10% charging loss)', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3); // 60 kWh battery
      await appPage.waitForAppReady();

      // Default is 20% to 80%
      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      const energy = await resultsPage.getEnergyValue();
      // (80 - 20) / 100 * 60 = 36 kWh to battery
      // With 10% charging loss (90% efficiency): 36 / 0.9 = 40 kWh from grid
      expect(energy).toBe(40);
    });

    test('40 kWh from grid at 11 kW = ~3.64 hours duration', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3); // 60 kWh, 11 kW
      await appPage.waitForAppReady();

      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);
      await inputFormPage.setChargingPower('11');
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      const durationHours = await resultsPage.getDurationHours();
      // 36 kWh to battery → 40 kWh from grid (10% loss)
      // 40 kWh / 11 kW = 3.64 hours
      expect(durationHours).toBeCloseTo(3.64, 1);
    });

    test('40 kWh from grid at 3.7 kW = ~10.81 hours duration', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3);
      await appPage.waitForAppReady();

      // Don't change time window - use default which gives enough hours
      // Changing time window on mobile causes issues with TimePicker "next occurrence" logic

      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);
      await inputFormPage.setChargingPower('3.7');
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      const durationHours = await resultsPage.getDurationHours();
      // 36 kWh to battery → 40 kWh from grid (10% loss)
      // 40 kWh / 3.7 kW = 10.81 hours
      expect(durationHours).toBeCloseTo(10.81, 1);
    });
  });

  test.describe('Formula Relationship Tests', () => {
    test('energy scales linearly with battery size', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // First: 60 kWh battery
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3);
      await appPage.waitForAppReady();

      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);
      await inputFormPage.waitForCalculation();

      const energy60 = await resultsPage.getEnergyValue();

      // Second: Change to 77 kWh battery (VW ID.4)
      await inputFormPage.setBatterySize(77);
      await inputFormPage.waitForCalculation();

      const energy77 = await resultsPage.getEnergyValue();

      // Energy should scale proportionally: 77/60 ratio
      const expectedRatio = 77 / 60;
      const actualRatio = energy77 / energy60;
      expect(actualRatio).toBeCloseTo(expectedRatio, 1);
    });

    test('duration scales inversely with charging power', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3);
      await appPage.waitForAppReady();

      // Extend time window
      await inputFormPage.setRelativeTimeWindow(0, 12);

      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);

      // First: 11 kW charging
      await inputFormPage.setChargingPower('11');
      await inputFormPage.waitForCalculation();
      const duration11kW = await resultsPage.getDurationHours();

      // Second: 22 kW charging (double the power)
      await inputFormPage.setChargingPower('22');
      await inputFormPage.waitForCalculation();
      const duration22kW = await resultsPage.getDurationHours();

      // Double power = half duration
      expect(duration11kW / duration22kW).toBeCloseTo(2, 1);
    });

    test('percentage range affects energy proportionally', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3);
      await appPage.waitForAppReady();

      // First: 60% range (20% to 80%)
      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);
      await inputFormPage.waitForCalculation();
      const energy60Range = await resultsPage.getEnergyValue();

      // Second: 10% range (40% to 50%)
      await inputFormPage.setStartPercent(40);
      await inputFormPage.setEndPercent(50);
      await inputFormPage.waitForCalculation();
      const energy10Range = await resultsPage.getEnergyValue();

      // 60% range needs 6x the energy of 10% range
      expect(energy60Range / energy10Range).toBeCloseTo(6, 1);
    });
  });

  test.describe('Optimal Window Selection (Price Scenarios)', () => {
    test('flat prices: cost equals energy times flat price', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // Set up flat price scenario BEFORE navigation triggers price fetch
      await clearAllStorage(page);
      await setPriceScenario(page, PRICE_SCENARIOS.FLAT);
      const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
      await seedCars(page, [testCar]);
      await seedSelectedCar(page, 'car-1');
      await page.goto('/');
      await appPage.waitForAppReady();

      // Set up a simple charging scenario
      await inputFormPage.setStartPercent(50);
      await inputFormPage.setEndPercent(60);
      await inputFormPage.setChargingPower('11');
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      const energy = await resultsPage.getEnergyValue();
      const cost = await resultsPage.getCostValue();

      // Flat price is 2.50 kr/kWh
      // Cost = energy * price (with some rounding tolerance)
      const expectedCost = energy * 2.5;
      expect(cost).toBeCloseTo(expectedCost, 0);
    });

    test('cheapest-night scenario: prefers 03:00 charging window when available', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // Set up cheapest-night scenario
      await clearAllStorage(page);
      await setPriceScenario(page, PRICE_SCENARIOS.CHEAPEST_NIGHT);
      const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
      await seedCars(page, [testCar]);
      await seedSelectedCar(page, 'car-1');
      await page.goto('/');
      await appPage.waitForAppReady();

      // Set time window that includes 03:00
      // Tomorrow 00:00 to 08:00 (TimePicker will auto-select tomorrow for past times)
      await inputFormPage.setTimeWindow('00:00', '08:00');

      // Small charge that fits in 1 hour window
      await inputFormPage.setStartPercent(50);
      await inputFormPage.setEndPercent(60);
      await inputFormPage.setChargingPower('11');
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      // The optimal window should start around 03:00
      const startTime = await resultsPage.getStartTime();
      expect(startTime).toMatch(/03:/);
    });

    test('cheapest-midday scenario: prefers 12:00 charging window when available', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // Set up cheapest-midday scenario
      await clearAllStorage(page);
      await setPriceScenario(page, PRICE_SCENARIOS.CHEAPEST_MIDDAY);
      const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
      await seedCars(page, [testCar]);
      await seedSelectedCar(page, 'car-1');
      await page.goto('/');
      await appPage.waitForAppReady();

      // Set time window that includes 12:00
      // Tomorrow 08:00 to 16:00 (TimePicker will auto-select tomorrow for past times)
      await inputFormPage.setTimeWindow('08:00', '16:00');

      // Small charge
      await inputFormPage.setStartPercent(50);
      await inputFormPage.setEndPercent(60);
      await inputFormPage.setChargingPower('11');
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      // The optimal window should start around 12:00
      const startTime = await resultsPage.getStartTime();
      expect(startTime).toMatch(/12:/);
    });

    test('descending prices: prefers later charging times', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // Set up descending price scenario
      await clearAllStorage(page);
      await setPriceScenario(page, PRICE_SCENARIOS.DESCENDING);
      const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
      await seedCars(page, [testCar]);
      await seedSelectedCar(page, 'car-1');
      await page.goto('/');
      await appPage.waitForAppReady();

      // Small charge
      await inputFormPage.setStartPercent(50);
      await inputFormPage.setEndPercent(55);
      await inputFormPage.setChargingPower('11');

      // Set a 4-hour window starting now
      await inputFormPage.setRelativeTimeWindow(0, 4);
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      // With descending prices, the algorithm should pick a window
      // closer to the end of the available range
      // We verify this by checking cost is less than if we started immediately
      const cost = await resultsPage.getCostValue();

      // The cost with descending prices (choosing cheapest) should be lower
      // than the first-hour price (4.00 kr/kWh) would give
      // Energy for 5% of 60kWh = 3 kWh
      // At starting price of 4.00 kr/kWh, cost would be ~12 DKK
      // At lower prices, it should be less
      expect(cost).toBeLessThan(12);
    });
  });

  test.describe('Switching Cars Updates Calculations', () => {
    test('selecting different car recalculates energy and duration', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // Set up two cars
      await clearAllStorage(page);
      const tesla = createTestCar('tesla', TEST_CARS.TESLA_MODEL_3);   // 60 kWh
      const porsche = createTestCar('porsche', TEST_CARS.PORSCHE_TAYCAN); // 93 kWh
      await seedCars(page, [tesla, porsche]);
      await seedSelectedCar(page, 'tesla');
      await page.goto('/');
      await appPage.waitForAppReady();

      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(80);
      await inputFormPage.waitForCalculation();

      // Get energy with Tesla
      const teslaEnergy = await resultsPage.getEnergyValue();
      // 60% of 60 kWh = 36 kWh to battery → 40 kWh from grid (10% loss)
      expect(teslaEnergy).toBe(40);

      // Switch to Porsche (via car selector dropdown)
      const carSelector = page.getByRole('combobox').first();
      await carSelector.click();
      await page.getByRole('option', { name: /Porsche/i }).click();
      await inputFormPage.waitForCalculation();

      // Get energy with Porsche
      const porscheEnergy = await resultsPage.getEnergyValue();
      // 60% of 93 kWh = 55.8 kWh to battery → 62 kWh from grid (10% loss)
      expect(porscheEnergy).toBeCloseTo(62, 1);
    });
  });

  test.describe('Edge Cases', () => {
    test('minimum viable charge (1% difference) calculates correctly', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      await setupCarAndNavigate(page, TEST_CARS.TESLA_MODEL_3);
      await appPage.waitForAppReady();

      // 1% of 60 kWh = 0.6 kWh to battery → 0.67 kWh from grid (10% loss)
      await inputFormPage.setStartPercent(50);
      await inputFormPage.setEndPercent(51);
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      const energy = await resultsPage.getEnergyValue();
      expect(energy).toBeCloseTo(0.67, 1);
    });

    test('large battery with slow charging calculates correctly', async ({
      appPage,
      inputFormPage,
      resultsPage,
      page,
    }) => {
      // Use Porsche Taycan with 93 kWh battery
      await setupCarAndNavigate(page, TEST_CARS.PORSCHE_TAYCAN);
      await appPage.waitForAppReady();

      // Use 11kW charging to keep duration reasonable for the time window
      // 50% of 93 kWh = 46.5 kWh to battery → 51.67 kWh from grid (10% loss)
      // 51.67 kWh / 11 kW = ~4.7 hours - fits easily in default window
      await inputFormPage.setStartPercent(20);
      await inputFormPage.setEndPercent(70);
      await inputFormPage.setChargingPower('11'); // 3-phase charger
      await inputFormPage.waitForCalculation();

      await resultsPage.expectResultsVisible();

      const energy = await resultsPage.getEnergyValue();
      const durationHours = await resultsPage.getDurationHours();

      // 50% of 93 kWh = 46.5 kWh to battery → 51.67 kWh from grid (10% loss)
      expect(energy).toBeCloseTo(51.67, 1);

      // 51.67 kWh / 11 kW = ~4.7 hours
      expect(durationHours).toBeCloseTo(4.7, 1);
    });
  });
});
