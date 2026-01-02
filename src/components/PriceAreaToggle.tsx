import React from 'react';

import {
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Globe20Regular } from '@fluentui/react-icons';

import { type PriceArea, usePriceSettings } from '@/contexts';

const PRICE_AREAS: { value: PriceArea; label: string; description: string }[] = [
  { value: 'DK1', label: 'DK1', description: 'West Denmark' },
  { value: 'DK2', label: 'DK2', description: 'East Denmark' },
];

export const PriceAreaToggle: React.FC = () => {
  const { resolved, setPriceArea } = usePriceSettings();
  const { priceArea, priceAreaSource, product } = resolved;

  // Don't show if a product is selected (price area comes from supplier)
  if (product || priceAreaSource === 'supplier') {
    return null;
  }

  const isDK2 = priceArea === 'DK2';
  const currentArea = PRICE_AREAS.find(a => a.value === priceArea) ?? PRICE_AREAS[0];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacingHorizontalS,
      padding: `${tokens.spacingHorizontalS} ${tokens.spacingHorizontalM}`,
      background: tokens.colorNeutralBackground3,
      borderRadius: tokens.borderRadiusLarge,
      marginBottom: tokens.spacingHorizontalM,
    }}>
      <Globe20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
      <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
        {PRICE_AREAS[0].description}
      </Text>
      <Switch
        checked={isDK2}
        onChange={(_, data) => {
          setPriceArea(data.checked ? 'DK2' : 'DK1');
        }}
        style={{ margin: `0 ${tokens.spacingHorizontalXS}` }}
      />
      <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
        {PRICE_AREAS[1].description}
      </Text>
      <Text
        size={200}
        weight="semibold"
        style={{ color: tokens.colorBrandForeground1, marginLeft: 'auto' }}
      >
        {currentArea.label}
      </Text>
    </div>
  );
};
