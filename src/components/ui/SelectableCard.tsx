import React from 'react';

import { Card, tokens } from '@fluentui/react-components';

type Props = {
  isSelected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Use 'add' variant for dashed border add card */
  variant?: 'default' | 'add';
  /** Horizontal flex layout (row) vs vertical (column) */
  horizontal?: boolean;
  /** Center content (for add variant) */
  centered?: boolean;
  /** Flex basis for responsive sizing */
  flexBasis?: number;
  /** Gap between children */
  gap?: number | string;
  /** Additional padding */
  padding?: number | string;
  'data-testid'?: string;
  style?: React.CSSProperties;
};

export const SelectableCard: React.FC<Props> = ({
  isSelected = false,
  onClick,
  children,
  variant = 'default',
  horizontal = false,
  centered = false,
  flexBasis = 200,
  gap = tokens.spacingHorizontalXS,
  padding = tokens.spacingHorizontalL,
  'data-testid': dataTestId,
  style,
}) => {
  const isAdd = variant === 'add';

  const background = isAdd
    ? 'transparent'
    : isSelected
      ? tokens.colorBrandBackground2
      : tokens.colorNeutralBackground3;

  const border = isAdd
    ? `2px dashed ${tokens.colorNeutralStroke1}`
    : isSelected
      ? `2px solid ${tokens.colorBrandStroke1}`
      : `1px solid ${tokens.colorNeutralStroke1}`;

  return (
    <Card
      onClick={onClick}
      data-testid={dataTestId}
      style={{
        flex: `1 1 ${flexBasis}px`,
        maxWidth: '100%',
        background,
        border,
        borderRadius: tokens.borderRadiusLarge,
        padding,
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: centered ? 'center' : horizontal ? 'flex-start' : undefined,
        justifyContent: centered ? 'center' : undefined,
        gap,
        cursor: 'pointer',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </Card>
  );
};
