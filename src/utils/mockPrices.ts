// Mock hourly electricity prices for "today" and "tomorrow" (DKK/kWh)
export type PriceData = {
  date: string; // YYYY-MM-DD
  hours: number[]; // 24 values, one per hour
};

function getLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const todayPrices = [
  0.32, 0.30, 0.28, 0.27, 0.26, 0.25, 0.24, 0.25,
  0.27, 0.29, 0.31, 0.33, 0.35, 0.36, 0.34, 0.32,
  0.30, 0.28, 0.27, 0.26, 0.25, 0.26, 0.28, 0.30
];

const tomorrowPrices = [
  0.29, 0.28, 0.27, 0.26, 0.25, 0.24, 0.23, 0.24,
  0.26, 0.28, 0.30, 0.32, 0.34, 0.36, 0.35, 0.33,
  0.31, 0.29, 0.28, 0.27, 0.26, 0.27, 0.28, 0.29
];

function getMockPrices(): PriceData[] {
  const now = new Date();
  const today = getLocalDateString(now);
  const tomorrow = getLocalDateString(new Date(now.getTime() + 86400000));
  return [
    { date: today, hours: todayPrices },
    { date: tomorrow, hours: tomorrowPrices }
  ];
}

// Utility to get available dates based on current time (Copenhagen time)
export function getAvailableDates(now: Date): string[] {
  const today = getLocalDateString(now);
  const tomorrow = getLocalDateString(new Date(now.getTime() + 86400000));
  // Prices for tomorrow are available after 13:00
  if (now.getHours() >= 13) {
    return [today, tomorrow];
  }
  return [today];
}

// Utility to get price data for a given date
export function getPricesForDate(date: string): number[] | undefined {
  return getMockPrices().find(p => p.date === date)?.hours;
}
