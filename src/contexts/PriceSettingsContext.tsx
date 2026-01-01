import React, { createContext, useCallback, useContext, useMemo } from 'react';

import {
  findCompanyById,
  findProductById,
  type Company,
  type Product,
  type Supplier,
} from '@/data';
import { useLocalStorage, type Location, useCompaniesQuery, useSuppliersByLocationQuery } from '@/hooks';
import type { PriceArea } from '@/types';
import { LS_KEYS } from '@/utils';

export { isCoordinates, isPostalCode } from '@/hooks';
export type { Coordinates, Location } from '@/hooks';
export type { PriceArea } from '@/types';

// ============ Types ============

export type AggregationSize = '15m' | '1h';
export type AggregationMethod = 'mean' | 'min' | 'max';

/** Selected company with chosen product (persisted for offline display) */
export type SelectedCompany = {
  id: string;
  name: string;
  /** The user's selected product from this company */
  product: Product | null;
};

export type PriceSettings = {
  location: Location; // Postal code (number) or GPS coordinates ({ lat, long }) or null
  priceArea: PriceArea | null; // Manual price area selection (used when no supplier is set)
  aggregationSize: AggregationSize;
  aggregationMethod: AggregationMethod;
  /** Selected supplier (persisted for offline display) */
  supplier: Supplier | null;
  /** Selected company with product (persisted for offline display) */
  company: SelectedCompany | null;
};

export type ResolvedPriceSettings = {
  location: Location;
  availableSuppliers: Supplier[];
  supplier: Supplier | null;
  company: Company | null;
  product: Product | null;
  /** Always resolved to a valid price area (supplier's area or manual selection, defaults to DK1) */
  priceArea: PriceArea;
  /** Where the price area came from */
  priceAreaSource: 'supplier' | 'manual';
  aggregationSize: AggregationSize;
  aggregationMethod: AggregationMethod;
  isLoading: boolean;
};

type PriceSettingsContextType = {
  settings: PriceSettings;
  resolved: ResolvedPriceSettings;
  setLocation: (location: Location) => void;
  setSupplier: (supplier: Supplier | null) => void;
  setCompany: (company: Company | null) => void;
  setProduct: (product: Product | null) => void;
  setPriceArea: (priceArea: PriceArea) => void;
  setAggregationSize: (size: AggregationSize) => void;
  setAggregationMethod: (method: AggregationMethod) => void;
  clearAll: () => void;
  applySettings: (settings: PriceSettings) => void;
  /** Refetch suppliers and companies if data is stale. Call when navigating to settings. */
  refetchIfStale: () => void;
};

// ============ Context ============

const PriceSettingsContext = createContext<PriceSettingsContextType | null>(null);

// ============ Defaults ============

const DEFAULT_SETTINGS: PriceSettings = {
  location: null,
  priceArea: 'DK1', // Default to West Denmark
  aggregationSize: '1h',
  aggregationMethod: 'mean',
  supplier: null,
  company: null,
};

// ============ Provider ============

