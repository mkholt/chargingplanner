import { renderHook, waitFor } from '@testing-library/react';

import { useCompaniesQuery, companyQueryKeys } from '@/hooks/useCompaniesQuery';
import { createQueryWrapper } from '@/test/utils/testUtils';

describe('useCompaniesQuery', () => {
  describe('query behavior', () => {
    it('fetches companies for DK1 region', async () => {
      const { result } = renderHook(
        () => useCompaniesQuery('DK1'),
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('fetches companies for DK2 region', async () => {
      const { result } = renderHook(
        () => useCompaniesQuery('DK2'),
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('is disabled when priceArea is null', () => {
      const { result } = renderHook(
        () => useCompaniesQuery(null),
        { wrapper: createQueryWrapper() }
      );

      // Query should not be fetching when disabled
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('data mapping', () => {
    it('maps API response to Company type with correct structure', async () => {
      const { result } = renderHook(
        () => useCompaniesQuery('DK1'),
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const companies = result.current.data;
      expect(companies).toBeDefined();
      expect(companies!.length).toBeGreaterThan(0);

      // Check structure of first company
      const company = companies![0];
      expect(company).toHaveProperty('id');
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('products');
      expect(typeof company.id).toBe('string');
      expect(typeof company.name).toBe('string');
      expect(Array.isArray(company.products)).toBe(true);
    });

    it('maps products with correct structure', async () => {
      const { result } = renderHook(
        () => useCompaniesQuery('DK1'),
        { wrapper: createQueryWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const companies = result.current.data!;
      const companyWithProducts = companies.find(c => c.products.length > 0);

      if (companyWithProducts) {
        const product = companyWithProducts.products[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('surcharge');
        expect(product).toHaveProperty('subscriptionMonthly');
        expect(product).toHaveProperty('isGreen');
        expect(typeof product.id).toBe('string');
        expect(typeof product.name).toBe('string');
        expect(typeof product.surcharge).toBe('number');
        expect(typeof product.subscriptionMonthly).toBe('number');
        expect(typeof product.isGreen).toBe('boolean');
      }
    });
  });

  describe('query keys', () => {
    it('generates correct query key for all companies', () => {
      expect(companyQueryKeys.all).toEqual(['companies']);
    });

    it('generates correct query key by region', () => {
      expect(companyQueryKeys.byRegion('DK1')).toEqual(['companies', { region: 'DK1' }]);
      expect(companyQueryKeys.byRegion('DK2')).toEqual(['companies', { region: 'DK2' }]);
    });
  });
});
