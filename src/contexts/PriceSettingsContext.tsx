import React, { createContext, useCallback, useContext, useState } from 'react';

import type { PriceArea } from '@/types';
import {
  findCompanyById,
  findProductById,
  findSupplierById,
  findSupplierByPostalCode,
  type Company,
  type Product,
  type Supplier,
} from '@/utils';

// ============ Types ============

export type AggregationSize = '15m' | '1h';
export type AggregationMethod = 'mean' | 'min' | 'max';

export type PriceSettings = {
  postalCode: number | null;
  supplierId: string | null;
  companyId: string | null;
  productId: string | null;
  aggregationSize: AggregationSize;
  aggregationMethod: AggregationMethod;
};

export type ResolvedPriceSettings = {
  postalCode: number | null;
  supplier: Supplier | null;
  company: Company | null;
  product: Product | null;
  priceArea: PriceArea | null;
  aggregationSize: AggregationSize;
  aggregationMethod: AggregationMethod;
};

type PriceSettingsContextType = {
  settings: PriceSettings;
  resolved: ResolvedPriceSettings;
  setPostalCode: (postalCode: number | null) => void;
  setSupplierId: (supplierId: string | null) => void;
  setCompanyId: (companyId: string | null) => void;
  setProductId: (productId: string | null) => void;
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
  aggregationSize: '1h',
  aggregationMethod: 'mean',
};

function loadSettings(): PriceSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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

  // Resolve IDs to full objects
  const supplier = settings.supplierId ? findSupplierById(settings.supplierId) ?? null : null;
  const priceArea = supplier?.priceArea ?? null;
  const company = priceArea && settings.companyId
    ? findCompanyById(priceArea, settings.companyId) ?? null
    : null;
  const product = priceArea && settings.productId
    ? findProductById(priceArea, settings.productId) ?? null
    : null;

  const resolved: ResolvedPriceSettings = {
    postalCode: settings.postalCode,
    supplier,
    company,
    product,
    priceArea,
    aggregationSize: settings.aggregationSize,
    aggregationMethod: settings.aggregationMethod,
  };

  const setPostalCode = useCallback((postalCode: number | null) => {
    setSettings(prev => {
      const newSupplier = postalCode ? findSupplierByPostalCode(postalCode) : null;
      const supplierChanged = newSupplier?.id !== prev.supplierId;

      const updated: PriceSettings = {
        postalCode,
        supplierId: newSupplier?.id ?? null,
        companyId: supplierChanged ? null : prev.companyId,
        productId: supplierChanged ? null : prev.productId,
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
