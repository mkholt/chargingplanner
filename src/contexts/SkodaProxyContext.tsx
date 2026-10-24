import React, { createContext, useCallback, useContext } from 'react';

import { useQuery } from '@tanstack/react-query';

import { checkSkodaProxyHealth, SKODA_PROXY_URL } from '@/api';
import { useLocalStorage } from '@/hooks';
import { LS_KEYS } from '@/utils';

// ============ Types ============

type SkodaProxySettings = {
  enabled: boolean;
};

type SkodaProxyContextType = {
  /** The proxy URL on the app's own origin */
  proxyUrl: string;
  /**
   * The Škoda connection can be offered: a proxy answered on the app's origin, or the connection is already turned
   * on (so that e.g. being offline doesn't hide linked cars)
   */
  available: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** The proxy URL while the connection is turned on; null means no Škoda requests are made */
  baseUrl: string | null;
};

// ============ Context ============

const SkodaProxyContext = createContext<SkodaProxyContextType | null>(null);

const DEFAULT_SETTINGS: SkodaProxySettings = { enabled: false };

/** Not under skodaQueryKeys.all: locking the vault removes those, and this one is not per-user data */
const SKODA_PROXY_HEALTH_QUERY_KEY = ['skodaProxyHealth'] as const;

// ============ Provider ============

export const SkodaProxyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { value: settings, setValue: setSettings } = useLocalStorage<SkodaProxySettings>(
    LS_KEYS.SKODA_PROXY,
    DEFAULT_SETTINGS
  );
  // Checked once per app load. The last answer is kept in the persisted query cache and used until then.
  const { data: detected = false } = useQuery({
    queryKey: SKODA_PROXY_HEALTH_QUERY_KEY,
    queryFn: () => checkSkodaProxyHealth(SKODA_PROXY_URL),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings({ enabled });
  }, [setSettings]);

  return (
    <SkodaProxyContext.Provider
      value={{
        proxyUrl: SKODA_PROXY_URL,
        available: detected || settings.enabled,
        enabled: settings.enabled,
        setEnabled,
        baseUrl: settings.enabled ? SKODA_PROXY_URL : null,
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
