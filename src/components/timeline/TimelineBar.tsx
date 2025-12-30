import React from 'react';

import {
  Text,
  Tooltip,
  tokens,
} from '@fluentui/react-components';

import type { HourData } from './types';

type Props = {
  data: HourData;
  color: string;
  isSelected: boolean;
  hasSelection: boolean;
  normalizedHeight: number;
  intervalMinutes: number;
  onClick: () => void;
};

export const TimelineBar: React.FC<Props> = ({
  data,
  color,
  isSelected,
  hasSelection,
  normalizedHeight,
  intervalMinutes,
  onClick,
}) => {
  // Interval time range
  const intervalStartTime = `${String(data.hour).padStart(2, '0')}:${String(data.minute ?? 0).padStart(2, '0')}`;
  const intervalEndDate = new Date(data.date.getTime() + intervalMinutes * 60 * 1000);
  const intervalEndTime = `${String(intervalEndDate.getHours()).padStart(2, '0')}:${String(intervalEndDate.getMinutes()).padStart(2, '0')}`;

  // Check if this is a partial charging bar (needed for tooltip)
  const isPartialBar = data.isCharging &&
    data.chargingFillFraction !== undefined &&
    data.chargingFillFraction < 1;
  const fillFraction = data.chargingFillFraction ?? 1;
  const fillFromRight = data.fillFromRight ?? false;

  // Calculate actual charging time for partial bars
  let chargingStartTime = intervalStartTime;
  let chargingEndTime = intervalEndTime;

  if (isPartialBar) {
    const inactiveFraction = 1 - fillFraction;
    const inactiveMinutes = Math.round(inactiveFraction * intervalMinutes);

    if (fillFromRight) {
      // Charging starts partway through (inactive portion at start)
      const actualStartDate = new Date(data.date.getTime() + inactiveMinutes * 60 * 1000);
      chargingStartTime = `${String(actualStartDate.getHours()).padStart(2, '0')}:${String(actualStartDate.getMinutes()).padStart(2, '0')}`;
    } else {
      // Charging ends partway through (inactive portion at end)
      const actualEndDate = new Date(data.date.getTime() + fillFraction * intervalMinutes * 60 * 1000);
      chargingEndTime = `${String(actualEndDate.getHours()).padStart(2, '0')}:${String(actualEndDate.getMinutes()).padStart(2, '0')}`;
    }
  }

  const tooltipContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Text size={200} weight="semibold">
          {intervalStartTime} - {intervalEndTime}
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
            {isPartialBar
              ? `Charging ${chargingStartTime} - ${chargingEndTime}`
              : 'Charging'}
          </Text>
        </div>
      )}
    </div>
  );

  // Gray overlay for inactive portions (mutes color but keeps it visible)
  const inactiveOverlay = 'rgba(0, 0, 0, 0.5)';

  // Determine if this bar needs a muting overlay
  const needsFullOverlay = !data.isCharging;
  const needsPartialOverlay = isPartialBar;

  return (
    <Tooltip
      content={tooltipContent}
      relationship="description"
      positioning="above"
      withArrow
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
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
          opacity: hasSelection && !isSelected ? 0.6 : 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Full overlay for non-charging bars */}
        {needsFullOverlay && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: inactiveOverlay,
              borderRadius: 3,
            }}
          />
        )}
        {/* Partial overlay for partial charging bars */}
        {needsPartialOverlay && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              [fillFromRight ? 'left' : 'right']: 0,
              width: `${(1 - fillFraction) * 100}%`,
              background: inactiveOverlay,
            }}
          />
        )}
      </div>
    </Tooltip>
  );
};
