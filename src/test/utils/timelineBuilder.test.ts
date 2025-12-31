
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
      expect(result!.slots[0].timestamp).toBeInstanceOf(Date);
      expect(result!.chargingStartTime).toBeInstanceOf(Date);
      expect(result!.chargingEndTime).toBeInstanceOf(Date);
      expect(result!.validDataEndTime).toBeInstanceOf(Date);
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
    it('stores chargingStartTime from earliestDate', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.chargingStartTime).toEqual(earliestDate);
    });

    it('stores chargingEndTime from latestDate', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.chargingEndTime).toEqual(latestDate);
    });

    it('preserves charging times when earliest is in the past', () => {
      // Earliest date is before current time
      const earliestDate = new Date(2024, 0, 15, 8, 0, 0); // 2 hours before now
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // chargingStartTime stores the original earliestDate
      expect(result!.chargingStartTime).toEqual(earliestDate);
    });

    it('ensures chargingEndTime >= chargingStartTime', () => {
      // Both dates in the past
      const earliestDate = new Date(2024, 0, 15, 8, 0, 0);
      const latestDate = new Date(2024, 0, 15, 9, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      expect(result!.chargingEndTime.getTime()).toBeGreaterThanOrEqual(result!.chargingStartTime.getTime());
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

  describe('validDataEndTime calculation', () => {
    it('calculates validDataEndTime as last valid slot timestamp plus interval', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      const priceData = getMockApiResponse('DK1');

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // Find the last slot with hasData = true
      const slotsWithData = result!.slots.filter(s => s.hasData);
      expect(slotsWithData.length).toBeGreaterThan(0);

      const lastValidSlot = slotsWithData[slotsWithData.length - 1];
      const expectedEndTime = new Date(lastValidSlot.timestamp.getTime() + result!.intervalMinutes * 60 * 1000);

      expect(result!.validDataEndTime).toEqual(expectedEndTime);
    });

    it('returns first slot timestamp when no valid data exists', () => {
      const earliestDate = new Date(2024, 0, 15, 12, 0, 0);
      const latestDate = new Date(2024, 0, 15, 18, 0, 0);
      // Empty price data - no valid slots
      const priceData = { prices: [] };

      const result = buildTimeline(earliestDate, latestDate, priceData);

      expect(result).not.toBeNull();
      // When no slots have data, validDataEndTime falls back to first slot timestamp
      expect(result!.validDataEndTime).toEqual(result!.slots[0].timestamp);
    });
  });
});
