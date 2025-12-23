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
