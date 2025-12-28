import { renderHook, waitFor } from '@testing-library/react';

import {
  useSuppliersByLocationQuery,
  supplierQueryKeys,
  isCoordinates,
  isPostalCode,
  type Location,
  type Coordinates,
} from '@/hooks/useSuppliersQuery';
import { createQueryWrapper } from '@/test/utils/testUtils';

describe('useSuppliersByLocationQuery', () => {
  describe('postal code lookup', () => {
    it('finds supplier by postal code', async () => {
      const { result } = renderHook(
        () => useSuppliersByLocationQuery(8000), // Aarhus
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('returns error for unknown postal code', async () => {
      // 3800 is not covered by any mock supplier (gap between 3799 and 4000)
      // The API returns a "not found" error for unknown postal codes
      const { result } = renderHook(
        () => useSuppliersByLocationQuery(3800),
        { wrapper: createQueryWrapper() }
      );

      // Wait for fetching to complete
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Should have an error for unknown postal code
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });

    it('is disabled for invalid postal codes', () => {
      const { result } = renderHook(
        () => useSuppliersByLocationQuery(999), // Too short
        { wrapper: createQueryWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('GPS coordinates lookup', () => {
    it('finds supplier by GPS coordinates (DK1 - west)', async () => {
      const coordinates: Coordinates = { lat: 56.16, long: 10.20 }; // Aarhus area
      const { result } = renderHook(
        () => useSuppliersByLocationQuery(coordinates),
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data!.length).toBeGreaterThan(0);
      expect(result.current.data![0].priceArea).toBe('DK1');
    });

    it('finds supplier by GPS coordinates (DK2 - east)', async () => {
      const coordinates: Coordinates = { lat: 55.68, long: 12.57 }; // Copenhagen area
      const { result } = renderHook(
        () => useSuppliersByLocationQuery(coordinates),
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data!.length).toBeGreaterThan(0);
      expect(result.current.data![0].priceArea).toBe('DK2');
    });
  });

  describe('null location', () => {
    it('is disabled when location is null', () => {
      const { result } = renderHook(
        () => useSuppliersByLocationQuery(null),
        { wrapper: createQueryWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});

describe('type guards', () => {
  describe('isCoordinates', () => {
    it('returns true for valid coordinates', () => {
      const coords: Location = { lat: 55.6761, long: 12.5683 };
      expect(isCoordinates(coords)).toBe(true);
    });

    it('returns false for postal code', () => {
      const postalCode: Location = 8000;
      expect(isCoordinates(postalCode)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isCoordinates(null)).toBe(false);
    });
  });

  describe('isPostalCode', () => {
    it('returns true for number', () => {
      const postalCode: Location = 8000;
      expect(isPostalCode(postalCode)).toBe(true);
    });

    it('returns false for coordinates', () => {
      const coords: Location = { lat: 55.6761, long: 12.5683 };
      expect(isPostalCode(coords)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPostalCode(null)).toBe(false);
    });
  });
});

describe('supplierQueryKeys', () => {
  it('generates correct key for all suppliers', () => {
    expect(supplierQueryKeys.all).toEqual(['suppliers']);
  });

  it('generates correct key for postal code location', () => {
    expect(supplierQueryKeys.findByLocation(8000)).toEqual([
      'suppliers',
      'find',
      { postalCode: 8000 },
    ]);
  });

  it('generates correct key for coordinates location', () => {
    expect(supplierQueryKeys.findByLocation({ lat: 55.6761, long: 12.5683 })).toEqual([
      'suppliers',
      'find',
      { lat: 55.6761, long: 12.5683 },
    ]);
  });

  it('generates correct key for null location', () => {
    expect(supplierQueryKeys.findByLocation(null)).toEqual([
      'suppliers',
      'find',
      null,
    ]);
  });
});
