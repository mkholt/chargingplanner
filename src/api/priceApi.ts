import { apiClient } from './client';

export type FetchPricesParams = {
  priceArea?: string;
  supplierId?: string;
  productId?: string;
  customerGroupId?: string;
  from?: string;
  to?: string;
  aggregation?: '1h';
  aggregationMethod?: 'mean' | 'min' | 'max';
  lean?: boolean;
  forecast?: boolean;
};

/**
 * Fetch electricity prices from the stromligning API.
 * Returns prices for the specified date range and settings.
 */
export async function fetchPrices(params: FetchPricesParams = {}) {
  const { data, error } = await apiClient.GET('/api/prices', {
    params: {
      query: params,
    },
  });

  if (error) {
    throw new Error(`Failed to fetch prices: ${JSON.stringify(error)}`);
  }

  return data;
}

