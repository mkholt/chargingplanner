import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { normalizeProxyUrl, SKODA_PROXY_DEFAULT_URL } from '@/api';
import { useLocalStorage } from '@/hooks';
import { LS_KEYS } from '@/utils';

// ============ Types ============

export type SkodaProxySettings = {
  enabled: boolean;
  /** Proxy base URL as entered by the user (may include a path prefix) */
  url: string;
};

type SkodaProxyContextType = {
  settings: SkodaProxySettings;
  setEnabled: (enabled: boolean) => void;
  setUrl: (url: string) => void;
  /** Normalised proxy URL when the proxy is enabled and the URL is valid; null means no Škoda requests are made */
  baseUrl: string | null;
  /** Whether the entered URL is acceptable (https, or http://localhost in development) */
  isUrlValid: boolean;
};

// ============ Context ============

const SkodaProxyContext = createContext<SkodaProxyContextType | null>(null);

const DEFAULT_SETTINGS: SkodaProxySettings = { enabled: false, url: SKODA_PROXY_DEFAULT_URL };

// ============ Provider ============

export const SkodaProxyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { value: settings, setValue: setSettings } = useLocalStorage<SkodaProxySettings>(
    LS_KEYS.SKODA_PROXY,
    DEFAULT_SETTINGS
  );

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
  }, [setSettings]);

  const setUrl = useCallback((url: string) => {
    setSettings(prev => ({ ...prev, url }));
  }, [setSettings]);

  const normalizedUrl = useMemo(() => normalizeProxyUrl(settings.url), [settings.url]);

  return (
    <SkodaProxyContext.Provider
      value={{
        settings,
        setEnabled,
        setUrl,
        baseUrl: settings.enabled ? normalizedUrl : null,
        isUrlValid: normalizedUrl !== null,
      }}
    >
      {children}
    </SkodaProxyContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function useSkodaProxy(): SkodaProxyContextType {
  const context = useContext(SkodaProxyContext);
  if (!context) {
    throw new Error('useSkodaProxy must be used within a SkodaProxyProvider');
  }
  return context;
}
