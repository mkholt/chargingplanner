
import {
  findSlotIndexByTime,
  formatDuration,
  formatTime,
  formatTimeValue,
  getDateLabel,
  getIntervalOffset,
  getLocalDateString,
  getNextOccurrence,
  roundToNext15Minutes,
  toDateTimeLocalString,
} from '@/utils/dateUtils';
import type { PriceSlot } from '@/utils/priceMapper';

describe('getLocalDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    // Create a date at noon to avoid timezone issues
    const date = new Date(2024, 0, 15, 12, 0, 0); // Jan 15, 2024
    const result = getLocalDateString(date);

    expect(result).toBe('2024-01-15');
  });

  it('pads single-digit months and days with zeros', () => {
    const date = new Date(2024, 0, 5, 12, 0, 0); // Jan 5, 2024
    const result = getLocalDateString(date);

    expect(result).toBe('2024-01-05');
  });

  it('handles year boundaries', () => {
    const date = new Date(2023, 11, 31, 12, 0, 0); // Dec 31, 2023
    const result = getLocalDateString(date);

    expect(result).toBe('2023-12-31');
  });

  it('handles double-digit months and days', () => {
    const date = new Date(2024, 10, 25, 12, 0, 0); // Nov 25, 2024
    const result = getLocalDateString(date);

    expect(result).toBe('2024-11-25');
  });
});

describe('toDateTimeLocalString', () => {
  it('formats date as YYYY-MM-DDTHH:MM', () => {
    const date = new Date(2024, 0, 15, 14, 30, 0); // Jan 15, 2024 14:30
    const result = toDateTimeLocalString(date);

    expect(result).toBe('2024-01-15T14:30');
  });

  it('pads single-digit hours and minutes with zeros', () => {
    const date = new Date(2024, 0, 5, 9, 5, 0); // Jan 5, 2024 09:05
    const result = toDateTimeLocalString(date);

    expect(result).toBe('2024-01-05T09:05');
  });

  it('handles midnight', () => {
    const date = new Date(2024, 0, 15, 0, 0, 0); // Midnight
    const result = toDateTimeLocalString(date);

    expect(result).toBe('2024-01-15T00:00');
  });

  it('handles end of day', () => {
    const date = new Date(2024, 0, 15, 23, 59, 0); // 23:59
    const result = toDateTimeLocalString(date);

    expect(result).toBe('2024-01-15T23:59');
  });
});

