import { useQuery } from '@tanstack/react-query';

import { fetchSuppliers, findSupplier } from '@/api';
import type { Supplier } from '@/data';
import {
  getMockSuppliers,
  findSupplierByPostalCode as findSupplierByPostalCodeMock,
} from '@/test/mocks/mockSuppliers';
import type { PriceArea, SuppliersApiResponse, SuppliersFindApiResponse } from '@/types';
import { QUERY_TIMING, USE_MOCK_API } from '@/utils';

// Query key factory for suppliers
// All suppliers have no dependencies
// Finding by postal code depends on the postal code
export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  list: () => ['suppliers', 'list'] as const,
  find: (postalCode: number) => ['suppliers', 'find', { postalCode }] as const,
};

/**
 * Map API response to our internal Supplier type.
 */
function mapApiSuppliers(apiSuppliers: SuppliersApiResponse): Supplier[] {
  return apiSuppliers.map(s => ({
    id: s.id ?? 'unknown',
    name: s.name ?? 'Unknown',
    companyName: s.companyName ?? 'Unknown',
    priceArea: (s.priceArea as PriceArea) ?? 'DK1',
  }));
}

/**
 * Map API find response to Supplier array.
 * A postal code can have multiple grid operators.
 */
function mapApiFindSuppliers(apiResult: SuppliersFindApiResponse): Supplier[] {
  if (!apiResult) return [];
  return apiResult.map(s => ({
    id: s.id ?? 'unknown',
    name: s.name ?? 'Unknown',
    companyName: s.companyName ?? 'Unknown',
    priceArea: (s.priceArea as PriceArea) ?? 'DK1',
  }));
}

/**
 * Fetch all suppliers.
 * Suppliers rarely change, so we cache aggressively.
 * @param enabled - Whether to enable the query (default: true)
 */
export function useSuppliersQuery(enabled = true) {
  return useQuery({
    queryKey: supplierQueryKeys.list(),
    queryFn: async (): Promise<Supplier[]> => {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return getMockSuppliers();
      }
      const apiResponse = await fetchSuppliers();
      return mapApiSuppliers(apiResponse ?? []);
    },
    enabled,
    staleTime: QUERY_TIMING.static.staleTime,
    gcTime: QUERY_TIMING.static.gcTime,
  });
}

/**
 * Find suppliers by postal code.
 * Returns an array since a postal code can have multiple grid operators.
 * Result is cached per postal code.
 */
export function useSuppliersByPostalCodeQuery(postalCode: number | null) {
  return useQuery({
    queryKey: supplierQueryKeys.find(postalCode ?? 0),
    queryFn: async (): Promise<Supplier[]> => {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const found = findSupplierByPostalCodeMock(postalCode!);
        // Mock returns single supplier, wrap in array for consistency
        return found ? [found] : [];
      }
      const result = await findSupplier({ postalCode: postalCode! });
      return mapApiFindSuppliers(result ?? []);
    },
    enabled: postalCode !== null && postalCode >= 1000 && postalCode <= 9999,
    staleTime: QUERY_TIMING.static.staleTime,
    gcTime: QUERY_TIMING.static.gcTime,
  });
}
