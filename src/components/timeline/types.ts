import type { PriceEntry } from '@/types';

export type PriceDetails = NonNullable<PriceEntry['details']>;

export type HourData = {
  index: number;
  hour: number;
  minute?: number;
  price: number;
  isCharging: boolean;
  date: Date;
  dayLabel: string;
  details?: PriceDetails;
  /** Fraction of bar that is actively charging (0-1). 1 = full bar, <1 = partial */
  chargingFillFraction?: number;
  /** Whether the partial fill starts from the right (true) or left (false) */
  fillFromRight?: boolean;
};
