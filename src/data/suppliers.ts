import type { PriceArea } from '@/types';

// Supplier type (grid operators / DSOs)
export type Supplier = {
  id: string;
  name: string;
  companyName: string;
  priceArea: PriceArea;
  postalCodeRanges?: Array<{ min: number; max: number }>;
};

/**
 * Find supplier by ID within a list of suppliers.
 */
export function findSupplierById(suppliers: Supplier[], supplierId: string): Supplier | undefined {
  return suppliers.find(s => s.id === supplierId);
}

/**
 * Get suppliers for a specific price area.
 */
export function getSuppliersByPriceArea(suppliers: Supplier[], priceArea: PriceArea): Supplier[] {
  return suppliers.filter(s => s.priceArea === priceArea);
}

/**
 * Validate if a postal code is a valid Danish postal code.
 */
export function isValidPostalCode(postalCode: number): boolean {
  return postalCode >= 1000 && postalCode <= 9999;
}
