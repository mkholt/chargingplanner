import { findOptimalChargingWindow, type ChargingInput } from '@/utils/chargingCalculator';
import { CHARGING_EFFICIENCY } from '@/utils/constants';
import type { PriceSlot, PriceDetails } from '@/utils/priceMapper';

/** Helper to create PriceSlot array from prices for testing */
function createSlots(prices: number[], intervalMinutes: number = 60): PriceSlot[] {
  const baseTime = new Date(2025, 0, 1, 0, 0, 0);
  return prices.map((price, i) => ({
    timestamp: new Date(baseTime.getTime() + i * intervalMinutes * 60000),
    total: price,
    hasData: true,
  }));
}

/** Helper to create PriceSlot array with price details (spot + tariffs) */
function createSlotsWithDetails(
  prices: { spot: number; tariff: number }[],
  intervalMinutes: number = 60
): PriceSlot[] {
  const baseTime = new Date(2025, 0, 1, 0, 0, 0);
  return prices.map((price, i) => {
    const spotValue = price.spot / 1.25; // Remove VAT to get base value
    const spotVat = spotValue * 0.25;
    const details: PriceDetails = {
      electricity: {
        value: spotValue,
        vat: spotVat,
        total: price.spot,
        unit: 'kr/kWh',
      },
      // Minimal required fields for the test
      surcharge: { value: 0, vat: 0, total: 0, unit: 'kr/kWh' },
      transmission: {
        systemTariff: { value: 0, vat: 0, total: 0, unit: 'kr/kWh' },
        netTariff: { value: 0, vat: 0, total: 0, unit: 'kr/kWh' },
      },
      electricityTax: { value: 0, vat: 0, total: 0, unit: 'kr/kWh' },
      distribution: { value: 0, vat: 0, total: 0, unit: 'kr/kWh' },
    };
    return {
      timestamp: new Date(baseTime.getTime() + i * intervalMinutes * 60000),
      total: price.spot + price.tariff,
      details,
      hasData: true,
    };
  });
}

