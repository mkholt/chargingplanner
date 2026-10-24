import { http, HttpResponse } from 'msw';

import {
  checkSkodaProxyHealth,
  fetchSkodaVehicle,
  issueSkodaToken,
  SKODA_PROXY_URL,
  SkodaProxyError,
} from '@/api';
import { MOCK_SKODA } from '@/test/mocks';
import { server } from '@/test/mocks/server';

const PROXY_URL = SKODA_PROXY_URL;
const { VIN, API_KEY } = MOCK_SKODA;

describe('issueSkodaToken', () => {
  it('returns a token bound to the VIN', async () => {
    const issued = await issueSkodaToken(PROXY_URL, API_KEY, VIN);

    expect(issued.vin).toBe(VIN);
    expect(issued.token).toBeTruthy();
    expect(Date.parse(issued.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('maps a problem response to a SkodaProxyError', async () => {
    const error = await issueSkodaToken(PROXY_URL, MOCK_SKODA.INVALID_API_KEY, VIN).catch(e => e);

    expect(error).toBeInstanceOf(SkodaProxyError);
    expect(error).toMatchObject({ status: 422, problemType: 'invalid-api-key' });
    expect(error.requiresRelink).toBe(false);
  });

  it('reports a non-problem error body as unknown', async () => {
    server.use(http.post('*/v1/tokens', () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));

    const error = await issueSkodaToken(PROXY_URL, API_KEY, VIN).catch(e => e);

    expect(error).toMatchObject({ status: 502, problemType: 'unknown' });
  });

  it('reports an unreachable proxy as a network error', async () => {
    server.use(http.post('*/v1/tokens', () => HttpResponse.error()));

    const error = await issueSkodaToken(PROXY_URL, API_KEY, VIN).catch(e => e);

    expect(error).toMatchObject({ status: 0, problemType: 'network-error' });
  });

  it('never sends credentials and refuses redirects', async () => {
    let request: Request | undefined;
    server.use(http.post('*/v1/tokens', ({ request: r }) => {
      request = r;
      return HttpResponse.json({ token: 't', vin: VIN, expiresAt: new Date().toISOString() }, { status: 201 });
    }));

    await issueSkodaToken(PROXY_URL, API_KEY, VIN);

    expect(request?.credentials).toBe('omit');
    expect(request?.redirect).toBe('error');
  });
});

describe('fetchSkodaVehicle', () => {
  it('reads the vehicle with the bearer token', async () => {
    const { token } = await issueSkodaToken(PROXY_URL, API_KEY, VIN);

    const vehicle = await fetchSkodaVehicle(PROXY_URL, token, VIN);

    expect(vehicle.vin).toBe(VIN);
    expect(vehicle.charging?.status?.battery?.stateOfChargeInPercent).toBe(MOCK_SKODA.STATE_OF_CHARGE);
  });

  it('requires re-linking when the key was revoked', async () => {
    const { token } = await issueSkodaToken(PROXY_URL, MOCK_SKODA.REVOKED_API_KEY, VIN);

    const error = await fetchSkodaVehicle(PROXY_URL, token, VIN).catch(e => e);

    expect(error).toMatchObject({ status: 401, problemType: 'key-revoked', requiresRelink: true });
  });

  it('requires re-linking when the token belongs to another VIN', async () => {
    const { token } = await issueSkodaToken(PROXY_URL, API_KEY, VIN);

    const error = await fetchSkodaVehicle(PROXY_URL, token, 'TMBJJ7NE8L0999999').catch(e => e);

    expect(error).toMatchObject({ status: 403, problemType: 'vin-not-allowed', requiresRelink: true });
  });
});

describe('response validation', () => {
  const expiresAt = '2027-01-22T12:00:00.000Z';

  it.each([
    ['no token', { vin: VIN, expiresAt }],
    ['a token for another VIN', { token: 'jwt', vin: 'TMBJJ7NE8L0999999', expiresAt }],
    ['no expiry', { token: 'jwt', vin: VIN }],
  ])('rejects an issued token with %s', async (_label, body) => {
    server.use(http.post('*/v1/tokens', () => HttpResponse.json(body)));

    const error = await issueSkodaToken(PROXY_URL, API_KEY, VIN).catch(e => e);

    expect(error).toBeInstanceOf(SkodaProxyError);
    expect(error.problemType).toBe('invalid-response');
  });

  it('rejects vehicle data for another VIN', async () => {
    server.use(http.get('*/v1/vehicles/:vin', () => HttpResponse.json({ vehicle: { vin: 'TMBJJ7NE8L0999999' } })));

    const error = await fetchSkodaVehicle(PROXY_URL, 'jwt', VIN).catch(e => e);

    expect(error).toMatchObject({ problemType: 'invalid-response' });
  });

  it('rejects a body that is not JSON', async () => {
    server.use(http.get('*/v1/vehicles/:vin', () => new HttpResponse('<html>', { status: 200 })));

    const error = await fetchSkodaVehicle(PROXY_URL, 'jwt', VIN).catch(e => e);

    expect(error).toMatchObject({ problemType: 'invalid-response' });
  });
});

describe('checkSkodaProxyHealth', () => {
  it('is true for a healthy proxy', async () => {
    expect(await checkSkodaProxyHealth(PROXY_URL)).toBe(true);
  });

  it('is false when the proxy cannot be reached', async () => {
    server.use(http.get('*/healthz', () => HttpResponse.error()));

    expect(await checkSkodaProxyHealth(PROXY_URL)).toBe(false);
  });

  it('is false when the web server answers with the app page instead', async () => {
    // No proxy deployed: the SPA fallback serves index.html for /api/skoda/healthz
    server.use(http.get('*/healthz', () => new HttpResponse('<!doctype html><html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })));

    expect(await checkSkodaProxyHealth(PROXY_URL)).toBe(false);
  });
});
