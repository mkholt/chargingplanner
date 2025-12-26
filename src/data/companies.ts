// Company and Product types
export type Product = {
  id: string;
  name: string;
  surcharge: number; // kr/kWh added to spot price
  subscriptionMonthly: number; // Monthly fee in kr
  isGreen: boolean;
};

export type Company = {
  id: string;
  name: string;
  products: Product[];
};

/**
 * Find a company by ID within a list of companies.
 */
export function findCompanyById(companies: Company[], companyId: string): Company | undefined {
  return companies.find(c => c.id === companyId);
}

/**
 * Find a product by ID within a list of companies.
 */
export function findProductById(companies: Company[], productId: string): Product | undefined {
  for (const company of companies) {
    const product = company.products.find(p => p.id === productId);
    if (product) return product;
  }
  return undefined;
}