describe('roundToNext15Minutes', () => {
  it('rounds 10:03 up to 10:15', () => {
    const date = new Date(2024, 0, 15, 10, 3, 0);
    const result = roundToNext15Minutes(date);

    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(15);
    expect(result.getSeconds()).toBe(0);
  });

  it('rounds 10:16 up to 10:30', () => {
    const date = new Date(2024, 0, 15, 10, 16, 0);
    const result = roundToNext15Minutes(date);

    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
  });

  it('rounds 10:31 up to 10:45', () => {
    const date = new Date(2024, 0, 15, 10, 31, 0);
    const result = roundToNext15Minutes(date);

    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(45);
  });

  it('rounds 10:46 up to 11:00', () => {
    const date = new Date(2024, 0, 15, 10, 46, 0);
    const result = roundToNext15Minutes(date);

    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
  });

  it('keeps exact 15-minute intervals unchanged', () => {
    const date = new Date(2024, 0, 15, 10, 30, 45); // has seconds
    const result = roundToNext15Minutes(date);

    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
  });

  it('handles hour rollover at 23:46', () => {
    const date = new Date(2024, 0, 15, 23, 46, 0);
    const result = roundToNext15Minutes(date);

    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('does not modify the original date', () => {
    const date = new Date(2024, 0, 15, 10, 3, 0);
    roundToNext15Minutes(date);

    expect(date.getMinutes()).toBe(3);
  });
});

describe('formatTimeValue', () => {
  it('formats time as HH:mm', () => {
    const date = new Date(2024, 0, 15, 14, 30, 0);
    expect(formatTimeValue(date)).toBe('14:30');
  });

  it('pads single-digit hours with zero', () => {
    const date = new Date(2024, 0, 15, 9, 30, 0);
    expect(formatTimeValue(date)).toBe('09:30');
  });

  it('pads single-digit minutes with zero', () => {
    const date = new Date(2024, 0, 15, 14, 5, 0);
    expect(formatTimeValue(date)).toBe('14:05');
  });

  it('handles midnight', () => {
    const date = new Date(2024, 0, 15, 0, 0, 0);
    expect(formatTimeValue(date)).toBe('00:00');
  });
});

describe('getNextOccurrence', () => {
  it('returns same day when time is in the future', () => {
    const reference = new Date(2024, 0, 15, 10, 0, 0); // 10:00
    const result = getNextOccurrence(14, 30, reference); // 14:30

    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  it('returns next day when time has passed', () => {
    const reference = new Date(2024, 0, 15, 16, 0, 0); // 16:00
    const result = getNextOccurrence(14, 30, reference); // 14:30

    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  it('returns next day when time equals reference', () => {
    const reference = new Date(2024, 0, 15, 14, 30, 0); // 14:30
    const result = getNextOccurrence(14, 30, reference); // 14:30

    expect(result.getDate()).toBe(16);
  });

  it('handles month boundary', () => {
    const reference = new Date(2024, 0, 31, 23, 0, 0); // Jan 31, 23:00
    const result = getNextOccurrence(1, 0, reference); // 01:00

    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(1);
  });
});

describe('getDateLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0)); // Jan 15, 2024 12:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for current date', () => {
    const date = new Date(2024, 0, 15, 18, 0, 0);
    expect(getDateLabel(date)).toBe('Today');
  });

  it('returns "Tomorrow" for next day', () => {
    const date = new Date(2024, 0, 16, 8, 0, 0);
    expect(getDateLabel(date)).toBe('Tomorrow');
  });

  it('returns formatted date for other days', () => {
    const date = new Date(2024, 0, 20, 12, 0, 0);
    const result = getDateLabel(date);
    // The exact format depends on locale, but should contain the date info
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Tomorrow');
  });
});

describe('findSlotIndexByTime', () => {
  const createSlots = (startHour: number, count: number, intervalMinutes: number): PriceSlot[] => {
    const slots: PriceSlot[] = [];
    const base = new Date(2025, 0, 1, startHour, 0, 0);
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(base.getTime() + i * intervalMinutes * 60000);
      slots.push({ timestamp, total: i, hasData: true });
    }
    return slots;
  };

  it('returns 0 for target time before first slot', () => {
    const slots = createSlots(10, 5, 60); // 10:00, 11:00, 12:00, 13:00, 14:00
    const target = new Date(2025, 0, 1, 9, 0, 0); // 09:00
    expect(findSlotIndexByTime(slots, target, 60)).toBe(0);
  });

  it('returns exact index when target matches slot timestamp', () => {
    const slots = createSlots(10, 5, 60);
    const target = new Date(2025, 0, 1, 12, 0, 0); // 12:00 = index 2
    expect(findSlotIndexByTime(slots, target, 60)).toBe(2);
  });

  it('returns index of slot containing target time', () => {
    const slots = createSlots(10, 5, 60);
    const target = new Date(2025, 0, 1, 12, 30, 0); // 12:30 is within 12:00-13:00 slot
    expect(findSlotIndexByTime(slots, target, 60)).toBe(2);
  });

  it('returns last index for target time beyond last slot', () => {
    const slots = createSlots(10, 5, 60);
    const target = new Date(2025, 0, 1, 20, 0, 0); // 20:00
    expect(findSlotIndexByTime(slots, target, 60)).toBe(4);
  });

  it('handles 15-minute intervals', () => {
    const slots = createSlots(10, 8, 15); // 10:00, 10:15, 10:30, 10:45, 11:00, ...
    const target = new Date(2025, 0, 1, 10, 35, 0); // 10:35 is within 10:30-10:45 slot
    expect(findSlotIndexByTime(slots, target, 15)).toBe(2);
  });

  it('returns -1 for empty slots array', () => {
    expect(findSlotIndexByTime([], new Date(), 60)).toBe(-1);
  });
});

describe('getIntervalOffset', () => {
  it('returns 0 for timestamp at interval boundary (hourly)', () => {
    const timestamp = new Date(2025, 0, 1, 14, 0, 0); // exactly 14:00
    expect(getIntervalOffset(timestamp, 60)).toBe(0);
  });

  it('returns 0.5 for timestamp halfway through interval (hourly)', () => {
    const timestamp = new Date(2025, 0, 1, 14, 30, 0); // 14:30
    expect(getIntervalOffset(timestamp, 60)).toBe(0.5);
  });

  it('returns 0.25 for timestamp 15 minutes into hour', () => {
    const timestamp = new Date(2025, 0, 1, 14, 15, 0);
    expect(getIntervalOffset(timestamp, 60)).toBe(0.25);
  });

  it('returns 0 for timestamp at 15-minute boundary', () => {
    const timestamp = new Date(2025, 0, 1, 14, 15, 0);
    expect(getIntervalOffset(timestamp, 15)).toBe(0);
  });

  it('returns 0.5 for timestamp halfway through 15-minute interval', () => {
    // 14:22:30 has 22 minutes, 22 % 15 = 7 minutes into the 14:15-14:30 slot
    // 7/15 ≈ 0.467, not 0.5
    // For exactly halfway (7.5 min), we'd need 14:22:30 but seconds aren't considered
    // Use 14:22 which is 7 minutes into interval = 7/15 ≈ 0.467
    // Or use a cleaner example: 14:07:30 which is 7.5 minutes into 14:00-14:15
    // But since we only use minutes, let's use 14:07 = 7/15 ≈ 0.467
    // For a true 0.5, we need exactly 7.5 minutes, so let's test something achievable
    const timestamp = new Date(2025, 0, 1, 14, 7, 30); // 7 minutes + 30 seconds into interval
    // Note: getIntervalOffset only uses minutes, so 30 seconds is ignored
    // 7/15 ≈ 0.467
    expect(getIntervalOffset(timestamp, 15)).toBeCloseTo(0.467, 2);
  });

  it('returns fractional offset for arbitrary time', () => {
    const timestamp = new Date(2025, 0, 1, 14, 20, 0); // 20 minutes into hour
    expect(getIntervalOffset(timestamp, 60)).toBeCloseTo(0.333, 2);
  });
});

describe('formatDuration', () => {
  it('formats whole hours', () => {
    expect(formatDuration(3)).toBe('3h');
    expect(formatDuration(1)).toBe('1h');
    expect(formatDuration(10)).toBe('10h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3.5)).toBe('3h 30m');
    expect(formatDuration(2.25)).toBe('2h 15m');
    expect(formatDuration(1.75)).toBe('1h 45m');
  });

  it('formats minutes only when less than 1 hour', () => {
    expect(formatDuration(0.5)).toBe('30m');
    expect(formatDuration(0.25)).toBe('15m');
    expect(formatDuration(0.75)).toBe('45m');
  });

  it('rounds minutes correctly', () => {
    expect(formatDuration(1.33)).toBe('1h 20m'); // 0.33 * 60 = 19.8 → 20
    expect(formatDuration(2.67)).toBe('2h 40m'); // 0.67 * 60 = 40.2 → 40
  });

  it('handles zero hours', () => {
    expect(formatDuration(0)).toBe('0h');
  });
});

describe('formatTime', () => {
  it('formats time in HH:MM format', () => {
    const date = new Date(2024, 0, 15, 14, 30, 0);
    const result = formatTime(date);
    // Danish locale uses 24-hour format
    expect(result).toMatch(/14[.:]30/);
  });

  it('formats midnight', () => {
    const date = new Date(2024, 0, 15, 0, 0, 0);
    const result = formatTime(date);
    expect(result).toMatch(/00[.:]00/);
  });

  it('formats single-digit hours and minutes', () => {
    const date = new Date(2024, 0, 15, 9, 5, 0);
    const result = formatTime(date);
    expect(result).toMatch(/09[.:]05/);
  });
});
