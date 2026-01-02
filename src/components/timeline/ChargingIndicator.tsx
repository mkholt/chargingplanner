import React from 'react';

import { tokens } from '@fluentui/react-components';

import type { HourData } from './types';

type Props = {
  hourData: HourData[];
};

export const ChargingIndicator: React.FC<Props> = ({ hourData }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacingHorizontalXXS,
        height: 4,
        marginTop: tokens.spacingHorizontalXS,
      }}
    >
      {hourData.map((data) => {
        const isPartial = data.isCharging &&
          data.chargingFillFraction !== undefined &&
          data.chargingFillFraction < 1;
        const fillFraction = data.chargingFillFraction ?? 1;
        const fillFromRight = data.fillFromRight ?? false;

        if (!data.isCharging) {
          return (
            <div
              key={data.index}
              style={{
                flex: 1,
                height: '100%',
                background: 'transparent',
                borderRadius: tokens.borderRadiusSmall,
              }}
            />
          );
        }

        if (isPartial) {
          return (
            <div
              key={data.index}
              style={{
                flex: 1,
                height: '100%',
                position: 'relative',
                borderRadius: tokens.borderRadiusSmall,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  [fillFromRight ? 'right' : 'left']: 0,
                  width: `${fillFraction * 100}%`,
                  background: tokens.colorBrandStroke1,
                  borderRadius: tokens.borderRadiusSmall,
                }}
              />
            </div>
          );
        }

        return (
          <div
            key={data.index}
            style={{
              flex: 1,
              height: '100%',
              background: tokens.colorBrandStroke1,
              borderRadius: tokens.borderRadiusSmall,
            }}
          />
        );
      })}
    </div>
  );
};
