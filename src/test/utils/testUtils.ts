import { vi } from 'vitest';

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
