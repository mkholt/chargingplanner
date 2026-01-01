import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

import type { DayBoundary } from '@/hooks/useTimelineData';

type Props = {
  dayBoundaries: DayBoundary[];
  totalBars: number;
};

export const DayMarkers: React.FC<Props> = ({ dayBoundaries, totalBars }) => {
  return (
    <div style={{ display: 'flex', position: 'relative', height: 20 }}>
      {dayBoundaries.map((boundary, i) => {
        const nextBoundary = dayBoundaries[i + 1];
        const endIndex = nextBoundary ? nextBoundary.startIndex : totalBars;
        const width = ((endIndex - boundary.startIndex) / totalBars) * 100;
        const left = (boundary.startIndex / totalBars) * 100;

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
  );
};
