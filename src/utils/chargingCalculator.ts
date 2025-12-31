import { CHARGING_EFFICIENCY, MS_PER_MINUTE } from './constants';
import type { PriceSlot } from './priceMapper';

export type ChargingInput = {
  startPercent: number; // e.g. 20
  endPercent: number;   // e.g. 80
  batterySize: number;  // kWh
  chargingSpeed: number; // kW
  /** Price slots with timestamps */
  slots: PriceSlot[];
  intervalMinutes: number; // 15 or 60
  /** Earliest allowed charging start time */
  earliestStart?: Date;
  /** Latest allowed charging end time */
  latestEnd?: Date;
};

export type ChargingResult = {
  /** Start time of optimal charging window */
  startTime: Date;
  /** End time of optimal charging window (accounting for partial intervals) */
  endTime: Date;
  /** Price slots in the optimal window */
  windowSlots: PriceSlot[];
  intervalMinutes: number;
  totalCost: number;
  durationHours: number;
  energyNeeded: number;
};

export function findOptimalChargingWindow(input: ChargingInput): ChargingResult | null {
  const { startPercent, endPercent, batterySize, chargingSpeed, slots, intervalMinutes, earliestStart, latestEnd } = input;
  if (endPercent <= startPercent || chargingSpeed <= 0 || batterySize <= 0) return null;
  if (slots.length === 0) return null;

  const msPerInterval = intervalMinutes * MS_PER_MINUTE;

  // Extract prices from slots for the algorithm
  const prices = slots.map(s => s.total);
  const firstSlotTime = slots[0].timestamp.getTime();

  // Calculate start constraint index and offset from earliestStart timestamp
  let constraintStartIdx = 0;
  let startOffset = 0;
  if (earliestStart) {
    const offsetMs = earliestStart.getTime() - firstSlotTime;
    if (offsetMs > 0) {
      constraintStartIdx = Math.floor(offsetMs / msPerInterval);
      startOffset = (offsetMs % msPerInterval) / msPerInterval;
    }
  }

  // Calculate end constraint index from latestEnd timestamp
  let constraintEndIdx = prices.length;
  if (latestEnd) {
    const offsetMs = latestEnd.getTime() - firstSlotTime;
    constraintEndIdx = Math.min(Math.ceil(offsetMs / msPerInterval), prices.length);
  }

  // Slice to constrained range
  const constrainedPrices = prices.slice(constraintStartIdx, constraintEndIdx);

  // Energy needed in the battery
  const kWhNeededInBattery = ((endPercent - startPercent) / 100) * batterySize;
  // Energy drawn from grid (accounting for charging losses)
  const kWhNeeded = kWhNeededInBattery / CHARGING_EFFICIENCY;
  const durationHours = kWhNeeded / chargingSpeed;

  // Convert duration to intervals (e.g., 2 hours = 8 intervals at 15m, 2 intervals at 1h)
  const intervalsPerHour = 60 / intervalMinutes;
  const durationIntervals = durationHours * intervalsPerHour;

  // Calculate effective available intervals considering partial first slot
  const effectiveMaxIntervals = constrainedPrices.length - startOffset;
  if (durationIntervals <= 0 || durationIntervals > effectiveMaxIntervals) return null;

  let minCost = Infinity;
  let bestStart = 0;

  // Try every possible continuous window within constrained range
  for (let start = 0; start <= constrainedPrices.length - Math.ceil(durationIntervals + (start === 0 ? startOffset : 0)); start++) {
    // Calculate cost for this window (may span partial intervals at start/end)
    let cost = 0;
    let remaining = durationIntervals;

    for (let i = start; i < constrainedPrices.length && remaining > 0; i++) {
      // For the first slot when starting at index 0, only use the available portion
      const availableFraction = (i === 0 && start === 0) ? (1 - startOffset) : 1;
      const intervalFraction = Math.min(availableFraction, remaining);
      // Cost = price * kW * fraction of interval * hours per interval
      cost += constrainedPrices[i] * chargingSpeed * intervalFraction * (intervalMinutes / 60);
      remaining -= intervalFraction;
    }
    if (remaining <= 0.0001 && cost < minCost) { // Use small epsilon for floating point
      minCost = cost;
      bestStart = start;
    }
  }

  if (minCost === Infinity) return null;

  // Calculate the effective start offset for the optimal window
  const effectiveStartOffset = bestStart === 0 ? startOffset : 0;

  // Calculate intervals actually used in the window
  const totalIntervalsInWindow = durationIntervals + effectiveStartOffset;
  const fullIntervalsNeeded = Math.ceil(totalIntervalsInWindow);

  // End offset is how much of the last interval is unused
  // If totalIntervalsInWindow is 3.75, we need 4 full slots but only use 0.75 of the last one
  // So endOffset = 1 - 0.75 = 0.25 (unused portion)
  const fractionalPart = totalIntervalsInWindow % 1;
  const endOffset = fractionalPart > 0.0001 ? (1 - fractionalPart) : 0;

  // Calculate result indices relative to original slots array
  const absoluteStartIdx = constraintStartIdx + bestStart;
  const absoluteEndIdx = absoluteStartIdx + fullIntervalsNeeded;

  // Calculate timestamps from slots
  const startTime = new Date(
    slots[absoluteStartIdx].timestamp.getTime() + effectiveStartOffset * msPerInterval
  );
  const endTime = new Date(
    slots[Math.min(absoluteEndIdx - 1, slots.length - 1)].timestamp.getTime() +
    msPerInterval -
    endOffset * msPerInterval
  );

  // Extract window slots
  const windowSlots = slots.slice(absoluteStartIdx, absoluteEndIdx);

  return {
    startTime,
    endTime,
    windowSlots,
    intervalMinutes,
    totalCost: Math.round(minCost * 100) / 100,
    durationHours: Math.round(durationHours * 100) / 100,
    energyNeeded: kWhNeeded,
  };
}
