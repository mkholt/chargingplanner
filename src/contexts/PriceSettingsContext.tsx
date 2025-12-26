import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  findCompanyById,
  findProductById,
  findSupplierById,
  type Company,
  type Product,
  type Supplier,
} from '@/data';
import { useCompaniesQuery, useSuppliersQuery, useSuppliersByPostalCodeQuery } from '@/hooks';
import type { PriceArea } from '@/types';

export type { PriceArea } from '@/types';

// ============ Types ============

export type AggregationSize = '15m' | '1h';
export type AggregationMethod = 'mean' | 'min' | 'max';

export type PriceSettings = {
  postalCode: number | null;
  supplierId: string | null;
  companyId: string | null;
  productId: string | null;
  priceArea: PriceArea | null; // Manual price area selection (used when no supplier is set)
  aggregationSize: AggregationSize;
  aggregationMethod: AggregationMethod;
};

export type ResolvedPriceSettings = {
  postalCode: number | null;
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
  setPostalCode: (postalCode: number | null) => void;
  setSupplierId: (supplierId: string | null) => void;
  setCompanyId: (companyId: string | null) => void;
  setProductId: (productId: string | null) => void;
  setPriceArea: (priceArea: PriceArea) => void;
  setAggregationSize: (size: AggregationSize) => void;
  setAggregationMethod: (method: AggregationMethod) => void;
  clearAll: () => void;
  applySettings: (settings: PriceSettings) => void;
};

// ============ Context ============

const PriceSettingsContext = createContext<PriceSettingsContextType | null>(null);

// ============ Storage ============

const LS_KEY = 'ev-price-settings';

const DEFAULT_SETTINGS: PriceSettings = {
  postalCode: null,
  supplierId: null,
  companyId: null,
  productId: null,
  priceArea: 'DK1', // Default to West Denmark
  aggregationSize: '1h',
  aggregationMethod: 'mean',
};

function loadSettings(): PriceSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
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
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

// ============ Provider ============

export const PriceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PriceSettings>(() => loadSettings());

  // Only fetch suppliers when needed (when postal code is set or supplier is selected)
  const needsSuppliers = settings.postalCode !== null || settings.supplierId !== null;
  const { data: allSuppliers = [] } = useSuppliersQuery(needsSuppliers);
  const {
    data: suppliersForPostalCode = [],
    isLoading: isLoadingSuppliers,
  } = useSuppliersByPostalCodeQuery(settings.postalCode);

  // Resolve supplier: use selected ID, or auto-select if only one available
  const supplier = useMemo(() => {
    if (settings.supplierId) {
      // Try to find in postal code results first, then fall back to all suppliers
      return (
        suppliersForPostalCode.find(s => s.id === settings.supplierId) ??
        findSupplierById(allSuppliers, settings.supplierId) ??
        null
      );
    }
    // Auto-select if exactly one supplier for postal code
    if (suppliersForPostalCode.length === 1) {
      return suppliersForPostalCode[0];
    }
    return null;
  }, [settings.supplierId, suppliersForPostalCode, allSuppliers]);

  // Resolve price area: supplier takes precedence, then manual selection, then default
  const priceArea: PriceArea = supplier?.priceArea ?? settings.priceArea ?? 'DK1';
  const priceAreaSource: 'supplier' | 'manual' = supplier?.priceArea ? 'supplier' : 'manual';

  // Only fetch companies when needed (when company or product is selected)
  const needsCompanies = settings.companyId !== null || settings.productId !== null;
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompaniesQuery(
    needsCompanies ? priceArea : null
  );

  // Resolve company and product from cached data
  const company = useMemo(() => {
    if (!settings.companyId) return null;
    return findCompanyById(companies, settings.companyId) ?? null;
  }, [settings.companyId, companies]);

  const product = useMemo(() => {
    if (!settings.productId) return null;
    return findProductById(companies, settings.productId) ?? null;
  }, [settings.productId, companies]);

  const isLoading = isLoadingSuppliers || isLoadingCompanies;

  const resolved: ResolvedPriceSettings = useMemo(() => ({
    postalCode: settings.postalCode,
    availableSuppliers: suppliersForPostalCode,
    supplier,
    company,
    product,
    priceArea,
    priceAreaSource,
    aggregationSize: settings.aggregationSize,
    aggregationMethod: settings.aggregationMethod,
    isLoading,
  }), [settings.postalCode, settings.aggregationSize, settings.aggregationMethod, suppliersForPostalCode, supplier, company, product, priceArea, priceAreaSource, isLoading]);

  const setPostalCode = useCallback((postalCode: number | null) => {
    setSettings(prev => {
      // When postal code changes, clear supplier/company/product selections
      // Suppliers will be resolved via useSuppliersByPostalCodeQuery
      const updated: PriceSettings = {
        postalCode,
        supplierId: null, // Will be auto-resolved from postal code
        companyId: null,
        productId: null,
        priceArea: prev.priceArea,
        aggregationSize: prev.aggregationSize,
        aggregationMethod: prev.aggregationMethod,
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setSupplierId = useCallback((supplierId: string | null) => {
    setSettings(prev => {
      const supplierChanged = supplierId !== prev.supplierId;

      const updated: PriceSettings = {
        ...prev,
        supplierId,
        companyId: supplierChanged ? null : prev.companyId,
        productId: supplierChanged ? null : prev.productId,
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setCompanyId = useCallback((companyId: string | null) => {
    setSettings(prev => {
      const companyChanged = companyId !== prev.companyId;

      const updated: PriceSettings = {
        ...prev,
        companyId,
        productId: companyChanged ? null : prev.productId,
      };

      saveSettings(updated);
      return updated;
    });
  }, []);

  const setProductId = useCallback((productId: string | null) => {
    setSettings(prev => {
      const updated: PriceSettings = { ...prev, productId };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const setPriceArea = useCallback((priceArea: PriceArea) => {
    setSettings(prev => {
      const updated: PriceSettings = { ...prev, priceArea };
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

  return (
    <PriceSettingsContext.Provider
      value={{
        settings,
        resolved,
        setPostalCode,
        setSupplierId,
        setCompanyId,
        setProductId,
        setPriceArea,
        setAggregationSize,
        setAggregationMethod,
        clearAll,
        applySettings,
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
