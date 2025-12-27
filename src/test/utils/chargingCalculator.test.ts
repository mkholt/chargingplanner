
import { findOptimalChargingWindow, type ChargingInput } from '@/utils/chargingCalculator';

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
    it('correctly calculates energy needed from percentage and battery size', () => {
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 80,
        batterySize: 60,
        chargingSpeed: 30, // Fast charging to complete in 1.2 hours
        prices: [1, 1, 1, 1],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // 60% of 60kWh = 36kWh
      expect(result!.energyNeeded).toBe(36);
    });
  });

  describe('optimal window finding with 60-minute intervals', () => {
    it('finds the cheapest single-hour window', () => {
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 20,
        batterySize: 50,
        chargingSpeed: 10, // 10kWh needed, 1 hour charging time
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
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 60,
        batterySize: 50,
        chargingSpeed: 10, // 30kWh needed, 3 hours charging time
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
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 40,
        batterySize: 50,
        chargingSpeed: 10, // 20kWh needed, 2 hours charging time
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
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 20,
        batterySize: 40,
        chargingSpeed: 8, // 8kWh needed, 1 hour = 4 intervals
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
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 10,
        batterySize: 40,
        chargingSpeed: 8, // 4kWh needed, 0.5 hours = 2 intervals at 15m
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
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 100,
        batterySize: 50,
        chargingSpeed: 50, // 1 hour charging time
        prices: [1, 2, 3],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.energyNeeded).toBe(50);
      expect(result!.durationHours).toBe(1);
      expect(result!.startIndex).toBe(0); // Cheapest slot
    });

    it('works when only one valid window exists', () => {
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 50,
        batterySize: 40,
        chargingSpeed: 10, // 20kWh needed, 2 hours
        prices: [1, 2],
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.startIndex).toBe(0);
      expect(result!.endIndex).toBe(2);
    });

    it('handles uniform prices', () => {
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 40,
        batterySize: 50,
        chargingSpeed: 10, // 10kWh needed, 1 hour
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
