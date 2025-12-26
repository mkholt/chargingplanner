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
};
