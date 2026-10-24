import { http, HttpResponse } from 'msw';

import {
  checkSkodaProxyHealth,
  fetchSkodaVehicle,
  issueSkodaToken,
  normalizeProxyUrl,
  SkodaProxyError,
} from '@/api';
import { MOCK_SKODA } from '@/test/mocks';
import { server } from '@/test/mocks/server';

const { PROXY_URL, VIN, API_KEY } = MOCK_SKODA;

describe('normalizeProxyUrl', () => {
  it.each([
    ['https://proxy.example.com', 'https://proxy.example.com'],
    ['https://proxy.example.com/', 'https://proxy.example.com'],
    ['  https://example.com/skoda-proxy//  ', 'https://example.com/skoda-proxy'],
    ['https://example.com:8443/a/b', 'https://example.com:8443/a/b'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeProxyUrl(input, false)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['proxy.example.com', 'no scheme'],
    ['http://proxy.example.com', 'plain http'],
    ['ftp://proxy.example.com', 'other scheme'],
    ['javascript:alert(1)', 'javascript URL'],
    ['https://user:pass@proxy.example.com', 'credentials'],
    ['https://proxy.example.com/?a=1', 'query'],
    ['https://proxy.example.com/#x', 'hash'],
  ])('rejects %s (%s)', input => {
    expect(normalizeProxyUrl(input, false)).toBeNull();
  });

  it('allows http://localhost only when local http is allowed', () => {
    expect(normalizeProxyUrl('http://localhost:8080', true)).toBe('http://localhost:8080');
    expect(normalizeProxyUrl('http://127.0.0.1:8080/', true)).toBe('http://127.0.0.1:8080');
    expect(normalizeProxyUrl('http://localhost:8080', false)).toBeNull();
    expect(normalizeProxyUrl('http://192.168.1.10:8080', true)).toBeNull();
  });
});

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

describe('checkSkodaProxyHealth', () => {
  it('is true for a healthy proxy', async () => {
    expect(await checkSkodaProxyHealth(PROXY_URL)).toBe(true);
  });

  it('is false when the proxy cannot be reached', async () => {
    server.use(http.get('*/healthz', () => HttpResponse.error()));

    expect(await checkSkodaProxyHealth(PROXY_URL)).toBe(false);
  });
});
