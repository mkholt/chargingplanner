import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

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
import { LS_KEYS, MS_PER_MINUTE, openWithPassword, VaultLockedError, WrongPasswordError } from '@/utils';

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
      [LS_KEYS.SKODA_PROXY]: JSON.stringify({ enabled: true }),
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
      const carsContext = useCars();
      return { car: carsContext.cars[0], carsContext, vault: useSkodaVault(), skodaLink: useSkodaLink() };
    }, { wrapper });
  }

  /** Every value in localStorage, to check that no token is stored in plain form */
  const storedText = () => Object.values(store).join('\n');

  async function linkCar(result: ReturnType<typeof renderSkoda>['result']) {
    await act(() => result.current.skodaLink.link(result.current.car, MOCK_SKODA.VIN, MOCK_SKODA.API_KEY));
  }

  async function lookUp(result: ReturnType<typeof renderSkoda>['result']) {
    let lookup: Awaited<ReturnType<typeof result.current.skodaLink.lookUp>> | undefined;
    await act(async () => {
      lookup = await result.current.skodaLink.lookUp(MOCK_SKODA.VIN, MOCK_SKODA.API_KEY);
    });
    return lookup!;
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

    it('ignores a token issued by another proxy', async () => {
      const { result } = renderSkoda();
      await linkCar(result);

      act(() => result.current.carsContext.updateCar(CAR.id, {
        skoda: { ...result.current.car.skoda!, proxyUrl: 'https://other-proxy.example' },
      }));

      expect(result.current.vault.getToken(result.current.car)).toBeNull();
    });

    it('adds a car linked with the token from a lookup', async () => {
      const { result } = renderSkoda();

      const lookup = await lookUp(result);
      expect(lookup.vehicle?.name).toBe(MOCK_SKODA.VEHICLE_NAME);

      let added: Car | undefined;
      await act(async () => {
        added = await result.current.skodaLink.addLinkedCar({ name: 'New Enyaq', batterySize: 77, maxPower: 11 }, lookup);
      });

      const car = result.current.carsContext.cars.find(c => c.id === added?.id);
      expect(car?.skoda).toMatchObject({ vin: MOCK_SKODA.VIN, proxyUrl: MOCK_SKODA.PROXY_URL });
      expect(result.current.vault.getToken(car ?? null)).toBe(lookup.issued.token);
    });

    it('keeps the token from a lookup when the vehicle cannot be read', async () => {
      server.use(http.get('*/v1/vehicles/:vin', () => new HttpResponse(null, { status: 502 })));
      const { result } = renderSkoda();

      const lookup = await lookUp(result);

      expect(lookup.vehicle).toBeNull();
      expect(lookup.issued.token).toBeTruthy();
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
      expect(result.current.car.skoda).toEqual({
        vin: MOCK_SKODA.VIN,
        expiresAt: expect.any(String),
        proxyUrl: MOCK_SKODA.PROXY_URL,
      });
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

    it('refuses to link while locked, without exchanging the API key', async () => {
      const { result } = await renderProtected();
      act(() => result.current.vault.lock());
      const requests = countProxyRequests();

      const error = await actError(() =>
        result.current.skodaLink.link(result.current.car, MOCK_SKODA.VIN, MOCK_SKODA.API_KEY)
      );
      requests.stop();

      expect(error).toBeInstanceOf(VaultLockedError);
      expect(requests.counter.count).toBe(0);
    });

    it('stores a new link in the vault only, without asking for the password while unlocked', async () => {
      const { result } = await renderProtected();
      await act(() => result.current.skodaLink.unlink(result.current.car));
      expect(result.current.vault.getToken(result.current.car)).toBeNull();

      await linkCar(result);

      const token = result.current.vault.getToken(result.current.car);
      expect(token).toBeTruthy();
      expect(result.current.car.skoda?.token).toBeUndefined();
      expect(storedText()).not.toContain(token);
    });

    it('forgets the password when locked', async () => {
      const { result } = await renderProtected();
      act(() => result.current.vault.lock());
      // Changes need the password, which is only kept while unlocked
      const error = await actError(() => result.current.vault.removeToken(CAR.id));

      expect(error).toBeInstanceOf(VaultLockedError);
      expect(result.current.vault.isUnlocked).toBe(false);

      await act(() => result.current.vault.unlock(PASSWORD));
      await act(() => result.current.vault.removeToken(CAR.id));
      expect(result.current.vault.getToken(result.current.car)).toBeNull();
    });

    it('does not keep a car added from a lookup when its token cannot be stored', async () => {
      const { result } = await renderProtected();
      const lookup = await lookUp(result);
      act(() => result.current.vault.lock());

      const error = await actError(() =>
        result.current.skodaLink.addLinkedCar({ name: 'New Enyaq', batterySize: 77, maxPower: 11 }, lookup)
      );

      expect(error).toBeInstanceOf(VaultLockedError);
      expect(result.current.carsContext.cars.map(car => car.id)).toEqual([CAR.id]);
      expect(storedText()).not.toContain(lookup.issued.token);
    });

    it('moves a plain token stored on a car into the vault', async () => {
      const { result } = await renderProtected();

      act(() => result.current.carsContext.updateCar(CAR.id, {
        skoda: { ...result.current.car.skoda!, token: 'stray-token' },
      }));

      await waitFor(() => expect(result.current.car.skoda?.token).toBeUndefined());
      expect(result.current.vault.getToken(result.current.car)).toBe('stray-token');
      expect(storedText()).not.toContain('stray-token');
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

      await act(() => result.current.vault.reset());

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

    describe('vault updates', () => {
      async function renderWithUpdates() {
        const rendered = await renderProtected();
        const { result } = rendered;
        const set = (carId: string, token: string) => result.current.vault.storeLinks([{
          carId,
          link: { vin: MOCK_SKODA.VIN, expiresAt: '2099-01-01T00:00:00.000Z', proxyUrl: MOCK_SKODA.PROXY_URL },
          token,
        }]);
        /** The vault as stored */
        const read = () => openWithPassword<Record<string, { token: string }>>(
          JSON.parse(store[LS_KEYS.SKODA_VAULT]).jwe,
          PASSWORD,
        );
        return { ...rendered, set, read };
      }

      it('keeps both changes when two updates run at once', async () => {
        const { result, set, read } = await renderWithUpdates();
        let secondCar: Car | undefined;
        act(() => {
          secondCar = result.current.carsContext.addCar({ name: 'Elroq', batterySize: 63, maxPower: 11 });
        });

        await act(() => Promise.all([set(CAR.id, 'token-1'), set(secondCar!.id, 'token-2')]));

        const tokens = await read();
        expect(tokens[CAR.id]?.token).toBe('token-1');
        expect(tokens[secondCar!.id]?.token).toBe('token-2');
      });

      it('drops tokens of deleted cars on the next update', async () => {
        const { set, read } = await renderWithUpdates();

        await act(() => set('deleted-car', 'token'));

        // Kept by the update that added it, dropped by the next one
        expect(Object.keys(await read())).toContain('deleted-car');
        await act(() => set(CAR.id, 'token-1'));
        expect(Object.keys(await read())).toEqual([CAR.id]);
      });
    });

    it('stays locked when locked while unlocking', async () => {
      const { result } = await renderProtected();
      act(() => result.current.vault.lock());

      await act(async () => {
        const unlocking = result.current.vault.unlock(PASSWORD);
        result.current.vault.lock();
        await unlocking;
      });

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
    skoda: {
      vin: MOCK_SKODA.VIN,
      expiresAt: '2099-01-01T00:00:00.000Z',
      proxyUrl: MOCK_SKODA.PROXY_URL,
      token: `mock-token.${MOCK_SKODA.VIN}`,
    },
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
    store[LS_KEYS.SKODA_PROXY] = JSON.stringify({ enabled: true });
    const { result } = renderQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getChargePrefill(result.current.data)).toEqual({
      startPercent: MOCK_SKODA.STATE_OF_CHARGE,
      endPercent: MOCK_SKODA.TARGET_STATE_OF_CHARGE,
      atChargeLimit: false,
    });
  });

  it('makes no requests while the proxy is turned off', async () => {
    store[LS_KEYS.SKODA_PROXY] = JSON.stringify({ enabled: false });
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
      .toEqual({ startPercent: 42, endPercent: undefined, atChargeLimit: false });
  });

  it('only pre-fills the target when the car is already at its charge limit', () => {
    const charging = (soc: number) => ({
      vin: MOCK_SKODA.VIN,
      charging: {
        isVehicleInSavedLocation: true,
        status: { battery: { stateOfChargeInPercent: soc } },
        settings: { targetStateOfChargeInPercent: 80 },
      },
    });
    expect(getChargePrefill(charging(80))).toEqual({ endPercent: 80, atChargeLimit: true });
    expect(getChargePrefill(charging(85))).toEqual({ endPercent: 80, atChargeLimit: true });
  });
});
