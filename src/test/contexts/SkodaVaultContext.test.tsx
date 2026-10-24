import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import {
  type Car,
  CarsProvider,
  SkodaProxyProvider,
  SkodaVaultProvider,
  useCars,
  useSkodaVault,
} from '@/contexts';
import { getChargePrefill, useSkodaLink, useSkodaVehicleQuery } from '@/hooks';
import { MOCK_SKODA } from '@/test/mocks';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, stubLocalStorage } from '@/test/utils/testUtils';
import { LS_KEYS, MS_PER_MINUTE, WrongPasswordError } from '@/utils';

const PASSWORD = 'correct horse battery';
const CAR: Car = { id: 'car-1', name: 'Enyaq', batterySize: 77, maxPower: 11 };

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

/** Counts requests that reach the (mock) Škoda proxy */
function countProxyRequests() {
  const counter = { count: 0 };
  const listener = ({ request }: { request: Request }) => {
    if (request.url.startsWith(MOCK_SKODA.PROXY_URL)) counter.count++;
  };
  server.events.on('request:start', listener);
  return { counter, stop: () => server.events.removeListener('request:start', listener) };
}

describe('Škoda linking and the password vault', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {
      [LS_KEYS.CARS]: JSON.stringify({ cars: [CAR], selectedId: CAR.id }),
      [LS_KEYS.SKODA_PROXY]: JSON.stringify({ enabled: true, url: MOCK_SKODA.PROXY_URL }),
    };
    stubLocalStorage(store);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function renderSkoda() {
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
      return { car: cars[0], vault: useSkodaVault(), skodaLink: useSkodaLink() };
    }, { wrapper });
  }

  /** Every value in localStorage, to check that no token is stored in plain form */
  const storedText = () => Object.values(store).join('\n');

  async function linkCar(result: ReturnType<typeof renderSkoda>['result'], password = '') {
    await act(() => result.current.skodaLink.link(result.current.car, MOCK_SKODA.VIN, MOCK_SKODA.API_KEY, password));
  }

  describe('without password protection', () => {
    it('stores the token on the car when linking', async () => {
      const { result } = renderSkoda();

      await linkCar(result);

      const link = result.current.car.skoda;
      expect(link?.vin).toBe(MOCK_SKODA.VIN);
      expect(link?.token).toBeTruthy();
      expect(result.current.vault.getToken(result.current.car)).toBe(link?.token);
      // The API key is never stored
      expect(storedText()).not.toContain(MOCK_SKODA.API_KEY);
    });

    it('keeps the car unlinked when the key is rejected', async () => {
      const { result } = renderSkoda();

      const error = await actError(() =>
        result.current.skodaLink.link(result.current.car, MOCK_SKODA.VIN, MOCK_SKODA.INVALID_API_KEY)
      );

      expect(error).toMatchObject({ problemType: 'invalid-api-key' });
      expect(result.current.car.skoda).toBeUndefined();
    });

    it('removes the link when unlinking', async () => {
      const { result } = renderSkoda();
      await linkCar(result);

      await act(() => result.current.skodaLink.unlink(result.current.car));

      expect(result.current.car.skoda).toBeUndefined();
    });
  });

  describe('with password protection', () => {
    async function renderProtected() {
      const rendered = renderSkoda();
      await linkCar(rendered.result);
      const token = rendered.result.current.car.skoda!.token!;
      await act(() => rendered.result.current.vault.enable(PASSWORD));
      return { ...rendered, token };
    }

    it('moves tokens into the vault and keeps none in plain form', async () => {
      const { result, token } = await renderProtected();

      expect(result.current.vault.isProtected).toBe(true);
      expect(result.current.vault.isUnlocked).toBe(true);
      expect(result.current.car.skoda).toEqual({ vin: MOCK_SKODA.VIN, expiresAt: expect.any(String) });
      expect(result.current.vault.getToken(result.current.car)).toBe(token);
      expect(storedText()).not.toContain(token);
    });

    it('rejects passwords that are too short', async () => {
      const { result } = renderSkoda();

      const error = await actError(() => result.current.vault.enable('short'));

      expect(error).toHaveProperty('message', expect.stringMatching(/at least/));
      expect(result.current.vault.isProtected).toBe(false);
    });

    it('hides tokens when locked and needs the right password to unlock', async () => {
      const { result, token } = await renderProtected();

      act(() => result.current.vault.lock());
      expect(result.current.vault.getToken(result.current.car)).toBeNull();

      expect(await actError(() => result.current.vault.unlock('wrong password!'))).toBeInstanceOf(WrongPasswordError);
      expect(result.current.vault.isUnlocked).toBe(false);

      await act(() => result.current.vault.unlock(PASSWORD));
      expect(result.current.vault.getToken(result.current.car)).toBe(token);
    });

    it('checks the vault password before exchanging the API key', async () => {
      const { result } = await renderProtected();
      const requests = countProxyRequests();

      const error = await actError(() =>
        result.current.skodaLink.link(result.current.car, MOCK_SKODA.VIN, MOCK_SKODA.API_KEY, 'wrong password!')
      );
      requests.stop();

      expect(error).toBeInstanceOf(WrongPasswordError);

      expect(requests.counter.count).toBe(0);
    });

    it('stores a new link in the vault only', async () => {
      const { result } = await renderProtected();
      await act(() => result.current.skodaLink.unlink(result.current.car, PASSWORD));
      expect(result.current.vault.getToken(result.current.car)).toBeNull();

      await linkCar(result, PASSWORD);

      const token = result.current.vault.getToken(result.current.car);
      expect(token).toBeTruthy();
      expect(result.current.car.skoda?.token).toBeUndefined();
      expect(storedText()).not.toContain(token);
    });

    it('changes the password', async () => {
      const { result, token } = await renderProtected();
      const newPassword = 'another long password';

      await act(() => result.current.vault.changePassword(PASSWORD, newPassword));
      act(() => result.current.vault.lock());

      expect(await actError(() => result.current.vault.unlock(PASSWORD))).toBeInstanceOf(WrongPasswordError);
      await act(() => result.current.vault.unlock(newPassword));
      expect(result.current.vault.getToken(result.current.car)).toBe(token);
    });

    it('moves the tokens back to the cars when turned off', async () => {
      const { result, token } = await renderProtected();

      await act(() => result.current.vault.disable(PASSWORD));

      expect(result.current.vault.isProtected).toBe(false);
      expect(result.current.car.skoda?.token).toBe(token);
    });

    it('drops the stored access on reset but keeps the link', async () => {
      const { result, token } = await renderProtected();

      act(() => result.current.vault.reset());

      expect(result.current.vault.isProtected).toBe(false);
      expect(result.current.car.skoda?.vin).toBe(MOCK_SKODA.VIN);
      expect(result.current.vault.getToken(result.current.car)).toBeNull();
      expect(storedText()).not.toContain(token);
    });

    it('locks after the configured time without activity', async () => {
      const { result } = await renderProtected();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
      // Re-run the auto-lock effect so it uses the fake timers
      act(() => result.current.vault.setAutoLockMinutes(5));

      act(() => vi.advanceTimersByTime(4 * MS_PER_MINUTE));
      act(() => {
        window.dispatchEvent(new Event('pointerdown'));
      });
      act(() => vi.advanceTimersByTime(4 * MS_PER_MINUTE));
      expect(result.current.vault.isUnlocked).toBe(true);

      act(() => vi.advanceTimersByTime(MS_PER_MINUTE));
      expect(result.current.vault.isUnlocked).toBe(false);
    });

    it('stays unlocked until the tab is closed when auto-lock is off', async () => {
      const { result } = await renderProtected();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
      act(() => result.current.vault.setAutoLockMinutes(null));

      act(() => vi.advanceTimersByTime(24 * 60 * MS_PER_MINUTE));

      expect(result.current.vault.isUnlocked).toBe(true);
    });
  });
});

