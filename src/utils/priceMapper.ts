import type { PriceEntry, PricesApiResponse } from '@/types';

import { getLocalDateString } from './dateUtils';

export type PriceDetails = NonNullable<PriceEntry['details']>;

/** A price slot with its total, optional breakdown details, and timestamp */
export type PriceSlot = {
  /** Start time of this interval */
  timestamp: Date;
  total: number;
  details?: PriceDetails;
  /** Whether this slot has real price data (false = placeholder) */
  hasData: boolean;
};

export type PriceMapResult = {
  /** Map of date string -> array of price slots (total + details) */
  slotsByDate: Map<string, PriceSlot[]>;
  /** Resolution of the data: '15m' or '1h' */
  resolution: '15m' | '1h';
  /** Number of intervals per day (96 for 15m, 24 for 1h) */
  intervalsPerDay: number;
};

/**
 * Create an array of empty slots with timestamps for a given day.
 */
export function createEmptySlots(dayDate: Date, intervalsPerDay: number, intervalMinutes: number): PriceSlot[] {
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);

  const slots: PriceSlot[] = [];
  for (let i = 0; i < intervalsPerDay; i++) {
    const slotTime = new Date(dayStart);
    slotTime.setMinutes(i * intervalMinutes);
    slots.push({
      timestamp: slotTime,
      total: 0,
      hasData: false,
    });
  }
  return slots;
}

/**
 * Convert API response to a map of date -> price slots.
 * Detects resolution from the API response and returns appropriate arrays.
 * For 15-minute data: 96 entries per day
 * For hourly data: 24 entries per day
 */
export function mapApiResponseToPrices(response: PricesApiResponse): PriceMapResult {
  const slotsByDate = new Map<string, PriceSlot[]>();

  if (!response.prices || response.prices.length === 0) {
    return { slotsByDate, resolution: '1h', intervalsPerDay: 24 };
  }

  // Detect resolution from first price entry
  const firstResolution = response.prices[0]?.resolution;
  const is15m = firstResolution === '15m';
  const intervalsPerDay = is15m ? 96 : 24;
  const resolution = is15m ? '15m' : '1h';
  const intervalMinutes = is15m ? 15 : 60;

  for (const entry of response.prices) {
    if (!entry.date || entry.price?.total === undefined) {
      continue;
    }

    const date = new Date(entry.date);
    const dateKey = getLocalDateString(date);
    const hour = date.getHours();
    const minute = date.getMinutes();

    // Calculate interval index based on resolution
    const intervalIndex = is15m
      ? hour * 4 + Math.floor(minute / 15) // 0-95 for 15m
      : hour; // 0-23 for 1h

    if (!slotsByDate.has(dateKey)) {
      slotsByDate.set(dateKey, createEmptySlots(date, intervalsPerDay, intervalMinutes));
    }

    const slots = slotsByDate.get(dateKey)!;
    slots[intervalIndex] = {
      timestamp: date,
      total: entry.price.total,
      details: entry.details,
      hasData: true,
    };
  }

  return { slotsByDate, resolution, intervalsPerDay };
}

/**
 * Get the price unit from the API response (e.g., "kr/kWh").
 */
export function getPriceUnit(response: PricesApiResponse): string {
  const firstPrice = response.prices?.[0]?.price;
  return firstPrice?.unit ?? 'kr/kWh';
}
