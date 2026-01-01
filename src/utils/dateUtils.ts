import { MS_PER_MINUTE } from './constants';
import type { PriceSlot } from './priceMapper';

// Formatter for YYYY-MM-DD (used as cache keys for price data)
// Note: sv-SE (Swedish) locale naturally formats as ISO 8601 (YYYY-MM-DD)
const dateKeyFormatter = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Formats a Date to YYYY-MM-DD string for use as price data key */
export function getLocalDateString(date: Date): string {
  return dateKeyFormatter.format(date);
}

// Formatter for datetime-local input values
const dateTimeLocalFormatter = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Formats a Date for datetime-local input (YYYY-MM-DDTHH:MM) */
export function toDateTimeLocalString(date: Date): string {
  return dateTimeLocalFormatter.format(date).replace(' ', 'T');
}

/** Round a date forward to the next 15-minute interval */
export function roundToNext15Minutes(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const remainder = minutes % 15;
  if (remainder > 0) {
    result.setMinutes(minutes + (15 - remainder), 0, 0);
  } else {
    result.setSeconds(0, 0);
  }
  return result;
}

/** Format a Date to HH:mm string */
export function formatTimeValue(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get the next occurrence of a given time on or after the reference date.
 * If the time is in the future on the reference day, use that day.
 * If the time has passed on the reference day, use the next day.
 */
export function getNextOccurrence(hours: number, minutes: number, referenceDate: Date): Date {
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);

  // If this time has already passed relative to reference, use next day
  if (result <= referenceDate) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() === today.getTime();
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate.getTime() === tomorrow.getTime();
}

/**
 * Format date as short localized string (e.g., "Mon, Jan 5")
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Find the index of a slot by timestamp.
 * Returns -1 if slots array is empty.
 * Returns the index of the slot containing the timestamp (floored).
 * If target is before first slot, returns 0.
 * If target is beyond last slot, returns last index.
 */
export function findSlotIndexByTime(
  slots: PriceSlot[],
  targetTime: Date,
  intervalMinutes: number
): number {
  if (slots.length === 0) return -1;

  const firstSlotTime = slots[0].timestamp.getTime();
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;
  const offsetMs = targetTime.getTime() - firstSlotTime;

  if (offsetMs < 0) return 0; // Before first slot

  const index = Math.floor(offsetMs / msPerInterval);
  return Math.min(index, slots.length - 1);
}

/**
 * Calculate the fractional offset within an interval for a given timestamp.
 * Returns 0 if the timestamp is exactly at the interval start.
 * Returns a value between 0 and 1 representing the position within the interval.
 */
export function getIntervalOffset(
  timestamp: Date,
  intervalMinutes: number
): number {
  const minutes = timestamp.getMinutes();
  const offsetMinutes = minutes % intervalMinutes;
  return offsetMinutes / intervalMinutes;
}

/**
 * Format a duration in hours as "Xh Ym" string.
 * Examples: 3.5 => "3h 30m", 2 => "2h", 0.5 => "30m"
 */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Format a Date for display as HH:MM using Danish locale.
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}
