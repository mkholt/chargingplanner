import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

type Variant = 'error' | 'warning' | 'info';

type Props = {
  variant: Variant;
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  'data-testid'?: string;
  style?: React.CSSProperties;
};

const variantStyles: Record<Variant, {
  background: string;
  border: string;
  foreground: string;
}> = {
  error: {
    background: tokens.colorPaletteRedBackground1,
    border: tokens.colorPaletteRedBorder1,
    foreground: tokens.colorPaletteRedForeground1,
  },
  warning: {
    background: tokens.colorPaletteYellowBackground1,
    border: tokens.colorPaletteYellowBorder1,
    foreground: tokens.colorPaletteYellowForeground1,
  },
  info: {
    background: tokens.colorPaletteBlueBackground2,
    border: tokens.colorPaletteBlueBackground2,
    foreground: tokens.colorPaletteBlueForeground2,
  },
};

export const AlertBox: React.FC<Props> = ({
  variant,
  icon,
  title,
  children,
  action,
  'data-testid': dataTestId,
  style,
}) => {
  const colors = variantStyles[variant];

  return (
    <div
      data-testid={dataTestId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: action ? 12 : undefined,
        padding: title ? 16 : 12,
        background: colors.background,
        borderRadius: 6,
        border: `1px solid ${colors.border}`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {icon && (
          <span style={{ color: colors.foreground, flexShrink: 0, display: 'flex' }}>
            {icon}
          </span>
        )}
        <div>
          {title && (
            <Text weight="semibold" style={{ color: colors.foreground, display: 'block' }}>
              {title}
            </Text>
          )}
          <Text size={title ? 200 : undefined} style={{ color: colors.foreground }}>
            {children}
          </Text>
        </div>
      </div>
      {action}
    </div>
  );
};
