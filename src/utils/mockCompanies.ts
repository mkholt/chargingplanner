import type { PriceArea } from '@/types';

// Extended company type with ID (API doesn't have ID, we generate from name)
export type Company = {
  id: string;
  name: string;
  products: Product[];
};

export type Product = {
  id: string;
  name: string;
  surcharge: number; // kr/kWh added to spot price
  subscriptionMonthly: number; // Monthly fee in kr
  isGreen: boolean;
};

// Mock companies for DK1 (West Denmark - Jutland/Funen)
const companiesDK1: Company[] = [
  {
    id: 'nrgi',
    name: 'NRGi',
    products: [
      { id: 'nrgi_spot', name: 'Spot', surcharge: 0.03, subscriptionMonthly: 23, isGreen: false },
      { id: 'nrgi_groen', name: 'Grøn Spot', surcharge: 0.05, subscriptionMonthly: 23, isGreen: true },
    ],
  },
  {
    id: 'norlys',
    name: 'Norlys',
    products: [
      { id: 'norlys_flex', name: 'Flex', surcharge: 0.029, subscriptionMonthly: 29, isGreen: false },
      { id: 'norlys_groen', name: 'Grøn Flex', surcharge: 0.049, subscriptionMonthly: 29, isGreen: true },
    ],
  },
  {
    id: 'ewii',
    name: 'EWII',
    products: [
      { id: 'ewii_variabel', name: 'Variabel', surcharge: 0.025, subscriptionMonthly: 19, isGreen: false },
      { id: 'ewii_klima', name: 'Klima+', surcharge: 0.045, subscriptionMonthly: 19, isGreen: true },
    ],
  },
  {
    id: 'ok',
    name: 'OK',
    products: [
      { id: 'ok_el', name: 'OK El', surcharge: 0.035, subscriptionMonthly: 25, isGreen: false },
    ],
  },
  {
    id: 'vindstoed',
    name: 'Vindstød',
    products: [
      { id: 'vindstoed_spot', name: 'Spot', surcharge: 0.01, subscriptionMonthly: 39, isGreen: true },
    ],
  },
];

// Mock companies for DK2 (East Denmark - Zealand/Bornholm)
const companiesDK2: Company[] = [
  {
    id: 'andel_energi',
    name: 'Andel Energi',
    products: [
      { id: 'andel_spot', name: 'Spot', surcharge: 0.032, subscriptionMonthly: 25, isGreen: false },
      { id: 'andel_groen', name: 'Grøn Strøm', surcharge: 0.052, subscriptionMonthly: 25, isGreen: true },
    ],
  },
  {
    id: 'ørsted',
    name: 'Ørsted',
    products: [
      { id: 'oersted_variabel', name: 'Variabel El', surcharge: 0.039, subscriptionMonthly: 29, isGreen: false },
      { id: 'oersted_groen', name: 'Grøn El', surcharge: 0.059, subscriptionMonthly: 29, isGreen: true },
    ],
  },
  {
    id: 'clever',
    name: 'Clever',
    products: [
      { id: 'clever_home', name: 'Home', surcharge: 0.028, subscriptionMonthly: 35, isGreen: true },
    ],
  },
  {
    id: 'nrgi',
    name: 'NRGi',
    products: [
      { id: 'nrgi_spot_dk2', name: 'Spot', surcharge: 0.03, subscriptionMonthly: 23, isGreen: false },
      { id: 'nrgi_groen_dk2', name: 'Grøn Spot', surcharge: 0.05, subscriptionMonthly: 23, isGreen: true },
    ],
  },
  {
    id: 'vindstoed',
    name: 'Vindstød',
    products: [
      { id: 'vindstoed_spot_dk2', name: 'Spot', surcharge: 0.01, subscriptionMonthly: 39, isGreen: true },
    ],
  },
];

/**
 * Get mock companies for a price area.
 */
export function getMockCompanies(priceArea: PriceArea): Company[] {
  return priceArea === 'DK1' ? companiesDK1 : companiesDK2;
}

/**
 * Find a company by ID within a price area.
 */
export function findCompanyById(priceArea: PriceArea, companyId: string): Company | undefined {
  return getMockCompanies(priceArea).find(c => c.id === companyId);
}

/**
 * Find a product by ID within a price area.
 */
export function findProductById(priceArea: PriceArea, productId: string): Product | undefined {
  for (const company of getMockCompanies(priceArea)) {
    const product = company.products.find(p => p.id === productId);
    if (product) return product;
  }
  return undefined;
}