describe('findOptimalChargingWindow', () => {
  describe('invalid inputs', () => {
    it('returns null when endPercent <= startPercent', () => {
      const input: ChargingInput = {
        startPercent: 80,
        endPercent: 20,
        batterySize: 60,
        chargingSpeed: 11,
        slots: createSlots([1, 2, 3, 4]),
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
        slots: createSlots([1, 2, 3, 4]),
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
        slots: createSlots([1, 2, 3, 4]),
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
        slots: createSlots([1, 2]), // Only 2 hours of prices, need ~9 hours
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
        slots: createSlots([1, 1, 1, 1]),
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
      const slots = createSlots([3, 5, 1, 4, 2]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 18% of 50kWh = 9kWh in battery = 10kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 10kWh from grid, 1 hour charging
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Cheapest price (1) is at index 2 (02:00)
      expect(result!.startTime).toEqual(slots[2].timestamp);
      expect(result!.windowSlots).toHaveLength(1);
      expect(result!.durationHours).toBe(1);
    });

    it('finds the cheapest multi-hour window', () => {
      // With 90% efficiency: 27kWh in battery needs 30kWh from grid
      // At 10kW charging speed, this takes exactly 3 hours
      const slots = createSlots([5, 4, 1, 2, 3, 6]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 54, // 54% of 50kWh = 27kWh in battery = 30kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 30kWh from grid, 3 hours charging
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Window [1, 2, 3] starts at index 2 (02:00)
      expect(result!.startTime).toEqual(slots[2].timestamp);
      expect(result!.durationHours).toBe(3);
      expect(result!.windowSlots.map(s => s.total)).toEqual([1, 2, 3]);
    });

    it('calculates total cost correctly', () => {
      // With 90% efficiency: 18kWh in battery needs 20kWh from grid
      // At 10kW charging speed, this takes 2 hours
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 36, // 36% of 50kWh = 18kWh in battery = 20kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 20kWh from grid, 2 hours charging
        slots: createSlots([2, 3]),
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
      const slots = createSlots([4, 4, 4, 4, 1, 1, 1, 1, 3, 3, 3, 3], 15);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 20,
        batterySize: 40,
        chargingSpeed: 8.89, // 8.89kWh from grid, 1 hour = 4 intervals
        slots,
        intervalMinutes: 15,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Cheapest window starts at index 4 (01:00)
      expect(result!.startTime).toEqual(slots[4].timestamp);
      expect(result!.intervalMinutes).toBe(15);
      expect(result!.windowSlots.map(s => s.total)).toEqual([1, 1, 1, 1]);
    });

    it('handles partial intervals correctly', () => {
      // With 90% efficiency: 4kWh in battery needs 4.44kWh from grid
      // At 8.89kW charging speed, this takes 0.5 hours = 2 intervals at 15m
      const slots = createSlots([5, 5, 1, 2, 3, 3], 15);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 10,
        batterySize: 40,
        chargingSpeed: 8.89, // 4.44kWh from grid, 0.5 hours
        slots,
        intervalMinutes: 15,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Window [1, 2] starts at index 2 (00:30)
      expect(result!.startTime).toEqual(slots[2].timestamp);
      expect(result!.durationHours).toBe(0.5);
    });
  });

  describe('edge cases', () => {
    it('handles charging from 0% to 100%', () => {
      // With 90% efficiency: 50kWh in battery needs 55.56kWh from grid
      // At 55.56kW charging speed, this takes 1 hour
      const slots = createSlots([1, 2, 3]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 100,
        batterySize: 50,
        chargingSpeed: 55.56, // 55.56kWh from grid, 1 hour charging
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Grid energy = 50 / 0.9 = 55.56kWh
      expect(result!.energyNeeded).toBeCloseTo(55.56, 1);
      expect(result!.durationHours).toBe(1);
      // Cheapest slot is at index 0 (00:00)
      expect(result!.startTime).toEqual(slots[0].timestamp);
    });

    it('works when only one valid window exists', () => {
      // With 90% efficiency: 18kWh in battery needs 20kWh from grid
      // At 10kW charging speed, this takes 2 hours
      const slots = createSlots([1, 2]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 45, // 45% of 40kWh = 18kWh in battery = 20kWh from grid
        batterySize: 40,
        chargingSpeed: 10, // 20kWh from grid, 2 hours
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Only window starts at index 0 (00:00)
      expect(result!.startTime).toEqual(slots[0].timestamp);
      expect(result!.windowSlots).toHaveLength(2);
    });

    it('handles uniform prices', () => {
      // With 90% efficiency: 10kWh in battery needs 11.11kWh from grid
      // At 11.11kW charging speed, this takes 1 hour
      const slots = createSlots([2, 2, 2, 2]);
      const input: ChargingInput = {
        startPercent: 20,
        endPercent: 40,
        batterySize: 50,
        chargingSpeed: 11.11, // 11.11kWh from grid, 1 hour
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Should return first window since all costs are equal
      expect(result!.startTime).toEqual(slots[0].timestamp);
    });
  });

  describe('timestamp-based results', () => {
    it('returns correct startTime and endTime', () => {
      const slots = createSlots([3, 5, 1, 4, 2]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 18% of 50kWh = 9kWh in battery = 10kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 10kWh from grid, 1 hour charging
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Cheapest is at index 2, which is 02:00
      expect(result!.startTime).toEqual(slots[2].timestamp);
      // End time is 1 hour later (03:00)
      expect(result!.endTime.getTime()).toBe(slots[2].timestamp.getTime() + 60 * 60 * 1000);
    });

    it('returns windowSlots containing the selected slots', () => {
      const slots = createSlots([5, 4, 1, 2, 3, 6]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 54, // 54% of 50kWh = 27kWh in battery = 30kWh from grid
        batterySize: 50,
        chargingSpeed: 10, // 30kWh from grid, 3 hours charging
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.windowSlots).toHaveLength(3);
      expect(result!.windowSlots.map(s => s.total)).toEqual([1, 2, 3]);
    });
  });

  describe('earliestStart and latestEnd constraints', () => {
    it('constrains search window with earliestStart', () => {
      // Prices: [5, 4, 1, 2, 3] at hours 00:00, 01:00, 02:00, 03:00, 04:00
      // Cheapest is at index 2 (02:00), but we constrain to start at 03:00
      const slots = createSlots([5, 4, 1, 2, 3]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 9kWh in battery = 10kWh from grid, 1 hour at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        earliestStart: new Date(2025, 0, 1, 3, 0, 0), // 03:00
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Should pick index 3 (price 2) since index 2 (price 1) is before earliestStart
      expect(result!.startTime).toEqual(slots[3].timestamp);
      expect(result!.windowSlots[0].total).toBe(2);
    });

    it('constrains search window with latestEnd', () => {
      // Prices: [5, 4, 1, 2, 3] at hours 00:00, 01:00, 02:00, 03:00, 04:00
      // Cheapest is at index 2 (02:00), but we constrain to end by 02:00
      const slots = createSlots([5, 4, 1, 2, 3]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 9kWh in battery = 10kWh from grid, 1 hour at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        latestEnd: new Date(2025, 0, 1, 2, 0, 0), // 02:00 - must finish by here
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Should pick index 1 (price 4) since it's the cheapest that ends by 02:00
      expect(result!.startTime).toEqual(slots[1].timestamp);
      expect(result!.windowSlots[0].total).toBe(4);
    });

    it('constrains search window with both earliestStart and latestEnd', () => {
      // Prices: [5, 4, 1, 2, 3, 6] at hours 00:00, 01:00, 02:00, 03:00, 04:00, 05:00
      const slots = createSlots([5, 4, 1, 2, 3, 6]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 9kWh in battery = 10kWh from grid, 1 hour at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        earliestStart: new Date(2025, 0, 1, 1, 0, 0), // 01:00
        latestEnd: new Date(2025, 0, 1, 4, 0, 0), // 04:00
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Within 01:00-04:00 window, cheapest is at index 2 (price 1)
      expect(result!.startTime).toEqual(slots[2].timestamp);
      expect(result!.windowSlots[0].total).toBe(1);
    });

    it('handles earliestStart with partial offset into interval', () => {
      // Prices: [5, 1, 3] at hours 00:00, 01:00, 02:00
      // Start constrained to 01:30 (30 minutes into the 01:00 slot)
      const slots = createSlots([5, 1, 3]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 9, // 4.5kWh in battery = 5kWh from grid, 0.5 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        earliestStart: new Date(2025, 0, 1, 1, 30, 0), // 01:30
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Should start at 01:30, not 01:00
      expect(result!.startTime.getHours()).toBe(1);
      expect(result!.startTime.getMinutes()).toBe(30);
    });

    it('returns null when earliestStart equals latestEnd', () => {
      const slots = createSlots([1, 2, 3]);
      const sameTime = new Date(2025, 0, 1, 1, 0, 0);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18,
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        earliestStart: sameTime,
        latestEnd: sameTime,
      };
      const result = findOptimalChargingWindow(input);
      // No time available for charging
      expect(result).toBeNull();
    });

    it('returns null when charging duration exceeds constrained window', () => {
      // Need 2 hours of charging but window is only 1 hour
      const slots = createSlots([1, 2, 3, 4, 5]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 36, // 18kWh in battery = 20kWh from grid, 2 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        earliestStart: new Date(2025, 0, 1, 1, 0, 0), // 01:00
        latestEnd: new Date(2025, 0, 1, 2, 0, 0), // 02:00 - only 1 hour window
      };
      const result = findOptimalChargingWindow(input);
      expect(result).toBeNull();
    });

    it('handles 15-minute intervals with constraints', () => {
      // Prices at 15-minute intervals: 00:00, 00:15, 00:30, 00:45, 01:00, 01:15, 01:30, 01:45
      const slots = createSlots([5, 5, 1, 1, 3, 3, 3, 3], 15);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 9, // 4.5kWh in battery = 5kWh from grid, 0.5 hours at 10kW = 2 intervals
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 15,
        earliestStart: new Date(2025, 0, 1, 0, 30, 0), // 00:30
        latestEnd: new Date(2025, 0, 1, 1, 30, 0), // 01:30
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      // Cheapest within window starts at 00:30 (index 2, price 1)
      expect(result!.startTime).toEqual(slots[2].timestamp);
      // Duration is 0.5 hours = 2 intervals, so windowSlots includes 2 slots
      expect(result!.durationHours).toBe(0.5);
      expect(result!.windowSlots).toHaveLength(2);
      expect(result!.windowSlots.map(s => s.total)).toEqual([1, 1]);
    });
  });

  describe('cost breakdown calculation', () => {
    it('returns undefined costBreakdown when slots have no price details', () => {
      // Using createSlots which doesn't include details
      const slots = createSlots([2, 3]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 36, // 18kWh in battery = 20kWh from grid, 2 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeUndefined();
    });

    it('calculates cost breakdown when price details are available', () => {
      // Spot: 1 kr/kWh, Tariff: 0.5 kr/kWh, Total: 1.5 kr/kWh
      // 10kWh at 1.5 kr/kWh = 15 kr total
      // Spot portion: 10kWh × 1 kr/kWh = 10 kr
      // Tariff portion: 10kWh × 0.5 kr/kWh = 5 kr
      const slots = createSlotsWithDetails([
        { spot: 1, tariff: 0.5 },
      ]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 9kWh in battery = 10kWh from grid, 1 hour at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeDefined();
      expect(result!.costBreakdown!.spotCost).toBe(10);
      expect(result!.costBreakdown!.tariffCost).toBe(5);
    });

    it('breakdown components sum to total cost', () => {
      const slots = createSlotsWithDetails([
        { spot: 1.2, tariff: 0.8 },
        { spot: 1.5, tariff: 0.7 },
      ]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 36, // 18kWh in battery = 20kWh from grid, 2 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeDefined();
      // Verify spot + tariff = total (within rounding tolerance)
      const summedCost = result!.costBreakdown!.spotCost + result!.costBreakdown!.tariffCost;
      expect(summedCost).toBeCloseTo(result!.totalCost, 2);
    });

    it('calculates breakdown correctly with varying prices per slot', () => {
      // Hour 1: spot=1, tariff=0.5, total=1.5
      // Hour 2: spot=2, tariff=1.0, total=3.0
      // 10kWh per hour at 10kW
      // Spot cost: 10×1 + 10×2 = 30
      // Tariff cost: 10×0.5 + 10×1.0 = 15
      const slots = createSlotsWithDetails([
        { spot: 1, tariff: 0.5 },
        { spot: 2, tariff: 1.0 },
      ]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 36, // 18kWh in battery = 20kWh from grid, 2 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeDefined();
      expect(result!.costBreakdown!.spotCost).toBe(30);
      expect(result!.costBreakdown!.tariffCost).toBe(15);
      expect(result!.totalCost).toBe(45);
    });

    it('calculates breakdown correctly with 15-minute intervals', () => {
      // 4 intervals of 15 minutes each = 1 hour
      // Each interval: spot=1, tariff=0.5, total=1.5
      // At 10kW for 1 hour = 10kWh total
      // Spot cost: 10 × 1 = 10
      // Tariff cost: 10 × 0.5 = 5
      const slots = createSlotsWithDetails([
        { spot: 1, tariff: 0.5 },
        { spot: 1, tariff: 0.5 },
        { spot: 1, tariff: 0.5 },
        { spot: 1, tariff: 0.5 },
      ], 15);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 18, // 9kWh in battery = 10kWh from grid, 1 hour at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 15,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeDefined();
      expect(result!.costBreakdown!.spotCost).toBe(10);
      expect(result!.costBreakdown!.tariffCost).toBe(5);
    });

    it('handles partial intervals in breakdown calculation', () => {
      // Need 0.5 hours at 10kW = 5kWh
      // Uses first slot fully (if starting mid-slot) or partially
      // With 2 slots at 15min each, using 2 full intervals = 0.5 hours
      const slots = createSlotsWithDetails([
        { spot: 2, tariff: 1 },
        { spot: 2, tariff: 1 },
        { spot: 4, tariff: 2 }, // More expensive, won't be selected
      ], 15);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 9, // 4.5kWh in battery = 5kWh from grid, 0.5 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 15,
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeDefined();
      // 5kWh × 2 kr/kWh spot = 10 kr spot
      // 5kWh × 1 kr/kWh tariff = 5 kr tariff
      expect(result!.costBreakdown!.spotCost).toBe(10);
      expect(result!.costBreakdown!.tariffCost).toBe(5);
    });

    it('accounts for partial start offset in breakdown', () => {
      // Start at 00:30, so first slot only has 0.5 fraction available
      // Need 0.5 hours = 5kWh at 10kW
      const slots = createSlotsWithDetails([
        { spot: 1, tariff: 0.5 }, // Only 0.5 fraction available due to earliestStart
        { spot: 1, tariff: 0.5 },
      ]);
      const input: ChargingInput = {
        startPercent: 0,
        endPercent: 9, // 4.5kWh in battery = 5kWh from grid, 0.5 hours at 10kW
        batterySize: 50,
        chargingSpeed: 10,
        slots,
        intervalMinutes: 60,
        earliestStart: new Date(2025, 0, 1, 0, 30, 0), // 00:30 - half into first slot
      };
      const result = findOptimalChargingWindow(input);
      expect(result).not.toBeNull();
      expect(result!.costBreakdown).toBeDefined();
      // 5kWh × 1 kr/kWh = 5 kr spot
      // 5kWh × 0.5 kr/kWh = 2.5 kr tariff
      expect(result!.costBreakdown!.spotCost).toBe(5);
      expect(result!.costBreakdown!.tariffCost).toBe(2.5);
    });
  });
});
