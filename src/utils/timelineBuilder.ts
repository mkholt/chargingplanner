import { MS_PER_DAY, MS_PER_MINUTE } from './constants';
import { getLocalDateString } from './dateUtils';
import { getAggregationSize, getPricesForDate } from './mockPrices';

export interface TimelineData {
  /** All prices from now to end of available data */
  prices: number[];
  /** Start time of the timeline (truncated to current interval) */
  startDate: Date;
  /** Index of charging interval start within the timeline */
  chargingStartIdx: number;
  /** Index of charging interval end within the timeline */
  chargingEndIdx: number;
  /** Interval size in minutes (15 or 60) */
  intervalMinutes: number;
}

/**
 * Builds a timeline of prices from the current interval to the end of available data,
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
  const aggregationSize = getAggregationSize();
  const intervalMinutes = aggregationSize === '15m' ? 15 : 60;
  const msPerInterval = intervalMinutes * MS_PER_MINUTE;
  const intervalsPerDay = (24 * 60) / intervalMinutes;

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

  // Find the index matching the current interval and slice from there
  // This gives us prices from "now" onwards
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const nowIntervalIdx =
    (now.getDate() - timelineAllStart.getDate()) * intervalsPerDay +
    Math.floor(minutesSinceMidnight / intervalMinutes);
  const timelinePrices = allPrices.slice(nowIntervalIdx);

  // Calculate the actual start time of our sliced timeline
  const timelineStart = new Date(timelineAllStart);
  timelineStart.setMinutes(nowIntervalIdx * intervalMinutes, 0, 0);

  // Calculate charging interval indices relative to the timeline
  const chargingStartIdx = Math.max(
    Math.floor((earliestDate.getTime() - timelineStart.getTime()) / msPerInterval),
    0
  );
  const chargingEndIdx = Math.max(
    Math.floor((latestDate.getTime() - timelineStart.getTime()) / msPerInterval),
    chargingStartIdx
  );

  return {
    prices: timelinePrices,
    startDate: timelineStart,
    chargingStartIdx,
    chargingEndIdx,
    intervalMinutes,
  };
}
