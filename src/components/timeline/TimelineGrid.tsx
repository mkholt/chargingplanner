import React from 'react';

import { tokens } from '@fluentui/react-components';

import type { DayBoundary } from '@/hooks/useTimelineData';

import { getPriceColor } from './priceColors';
import { TimelineBar } from './TimelineBar';
import type { HourData } from './types';

type Props = {
  hourData: HourData[];
  dayBoundaries: DayBoundary[];
  minPrice: number;
  maxPrice: number;
  intervalMinutes: number;
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
};

export const TimelineGrid: React.FC<Props> = ({
  hourData,
  dayBoundaries,
  minPrice,
  maxPrice,
  intervalMinutes,
  selectedIndex,
  onSelectIndex,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: tokens.spacingHorizontalXXS,
        height: 80,
        alignItems: 'flex-end',
      }}
    >
      {/* Day-shift vertical lines */}
      {dayBoundaries.slice(1).map((boundary) => {
        const leftPercent = (boundary.startIndex / hourData.length) * 100;
        return (
          <div
            key={`day-shift-${boundary.label}`}
            style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              top: 0,
              bottom: 0,
              width: 0,
              borderLeft: `2px dashed ${tokens.colorNeutralForeground3}`,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        );
      })}
      {hourData.map((data) => {
        const color = getPriceColor(data.price, minPrice, maxPrice);
        const isSelected = selectedIndex === data.index;

        // Normalize height (min 20%, max 100%)
        const range = maxPrice - minPrice;
        const normalizedHeight = range > 0
          ? 20 + ((data.price - minPrice) / range) * 80
          : 50;

        return (
          <TimelineBar
            key={data.index}
            data={data}
            color={color}
            isSelected={isSelected}
            hasSelection={selectedIndex !== null}
            normalizedHeight={normalizedHeight}
            intervalMinutes={intervalMinutes}
            onClick={() => onSelectIndex(isSelected ? null : data.index)}
          />
        );
      })}
    </div>
  );
};
