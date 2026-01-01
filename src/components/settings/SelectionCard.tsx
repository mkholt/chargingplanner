import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

import { SelectableCard, Stack } from '@/components/ui';

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
    <SelectableCard
      isSelected={isSelected}
      onClick={onClick}
      horizontal
      flexBasis={180}
      gap={8}
      padding={12}
    >
      {icon && (
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {icon}
        </div>
      )}
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
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
            }}
          >
            {subtitle}
          </Text>
        )}
      </Stack>
    </SelectableCard>
  );
};
