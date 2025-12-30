import { findOptimalChargingWindow, type ChargingInput } from '@/utils/chargingCalculator';
import { CHARGING_EFFICIENCY } from '@/utils/constants';

describe('findOptimalChargingWindow', () => {
  describe('invalid inputs', () => {
    it('returns null when endPercent <= startPercent', () => {
      const input: ChargingInput = {
        startPercent: 80,
        endPercent: 20,
        batterySize: 60,
        chargingSpeed: 11,
        prices: [1, 2, 3, 4],
        intervalMinutes: 60,
      };
      expect(findOptimalChargingWindow(input)).toBeNull();

      // Also test equal percentages
      input.endPercent = 80;
      expect(findOptimalChargingWindow(input)).toBeNull();
    });

    it('returns null when chargingSpeed is zero or negative', () => {
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 80,
        batterySize: 60,
        chargingSpeed: 0,
        prices: [1, 2, 3, 4],
        intervalMinutes: 60,
      };
      expect(findOptimalChargingWindow(input)).toBeNull();
    });

    it('returns null when batterySize is zero or negative', () => {
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 80,
        batterySize: 0,
        chargingSpeed: 11,
        prices: [1, 2, 3, 4],
        intervalMinutes: 60,
      };
      expect(findOptimalChargingWindow(input)).toBeNull();
    });

    it('returns null when duration exceeds available price slots', () => {
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 100,
        batterySize: 100,
        chargingSpeed: 11,
        prices: [1, 2], // Only 2 hours of prices, need ~9 hours
        intervalMinutes: 60,
      };
      expect(findOptimalChargingWindow(input)).toBeNull();
    });
  });

  describe('energy calculation', () => {
    it('correctly calculates energy needed including charging losses', () => {
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 80,
        batterySize: 60,
        chargingSpeed: 50, // Fast charging to complete quickly
        prices: [1, 1, 1, 1],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // 60% of 60kWh = 36kWh in battery, but we need 36/0.9 = 40kWh from grid
      const batteryEnergy = 36;
      const gridEnergy = batteryEnergy / CHARGING_EFFICIENCY;
      expect(result!.energyNeeded).toBe(gridEnergy);
    });
  });

  describe('optimal window finding with 60-minute intervals', () => {
    it('finds the cheapest single-hour window', () => {
      // With 90% efficiency: 9kWh in battery needs 10kWh from grid
      // At 10kW charging speed, this takes exactly 1 hour
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 18% of 50kWh = 9kWh in battery = 10kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 10kWh from grid, 1 hour charging
        prices: [3, 5, 1, 4, 2],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.startIndex).toBe(2); // Index of cheapest price (1)
      expect(result!.endIndex).toBe(3);
      expect(result!.durationHours).toBe(1);
    });

    it('finds the cheapest multi-hour window', () => {
      // With 90% efficiency: 27kWh in battery needs 30kWh from grid
      // At 10kW charging speed, this takes exactly 3 hours
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 54, // 54% of 50kWh = 27kWh in battery = 30kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 30kWh from grid, 3 hours charging
        prices: [5, 4, 1, 2, 3, 6],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.startIndex).toBe(2); // Window [1, 2, 3] = sum 6
      expect(result!.endIndex).toBe(5);
      expect(result!.durationHours).toBe(3);
      expect(result!.windowPrices).toEqual([1, 2, 3]);
    });

    it('calculates total cost correctly', () => {
      // With 90% efficiency: 18kWh in battery needs 20kWh from grid
      // At 10kW charging speed, this takes 2 hours
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 36, // 36% of 50kWh = 18kWh in battery = 20kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 20kWh from grid, 2 hours charging
        prices: [2, 3],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Cost = (2 + 3) * 10kW * 1h = 50 kr
      expect(result!.totalCost).toBe(50);
    });
  });

  describe('optimal window finding with 15-minute intervals', () => {
    it('finds the cheapest window with 15-minute intervals', () => {
      // With 90% efficiency: 8kWh in battery needs 8.89kWh from grid
      // At 8.89kW charging speed, this takes 1 hour = 4 intervals
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 20,
        batterySize: 40,
        chargingSpeed: 8.89, // 8.89kWh from grid, 1 hour = 4 intervals
        prices: [4, 4, 4, 4, 1, 1, 1, 1, 3, 3, 3, 3],
        intervalMinutes: 15,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.startIndex).toBe(4); // Start at the 1s
      expect(result!.endIndex).toBe(8);
      expect(result!.intervalMinutes).toBe(15);
      expect(result!.windowPrices).toEqual([1, 1, 1, 1]);
    });

    it('handles partial intervals correctly', () => {
      // With 90% efficiency: 4kWh in battery needs 4.44kWh from grid
      // At 8.89kW charging speed, this takes 0.5 hours = 2 intervals at 15m
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 10,
        batterySize: 40,
        chargingSpeed: 8.89, // 4.44kWh from grid, 0.5 hours
        prices: [5, 5, 1, 2, 3, 3],
        intervalMinutes: 15,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.startIndex).toBe(2); // Window [1, 2] = lowest sum
      expect(result!.durationHours).toBe(0.5);
    });
  });

  describe('edge cases', () => {
    it('handles charging from 0% to 100%', () => {
      // With 90% efficiency: 50kWh in battery needs 55.56kWh from grid
      // At 55.56kW charging speed, this takes 1 hour
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 100,
        batterySize: 50,
        chargingSpeed: 55.56, // 55.56kWh from grid, 1 hour charging
        prices: [1, 2, 3],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Grid energy = 50 / 0.9 = 55.56kWh
      expect(result!.energyNeeded).toBeCloseTo(55.56, 1);
      expect(result!.durationHours).toBe(1);
      expect(result!.startIndex).toBe(0); // Cheapest slot
    });

    it('works when only one valid window exists', () => {
      // With 90% efficiency: 18kWh in battery needs 20kWh from grid
      // At 10kW charging speed, this takes 2 hours
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 45, // 45% of 40kWh = 18kWh in battery = 20kWh from grid
        batterySize: 40,
        chargingSpeed: 10, // 20kWh from grid, 2 hours
        prices: [1, 2],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.startIndex).toBe(0);
      expect(result!.endIndex).toBe(2);
    });

    it('handles uniform prices', () => {
      // With 90% efficiency: 10kWh in battery needs 11.11kWh from grid
      // At 11.11kW charging speed, this takes 1 hour
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 40,
        batterySize: 50,
        chargingSpeed: 11.11, // 11.11kWh from grid, 1 hour
        prices: [2, 2, 2, 2],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Should return first window since all costs are equal
      expect(result!.startIndex).toBe(0);
    });
  });
});
