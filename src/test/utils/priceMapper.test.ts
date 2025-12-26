import { describe, it, expect } from 'vitest';
import { mapApiResponseToPrices, getPriceUnit } from '@/utils/priceMapper';
import type { PricesApiResponse } from '@/types';

describe('mapApiResponseToPrices', () => {
  describe('empty/invalid responses', () => {
    it('returns empty map with default resolution for empty prices array', () => {
      const response: PricesApiResponse = { prices: [] };
      const result = mapApiResponseToPrices(response);

      expect(result.slotsByDate.size).toBe(0);
      expect(result.resolution).toBe('1h');
      expect(result.intervalsPerDay).toBe(24);
    });

    it('returns empty map when prices is undefined', () => {
      const response = {} as PricesApiResponse;
      const result = mapApiResponseToPrices(response);

      expect(result.slotsByDate.size).toBe(0);
      expect(result.resolution).toBe('1h');
    });
  });

  describe('resolution detection', () => {
    it('detects 15-minute resolution from API response', () => {
      const response: PricesApiResponse = {
        prices: [
          {
            date: '2024-01-15T10:00:00.000Z',
            price: { total: 1.5, unit: 'kr/kWh' },
            resolution: '15m',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      expect(result.resolution).toBe('15m');
      expect(result.intervalsPerDay).toBe(96);
    });

    it('detects 1-hour resolution from API response', () => {
      const response: PricesApiResponse = {
        prices: [
          {
            date: '2024-01-15T10:00:00.000Z',
            price: { total: 1.5, unit: 'kr/kWh' },
            resolution: '1h',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      expect(result.resolution).toBe('1h');
      expect(result.intervalsPerDay).toBe(24);
    });

    it('defaults to 1-hour resolution when resolution is missing', () => {
      const response: PricesApiResponse = {
        prices: [
          {
            date: '2024-01-15T10:00:00.000Z',
            price: { total: 1.5, unit: 'kr/kWh' },
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      expect(result.resolution).toBe('1h');
    });
  });

  describe('price mapping for 1-hour resolution', () => {
    it('maps prices to correct date keys and hour indices', () => {
      // Use local dates to avoid timezone issues
      const date1 = new Date(2024, 0, 15, 8, 0, 0); // Jan 15, 2024 08:00 local
      const date2 = new Date(2024, 0, 15, 9, 0, 0); // Jan 15, 2024 09:00 local
      const response: PricesApiResponse = {
        prices: [
          {
            date: date1.toISOString(),
            price: { total: 1.5, unit: 'kr/kWh' },
            resolution: '1h',
          },
          {
            date: date2.toISOString(),
            price: { total: 2.0, unit: 'kr/kWh' },
            resolution: '1h',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      expect(result.slotsByDate.size).toBe(1);
      const slots = result.slotsByDate.get('2024-01-15');
      expect(slots).toBeDefined();
      expect(slots!.length).toBe(24);
      // Hours 8 and 9 in local time
      expect(slots![8].total).toBe(1.5);
      expect(slots![9].total).toBe(2.0);
    });

    it('creates separate entries for different dates', () => {
      // Use local dates to ensure they fall on different calendar days
      const date1 = new Date(2024, 0, 15, 23, 0, 0); // Jan 15, 2024 23:00 local
      const date2 = new Date(2024, 0, 16, 0, 0, 0); // Jan 16, 2024 00:00 local
      const response: PricesApiResponse = {
        prices: [
          {
            date: date1.toISOString(),
            price: { total: 1.0, unit: 'kr/kWh' },
            resolution: '1h',
          },
          {
            date: date2.toISOString(),
            price: { total: 2.0, unit: 'kr/kWh' },
            resolution: '1h',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      expect(result.slotsByDate.size).toBe(2);
      expect(result.slotsByDate.has('2024-01-15')).toBe(true);
      expect(result.slotsByDate.has('2024-01-16')).toBe(true);
    });
  });

  describe('price mapping for 15-minute resolution', () => {
    it('calculates correct interval indices for 15-minute data', () => {
      // Use local dates to avoid timezone issues
      const date1 = new Date(2024, 0, 15, 10, 0, 0);
      const date2 = new Date(2024, 0, 15, 10, 15, 0);
      const date3 = new Date(2024, 0, 15, 10, 30, 0);
      const date4 = new Date(2024, 0, 15, 10, 45, 0);
      const response: PricesApiResponse = {
        prices: [
          {
            date: date1.toISOString(),
            price: { total: 1.0, unit: 'kr/kWh' },
            resolution: '15m',
          },
          {
            date: date2.toISOString(),
            price: { total: 1.1, unit: 'kr/kWh' },
            resolution: '15m',
          },
          {
            date: date3.toISOString(),
            price: { total: 1.2, unit: 'kr/kWh' },
            resolution: '15m',
          },
          {
            date: date4.toISOString(),
            price: { total: 1.3, unit: 'kr/kWh' },
            resolution: '15m',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      const slots = result.slotsByDate.get('2024-01-15')!;
      expect(slots.length).toBe(96);
      // Hour 10 = indices 40, 41, 42, 43 (10 * 4 + 0/1/2/3)
      expect(slots[40].total).toBe(1.0);
      expect(slots[41].total).toBe(1.1);
      expect(slots[42].total).toBe(1.2);
      expect(slots[43].total).toBe(1.3);
    });
  });

  describe('edge cases', () => {
    it('skips entries with missing date', () => {
      // Use a local date to avoid timezone issues
      const testDate = new Date(2024, 0, 15, 10, 0, 0); // Jan 15, 2024 10:00 local
      const response: PricesApiResponse = {
        prices: [
          {
            date: testDate.toISOString(),
            price: { total: 1.5, unit: 'kr/kWh' },
            resolution: '1h',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { price: { total: 2.0, unit: 'kr/kWh' }, resolution: '1h' } as any,
        ],
      };
      const result = mapApiResponseToPrices(response);

      const slots = result.slotsByDate.values().next().value!;
      expect(slots[10].total).toBe(1.5);
    });

    it('skips entries with missing price total', () => {
      const testDate1 = new Date(2024, 0, 15, 10, 0, 0);
      const testDate2 = new Date(2024, 0, 15, 11, 0, 0);
      const response: PricesApiResponse = {
        prices: [
          {
            date: testDate1.toISOString(),
            price: { total: 1.5, unit: 'kr/kWh' },
            resolution: '1h',
          },
          {
            date: testDate2.toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            price: { unit: 'kr/kWh' } as any,
            resolution: '1h',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      const slots = result.slotsByDate.values().next().value!;
      expect(slots[10].total).toBe(1.5);
      expect(slots[11].total).toBe(0); // Empty slot
    });

    it('preserves price details when present', () => {
      const testDate = new Date(2024, 0, 15, 10, 0, 0);
      const details = {
        electricity: { value: 0.5, vat: 0.125, total: 0.625, unit: 'kr/kWh' as const },
      };
      const response: PricesApiResponse = {
        prices: [
          {
            date: testDate.toISOString(),
            price: { total: 1.5, unit: 'kr/kWh' },
            details,
            resolution: '1h',
          },
        ],
      };
      const result = mapApiResponseToPrices(response);

      const slots = result.slotsByDate.values().next().value!;
      expect(slots[10].details).toEqual(details);
    });
  });
});

describe('getPriceUnit', () => {
  it('returns unit from first price entry', () => {
    const response: PricesApiResponse = {
      prices: [
        {
          date: '2024-01-15T10:00:00.000Z',
          price: { total: 1.5, unit: 'øre/kWh' },
        },
      ],
    };
    expect(getPriceUnit(response)).toBe('øre/kWh');
  });

  it('returns default kr/kWh when unit is missing', () => {
    const response: PricesApiResponse = {
      prices: [
        {
          date: '2024-01-15T10:00:00.000Z',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          price: { total: 1.5 } as any,
        },
      ],
    };
    expect(getPriceUnit(response)).toBe('kr/kWh');
  });

  it('returns default kr/kWh when prices array is empty', () => {
    const response: PricesApiResponse = { prices: [] };
    expect(getPriceUnit(response)).toBe('kr/kWh');
  });

  it('returns default kr/kWh when prices is undefined', () => {
    const response = {} as PricesApiResponse;
    expect(getPriceUnit(response)).toBe('kr/kWh');
  });
});
