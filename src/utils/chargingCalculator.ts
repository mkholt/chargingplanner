import { CHARGING_EFFICIENCY, MS_PER_MINUTE, roundToCents } from './constants';
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
  /** Cost breakdown - only present when price details available */
  costBreakdown?: {
    spotCost: number;       // Electricity spot price portion
    surchargesCost: number; // Supplier surcharges portion
    tariffCost: number;     // Tariffs portion (transmission, distribution, tax)
  };
};

type TimeConstraints = {
  constraintStartIdx: number;
  constraintEndIdx: number;
  startOffset: number; // Fraction of first slot unavailable (0-1)
};

type EnergyRequirements = {
  kWhNeeded: number;
  durationHours: number;
  durationIntervals: number;
};

type WindowResult = {
  bestStart: number;
  minCost: number;
};

/** Calculate constraint indices and offsets from time bounds */
function calculateTimeConstraints(
  slots: PriceSlot[],
  intervalMinutes: number,
  earliestStart?: Date,
  latestEnd?: Date
): TimeConstraints {
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;
  const firstSlotTime = slots[0].timestamp.getTime();

  let constraintStartIdx = 0;
  let startOffset = 0;
  if (earliestStart) {
    const offsetMs = earliestStart.getTime() - firstSlotTime;
    if (offsetMs > 0) {
      constraintStartIdx = Math.floor(offsetMs / msPerInterval);
      startOffset = (offsetMs % msPerInterval) / msPerInterval;
    }
  }

  let constraintEndIdx = slots.length;
  if (latestEnd) {
    const offsetMs = latestEnd.getTime() - firstSlotTime;
    constraintEndIdx = Math.min(Math.ceil(offsetMs / msPerInterval), slots.length);
  }

  return { constraintStartIdx, constraintEndIdx, startOffset };
}

/** Calculate energy needed from grid and charging duration */
function calculateEnergyRequirements(
  startPercent: number,
  endPercent: number,
  batterySize: number,
  chargingSpeed: number,
  intervalMinutes: number
): EnergyRequirements {
  const kWhNeededInBattery = ((endPercent - startPercent) / 100) * batterySize;
  const kWhNeeded = kWhNeededInBattery / CHARGING_EFFICIENCY;
  const durationHours = kWhNeeded / chargingSpeed;
  const intervalsPerHour = 60 / intervalMinutes;
  const durationIntervals = durationHours * intervalsPerHour;

  return { kWhNeeded, durationHours, durationIntervals };
}

/** Find the cheapest continuous charging window by trying all positions */
function findCheapestWindow(
  constrainedSlots: PriceSlot[],
  durationIntervals: number,
  startOffset: number,
  chargingSpeed: number,
  intervalMinutes: number
): WindowResult | null {
  const effectiveMaxIntervals = constrainedSlots.length - startOffset;
  if (durationIntervals <= 0 || durationIntervals > effectiveMaxIntervals) return null;

  const energyPerInterval = chargingSpeed * (intervalMinutes / 60);

  let minCost = Infinity;
  let bestStart = 0;

  // Try each possible starting position
  const maxStart = constrainedSlots.length - Math.ceil(durationIntervals + startOffset);
  for (let start = 0; start <= maxStart; start++) {
    let cost = 0;
    let remaining = durationIntervals;

    for (let i = start; i < constrainedSlots.length && remaining > 0; i++) {
      // First slot at start=0 may be partial due to startOffset
      const availableFraction = (i === 0 && start === 0) ? (1 - startOffset) : 1;
      const intervalFraction = Math.min(availableFraction, remaining);
      cost += constrainedSlots[i].total * energyPerInterval * intervalFraction;
      remaining -= intervalFraction;
    }

    if (remaining <= 0.0001 && cost < minCost) {
      minCost = cost;
      bestStart = start;
    }
  }

  return minCost === Infinity ? null : { bestStart, minCost };
}

