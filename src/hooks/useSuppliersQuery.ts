import { useQuery } from '@tanstack/react-query';

import { fetchSuppliers, findSupplier } from '@/api';
import type { Supplier } from '@/data';
import {
  getMockSuppliers,
  findSupplierByPostalCode as findSupplierByPostalCodeMock,
} from '@/test/mocks/mockSuppliers';
import type { PriceArea, SuppliersApiResponse, SuppliersFindApiResponse } from '@/types';
import { QUERY_TIMING, USE_MOCK_API } from '@/utils';

// ============ Types ============

/** GPS coordinates */
export type Coordinates = { lat: number; long: number };

/** Location can be a postal code (number), GPS coordinates, or null (not set) */
export type Location = number | Coordinates | null;

/** Type guard: check if location is GPS coordinates */
export function isCoordinates(location: Location): location is Coordinates {
  return location !== null && typeof location === 'object' && 'lat' in location && 'long' in location;
}

/** Type guard: check if location is a postal code */
export function isPostalCode(location: Location): location is number {
  return typeof location === 'number';
}

// ============ Query Keys ============

// Query key factory for suppliers
// All suppliers have no dependencies
// Finding by location depends on those values
export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  list: () => ['suppliers', 'list'] as const,
  findByLocation: (location: Location) => {
    if (isCoordinates(location)) {
      return ['suppliers', 'find', { lat: location.lat, long: location.long }] as const;
    }
    if (isPostalCode(location)) {
      return ['suppliers', 'find', { postalCode: location }] as const;
    }
    return ['suppliers', 'find', null] as const;
  },
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
 * Find suppliers by location (postal code or GPS coordinates).
 * Returns an array since a location can have multiple grid operators.
 * Result is cached per location.
 */
export function useSuppliersByLocationQuery(location: Location) {
  return useQuery({
    queryKey: supplierQueryKeys.findByLocation(location),
    queryFn: async (): Promise<Supplier[]> => {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (isPostalCode(location)) {
          const found = findSupplierByPostalCodeMock(location);
          return found ? [found] : [];
        }

        if (isCoordinates(location)) {
          // For mock, return a default supplier based on longitude (rough DK1/DK2 split)
          // East of ~12° longitude is DK2, west is DK1
          const isDK2 = location.long > 12;
          const mockSuppliers = getMockSuppliers();
          const found = mockSuppliers.find(s => s.priceArea === (isDK2 ? 'DK2' : 'DK1'));
          return found ? [found] : [];
        }

        return [];
      }

      // Real API call
      if (isPostalCode(location)) {
        const result = await findSupplier({ postalCode: location });
        return mapApiFindSuppliers(result ?? []);
      }

      if (isCoordinates(location)) {
        const result = await findSupplier({ lat: location.lat, long: location.long });
        return mapApiFindSuppliers(result ?? []);
      }

      return [];
    },
    enabled: location !== null && (isCoordinates(location) || (isPostalCode(location) && location >= 1000 && location <= 9999)),
    staleTime: QUERY_TIMING.static.staleTime,
    gcTime: QUERY_TIMING.static.gcTime,
  });
}
