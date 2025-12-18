import React, { useState } from 'react';

import {
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

// Calculate SVG arc path for a segment
function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  offset: number = 0 // offset outward from center
): string {
  // Calculate offset direction (midpoint of the arc)
  const midAngle = (startAngle + endAngle) / 2;
  const offsetX = offset * Math.cos((midAngle - 90) * Math.PI / 180);
  const offsetY = offset * Math.sin((midAngle - 90) * Math.PI / 180);

  const offsetCx = cx + offsetX;
  const offsetCy = cy + offsetY;

  const startOuter = polarToCartesian(offsetCx, offsetCy, outerRadius, endAngle);
  const endOuter = polarToCartesian(offsetCx, offsetCy, outerRadius, startAngle);
  const startInner = polarToCartesian(offsetCx, offsetCy, innerRadius, endAngle);
  const endInner = polarToCartesian(offsetCx, offsetCy, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

// Arc stroke path (outline only, no fill)
function describeArcStroke(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
  ].join(' ');
}

export const PriceClock: React.FC<Props> = ({
  prices,
  startDate,
  chargingStart = -1,
  chargingEnd = -1,
  chargingSpeed,
  totalCost,
  duration,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!prices.length) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Build hour data - we need to map to 24-hour clock positions
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
    };
  });

  // SVG dimensions
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 140;
  const innerRadius = 70;
  const labelRadius = outerRadius + 20;

  // Each hour segment is 15 degrees (360 / 24)
  const segmentAngle = 15;
  const gap = 1; // Small gap between segments

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16, width: '100%' }}>
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: size, aspectRatio: '1 / 1' }}
      >
        {/* Hour labels around the clock */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
          const angle = hour * segmentAngle;
          const pos = polarToCartesian(cx, cy, labelRadius, angle);
          return (
            <text
              key={`label-${hour}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={tokens.colorNeutralForeground3}
              fontSize={12}
              fontWeight={500}
            >
              {String(hour).padStart(2, '0')}
            </text>
          );
        })}

        {/* Hour segments */}
        {hourData.map((data) => {
          const startAngle = data.hour * segmentAngle + gap / 2;
          const endAngle = (data.hour + 1) * segmentAngle - gap / 2;
          const color = getPriceColor(data.price, minPrice, maxPrice);
          const isHovered = hoveredIndex === data.index;

          // Pop out charging segments slightly
          const popOutOffset = data.isCharging ? 8 : 0;
          const segmentOuterRadius = isHovered ? outerRadius + 8 : outerRadius;
          const path = describeArc(cx, cy, innerRadius, segmentOuterRadius, startAngle, endAngle, popOutOffset);

          const cost = chargingSpeed !== undefined
            ? Math.round(data.price * chargingSpeed * 100) / 100
            : undefined;

          const tooltipContent = (
            <div style={{ padding: 4 }}>
              <div style={{ fontWeight: 600 }}>
                {data.date.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div>{data.price.toFixed(2)} DKK/kWh</div>
              {cost !== undefined && (
                <div style={{ color: tokens.colorNeutralForeground2 }}>
                  Cost: {cost} DKK @ {chargingSpeed?.toFixed(1)} kW
                </div>
              )}
              {data.isCharging && (
                <div style={{ color: tokens.colorBrandForeground1, fontWeight: 600, marginTop: 4 }}>
                  ⚡ Charging
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
            >
              <path
                d={path}
                fill={color}
                stroke={tokens.colorNeutralStroke1}
                strokeWidth={1}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-out',
                  filter: isHovered ? 'brightness(1.1)' : 'none',
                }}
                onMouseEnter={() => setHoveredIndex(data.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </Tooltip>
          );
        })}

        {/* Charging window outline arc */}
        {chargingStart >= 0 && chargingEnd > chargingStart && (
          <>
            {(() => {
              const startHour = hourData[chargingStart]?.hour ?? 0;
              const endHour = hourData[Math.min(chargingEnd - 1, hourData.length - 1)]?.hour ?? 0;
              const arcStartAngle = startHour * segmentAngle;
              const arcEndAngle = (endHour + 1) * segmentAngle;

              // Draw outline arc around the popped-out charging segments
              const outlineRadius = outerRadius + 16;
              const outlinePath = describeArcStroke(cx, cy, outlineRadius, arcStartAngle, arcEndAngle);

              return (
                <path
                  d={outlinePath}
                  fill="none"
                  stroke={tokens.colorBrandStroke1}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              );
            })()}
          </>
        )}

        {/* Center content */}
        <circle cx={cx} cy={cy} r={innerRadius - 8} fill={tokens.colorNeutralBackground2} />
        {totalCost !== undefined && (
          <>
            <text
              x={cx}
              y={cy - 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={tokens.colorBrandForeground1}
              fontSize={24}
              fontWeight={700}
            >
              {totalCost.toFixed(2)}
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={tokens.colorNeutralForeground2}
              fontSize={14}
            >
              DKK
            </text>
            {duration !== undefined && (
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={tokens.colorNeutralForeground3}
                fontSize={12}
              >
                {duration.toFixed(1)}h
              </text>
            )}
          </>
        )}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px 16px',
          marginTop: 12,
          padding: '8px 12px',
          background: tokens.colorNeutralBackground3,
          borderRadius: 8,
          fontSize: 11,
          maxWidth: '100%',
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
          <span>Cheap</span>
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
          <span>Medium</span>
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
          <span>Expensive</span>
        </div>
        <div style={{ color: tokens.colorNeutralForeground3 }}>
          {minPrice.toFixed(2)}-{maxPrice.toFixed(2)} DKK
        </div>
      </div>
    </div>
  );
};
