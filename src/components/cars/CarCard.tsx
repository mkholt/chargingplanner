import React from 'react';

import {
  Button,
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';

import type { Car } from '@/hooks';

type Props = {
  car: Car;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export const CarCard: React.FC<Props> = ({
  car,
  isSelected,
  onSelect,
  onDelete,
}) => {
  return (
    <Card
      onClick={onSelect}
      style={{
        flex: '1 1 200px',
        maxWidth: '100%',
        background: isSelected ? tokens.colorBrandBackground2 : tokens.colorNeutralBackground3,
        border: isSelected
          ? `2px solid ${tokens.colorBrandStroke1}`
          : `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Button
        size="small"
        appearance="subtle"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          minWidth: 24,
          minHeight: 24,
          padding: 0,
        }}
        icon={<Delete24Regular />}
        aria-label="Delete car"
      />
      <div style={{ fontWeight: 600, fontSize: 15, color: tokens.colorNeutralForeground1 }}>
        {car.name}
      </div>
      <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
        {car.batterySize} kWh • {car.maxPower} kW
      </Text>
    </Card>
  );
};
