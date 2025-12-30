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
 * Get friendly label for the date (Today/Tomorrow or formatted date)
 */
export function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
