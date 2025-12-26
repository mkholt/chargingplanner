import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

import type { HourData } from './types';

type Props = {
  hour: HourData;
  color: string;
  chargingSpeed?: number;
  intervalMinutes: number;
};

export const SelectedHourDetail: React.FC<Props> = ({
  hour,
  color,
  chargingSpeed,
  intervalMinutes,
}) => {
  const endDate = new Date(hour.date.getTime() + intervalMinutes * 60 * 1000);
  const durationLabel = intervalMinutes === 60 ? '1 hour' : `${intervalMinutes} min`;

  return (
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
            {hour.date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' - '}
            {endDate.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground2 }}>
            {hour.dayLabel}
          </Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text weight="semibold" size={400} style={{ color }}>
            {hour.price.toFixed(2)}
          </Text>
          <Text size={200} style={{ display: 'block', color: tokens.colorNeutralForeground3 }}>
            DKK/kWh
          </Text>
        </div>
      </div>

      {chargingSpeed !== undefined && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${tokens.colorNeutralStroke1}` }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            Cost for {durationLabel} @ {chargingSpeed} kW:{' '}
            <Text weight="semibold">
              {(hour.price * chargingSpeed * (intervalMinutes / 60)).toFixed(2)} DKK
            </Text>
          </Text>
        </div>
      )}

      {hour.isCharging && (
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
  );
};
