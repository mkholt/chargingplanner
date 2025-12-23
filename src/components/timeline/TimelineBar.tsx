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
  onClick: () => void;
};

export const TimelineBar: React.FC<Props> = ({
  data,
  color,
  isSelected,
  hasSelection,
  normalizedHeight,
  onClick,
}) => {
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
        }}
      />
    </Tooltip>
  );
};
