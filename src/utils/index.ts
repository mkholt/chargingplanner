export { findOptimalChargingWindow } from './chargingCalculator';
export type { ChargingResult } from './chargingCalculator';
export {
  decodeSyncData,
  encodeSyncData,
  generateShareableUrl,
  generateSyncCode,
  mergeCars,
  parseAnyFormat,
  parseShareableUrl,
} from './carSyncCodec';
export type { MergeResult, SyncData } from './carSyncCodec';
export { CHARGING_POWER_OPTIONS, DEBOUNCE_MS, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from './constants';
export { getLocalDateString, toDateTimeLocalString } from './dateUtils';
export {
  findCompanyById,
  findProductById,
  getMockCompanies,
} from './mockCompanies';
export type { Company, Product } from './mockCompanies';
export {
  getAggregationSize,
  getAvailableDates,
  getMockApiResponse,
  getPricesForDate,
  setAggregationSettings,
} from './mockPrices';
export {
  findSupplierById,
  findSupplierByPostalCode,
  getMockSuppliers,
  getSuppliersByPriceArea,
  isValidPostalCode,
} from './mockSuppliers';
export type { Supplier } from './mockSuppliers';
export { getPriceUnit, mapApiResponseToPrices } from './priceMapper';
export { buildTimeline } from './timelineBuilder';
export type { TimelineData } from './timelineBuilder';
