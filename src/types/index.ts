export type { paths } from './stromligning';

// Extract the prices endpoint response type
import type { paths } from './stromligning';

// Response type from GET /api/prices
export type PricesApiResponse = NonNullable<
  paths['/api/prices']['get']['responses']['200']['content']['application/json']
>;

// Individual price entry from the prices array
export type PriceEntry = NonNullable<PricesApiResponse['prices']>[number];

// Price breakdown object
export type PriceBreakdown = NonNullable<PriceEntry['price']>;