describe('useSkodaVehicleQuery', () => {
  let store: Record<string, string>;
  const linkedCar: Car = {
    ...CAR,
    skoda: { vin: MOCK_SKODA.VIN, expiresAt: '2099-01-01T00:00:00.000Z', token: `mock-token.${MOCK_SKODA.VIN}` },
  };

  beforeEach(() => {
    store = { [LS_KEYS.CARS]: JSON.stringify({ cars: [linkedCar], selectedId: CAR.id }) };
    stubLocalStorage(store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderQuery() {
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
    return renderHook(() => useSkodaVehicleQuery(useCars().cars[0]), { wrapper });
  }

  it('loads the vehicle and pre-fills start and target from it', async () => {
    store[LS_KEYS.SKODA_PROXY] = JSON.stringify({ enabled: true, url: MOCK_SKODA.PROXY_URL });
    const { result } = renderQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getChargePrefill(result.current.data)).toEqual({
      startPercent: MOCK_SKODA.STATE_OF_CHARGE,
      endPercent: MOCK_SKODA.TARGET_STATE_OF_CHARGE,
    });
  });

  it('makes no requests while the proxy is turned off', async () => {
    store[LS_KEYS.SKODA_PROXY] = JSON.stringify({ enabled: false, url: MOCK_SKODA.PROXY_URL });
    const requests = countProxyRequests();

    const { result } = renderQuery();
    await new Promise(resolve => setTimeout(resolve, 50));
    requests.stop();

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests.counter.count).toBe(0);
  });
});

describe('getChargePrefill', () => {
  it('is null without vehicle data', () => {
    expect(getChargePrefill(undefined)).toBeNull();
    expect(getChargePrefill({ vin: MOCK_SKODA.VIN })).toBeNull();
  });

  it('uses whatever values are available', () => {
    expect(getChargePrefill({ vin: MOCK_SKODA.VIN, charging: { isVehicleInSavedLocation: true, status: { battery: { stateOfChargeInPercent: 42 } } } }))
      .toEqual({ startPercent: 42, endPercent: undefined });
  });
});