/** Calculate cost breakdown (spot vs surcharges vs tariffs) for the charging window */
function calculateCostBreakdown(
  windowSlots: PriceSlot[],
  durationIntervals: number,
  effectiveStartOffset: number,
  chargingSpeed: number,
  intervalMinutes: number
): { spotCost: number; surchargesCost: number; tariffCost: number } | undefined {
  let spotCost = 0;
  let surchargesCost = 0;
  let tariffCost = 0;
  let hasDetails = false;
  let remaining = durationIntervals;

  for (let i = 0; i < windowSlots.length && remaining > 0; i++) {
    const slot = windowSlots[i];
    const availableFraction = (i === 0) ? (1 - effectiveStartOffset) : 1;
    const intervalFraction = Math.min(availableFraction, remaining);
    const energyInSlot = chargingSpeed * intervalFraction * (intervalMinutes / 60);

    if (slot.details?.electricity?.total !== undefined) {
      hasDetails = true;
      const spotRate = slot.details.electricity.total;
      const surchargeRate = slot.details.surcharge?.total ?? 0;
      const tariffRate = slot.total - spotRate - surchargeRate;
      spotCost += spotRate * energyInSlot;
      surchargesCost += surchargeRate * energyInSlot;
      tariffCost += tariffRate * energyInSlot;
    }

    remaining -= intervalFraction;
  }

  if (!hasDetails) return undefined;

  return {
    spotCost: roundToCents(spotCost),
    surchargesCost: roundToCents(surchargesCost),
    tariffCost: roundToCents(tariffCost),
  };
}

/** Build the final result with timestamps and window slots */
function buildResult(
  slots: PriceSlot[],
  constraintStartIdx: number,
  bestStart: number,
  startOffset: number,
  durationIntervals: number,
  intervalMinutes: number,
  minCost: number,
  durationHours: number,
  kWhNeeded: number,
  chargingSpeed: number
): ChargingResult {
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;
  const effectiveStartOffset = bestStart === 0 ? startOffset : 0;

  const totalIntervalsInWindow = durationIntervals + effectiveStartOffset;
  const fullIntervalsNeeded = Math.ceil(totalIntervalsInWindow);

  const fractionalPart = totalIntervalsInWindow % 1;
  const endOffset = fractionalPart > 0.0001 ? (1 - fractionalPart) : 0;

  const absoluteStartIdx = constraintStartIdx + bestStart;
  const absoluteEndIdx = absoluteStartIdx + fullIntervalsNeeded;

  const startTime = new Date(
    slots[absoluteStartIdx].timestamp.getTime() + effectiveStartOffset * msPerInterval
  );
  const endTime = new Date(
    slots[Math.min(absoluteEndIdx - 1, slots.length - 1)].timestamp.getTime() +
    msPerInterval -
    endOffset * msPerInterval
  );

  const windowSlots = slots.slice(absoluteStartIdx, absoluteEndIdx);

  const costBreakdown = calculateCostBreakdown(
    windowSlots,
    durationIntervals,
    effectiveStartOffset,
    chargingSpeed,
    intervalMinutes
  );

  return {
    startTime,
    endTime,
    windowSlots,
    intervalMinutes,
    totalCost: roundToCents(minCost),
    durationHours: roundToCents(durationHours),
    energyNeeded: kWhNeeded,
    costBreakdown,
  };
}

export function findOptimalChargingWindow(input: ChargingInput): ChargingResult | null {
  const { startPercent, endPercent, batterySize, chargingSpeed, slots, intervalMinutes, earliestStart, latestEnd } = input;

  // Validate inputs
  if (endPercent <= startPercent || chargingSpeed <= 0 || batterySize <= 0) return null;
  if (slots.length === 0) return null;

  // Calculate time constraints
  const { constraintStartIdx, constraintEndIdx, startOffset } = calculateTimeConstraints(
    slots,
    intervalMinutes,
    earliestStart,
    latestEnd
  );

  const constrainedSlots = slots.slice(constraintStartIdx, constraintEndIdx);

  // Calculate energy requirements
  const { kWhNeeded, durationHours, durationIntervals } = calculateEnergyRequirements(
    startPercent,
    endPercent,
    batterySize,
    chargingSpeed,
    intervalMinutes
  );

  // Find cheapest window
  const windowResult = findCheapestWindow(
    constrainedSlots,
    durationIntervals,
    startOffset,
    chargingSpeed,
    intervalMinutes
  );

  if (!windowResult) return null;

  // Build and return result
  return buildResult(
    slots,
    constraintStartIdx,
    windowResult.bestStart,
    startOffset,
    durationIntervals,
    intervalMinutes,
    windowResult.minCost,
    durationHours,
    kWhNeeded,
    chargingSpeed
  );
}
