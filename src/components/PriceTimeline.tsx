import React, { useRef, useState } from 'react';

import {
  Text,
  Tooltip,
  tokens,
} from '@fluentui/react-components';

type Props = {
  prices: number[];
  startDate: Date;
  chargingStart?: number;
  chargingEnd?: number;
  chargingSpeed?: number;
  totalCost?: number;
  duration?: number;
};

type HourData = {
  index: number;
  hour: number;
  price: number;
  isCharging: boolean;
  date: Date;
  dayLabel: string;
};

function getPriceColor(price: number, min: number, max: number): string {
  const range = max - min;
  if (range === 0) return tokens.colorPaletteYellowBorder1;

  const normalized = (price - min) / range;

  if (normalized < 0.33) {
    return tokens.colorPaletteGreenBorder1;
  } else if (normalized < 0.66) {
    return tokens.colorPaletteYellowBorder1;
  } else {
    return tokens.colorPaletteRedBorder1;
  }
}

function getDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }
}

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

          const tooltipContent = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Text size={200} weight="semibold">
                  {String(data.hour).padStart(2, '0')}:00 - {String((data.hour + 1) % 24).padStart(2, '0')}:00
                </Text>
                <Text size={200} weight="semibold" style={{ color }}>
                  {data.price.toFixed(2)}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                  {data.dayLabel}
                </Text>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                  DKK/kWh
                </Text>
              </div>
              {data.isCharging && (
                <div
                  style={{
                    marginTop: 2,
                    padding: '2px 6px',
                    background: tokens.colorBrandBackground2,
                    borderRadius: 3,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text size={100} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
                    Charging
                  </Text>
                </div>
              )}
            </div>
          );

          return (
            <Tooltip
              key={data.index}
              content={tooltipContent}
              relationship="description"
              positioning="above"
              withArrow
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(isSelected ? null : data.index);
                }}
                style={{
                  flex: 1,
                  height: `${normalizedHeight}%`,
                  background: color,
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-out',
                  transform: isSelected ? 'scaleY(1.1)' : 'none',
                  transformOrigin: 'bottom',
                  boxShadow: isSelected ? `0 0 0 2px ${tokens.colorNeutralStroke1}` : 'none',
                  opacity: selectedIndex !== null && !isSelected ? 0.6 : 1,
                }}
              />
            </Tooltip>
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
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: tokens.colorNeutralBackground3,
            borderRadius: 8,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text weight="semibold" size={300}>
                {selectedHour.date.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' - '}
                {new Date(selectedHour.date.getTime() + 3600000).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground2 }}>
                {selectedHour.dayLabel}
              </Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text weight="semibold" size={400} style={{ color: getPriceColor(selectedHour.price, minPrice, maxPrice) }}>
                {selectedHour.price.toFixed(2)}
              </Text>
              <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground3 }}>
                DKK/kWh
              </Text>
            </div>
          </div>

          {chargingSpeed !== undefined && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${tokens.colorNeutralStroke1}` }}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                Cost for 1 hour @ {chargingSpeed} kW:{' '}
                <Text weight="semibold">
                  {(selectedHour.price * chargingSpeed).toFixed(2)} DKK
                </Text>
              </Text>
            </div>
          )}

          {selectedHour.isCharging && (
            <div
              style={{
                marginTop: 8,
                padding: '4px 8px',
                background: tokens.colorBrandBackground2,
                borderRadius: 4,
                display: 'inline-block',
              }}
            >
              <Text size={200} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
                Charging
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {(() => {
        const range = maxPrice - minPrice;
        const cheapCutoff = minPrice + range * 0.33;
        const expensiveCutoff = minPrice + range * 0.66;
        return (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px 16px',
              marginTop: 8,
              padding: '8px 12px',
              background: tokens.colorNeutralBackground3,
              borderRadius: 8,
              fontSize: 11,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: tokens.colorPaletteGreenBorder1,
                  borderRadius: 2,
                }}
              />
              <span>&lt; {cheapCutoff.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: tokens.colorPaletteYellowBorder1,
                  borderRadius: 2,
                }}
              />
              <span>{cheapCutoff.toFixed(2)} - {expensiveCutoff.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: tokens.colorPaletteRedBorder1,
                  borderRadius: 2,
                }}
              />
              <span>&gt; {expensiveCutoff.toFixed(2)}</span>
            </div>
            <span style={{ color: tokens.colorNeutralForeground3 }}>DKK/kWh</span>
          </div>
        );
      })()}
    </div>
  );
};
