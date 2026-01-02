import React from 'react';

import {
  Popover,
  PopoverSurface,
  PopoverTrigger,
  tokens,
} from '@fluentui/react-components';
import { Info12Regular } from '@fluentui/react-icons';

type Props = {
  /** The trigger content (displayed inline) */
  trigger: React.ReactNode;
  /** The popover content */
  children: React.ReactNode;
  /** Accessible label for the trigger */
  ariaLabel: string;
  /** Trigger text color (defaults to inherit) */
  color?: string;
  /** Trigger font size */
  fontSize?: number;
  /** Trigger font weight */
  fontWeight?: number;
};

export const InfoPopover: React.FC<Props> = ({
  trigger,
  children,
  ariaLabel,
  color = 'inherit',
  fontSize = 14,
  fontWeight = 600,
}) => {
  return (
    <Popover withArrow openOnHover>
      <PopoverTrigger disableButtonEnhancement>
        <button
          type="button"
          style={{
            fontSize,
            fontWeight,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: tokens.spacingHorizontalXS,
            background: 'none',
            border: 'none',
            padding: 0,
            color,
            font: 'inherit',
          }}
          aria-label={ariaLabel}
        >
          {trigger}
          <Info12Regular style={{ color: tokens.colorNeutralForeground2 }} />
        </button>
      </PopoverTrigger>
      <PopoverSurface>
        {children}
      </PopoverSurface>
    </Popover>
  );
};
