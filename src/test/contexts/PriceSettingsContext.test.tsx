import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PriceSettingsProvider, usePriceSettings, type PriceSettings } from '@/contexts/PriceSettingsContext';
import { stubLocalStorage } from '@/test/utils/testUtils';

// Mock the hooks that PriceSettingsContext depends on
vi.mock('@/hooks', () => ({
  useSuppliersQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useSuppliersByPostalCodeQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCompaniesQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

describe('PriceSettingsContext', () => {
  let queryClient: QueryClient;
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    stubLocalStorage(localStorageStore);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PriceSettingsProvider>{children}</PriceSettingsProvider>
    </QueryClientProvider>
  );

  describe('initial state', () => {
    it('starts with default settings when localStorage is empty', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      expect(result.current.settings.postalCode).toBeNull();
      expect(result.current.settings.supplierId).toBeNull();
      expect(result.current.settings.companyId).toBeNull();
      expect(result.current.settings.productId).toBeNull();
      expect(result.current.settings.priceArea).toBe('DK1');
      expect(result.current.settings.aggregationSize).toBe('1h');
      expect(result.current.settings.aggregationMethod).toBe('mean');
    });

    it('loads settings from localStorage on init', () => {
      const savedSettings: PriceSettings = {
        postalCode: 8000,
        supplierId: 'supplier-1',
        companyId: null,
        productId: null,
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      };
      localStorageStore['ev-price-settings'] = JSON.stringify(savedSettings);

      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      expect(result.current.settings.postalCode).toBe(8000);
      expect(result.current.settings.priceArea).toBe('DK2');
      expect(result.current.settings.aggregationSize).toBe('15m');
    });
  });

  describe('setPostalCode', () => {
    it('updates postal code and clears dependent selections', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      // First set supplier/company/product
      act(() => {
        result.current.setSupplierId('supplier-1');
        result.current.setCompanyId('company-1');
        result.current.setProductId('product-1');
      });

      // Then change postal code
      act(() => {
        result.current.setPostalCode(8000);
      });

      expect(result.current.settings.postalCode).toBe(8000);
      expect(result.current.settings.supplierId).toBeNull();
      expect(result.current.settings.companyId).toBeNull();
      expect(result.current.settings.productId).toBeNull();
    });

    it('persists to localStorage', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setPostalCode(2100);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ev-price-settings',
        expect.stringContaining('2100')
      );
    });
  });

  describe('setSupplierId', () => {
    it('updates supplier ID and clears company/product when changed', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setCompanyId('company-1');
        result.current.setProductId('product-1');
      });

      act(() => {
        result.current.setSupplierId('new-supplier');
      });

      expect(result.current.settings.supplierId).toBe('new-supplier');
      expect(result.current.settings.companyId).toBeNull();
      expect(result.current.settings.productId).toBeNull();
    });
  });

  describe('setCompanyId', () => {
    it('updates company ID and clears product when changed', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setProductId('product-1');
      });

      act(() => {
        result.current.setCompanyId('new-company');
      });

      expect(result.current.settings.companyId).toBe('new-company');
      expect(result.current.settings.productId).toBeNull();
    });
  });

  describe('setProductId', () => {
    it('updates product ID', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setProductId('product-123');
      });

      expect(result.current.settings.productId).toBe('product-123');
    });
  });

  describe('setPriceArea', () => {
    it('updates price area', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setPriceArea('DK2');
      });

      expect(result.current.settings.priceArea).toBe('DK2');
    });
  });

  describe('setAggregationSize', () => {
    it('updates aggregation size', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setAggregationSize('15m');
      });

      expect(result.current.settings.aggregationSize).toBe('15m');
    });
  });

  describe('setAggregationMethod', () => {
    it('updates aggregation method', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setAggregationMethod('min');
      });

      expect(result.current.settings.aggregationMethod).toBe('min');
    });
  });

  describe('clearAll', () => {
    it('resets all settings to defaults', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      // Set some values
      act(() => {
        result.current.setPostalCode(8000);
        result.current.setPriceArea('DK2');
        result.current.setAggregationSize('15m');
      });

      // Clear all
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.settings.postalCode).toBeNull();
      expect(result.current.settings.priceArea).toBe('DK1');
      expect(result.current.settings.aggregationSize).toBe('1h');
    });
  });

  describe('applySettings', () => {
    it('applies complete settings object', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      const newSettings: PriceSettings = {
        postalCode: 5000,
        supplierId: 'sup-1',
        companyId: 'comp-1',
        productId: 'prod-1',
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      };

      act(() => {
        result.current.applySettings(newSettings);
      });

      expect(result.current.settings).toEqual(newSettings);
    });
  });

  describe('resolved settings', () => {
    it('provides resolved price area with correct source', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      // Without a supplier, price area comes from manual selection (default DK1)
      expect(result.current.resolved.priceArea).toBe('DK1');
      expect(result.current.resolved.priceAreaSource).toBe('manual');
    });

    it('provides aggregation settings in resolved', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setAggregationSize('15m');
        result.current.setAggregationMethod('max');
      });

      expect(result.current.resolved.aggregationSize).toBe('15m');
      expect(result.current.resolved.aggregationMethod).toBe('max');
    });
  });

  describe('error handling', () => {
    it('throws error when usePriceSettings is used outside provider', () => {
      // Need a separate wrapper without provider for this test
      const queryOnlyWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      expect(() => {
        renderHook(() => usePriceSettings(), { wrapper: queryOnlyWrapper });
      }).toThrow('usePriceSettings must be used within a PriceSettingsProvider');
    });
  });
});
