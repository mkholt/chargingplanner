export type { paths } from './stromligning';

import type { paths } from './stromligning';

// =============================================================================
// Prices API Types
// =============================================================================

// Response type from GET /api/prices
export type PricesApiResponse = NonNullable<
  paths['/api/prices']['get']['responses']['200']['content']['application/json']
>;

// Individual price entry from the prices array
export type PriceEntry = NonNullable<PricesApiResponse['prices']>[number];

// Price breakdown object
export type PriceBreakdown = NonNullable<PriceEntry['price']>;

// =============================================================================
// Companies API Types
// =============================================================================

// Response type from GET /api/companies (array of companies)
export type CompaniesApiResponse = NonNullable<
  paths['/api/companies']['get']['responses']['200']['content']['application/json']
>;

// Individual company from the response
export type CompanyEntry = CompaniesApiResponse[number];

// Product within a company
export type ProductEntry = NonNullable<CompanyEntry['products']>[number];

// =============================================================================
// Suppliers API Types
// =============================================================================

// Response type from GET /api/suppliers (array of suppliers)
export type SuppliersApiResponse = NonNullable<
  paths['/api/suppliers']['get']['responses']['200']['content']['application/json']
>;

// Individual supplier from the response
export type SupplierEntry = SuppliersApiResponse[number];

// Customer group within a supplier
export type CustomerGroupEntry = NonNullable<SupplierEntry['customerGroups']>[number];

// Response type from GET /api/suppliers/find
export type SuppliersFindApiResponse = NonNullable<
  paths['/api/suppliers/find']['get']['responses']['200']['content']['application/json']
>;

// Price area type (DK1 = West, DK2 = East of Storebælt)
export type PriceArea = 'DK1' | 'DK2';
