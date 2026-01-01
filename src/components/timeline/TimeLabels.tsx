import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

import type { HourData } from './types';

type Props = {
  hourData: HourData[];
  intervalMinutes: number;
};

export const TimeLabels: React.FC<Props> = ({ hourData, intervalMinutes }) => {
  return (
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
  );
};
