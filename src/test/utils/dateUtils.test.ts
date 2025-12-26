import { describe, it, expect } from 'vitest';
import { getLocalDateString, toDateTimeLocalString } from '@/utils/dateUtils';

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
