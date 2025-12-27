import React from 'react';

import { Card, Text, tokens } from '@fluentui/react-components';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
};

export const SelectionCard: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  isSelected,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      style={{
        flex: '1 1 180px',
        maxWidth: '100%',
        background: isSelected ? tokens.colorBrandBackground2 : tokens.colorNeutralBackground3,
        border: isSelected
          ? `2px solid ${tokens.colorBrandStroke1}`
          : `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        cursor: 'pointer',
      }}
    >
      {icon && (
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          weight="semibold"
          style={{
            display: 'block',
            color: tokens.colorNeutralForeground1,
            fontSize: 14,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            size={200}
            style={{
              display: 'block',
              color: tokens.colorNeutralForeground2,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </div>
    </Card>
  );
};
