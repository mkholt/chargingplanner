import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildTimeline } from '@/utils/timelineBuilder';
import { getMockApiResponse } from '@/test/mocks/mockPrices';

describe('buildTimeline', () => {
  beforeEach(() => {
    // Mock Date.now() to return a fixed time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0)); // Jan 15, 2024 10:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('null returns', () => {
    it('returns null for undefined priceData', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);

      const result = buildTimeline(earliestDate, latestDate, undefined);

      expect(result).toBeNull();
    });

    it('returns timeline with empty slots for empty price data', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);

      const result = buildTimeline(earliestDate, latestDate, { prices: [] });

      // Function creates empty slots when no price data is available
      expect(result).not.toBeNull();
      expect(result!.slots.length).toBeGreaterThan(0);
      // All slots should have total of 0
      expect(result!.slots[0].total).toBe(0);
    });
  });

  describe('timeline building with mock data', () => {
    it('returns timeline with correct structure', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.slots).toBeDefined();
      expect(result!.startDate).toBeInstanceOf(Date);
      expect(typeof result!.chargingStartIdx).toBe('number');
      expect(typeof result!.chargingEndIdx).toBe('number');
      expect(result!.intervalMinutes).toBe(15); // Mock data uses 15-minute intervals
    });

    it('slices slots from current interval onwards', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // At 10:00 with 15-minute intervals, we're at index 40 (10 hours * 4 intervals)
      // Total slots = 192 (96 for today + 96 for tomorrow)
      // Remaining slots = 192 - 40 = 152
      expect(result!.slots.length).toBeLessThan(192);
      expect(result!.slots.length).toBeGreaterThan(0);
    });

    it('sets correct intervalMinutes for 15-minute resolution', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result!.intervalMinutes).toBe(15);
    });
  });

  describe('charging interval calculations', () => {
    it('calculates charging start index correctly', () => {
      // Current time is 10:00, charging starts at 12:00 (2 hours later = 8 intervals at 15m)
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // 2 hours = 8 intervals at 15-minute resolution
      expect(result!.chargingStartIdx).toBe(8);
    });

    it('calculates charging end index correctly', () => {
      // Current time is 10:00, charging ends at 18:00 (8 hours later = 32 intervals at 15m)
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // 8 hours = 32 intervals at 15-minute resolution
      expect(result!.chargingEndIdx).toBe(32);
    });

    it('clamps charging start index to 0 when earliest date is in the past', () => {
      // Earliest date is before current time
      const earliestDate = new Date(2024, 0, 15, 8, 0, 0); // 2 hours before now
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.chargingStartIdx).toBe(0);
    });

    it('ensures chargingEndIdx >= chargingStartIdx', () => {
      // Both dates in the past should result in both indices being 0
      const earliestDate = new Date(2024, 0, 15, 8, 0, 0);
      const latestDate = new Date(2024, 0, 15, 9, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.chargingEndIdx).toBeGreaterThanOrEqual(result!.chargingStartIdx);
    });
  });

  describe('price area handling', () => {
    it('works with DK1 price area', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.slots.length).toBeGreaterThan(0);
    });

    it('works with DK2 price area', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK2');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.slots.length).toBeGreaterThan(0);
    });
  });

  describe('slot data integrity', () => {
    it('includes price details in slots', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // Check first slot has the expected structure
      const firstSlot = result!.slots[0];
      expect(typeof firstSlot.total).toBe('number');
      expect(firstSlot.total).toBeGreaterThan(0);
      expect(firstSlot.details).toBeDefined();
    });
  });
});
