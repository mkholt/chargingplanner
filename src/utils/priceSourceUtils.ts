import type { TFunction } from 'i18next';

import type { ResolvedPriceSettings } from '@/contexts';

/**
 * Build a display string for the price source based on settings.
 * Returns company+product name, supplier name, or price area.
 */
export function getPriceSourceString(
  priceSettings: ResolvedPriceSettings,
  t: TFunction
): string {
  const { company, product, supplier, priceArea, priceAreaSource } = priceSettings;

  if (company && product) {
    return `${company.name} - ${product.name}`;
  }
  if (supplier) {
    return `${supplier.name} (${priceArea})`;
  }
  return priceAreaSource === 'manual'
    ? t('results.spotPrice', { area: priceArea })
    : priceArea;
}
