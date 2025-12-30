
import {
  formatTimeValue,
  getDateLabel,
  getLocalDateString,
  getNextOccurrence,
  roundToNext15Minutes,
  toDateTimeLocalString,
} from '@/utils/dateUtils';

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