export const PriceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { value: settings, setValue: setSettings } = useLocalStorage<PriceSettings>(
    LS_KEYS.PRICE_SETTINGS,
    DEFAULT_SETTINGS
  );

  // Fetch suppliers by location (only when location is set)
  const {
    data: availableSuppliers = [],
    isLoading: isLoadingSuppliers,
    refetch: refetchSuppliers,
  } = useSuppliersByLocationQuery(settings.location);

  // Resolve supplier: prefer API data, fall back to cached settings
  const supplier = useMemo((): Supplier | null => {
    if (settings.supplier) {
      // Find fresh data from API if available
      const fromApi = availableSuppliers.find(s => s.id === settings.supplier?.id);
      if (fromApi) return fromApi;
      // Fall back to cached supplier info
      return settings.supplier;
    }
    // Auto-select if exactly one supplier available
    if (availableSuppliers.length === 1) {
      return availableSuppliers[0];
    }
    return null;
  }, [settings.supplier, availableSuppliers]);

  // Resolve price area: supplier takes precedence, then manual selection, then default
  const priceArea: PriceArea = supplier?.priceArea ?? settings.priceArea ?? 'DK1';
  // Only report 'supplier' source when we have a complete product selection (supplier + product)
  // because that's when the API actually uses supplier-specific pricing
  const hasCompleteProductSelection = supplier !== null && settings.company?.product !== null;
  const priceAreaSource: 'supplier' | 'manual' = hasCompleteProductSelection ? 'supplier' : 'manual';

  // Fetch companies when needed (when company is selected)
  const needsCompanies = settings.company !== null;
  const {
    data: companies = [],
    isLoading: isLoadingCompanies,
    refetch: refetchCompanies,
  } = useCompaniesQuery(needsCompanies ? priceArea : null);

  // Resolve company from API data, falling back to cached
  const company = useMemo((): Company | null => {
    if (!settings.company) return null;
    const fromApi = findCompanyById(companies, settings.company.id);
    if (fromApi) return fromApi;
    // Fall back to cached company info - reconstruct a minimal Company object
    return {
      id: settings.company.id,
      name: settings.company.name,
      products: settings.company.product ? [settings.company.product] : [],
    };
  }, [settings.company, companies]);

  // Resolve product from API data, falling back to cached
  const product = useMemo((): Product | null => {
    if (!settings.company?.product) return null;
    const fromApi = findProductById(companies, settings.company.product.id);
    if (fromApi) return fromApi;
    // Fall back to cached product info
    return settings.company.product;
  }, [settings.company, companies]);

  const isLoading = isLoadingSuppliers || isLoadingCompanies;

  const resolved: ResolvedPriceSettings = useMemo(() => ({
    location: settings.location,
    availableSuppliers,
    supplier,
    company,
    product,
    priceArea,
    priceAreaSource,
    aggregationSize: settings.aggregationSize,
    aggregationMethod: settings.aggregationMethod,
    isLoading,
  }), [settings.location, settings.aggregationSize, settings.aggregationMethod, availableSuppliers, supplier, company, product, priceArea, priceAreaSource, isLoading]);

  const setLocation = useCallback((location: Location) => {
    // When location changes, clear supplier/company selections
    setSettings(prev => ({
      ...prev,
      location,
      supplier: null,
      company: null,
    }));
  }, [setSettings]);

  const setSupplier = useCallback((newSupplier: Supplier | null) => {
    setSettings(prev => {
      const supplierChanged = newSupplier?.id !== prev.supplier?.id;
      return {
        ...prev,
        supplier: newSupplier,
        company: supplierChanged ? null : prev.company,
      };
    });
  }, [setSettings]);

  const setCompany = useCallback((newCompany: Company | null) => {
    setSettings(prev => {
      const companyChanged = newCompany?.id !== prev.company?.id;
      // Store selected company info (without product initially)
      const selectedCompany: SelectedCompany | null = newCompany
        ? { id: newCompany.id, name: newCompany.name, product: null }
        : null;
      return {
        ...prev,
        company: companyChanged ? selectedCompany : prev.company,
      };
    });
  }, [setSettings]);

  const setProduct = useCallback((newProduct: Product | null) => {
    setSettings(prev => {
      if (!prev.company) return prev;
      return {
        ...prev,
        company: { ...prev.company, product: newProduct },
      };
    });
  }, [setSettings]);

  const setPriceArea = useCallback((newPriceArea: PriceArea) => {
    setSettings(prev => ({ ...prev, priceArea: newPriceArea }));
  }, [setSettings]);

  const setAggregationSize = useCallback((aggregationSize: AggregationSize) => {
    setSettings(prev => ({ ...prev, aggregationSize }));
  }, [setSettings]);

  const setAggregationMethod = useCallback((aggregationMethod: AggregationMethod) => {
    setSettings(prev => ({ ...prev, aggregationMethod }));
  }, [setSettings]);

  const clearAll = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, [setSettings]);

  const applySettings = useCallback((newSettings: PriceSettings) => {
    setSettings(newSettings);
  }, [setSettings]);

  const refetchIfStale = useCallback(() => {
    // React Query will only actually refetch if data is stale
    if (settings.location !== null) {
      refetchSuppliers();
    }
    if (needsCompanies) {
      refetchCompanies();
    }
  }, [settings.location, needsCompanies, refetchSuppliers, refetchCompanies]);

  return (
    <PriceSettingsContext.Provider
      value={{
        settings,
        resolved,
        setLocation,
        setSupplier,
        setCompany,
        setProduct,
        setPriceArea,
        setAggregationSize,
        setAggregationMethod,
        clearAll,
        applySettings,
        refetchIfStale,
      }}
    >
      {children}
    </PriceSettingsContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function usePriceSettings(): PriceSettingsContextType {
  const context = useContext(PriceSettingsContext);
  if (!context) {
    throw new Error('usePriceSettings must be used within a PriceSettingsProvider');
  }
  return context;
}
