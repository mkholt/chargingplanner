
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PriceSettingsProvider, usePriceSettings, type PriceSettings } from '@/contexts/PriceSettingsContext';
import { stubLocalStorage } from '@/test/utils/testUtils';
import type { Company, Product, Supplier } from '@/data';

// Mock the hooks that PriceSettingsContext depends on
vi.mock('@/hooks', () => ({
  useSuppliersByLocationQuery: vi.fn(() => ({ data: [], isLoading: false, refetch: vi.fn() })),
  useCompaniesQuery: vi.fn(() => ({ data: [], isLoading: false, refetch: vi.fn() })),
}));

// Test fixtures
const mockSupplier: Supplier = {
  id: 'supplier-1',
  name: 'Test Supplier',
  companyName: 'Test Company',
  priceArea: 'DK1',
};

const mockProduct: Product = {
  id: 'product-1',
  name: 'Test Product',
  surcharge: 0.05,
  subscriptionMonthly: 39,
  isGreen: true,
};

const mockCompany: Company = {
  id: 'company-1',
  name: 'Test Company',
  products: [mockProduct],
};

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

      expect(result.current.settings.location).toBeNull();
      expect(result.current.settings.supplier).toBeNull();
      expect(result.current.settings.company).toBeNull();
      expect(result.current.settings.priceArea).toBe('DK1');
      expect(result.current.settings.aggregationSize).toBe('1h');
      expect(result.current.settings.aggregationMethod).toBe('mean');
    });

    it('loads settings from localStorage on init', () => {
      const savedSettings: PriceSettings = {
        location: 8000,
        supplier: mockSupplier,
        company: null,
        priceArea: 'DK2',
        aggregationSize: '15m',
        aggregationMethod: 'max',
      };
      localStorageStore['ev-price-settings'] = JSON.stringify(savedSettings);

      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      expect(result.current.settings.location).toBe(8000);
      expect(result.current.settings.priceArea).toBe('DK2');
      expect(result.current.settings.aggregationSize).toBe('15m');
    });
  });

  describe('setLocation', () => {
    it('updates location and clears dependent selections', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      // First set supplier/company/product
      act(() => {
        result.current.setSupplier(mockSupplier);
        result.current.setCompany(mockCompany);
        result.current.setProduct(mockProduct);
      });

      // Then change location (postal code)
      act(() => {
        result.current.setLocation(8000);
      });

      expect(result.current.settings.location).toBe(8000);
      expect(result.current.settings.supplier).toBeNull();
      expect(result.current.settings.company).toBeNull();
    });

    it('accepts GPS coordinates', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setLocation({ lat: 55.6761, long: 12.5683 });
      });

      expect(result.current.settings.location).toEqual({ lat: 55.6761, long: 12.5683 });
    });

    it('persists to localStorage', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setLocation(2100);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ev-price-settings',
        expect.stringContaining('2100')
      );
    });
  });

  describe('setSupplier', () => {
    it('updates supplier and clears company when changed', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setCompany(mockCompany);
        result.current.setProduct(mockProduct);
      });

      const newSupplier = { id: 'new-supplier', name: 'New Supplier', companyName: 'New Co', priceArea: 'DK2' as const };
      act(() => {
        result.current.setSupplier(newSupplier);
      });

      expect(result.current.settings.supplier?.id).toBe('new-supplier');
      expect(result.current.settings.company).toBeNull();
    });

    it('stores full supplier object for offline display', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setSupplier(mockSupplier);
      });

      expect(result.current.settings.supplier).toEqual({
        id: 'supplier-1',
        name: 'Test Supplier',
        companyName: 'Test Company',
        priceArea: 'DK1',
      });
    });

    it('clears supplier when set to null', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setSupplier(mockSupplier);
      });

      act(() => {
        result.current.setSupplier(null);
      });

      expect(result.current.settings.supplier).toBeNull();
    });
  });

  describe('setCompany', () => {
    it('updates company and clears product when changed', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setCompany(mockCompany);
        result.current.setProduct(mockProduct);
      });

      const newCompany = { id: 'new-company', name: 'New Company', products: [] };
      act(() => {
        result.current.setCompany(newCompany);
      });

      expect(result.current.settings.company?.id).toBe('new-company');
      expect(result.current.settings.company?.product).toBeNull();
    });
  });

  describe('setProduct', () => {
    it('updates product within company', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setCompany(mockCompany);
      });

      act(() => {
        result.current.setProduct(mockProduct);
      });

      expect(result.current.settings.company?.product?.id).toBe('product-1');
    });

    it('does nothing if no company is selected', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      act(() => {
        result.current.setProduct(mockProduct);
      });

      expect(result.current.settings.company).toBeNull();
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
        result.current.setLocation(8000);
        result.current.setPriceArea('DK2');
        result.current.setAggregationSize('15m');
      });

      // Clear all
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.settings.location).toBeNull();
      expect(result.current.settings.priceArea).toBe('DK1');
      expect(result.current.settings.aggregationSize).toBe('1h');
    });
  });

  describe('applySettings', () => {
    it('applies complete settings object', () => {
      const { result } = renderHook(() => usePriceSettings(), { wrapper });

      const newSettings: PriceSettings = {
        location: 5000,
        supplier: mockSupplier,
        company: { id: 'comp-1', name: 'Test', product: mockProduct },
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
