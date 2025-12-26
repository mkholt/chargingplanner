export type ChargingInput = {
  startPercent: number; // e.g. 20
  endPercent: number;   // e.g. 80
  batterySize: number;  // kWh
  chargingSpeed: number; // kW
  prices: number[];     // 24 hourly prices
};

export type ChargingResult = {
  startHour: number;
  endHour: number;
  totalCost: number;
  duration: number;
  windowPrices: number[];
  energyNeeded: number;
};

export function findOptimalChargingWindow(input: ChargingInput): ChargingResult | null {
  const { startPercent, endPercent, batterySize, chargingSpeed, prices } = input;
  if (endPercent <= startPercent || chargingSpeed <= 0 || batterySize <= 0) return null;

  const kWhNeeded = ((endPercent - startPercent) / 100) * batterySize;
  const duration = kWhNeeded / chargingSpeed;
  if (duration <= 0 || duration > 24) return null;

  let minCost = Infinity;
  let bestStart = 0;
  let bestWindow: number[] = [];

  // Try every possible continuous window
  for (let start = 0; start <= prices.length - Math.ceil(duration); start++) {
    // Calculate cost for this window (may span partial hours at start/end)
    let cost = 0;
    const window: number[] = [];
    let remaining = duration;
    for (let h = start; h < prices.length && remaining > 0; h++) {
      const hourFraction = Math.min(1, remaining);
      cost += prices[h] * chargingSpeed * hourFraction;
      window.push(prices[h]);
      remaining -= hourFraction;
    }
    if (remaining <= 0 && cost < minCost) {
      minCost = cost;
      bestStart = start;
      bestWindow = window;
    }
  }

  return {
    startHour: bestStart,
    endHour: bestStart + Math.ceil(duration),
    totalCost: Math.round(minCost * 100) / 100,
    duration: Math.round(duration * 100) / 100,
    windowPrices: bestWindow,
    energyNeeded: kWhNeeded,
  };
}
