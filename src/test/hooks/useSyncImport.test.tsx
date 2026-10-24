import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import {
  CarsProvider,
  PriceSettingsProvider,
  SkodaProxyProvider,
  SkodaVaultProvider,
  useCars,
  useSkodaVault,
} from '@/contexts';
import { useSyncImport } from '@/hooks';
import { MOCK_SKODA } from '@/test/mocks';
import { createTestQueryClient, stubLocalStorage } from '@/test/utils/testUtils';
import {
  generateExportCode,
  LS_KEYS,
  sealAccess,
  type SyncData,
  VaultLockedError,
  WrongExportCodeError,
} from '@/utils';

const PASSWORD = 'correct horse battery';
const EXPORT_CODE = generateExportCode();
const TOKEN = 'imported-token';

/** Run an async action inside act and return what it threw (a rejected act breaks later tests) */
async function actError(action: () => Promise<unknown>): Promise<unknown> {
  let error: unknown;
  await act(async () => {
    await action().catch(e => {
      error = e;
    });
  });
  return error;
}

async function syncDataWithAccess(): Promise<SyncData> {
  return {
    cars: [{
      name: 'Enyaq',
      batterySize: 77,
      maxPower: 11,
      skoda: {
        vin: MOCK_SKODA.VIN,
        expiresAt: '2027-01-22T12:00:00.000Z',
        proxyUrl: MOCK_SKODA.PROXY_URL,
        sealedToken: await sealAccess({ vin: MOCK_SKODA.VIN, token: TOKEN }, EXPORT_CODE),
      },
    }],
  };
}

describe('useSyncImport with Škoda access', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = { [LS_KEYS.SKODA_PROXY]: JSON.stringify({ enabled: true }) };
    stubLocalStorage(store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderImport() {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <CarsProvider>
          <PriceSettingsProvider>
            <SkodaProxyProvider>
              <SkodaVaultProvider>{children}</SkodaVaultProvider>
            </SkodaProxyProvider>
          </PriceSettingsProvider>
        </CarsProvider>
      </QueryClientProvider>
    );
    return renderHook(() => ({ syncImport: useSyncImport(), cars: useCars().cars, vault: useSkodaVault() }), { wrapper });
  }

  async function importCar(result: ReturnType<typeof renderImport>['result']) {
    const data = await syncDataWithAccess();
    act(() => result.current.syncImport.confirmImport(data, [0], false));
  }

  it('adds the car linked without access until the export code is entered', async () => {
    const { result } = renderImport();

    await importCar(result);

    const car = result.current.cars[0];
    expect(car.skoda).toEqual({ vin: MOCK_SKODA.VIN, expiresAt: '2027-01-22T12:00:00.000Z', proxyUrl: MOCK_SKODA.PROXY_URL });
    expect(result.current.syncImport.pendingAccessCount).toBe(1);

    await act(() => result.current.syncImport.completeAccess(EXPORT_CODE));

    expect(result.current.vault.getToken(result.current.cars[0])).toBe(TOKEN);
    expect(result.current.syncImport.pendingAccessCount).toBe(0);
  });

  it('keeps the access pending when the export code is wrong', async () => {
    const { result } = renderImport();
    await importCar(result);

    const error = await actError(() => result.current.syncImport.completeAccess(generateExportCode()));

    expect(error).toBeInstanceOf(WrongExportCodeError);
    expect(result.current.syncImport.pendingAccessCount).toBe(1);
    expect(result.current.vault.getToken(result.current.cars[0])).toBeNull();
  });

  it('stores the access in the vault of this device when it is protected', async () => {
    const { result } = renderImport();
    await act(() => result.current.vault.enable(PASSWORD));
    await importCar(result);

    // While locked, the access stays pending
    act(() => result.current.vault.lock());
    const error = await actError(() => result.current.syncImport.completeAccess(EXPORT_CODE));
    expect(error).toBeInstanceOf(VaultLockedError);
    expect(result.current.syncImport.pendingAccessCount).toBe(1);

    await act(() => result.current.vault.unlock(PASSWORD));
    await act(() => result.current.syncImport.completeAccess(EXPORT_CODE));

    expect(result.current.cars[0].skoda?.token).toBeUndefined();
    expect(result.current.vault.getToken(result.current.cars[0])).toBe(TOKEN);
    expect(Object.values(store).join('\n')).not.toContain(TOKEN);
  });
});
