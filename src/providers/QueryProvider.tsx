import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { ReactNode } from 'react';

import { QUERY_TIMING } from '@/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_TIMING.prices.staleTime,
      gcTime: QUERY_TIMING.prices.gcTime,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Version the cache key to invalidate old cached data when data format/logic changes
// Increment CACHE_VERSION when making breaking changes to query data structure
const CACHE_VERSION = 2; // v2: Fixed price area differentiation in mock data

// Async storage adapter for localStorage (required by createAsyncStoragePersister)
const asyncLocalStorage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const persister = createAsyncStoragePersister({
  storage: asyncLocalStorage,
  key: `ev-price-query-cache-v${CACHE_VERSION}`,
});

type Props = {
  children: ReactNode;
};

export const QueryProvider: React.FC<Props> = ({ children }) => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: QUERY_TIMING.prices.staleTime,
    }}
  >
    {children}
  </PersistQueryClientProvider>
);
