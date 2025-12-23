export { findOptimalChargingWindow } from './chargingCalculator';
export type { ChargingResult } from './chargingCalculator';
export {
  encodeCars,
  generateShareableUrl,
  generateShareableUrl as createShareableUrl,
  generateSyncCode,
  parseAnyFormat,
  parseShareableUrl,
} from './carSyncCodec';
export { CHARGING_POWER_OPTIONS, DEBOUNCE_MS, MS_PER_HOUR, MS_PER_DAY } from './constants';
export { getLocalDateString, toDateTimeLocalString } from './dateUtils';
export { getAvailableDates, getPricesForDate } from './mockPrices';
export type { PriceData } from './mockPrices';
export { buildTimeline } from './timelineBuilder';
export type { TimelineData } from './timelineBuilder';
