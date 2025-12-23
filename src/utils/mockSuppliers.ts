import type { PriceArea } from '@/types';

// Extended supplier type with postal code ranges
export type Supplier = {
  id: string;
  name: string;
  companyName: string;
  priceArea: PriceArea;
  postalCodeRanges: Array<{ min: number; max: number }>;
};

// Mock Danish grid operators (netselskaber/DSOs)
const suppliers: Supplier[] = [
  // DK2 - East Denmark (Zealand, Copenhagen, Bornholm)
  {
    id: 'radius_c',
    name: 'Radius',
    companyName: 'Radius Elnet A/S',
    priceArea: 'DK2',
    postalCodeRanges: [
      { min: 1000, max: 2999 }, // Copenhagen
      { min: 3000, max: 3699 }, // North Zealand
    ],
  },
  {
    id: 'cerius_c',
    name: 'Cerius',
    companyName: 'Cerius A/S',
    priceArea: 'DK2',
    postalCodeRanges: [
      { min: 4000, max: 4999 }, // South Zealand
    ],
  },
  {
    id: 'vores_elnet_c',
    name: 'Vores Elnet',
    companyName: 'Vores Elnet A/S',
    priceArea: 'DK2',
    postalCodeRanges: [
      { min: 3700, max: 3799 }, // Rønne/Bornholm area
    ],
  },

  // DK1 - West Denmark (Jutland, Funen)
  {
    id: 'n1_c',
    name: 'N1',
    companyName: 'N1 A/S',
    priceArea: 'DK1',
    postalCodeRanges: [
      { min: 9000, max: 9999 }, // North Jutland
    ],
  },
  {
    id: 'norlys_c',
    name: 'Norlys',
    companyName: 'Norlys Net A/S',
    priceArea: 'DK1',
    postalCodeRanges: [
      { min: 7000, max: 7999 }, // Mid-West Jutland
      { min: 8000, max: 8999 }, // East Jutland / Aarhus area
    ],
  },
  {
    id: 'trefor_c',
    name: 'TREFOR',
    companyName: 'TREFOR El-net A/S',
    priceArea: 'DK1',
    postalCodeRanges: [
      { min: 6000, max: 6999 }, // South Jutland
    ],
  },
  {
    id: 'flow_c',
    name: 'Flow',
    companyName: 'Flow Elnet A/S',
    priceArea: 'DK1',
    postalCodeRanges: [
      { min: 5000, max: 5999 }, // Funen
    ],
  },
];

/**
 * Get all mock suppliers.
 */
export function getMockSuppliers(): Supplier[] {
  return suppliers;
}

/**
 * Get suppliers for a specific price area.
 */
export function getSuppliersByPriceArea(priceArea: PriceArea): Supplier[] {
  return suppliers.filter(s => s.priceArea === priceArea);
}

/**
 * Find supplier by postal code.
 * Returns the first matching supplier or undefined.
 */
export function findSupplierByPostalCode(postalCode: number): Supplier | undefined {
  return suppliers.find(supplier =>
    supplier.postalCodeRanges.some(
      range => postalCode >= range.min && postalCode <= range.max
    )
  );
}

/**
 * Find supplier by ID.
 */
export function findSupplierById(supplierId: string): Supplier | undefined {
  return suppliers.find(s => s.id === supplierId);
}

/**
 * Validate if a postal code is a valid Danish postal code.
 */
export function isValidPostalCode(postalCode: number): boolean {
  return postalCode >= 1000 && postalCode <= 9999;
}
