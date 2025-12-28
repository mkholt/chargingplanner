import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { usePricesQuery, priceQueryKeys } from '@/hooks/usePricesQuery';
import { PriceSettingsProvider } from '@/contexts/PriceSettingsContext';
import { createTestQueryClient } from '@/test/utils/testUtils';
import { stubLocalStorage } from '@/test/utils/testUtils';

// Mock the dependent hooks used by PriceSettingsContext
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return {
    ...actual,
    useSuppliersQuery: vi.fn(() => ({ data: [], isLoading: false })),
    useSuppliersByLocationQuery: vi.fn(() => ({ data: [], isLoading: false })),
    useCompaniesQuery: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

describe('usePricesQuery', () => {
  let queryClient: QueryClient;
  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    localStorageStore = {};
    stubLocalStorage(localStorageStore);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PriceSettingsProvider>{children}</PriceSettingsProvider>
    </QueryClientProvider>
  );

  describe('price fetching', () => {
    it('fetches prices with default settings', async () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.data).toBeDefined();
    });

    it('returns isMocked flag based on environment', async () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // In test environment with MSW, this should be based on USE_MOCK_API
      expect(typeof result.current.data?.isMocked).toBe('boolean');
    });

    it('includes price data in response', async () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const data = result.current.data?.data;
      expect(data).toBeDefined();
      expect(data).toHaveProperty('prices');
    });
  });

  describe('refresh functionality', () => {
    it('provides a refresh function', async () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.refresh).toBe('function');
    });

    it('refresh invalidates price queries', async () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Track invalidation
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.refresh();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: priceQueryKeys.all,
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('query state', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);
    });

    it('transitions to success state', async () => {
      const { result } = renderHook(() => usePricesQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('priceQueryKeys', () => {
  it('generates correct key for all prices', () => {
    expect(priceQueryKeys.all).toEqual(['prices']);
  });

  it('generates correct key with params', () => {
    const params = {
      priceArea: 'DK1' as const,
      from: '2024-01-01',
    };
    expect(priceQueryKeys.byParams(params)).toEqual(['prices', params]);
  });

  it('generates correct key with all params', () => {
    const params = {
      priceArea: undefined,
      supplierId: 'supplier-1',
      productId: 'product-1',
      from: '2024-01-01',
      aggregation: '1h' as const,
      aggregationMethod: 'mean' as const,
    };
    expect(priceQueryKeys.byParams(params)).toEqual(['prices', params]);
  });
});
