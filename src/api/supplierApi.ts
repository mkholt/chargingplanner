import { apiClient } from './client';

export type FindSupplierParams = {
  postalCode?: number;
  lat?: number;
  long?: number;
};

/**
 * Find suppliers by postal code or coordinates.
 */
export async function findSupplier(params: FindSupplierParams) {
  const { data, error } = await apiClient.GET('/api/suppliers/find', {
    params: {
      query: params,
    },
  });

  if (error) {
    throw new Error(`Failed to find supplier: ${JSON.stringify(error)}`);
  }

  return data;
}
