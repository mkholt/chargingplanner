import { MS_PER_DAY, MS_PER_HOUR } from './constants';
import { getLocalDateString } from './dateUtils';
import { getPricesForDate } from './mockPrices';

export interface TimelineData {
  /** All prices from now to end of available data */
  prices: number[];
  /** Start time of the timeline (current hour, truncated to hour) */
  startDate: Date;
  /** Index of charging interval start within the timeline */
  chargingStartIdx: number;
  /** Index of charging interval end within the timeline */
  chargingEndIdx: number;
}

/**
 * Builds a timeline of prices from the current hour to the end of available data,
 * and calculates where the charging interval falls within that timeline.
 *
 * @param earliestDate - Start of the user's desired charging window
 * @param latestDate - End of the user's desired charging window
 * @returns Timeline data, or null if no prices available
 */
export function buildTimeline(
  earliestDate: Date,
  latestDate: Date
): TimelineData | null {
  const now = new Date();

  // Gather prices for today and tomorrow
  const today = getLocalDateString(now);
  const tomorrowDate = new Date(now.getTime() + MS_PER_DAY);
  const tomorrow = getLocalDateString(tomorrowDate);

  const todayPrices = getPricesForDate(today) || [];
  const tomorrowPrices = getPricesForDate(tomorrow) || [];
  const allPrices = [...todayPrices, ...tomorrowPrices];

  if (allPrices.length === 0) {
    return null;
  }

  // Calculate timeline start (midnight today)
  const timelineAllStart = new Date(now);
  timelineAllStart.setHours(0, 0, 0, 0);

  // Find the index matching the current hour and slice from there
  // This gives us prices from "now" onwards
  const nowHourIdx =
    (now.getDate() - timelineAllStart.getDate()) * 24 + now.getHours();
  const timelinePrices = allPrices.slice(nowHourIdx);

  // Calculate the actual start time of our sliced timeline
  const timelineStart = new Date(timelineAllStart);
  timelineStart.setHours(timelineStart.getHours() + nowHourIdx, 0, 0, 0);

  // Calculate charging interval indices relative to the timeline
  const chargingStartIdx = Math.max(
    Math.floor((earliestDate.getTime() - timelineStart.getTime()) / MS_PER_HOUR),
    0
  );
  const chargingEndIdx = Math.max(
    Math.floor((latestDate.getTime() - timelineStart.getTime()) / MS_PER_HOUR),
    chargingStartIdx
  );

  return {
    prices: timelinePrices,
    startDate: timelineStart,
    chargingStartIdx,
    chargingEndIdx,
  };
}
