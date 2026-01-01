import React from 'react';

import { tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

type Props = {
  minPrice: number;
  maxPrice: number;
};

export const PriceLegend: React.FC<Props> = ({ minPrice, maxPrice }) => {
  const { t } = useTranslation();
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
        <span>{t('priceTimeline.lessThan', { price: cheapCutoff.toFixed(2) })}</span>
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
        <span>{t('priceTimeline.range', { min: cheapCutoff.toFixed(2), max: expensiveCutoff.toFixed(2) })}</span>
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
        <span>{t('priceTimeline.moreThan', { price: expensiveCutoff.toFixed(2) })}</span>
      </div>
      <span style={{ color: tokens.colorNeutralForeground3 }}>{t('priceTimeline.unit')}</span>
    </div>
  );
};
