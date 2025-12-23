import React, { useRef, useState } from 'react';

import {
  Text,
  tokens,
} from '@fluentui/react-components';

import { PriceLegend } from './timeline/PriceLegend';
import { getDayLabel, getPriceColor } from './timeline/priceColors';
import { SelectedHourDetail } from './timeline/SelectedHourDetail';
import { TimelineBar } from './timeline/TimelineBar';
import type { HourData } from './timeline/types';

type Props = {
  prices: number[];
  startDate: Date;
  chargingStart?: number;
  chargingEnd?: number;
  chargingSpeed?: number;
  totalCost?: number;
  duration?: number;
};

export const PriceTimeline: React.FC<Props> = ({
  prices,
  startDate,
  chargingStart = -1,
  chargingEnd = -1,
  chargingSpeed,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!prices.length) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Build hour data
  const hourData: HourData[] = prices.map((price, index) => {
    const date = new Date(startDate);
    date.setHours(date.getHours() + index, 0, 0, 0);
    const isCharging = index >= chargingStart && index < chargingEnd;

    return {
      index,
      hour: date.getHours(),
      price,
      isCharging,
      date,
      dayLabel: getDayLabel(date),
    };
  });

  // Find day boundaries for markers
  const dayBoundaries: { label: string; startIndex: number }[] = [];
  let currentDay = '';
  hourData.forEach((data, index) => {
    if (data.dayLabel !== currentDay) {
      currentDay = data.dayLabel;
      dayBoundaries.push({ label: data.dayLabel, startIndex: index });
    }
  });

  const selectedHour = selectedIndex !== null ? hourData[selectedIndex] : null;

  // Handle click outside to deselect
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setSelectedIndex(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginTop: 16,
        width: '100%',
      }}
    >
      {/* Day markers */}
      <div style={{ display: 'flex', position: 'relative', height: 20 }}>
        {dayBoundaries.map((boundary, i) => {
          const nextBoundary = dayBoundaries[i + 1];
          const endIndex = nextBoundary ? nextBoundary.startIndex : hourData.length;
          const width = ((endIndex - boundary.startIndex) / hourData.length) * 100;
          const left = (boundary.startIndex / hourData.length) * 100;

          return (
            <div
              key={boundary.label}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                textAlign: 'center',
              }}
            >
              <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>
                {boundary.label}
              </Text>
            </div>
          );
        })}
      </div>

      {/* Timeline bars */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          height: 80,
          alignItems: 'flex-end',
        }}
      >
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
              onClick={() => setSelectedIndex(isSelected ? null : data.index)}
            />
          );
        })}
      </div>

      {/* Charging indicator line */}
      {chargingStart >= 0 && chargingEnd > chargingStart && (
        <div
          style={{
            display: 'flex',
            gap: 2,
            height: 4,
            marginTop: 4,
          }}
        >
          {hourData.map((data) => (
            <div
              key={data.index}
              style={{
                flex: 1,
                height: '100%',
                background: data.isCharging ? tokens.colorBrandStroke1 : 'transparent',
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Hour labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: 4,
        }}
      >
        {hourData
          .filter((_, i) => {
            // Show labels at reasonable intervals
            const interval = hourData.length > 24 ? 6 : hourData.length > 12 ? 3 : 2;
            return i % interval === 0 || i === hourData.length - 1;
          })
          .map((data) => (
            <Text
              key={data.index}
              size={100}
              style={{
                color: tokens.colorNeutralForeground3,
                minWidth: 24,
                textAlign: 'center',
              }}
            >
              {String(data.hour).padStart(2, '0')}
            </Text>
          ))}
      </div>

      {/* Selected hour detail */}
      {selectedHour && (
        <SelectedHourDetail
          hour={selectedHour}
          color={getPriceColor(selectedHour.price, minPrice, maxPrice)}
          chargingSpeed={chargingSpeed}
        />
      )}

      <PriceLegend minPrice={minPrice} maxPrice={maxPrice} />
    </div>
  );
};
