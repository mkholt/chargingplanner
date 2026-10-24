import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { SKODA_PROXY_URL } from '@/api';
import {
  type Car,
  CarsProvider,
  SkodaProxyProvider,
  SkodaVaultProvider,
  useCars,
  useSkodaVault,
} from '@/contexts';
import { useSkodaAccessExport } from '@/hooks';
import { MOCK_SKODA } from '@/test/mocks';
import { createTestQueryClient, stubLocalStorage } from '@/test/utils/testUtils';
import { LS_KEYS, openAccess } from '@/utils';

const PASSWORD = 'correct horse battery';
const TOKEN = `mock-token.${MOCK_SKODA.VIN}`;
const CAR: Car = {
  id: 'car-1',
  name: 'Enyaq',
  batterySize: 77,
  maxPower: 11,
  skoda: { vin: MOCK_SKODA.VIN, expiresAt: '2099-01-01T00:00:00.000Z', proxyUrl: SKODA_PROXY_URL, token: TOKEN },
};

describe('useSkodaAccessExport', () => {
  beforeEach(() => {
    stubLocalStorage({
      [LS_KEYS.CARS]: JSON.stringify({ cars: [CAR], selectedId: CAR.id }),
      [LS_KEYS.SKODA_PROXY]: JSON.stringify({ enabled: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function renderExport() {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <CarsProvider>
          <SkodaProxyProvider>
            <SkodaVaultProvider>{children}</SkodaVaultProvider>
          </SkodaProxyProvider>
        </CarsProvider>
      </QueryClientProvider>
    );
    return renderHook(() => {
      const { cars } = useCars();
      return { skodaExport: useSkodaAccessExport(cars), vault: useSkodaVault() };
    }, { wrapper });
  }

  it('includes nothing until opted in', () => {
    const { result } = renderExport();

    expect(result.current.skodaExport.available).toBe(true);
    expect(result.current.skodaExport.included).toBe(false);
    expect(result.current.skodaExport.ready).toBe(true);
    expect(result.current.skodaExport.access).toEqual({});
  });

  it('seals each token with a new export code', async () => {
    const { result } = renderExport();

    act(() => result.current.skodaExport.setIncluded(true));
    expect(result.current.skodaExport.ready).toBe(false);
    await waitFor(() => expect(result.current.skodaExport.ready).toBe(true));

    const { exportCode, access } = result.current.skodaExport;
    expect(Object.keys(access)).toEqual([CAR.id]);
    await expect(openAccess(access[CAR.id], exportCode!, MOCK_SKODA.VIN)).resolves.toBe(TOKEN);

    // Opting in again creates another code
    act(() => result.current.skodaExport.setIncluded(false));
    act(() => result.current.skodaExport.setIncluded(true));
    await waitFor(() => expect(result.current.skodaExport.ready).toBe(true));
    expect(result.current.skodaExport.exportCode).not.toBe(exportCode);
  });

  it('waits for the vault to be unlocked', async () => {
    const { result } = renderExport();
    await act(() => result.current.vault.enable(PASSWORD));
    act(() => result.current.vault.lock());

    act(() => result.current.skodaExport.setIncluded(true));
    expect(result.current.skodaExport.needsUnlock).toBe(true);
    expect(result.current.skodaExport.ready).toBe(false);

    await act(() => result.current.vault.unlock(PASSWORD));
    await waitFor(() => expect(result.current.skodaExport.ready).toBe(true));
    expect(Object.keys(result.current.skodaExport.access)).toEqual([CAR.id]);
  });

  it('reports a failure to seal and never becomes ready', async () => {
    // E.g. Web Crypto being unavailable
    vi.spyOn(crypto.subtle, 'encrypt').mockRejectedValue(new Error('No crypto'));
    const { result } = renderExport();

    act(() => result.current.skodaExport.setIncluded(true));

    await waitFor(() => expect(result.current.skodaExport.error).toBeInstanceOf(Error));
    expect(result.current.skodaExport.ready).toBe(false);
    expect(result.current.skodaExport.sealing).toBe(false);
    expect(result.current.skodaExport.access).toEqual({});
  });
});
