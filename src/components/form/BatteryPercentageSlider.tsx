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
  snapPoint?: number;
  snapRange?: number;
  escapeDistance?: number;
};

export const BatteryPercentageSlider: React.FC<Props> = ({
  value,
  onChange,
  snapPoint,
  snapRange = 3,
  escapeDistance = 7,
}) => {
  const sliderStyles = useSliderStyles();

  const handleSliderChange = (newValue: number) => {
    if (snapPoint === undefined) {
      onChange(newValue, true);
      return;
    }

    // If currently snapped, require dragging far enough to break free
    if (value === snapPoint) {
      if (Math.abs(newValue - snapPoint) >= escapeDistance) {
        onChange(newValue, true);
      }
      return;
    }

    // If approaching snap point, snap to it
    if (Math.abs(newValue - snapPoint) <= snapRange) {
      onChange(snapPoint, true);
    } else {
      onChange(newValue, true);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Slider
        min={0}
        max={100}
        value={value}
        onChange={(_ev, data) => handleSliderChange(data.value)}
        className={getSliderClass(value, sliderStyles)}
        style={{ flex: 1 }}
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={String(value)}
        onChange={(_ev, data) => onChange(Number(data.value), false)}
        style={{ width: 70 }}
      />
    </div>
  );
};
