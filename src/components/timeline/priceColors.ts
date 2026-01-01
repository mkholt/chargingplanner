import { tokens } from '@fluentui/react-components';

export function getPriceColor(price: number, min: number, max: number): string {
  const range = max - min;
  if (range === 0) return tokens.colorPaletteYellowBorder1;

  const normalized = (price - min) / range;

  if (normalized < 0.33) {
    return tokens.colorPaletteGreenBorder1;
  } else if (normalized < 0.66) {
    return tokens.colorPaletteYellowBorder1;
  } else {
    return tokens.colorPaletteRedBorder1;
  }
}
