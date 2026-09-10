import { CHARGING_EFFICIENCY, MS_PER_HOUR, MS_PER_MINUTE, roundToCents } from './constants';
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

/** Tolerance in milliseconds used when comparing floating point time boundaries */
const TIME_EPSILON_MS = 0.001;

type SearchBounds = {
  /** Earliest allowed charging start (ms) */
  windowStartMs: number;
  /** Latest allowed charging end (ms) */
  windowEndMs: number;
};

type EnergyRequirements = {
  kWhNeeded: number;
  durationHours: number;
  durationMs: number;
};

/** A part of the charging window that falls inside a single price slot */
type WindowSegment = {
  slot: PriceSlot;
  /** Hours charged inside this slot */
  hours: number;
};

/** Clamp the user's time constraints to the range actually covered by price data */
function calculateSearchBounds(
  slots: PriceSlot[],
  intervalMinutes: number,
  earliestStart?: Date,
  latestEnd?: Date
): SearchBounds {
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;
  const timelineStartMs = slots[0].timestamp.getTime();
  const timelineEndMs = slots[slots.length - 1].timestamp.getTime() + msPerInterval;

  const windowStartMs = earliestStart
    ? Math.max(earliestStart.getTime(), timelineStartMs)
    : timelineStartMs;
  const windowEndMs = latestEnd
    ? Math.min(latestEnd.getTime(), timelineEndMs)
    : timelineEndMs;

  return { windowStartMs, windowEndMs };
}

/** Calculate energy needed from grid and charging duration */
function calculateEnergyRequirements(
  startPercent: number,
  endPercent: number,
  batterySize: number,
  chargingSpeed: number
): EnergyRequirements {
  const kWhNeededInBattery = ((endPercent - startPercent) / 100) * batterySize;
  const kWhNeeded = kWhNeededInBattery / CHARGING_EFFICIENCY;
  const durationHours = kWhNeeded / chargingSpeed;

  return { kWhNeeded, durationHours, durationMs: durationHours * MS_PER_HOUR };
}

/** Split a charging window into the parts falling inside each price slot */
function collectSegments(
  slots: PriceSlot[],
  intervalMinutes: number,
  startMs: number,
  durationMs: number
): WindowSegment[] {
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;
  const endMs = startMs + durationMs;
  const segments: WindowSegment[] = [];

  for (const slot of slots) {
    const slotStart = slot.timestamp.getTime();
    const slotEnd = slotStart + msPerInterval;
    if (slotEnd <= startMs) continue;
    if (slotStart >= endMs) break;

    const overlapMs = Math.min(slotEnd, endMs) - Math.max(slotStart, startMs);
    if (overlapMs > TIME_EPSILON_MS) {
      segments.push({ slot, hours: overlapMs / MS_PER_HOUR });
    }
  }

  return segments;
}

/** Cost of charging for the given segments */
function segmentsCost(segments: WindowSegment[], chargingSpeed: number): number {
  return segments.reduce((sum, { slot, hours }) => sum + slot.total * chargingSpeed * hours, 0);
}

/**
 * Candidate start times for the cheapest window.
 *
 * Cost is piecewise linear in the start time, so an optimum always sits on a
 * breakpoint: the earliest allowed start, the latest possible start, a slot
 * boundary the window starts on, or a slot boundary the window ends on.
 */
function candidateStartTimes(
  slots: PriceSlot[],
  windowStartMs: number,
  latestStartMs: number,
  durationMs: number
): number[] {
  const candidates = new Set<number>([windowStartMs, latestStartMs]);

  for (const slot of slots) {
    const boundaryMs = slot.timestamp.getTime();
    for (const candidate of [boundaryMs, boundaryMs - durationMs]) {
      if (candidate > windowStartMs && candidate < latestStartMs) {
        candidates.add(candidate);
      }
    }
  }

  return [...candidates].sort((a, b) => a - b);
}

/** Calculate cost breakdown (spot vs surcharges vs tariffs) for the charging window */
function calculateCostBreakdown(
  segments: WindowSegment[],
  chargingSpeed: number
): { spotCost: number; surchargesCost: number; tariffCost: number } | undefined {
  let spotCost = 0;
  let surchargesCost = 0;
  let tariffCost = 0;
  let hasDetails = false;

  for (const { slot, hours } of segments) {
    if (slot.details?.electricity?.total === undefined) continue;

    hasDetails = true;
    const energyInSlot = chargingSpeed * hours;
    const spotRate = slot.details.electricity.total;
    const surchargeRate = slot.details.surcharge?.total ?? 0;
    const tariffRate = slot.total - spotRate - surchargeRate;
    spotCost += spotRate * energyInSlot;
    surchargesCost += surchargeRate * energyInSlot;
    tariffCost += tariffRate * energyInSlot;
  }

  if (!hasDetails) return undefined;

  return {
    spotCost: roundToCents(spotCost),
    surchargesCost: roundToCents(surchargesCost),
    tariffCost: roundToCents(tariffCost),
  };
}

export function findOptimalChargingWindow(input: ChargingInput): ChargingResult | null {
  const { startPercent, endPercent, batterySize, chargingSpeed, slots, intervalMinutes, earliestStart, latestEnd } = input;

  // Validate inputs
  if (endPercent <= startPercent || chargingSpeed <= 0 || batterySize <= 0) return null;
  if (slots.length === 0) return null;

  const { windowStartMs, windowEndMs } = calculateSearchBounds(
    slots,
    intervalMinutes,
    earliestStart,
    latestEnd
  );

  const { kWhNeeded, durationHours, durationMs } = calculateEnergyRequirements(
    startPercent,
    endPercent,
    batterySize,
    chargingSpeed
  );

  // Charging must fit between the earliest start and the latest end
  const latestStartMs = windowEndMs - durationMs;
  if (durationMs <= 0 || latestStartMs < windowStartMs - TIME_EPSILON_MS) return null;

  // Pick the cheapest candidate, preferring the earliest one on ties
  let bestStartMs: number | null = null;
  let bestSegments: WindowSegment[] = [];
  let minCost = Infinity;

  for (const startMs of candidateStartTimes(slots, windowStartMs, latestStartMs, durationMs)) {
    const segments = collectSegments(slots, intervalMinutes, startMs, durationMs);
    const cost = segmentsCost(segments, chargingSpeed);
    if (cost < minCost) {
      minCost = cost;
      bestStartMs = startMs;
      bestSegments = segments;
    }
  }

  if (bestStartMs === null) return null;

  return {
    startTime: new Date(bestStartMs),
    endTime: new Date(bestStartMs + durationMs),
    windowSlots: bestSegments.map(segment => segment.slot),
    intervalMinutes,
    totalCost: roundToCents(minCost),
    durationHours: roundToCents(durationHours),
    energyNeeded: kWhNeeded,
    costBreakdown: calculateCostBreakdown(bestSegments, chargingSpeed),
  };
}
