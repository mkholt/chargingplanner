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

export function getDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }
}
