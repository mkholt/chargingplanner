import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import type { HourData } from '@/components/timeline';
import { formatShortDate, isToday, isTomorrow, MS_PER_MINUTE, type PriceSlot } from '@/utils';

export type DayBoundary = {
  label: string;
  startIndex: number;
};

export type TimelineData = {
  hourData: HourData[];
  dayBoundaries: DayBoundary[];
  minPrice: number;
  maxPrice: number;
};

type UseTimelineDataParams = {
  slots: PriceSlot[];
  chargingStart?: Date;
  chargingEnd?: Date;
  intervalMinutes: number;
};

/**
 * Hook that transforms raw price slots into timeline visualization data.
 * Calculates charging fill fractions, day boundaries, and price ranges.
 */
export function useTimelineData({
  slots,
  chargingStart,
  chargingEnd,
  intervalMinutes,
}: UseTimelineDataParams): TimelineData | null {
  const { t } = useTranslation();

  return useMemo(() => {
    if (!slots.length) return null;

    const getDayLabel = (date: Date): string => {
      if (isToday(date)) return t('time.today');
      if (isTomorrow(date)) return t('time.tomorrow');
      return formatShortDate(date);
    };

    const prices = slots.map(s => s.total);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const msPerInterval = intervalMinutes * MS_PER_MINUTE;

    // Build interval data using slot timestamps directly
    const hourData: HourData[] = slots.map((slot, index) => {
      const slotTime = slot.timestamp;
      const slotEndTime = new Date(slotTime.getTime() + msPerInterval);

      // Determine if this slot is in the charging window using timestamps
      const isCharging = chargingStart && chargingEnd
        ? slotTime < chargingEnd && slotEndTime > chargingStart
        : false;

      // Calculate fill fraction for partial bars
      let chargingFillFraction: number | undefined;
      let fillFromRight: boolean | undefined;

      if (isCharging && chargingStart && chargingEnd) {
        const isFirstChargingBar = chargingStart > slotTime && chargingStart < slotEndTime;
        const isLastChargingBar = chargingEnd > slotTime && chargingEnd < slotEndTime;

        if (isFirstChargingBar) {
          // First bar starts partway through - fill from right (active portion on right)
          const offsetMs = chargingStart.getTime() - slotTime.getTime();
          chargingFillFraction = 1 - (offsetMs / msPerInterval);
          fillFromRight = true;
        } else if (isLastChargingBar) {
          // Last bar ends partway through - fill from left (active portion on left)
          const usedMs = chargingEnd.getTime() - slotTime.getTime();
          chargingFillFraction = usedMs / msPerInterval;
          fillFromRight = false;
        } else {
          // Full bar
          chargingFillFraction = 1;
        }
      }

      return {
        index,
        hour: slotTime.getHours(),
        minute: slotTime.getMinutes(),
        price: slot.total,
        isCharging,
        date: slotTime,
        dayLabel: getDayLabel(slotTime),
        details: slot.details,
        chargingFillFraction,
        fillFromRight,
      };
    });

    // Find day boundaries for markers
    const dayBoundaries: DayBoundary[] = [];
    let currentDay = '';
    hourData.forEach((data, index) => {
      if (data.dayLabel !== currentDay) {
        currentDay = data.dayLabel;
        dayBoundaries.push({ label: data.dayLabel, startIndex: index });
      }
    });

    return { hourData, dayBoundaries, minPrice, maxPrice };
  }, [slots, chargingStart, chargingEnd, intervalMinutes, t]);
}
