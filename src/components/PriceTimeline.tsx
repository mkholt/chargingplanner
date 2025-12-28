import React, { useRef, useState } from 'react';

import {
  Link,
  Text,
  tokens,
} from '@fluentui/react-components';

import {
  getDayLabel,
  getPriceColor,
  type HourData,
  PriceLegend,
  SelectedHourDetail,
  TimelineBar,
} from '@/components/timeline';
import type { PriceSlot } from '@/utils';

type Props = {
  slots: PriceSlot[];
  startDate: Date;
  chargingStart?: number;
  chargingEnd?: number;
  chargingSpeed?: number;
  intervalMinutes?: number;
};

export const PriceTimeline: React.FC<Props> = ({
  slots,
  startDate,
  chargingStart = -1,
  chargingEnd = -1,
  chargingSpeed,
  intervalMinutes = 60,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!slots.length) return null;

  const prices = slots.map(s => s.total);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Build interval data (each entry represents one interval - 15m or 1h)
  const hourData: HourData[] = slots.map((slot, index) => {
    const date = new Date(startDate);
    date.setMinutes(date.getMinutes() + index * intervalMinutes, 0, 0);
    const isCharging = index >= chargingStart && index < chargingEnd;

    return {
      index,
      hour: date.getHours(),
      minute: date.getMinutes(),
      price: slot.total,
      isCharging,
      date,
      dayLabel: getDayLabel(date),
      details: slot.details,
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
              intervalMinutes={intervalMinutes}
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

      {/* Time labels - matches bar layout with flex: 1 and gap: 2 */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          paddingTop: 4,
        }}
      >
        {hourData.map((data, i) => {
          const isFirst = i === 0;
          const isLast = i === hourData.length - 1;

          // For 15m intervals (96 per day), show labels every hour (every 4th interval)
          // For 1h intervals (24 per day), show every 2nd or 3rd
          let showLabel = false;
          if (intervalMinutes === 15) {
            // Show on the hour (minute === 0), plus first and last
            showLabel = isFirst || isLast || (data.minute === 0 && i % 8 === 0);
          } else {
            // Original logic for hourly intervals
            const labelInterval = hourData.length > 24 ? 3 : 2;
            showLabel = isFirst || isLast || i % labelInterval === 0;
          }

          // Format label: show HH:MM for 15m, just HH for 1h
          const label = intervalMinutes === 15
            ? `${String(data.hour).padStart(2, '0')}:${String(data.minute ?? 0).padStart(2, '0')}`
            : String(data.hour).padStart(2, '0');

          return (
            <div
              key={data.index}
              style={{
                flex: 1,
                textAlign: 'center',
              }}
            >
              {showLabel && (
                <Text
                  size={100}
                  style={{ color: tokens.colorNeutralForeground3 }}
                >
                  {label}
                </Text>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected hour detail */}
      {selectedHour && (
        <SelectedHourDetail
          hour={selectedHour}
          color={getPriceColor(selectedHour.price, minPrice, maxPrice)}
          chargingSpeed={chargingSpeed}
          intervalMinutes={intervalMinutes}
        />
      )}

      <PriceLegend minPrice={minPrice} maxPrice={maxPrice} />

      {/* Strømligning attribution */}
      <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: 8 }}>
        Data provided by Strømligning.{' '}
        <Link href="https://stromligning.dk" target="_blank" rel="noopener noreferrer">
          stromligning.dk
        </Link>
      </Text>
    </div>
  );
};
