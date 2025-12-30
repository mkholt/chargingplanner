import { CHARGING_EFFICIENCY } from './constants';

export type ChargingInput = {
  startPercent: number; // e.g. 20
  endPercent: number;   // e.g. 80
  batterySize: number;  // kWh
  chargingSpeed: number; // kW
  prices: number[];     // price per interval
  intervalMinutes: number; // 15 or 60
  /** Fraction of first interval unavailable (0-1), e.g., 0.5 means start halfway through first slot */
  startOffset?: number;
};

export type ChargingResult = {
  startIndex: number;
  endIndex: number;
  intervalMinutes: number;
  totalCost: number;
  durationHours: number;
  windowPrices: number[];
  energyNeeded: number;
};

export function findOptimalChargingWindow(input: ChargingInput): ChargingResult | null {
  const { startPercent, endPercent, batterySize, chargingSpeed, prices, intervalMinutes, startOffset = 0 } = input;
  if (endPercent <= startPercent || chargingSpeed <= 0 || batterySize <= 0) return null;

  // Energy needed in the battery
  const kWhNeededInBattery = ((endPercent - startPercent) / 100) * batterySize;
  // Energy drawn from grid (accounting for charging losses)
  const kWhNeeded = kWhNeededInBattery / CHARGING_EFFICIENCY;
  const durationHours = kWhNeeded / chargingSpeed;

  // Convert duration to intervals (e.g., 2 hours = 8 intervals at 15m, 2 intervals at 1h)
  const intervalsPerHour = 60 / intervalMinutes;
  const durationIntervals = durationHours * intervalsPerHour;

  // Calculate effective available intervals considering partial first slot
  const effectiveMaxIntervals = prices.length - startOffset;
  if (durationIntervals <= 0 || durationIntervals > effectiveMaxIntervals) return null;

  let minCost = Infinity;
  let bestStart = 0;
  let bestWindow: number[] = [];

  // Try every possible continuous window
  for (let start = 0; start <= prices.length - Math.ceil(durationIntervals + (start === 0 ? startOffset : 0)); start++) {
    // Calculate cost for this window (may span partial intervals at start/end)
    let cost = 0;
    const window: number[] = [];
    let remaining = durationIntervals;

    for (let i = start; i < prices.length && remaining > 0; i++) {
      // For the first slot when starting at index 0, only use the available portion
      const availableFraction = (i === 0 && start === 0) ? (1 - startOffset) : 1;
      const intervalFraction = Math.min(availableFraction, remaining);
      // Cost = price * kW * fraction of interval * hours per interval
      cost += prices[i] * chargingSpeed * intervalFraction * (intervalMinutes / 60);
      window.push(prices[i]);
      remaining -= intervalFraction;
    }
    if (remaining <= 0.0001 && cost < minCost) { // Use small epsilon for floating point
      minCost = cost;
      bestStart = start;
      bestWindow = window;
    }
  }

  if (minCost === Infinity) return null;

  return {
    startIndex: bestStart,
    endIndex: bestStart + Math.ceil(durationIntervals + (bestStart === 0 ? startOffset : 0)),
    intervalMinutes,
    totalCost: Math.round(minCost * 100) / 100,
    durationHours: Math.round(durationHours * 100) / 100,
    windowPrices: bestWindow,
    energyNeeded: kWhNeeded,
  };
}
