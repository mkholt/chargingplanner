import type { PricesApiResponse } from '@/types';

import { MS_PER_DAY, MS_PER_MINUTE } from './constants';
import { getLocalDateString } from './dateUtils';
import { createEmptySlots, mapApiResponseToPrices, type PriceSlot } from './priceMapper';

export interface TimelineData {
  /** All price slots from now to end of available data (each slot has its own timestamp) */
  slots: PriceSlot[];
  /** Interval size in minutes (15 or 60) */
  intervalMinutes: number;
  /** User's earliest allowed charging start time */
  chargingStartTime: Date;
  /** User's latest allowed charging end time */
  chargingEndTime: Date;
  /** End time of valid price data (timestamp after last slot with data) */
  validDataEndTime: Date;
}

/**
 * Builds a timeline of prices from the current interval to the end of available data,
 * and calculates where the charging interval falls within that timeline.
 *
 * The timeline uses the resolution from the API response (15m or 1h).
 * No client-side aggregation is performed - the API handles aggregation.
 *
 * @param earliestDate - Start of the user's desired charging window
 * @param latestDate - End of the user's desired charging window
 * @param priceData - API response containing price data
 * @returns Timeline data, or null if no prices available
 */
export function buildTimeline(
  earliestDate: Date,
  latestDate: Date,
  priceData: PricesApiResponse | undefined
): TimelineData | null {
  if (!priceData) {
    return null;
  }

  const now = new Date();

  // Convert API response to price slots - resolution is detected from API response
  const { slotsByDate, resolution, intervalsPerDay } = mapApiResponseToPrices(priceData);

  const intervalMinutes = resolution === '15m' ? 15 : 60;
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;

  // Gather slots for today and tomorrow
  const today = getLocalDateString(now);
  const tomorrowDate = new Date(now.getTime() + MS_PER_DAY);
  const tomorrow = getLocalDateString(tomorrowDate);

  const todaySlots = slotsByDate.get(today) || createEmptySlots(now, intervalsPerDay, intervalMinutes);
  const tomorrowSlots = slotsByDate.get(tomorrow) || createEmptySlots(tomorrowDate, intervalsPerDay, intervalMinutes);

  const allSlots = [...todaySlots, ...tomorrowSlots];

  if (allSlots.length === 0) {
    return null;
  }

  // Calculate timeline start (midnight today)
  const timelineAllStart = new Date(now);
  timelineAllStart.setHours(0, 0, 0, 0);

  // Find the index matching the current interval and slice from there
  // This gives us prices from "now" onwards
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const nowIntervalIdx =
    (now.getDate() - timelineAllStart.getDate()) * intervalsPerDay +
    Math.floor(minutesSinceMidnight / intervalMinutes);
  const timelineSlots = allSlots.slice(nowIntervalIdx);

  // Find the last slot with valid price data to calculate validDataEndTime
  let lastValidSlot: PriceSlot | null = null;
  for (const slot of timelineSlots) {
    if (slot.hasData) {
      lastValidSlot = slot;
    }
  }

  // Calculate valid data end time from the last slot with data
  const validDataEndTime = lastValidSlot
    ? new Date(lastValidSlot.timestamp.getTime() + msPerInterval)
    : timelineSlots[0].timestamp;

  return {
    slots: timelineSlots,
    intervalMinutes,
    chargingStartTime: earliestDate,
    chargingEndTime: latestDate,
    validDataEndTime,
  };
}
