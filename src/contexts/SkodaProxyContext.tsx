import React, { createContext, useCallback, useContext } from 'react';

import { normalizeProxyUrl, SKODA_PROXY_URL } from '@/api';
import { useLocalStorage } from '@/hooks';
import { LS_KEYS } from '@/utils';

// ============ Types ============

type SkodaProxySettings = {
  enabled: boolean;
};

type SkodaProxyContextType = {
  /** The proxy URL this build is configured with, or null if the Škoda connection isn't available */
  proxyUrl: string | null;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** The proxy URL while the connection is turned on; null means no Škoda requests are made */
  baseUrl: string | null;
};

// ============ Context ============

const SkodaProxyContext = createContext<SkodaProxyContextType | null>(null);

const DEFAULT_SETTINGS: SkodaProxySettings = { enabled: false };

const CONFIGURED_PROXY_URL = normalizeProxyUrl(SKODA_PROXY_URL);

// ============ Provider ============

/** `proxyUrl` defaults to the build-time VITE_SKODA_PROXY_URL; tests can pass another one */
export const SkodaProxyProvider: React.FC<{ children: React.ReactNode; proxyUrl?: string | null }> = ({
  children,
  proxyUrl = CONFIGURED_PROXY_URL,
}) => {
  const { value: settings, setValue: setSettings } = useLocalStorage<SkodaProxySettings>(
    LS_KEYS.SKODA_PROXY,
    DEFAULT_SETTINGS
  );

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings({ enabled });
  }, [setSettings]);

  return (
    <SkodaProxyContext.Provider
      value={{
        proxyUrl,
        enabled: settings.enabled,
        setEnabled,
        baseUrl: settings.enabled ? proxyUrl : null,
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
