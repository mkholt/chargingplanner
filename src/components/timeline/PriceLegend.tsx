import React from 'react';

import { tokens } from '@fluentui/react-components';

type Props = {
  minPrice: number;
  maxPrice: number;
};

export const PriceLegend: React.FC<Props> = ({ minPrice, maxPrice }) => {
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
};
