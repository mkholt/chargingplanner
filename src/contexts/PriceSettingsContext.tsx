import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  findCompanyById,
  findProductById,
  type Company,
  type Product,
  type Supplier,
} from '@/data';
import { type Location, useCompaniesQuery, useSuppliersByLocationQuery } from '@/hooks';
import type { PriceArea } from '@/types';
import { LS_KEYS } from '@/utils';

/**
 * PriceSettingsContext manages electricity pricing settings with localStorage persistence.
 *
 * Why not useLocalStorage hook?
 * - API sync: persists fresh API data to localStorage for offline display
 * - Cascading clears: location change clears supplier/company
 * - Default merging: handles backwards compatibility with old data structures
 *
 * @see CLAUDE.md "State Management Patterns" section
 */

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

// ============ Storage ============

const DEFAULT_SETTINGS: PriceSettings = {
  location: null,
  priceArea: 'DK1', // Default to West Denmark
  aggregationSize: '1h',
  aggregationMethod: 'mean',
  supplier: null,
  company: null,
};

function loadSettings(): PriceSettings {
  try {
    const raw = localStorage.getItem(LS_KEYS.PRICE_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // Ensure priceArea has a valid value (handles old data without priceArea field)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      priceArea: parsed.priceArea ?? DEFAULT_SETTINGS.priceArea,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: PriceSettings) {
  localStorage.setItem(LS_KEYS.PRICE_SETTINGS, JSON.stringify(settings));
}

// ============ Provider ============

export const PriceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PriceSettings>(() => loadSettings());

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

  // Sync fresh API data to localStorage (external system sync)
  // This updates the persisted cache when API returns newer data than what we have stored.
  // The resolved values already prefer API data, so no state update needed - just persist for next load.
  const lastSyncedRef = useRef<string>('');

  useEffect(() => {
    // Build current cache state for comparison
    const currentSupplier = settings.supplier;
    const currentProduct = settings.company?.product;

    // Find fresh API data (if available)
    const apiSupplier = currentSupplier
      ? availableSuppliers.find(s => s.id === currentSupplier.id)
      : null;
    const apiProduct = currentProduct
      ? findProductById(companies, currentProduct.id)
      : null;

    // Create sync key to avoid redundant writes
    const syncKey = JSON.stringify({ apiSupplier, apiProduct });
    if (syncKey === lastSyncedRef.current) return;
    lastSyncedRef.current = syncKey;

    // Check what needs updating
    let updatedSettings = settings;
    let needsSave = false;

    if (apiSupplier && currentSupplier) {
      const supplierChanged =
        apiSupplier.name !== currentSupplier.name ||
        apiSupplier.companyName !== currentSupplier.companyName ||
        apiSupplier.priceArea !== currentSupplier.priceArea;

      if (supplierChanged) {
        updatedSettings = { ...updatedSettings, supplier: apiSupplier };
        needsSave = true;
      }
    }

    if (apiProduct && currentProduct && settings.company) {
      const productChanged =
        apiProduct.name !== currentProduct.name ||
        apiProduct.surcharge !== currentProduct.surcharge ||
        apiProduct.subscriptionMonthly !== currentProduct.subscriptionMonthly ||
        apiProduct.isGreen !== currentProduct.isGreen;

      if (productChanged) {
        updatedSettings = {
          ...updatedSettings,
          company: { ...settings.company, product: apiProduct },
        };
        needsSave = true;
      }
    }

    // Persist to localStorage only (no state update - resolved values already use API data)
    if (needsSave) {
      saveSettings(updatedSettings);
    }
  }, [settings, availableSuppliers, companies]);

  const setLocation = useCallback((location: Location) => {
    setSettings(prev => {
      // When location changes, clear supplier/company selections
      const updated: PriceSettings = {
        ...prev,
        location,
        supplier: null,
        company: null,
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setSupplier = useCallback((newSupplier: Supplier | null) => {
    setSettings(prev => {
      const supplierChanged = newSupplier?.id !== prev.supplier?.id;

      const updated: PriceSettings = {
        ...prev,
        supplier: newSupplier,
        company: supplierChanged ? null : prev.company,
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setCompany = useCallback((newCompany: Company | null) => {
    setSettings(prev => {
      const companyChanged = newCompany?.id !== prev.company?.id;

      // Store selected company info (without product initially)
      const selectedCompany: SelectedCompany | null = newCompany
        ? { id: newCompany.id, name: newCompany.name, product: null }
        : null;

      const updated: PriceSettings = {
        ...prev,
        company: companyChanged ? selectedCompany : prev.company,
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setProduct = useCallback((newProduct: Product | null) => {
    setSettings(prev => {
      if (!prev.company) return prev;

      // Update cached company with the selected product
      const updated: PriceSettings = {
        ...prev,
        company: { ...prev.company, product: newProduct },
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setPriceArea = useCallback((newPriceArea: PriceArea) => {
    setSettings(prev => {
      const updated: PriceSettings = { ...prev, priceArea: newPriceArea };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const setAggregationSize = useCallback((aggregationSize: AggregationSize) => {
    setSettings(prev => {
      const updated: PriceSettings = { ...prev, aggregationSize };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const setAggregationMethod = useCallback((aggregationMethod: AggregationMethod) => {
    setSettings(prev => {
      const updated: PriceSettings = { ...prev, aggregationMethod };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  const applySettings = useCallback((newSettings: PriceSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

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
