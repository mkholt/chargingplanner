import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

/**
 * Creates a fresh QueryClient for testing with retries disabled.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

/**
 * Creates a wrapper component with QueryClientProvider.
 * Use with renderHook({ wrapper: createQueryWrapper() })
 */
export function createQueryWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Creates a localStorage mock with isolated storage.
 * Use in beforeEach to get a fresh store for each test.
 *
 * @example
 * ```ts
 * let localStorageStore: Record<string, string>;
 *
 * beforeEach(() => {
 *   localStorageStore = {};
 *   stubLocalStorage(localStorageStore);
 * });
 *
 * afterEach(() => {
 *   vi.unstubAllGlobals();
 * });
 * ```
 */
export function stubLocalStorage(store: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  });
}
