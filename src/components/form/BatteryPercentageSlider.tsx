import React from 'react';

import {
  Input,
  makeStyles,
  Slider,
  tokens,
} from '@fluentui/react-components';

const useSliderStyles = makeStyles({
  red: {
    '& .fui-Slider__rail::before': {
      backgroundColor: tokens.colorPaletteRedBorder1,
    },
    '& .fui-Slider__thumb': {
      backgroundColor: tokens.colorPaletteRedBorder1,
    },
  },
  yellow: {
    '& .fui-Slider__rail::before': {
      backgroundColor: tokens.colorPaletteYellowBorder1,
    },
    '& .fui-Slider__thumb': {
      backgroundColor: tokens.colorPaletteYellowBorder1,
    },
  },
  green: {
    '& .fui-Slider__rail::before': {
      backgroundColor: tokens.colorPaletteGreenBorder1,
    },
    '& .fui-Slider__thumb': {
      backgroundColor: tokens.colorPaletteGreenBorder1,
    },
  },
});

function getSliderClass(value: number, styles: ReturnType<typeof useSliderStyles>): string {
  if (value < 20) return styles.red;
  if (value > 80) return styles.yellow;
  return styles.green;
}

type Props = {
  value: number;
  onChange: (value: number, fromSlider?: boolean) => void;
  min?: number;
  max?: number;
  snapPoint?: number;
  snapRange?: number;
  escapeDistance?: number;
  'data-testid'?: string;
};

export const BatteryPercentageSlider: React.FC<Props> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  snapPoint,
  snapRange = 3,
  escapeDistance = 7,
  'data-testid': testId,
}) => {
  const sliderStyles = useSliderStyles();

  const handleSliderChange = (newValue: number) => {
    // Clamp to min/max bounds
    const clampedValue = Math.max(min, Math.min(max, newValue));

    if (snapPoint === undefined) {
      onChange(clampedValue, true);
      return;
    }

    // If currently snapped, require dragging far enough to break free
    if (value === snapPoint) {
      if (Math.abs(clampedValue - snapPoint) >= escapeDistance) {
        onChange(clampedValue, true);
      }
      return;
    }

    // If approaching snap point, snap to it
    if (Math.abs(clampedValue - snapPoint) <= snapRange) {
      onChange(snapPoint, true);
    } else {
      onChange(clampedValue, true);
    }
  };

  const handleInputChange = (newValue: number) => {
    // Clamp to min/max bounds
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange(clampedValue, false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
      <Input
        type="number"
        min={min}
        max={max}
        value={String(value)}
        onChange={(_ev, data) => handleInputChange(Number(data.value))}
        data-testid={testId}
        style={{ width: 70 }}
      />
      <Slider
        min={min}
        max={max}
        value={value}
        onChange={(_ev, data) => handleSliderChange(data.value)}
        className={getSliderClass(value, sliderStyles)}
        style={{ flex: 1 }}
      />
    </div>
  );
};
