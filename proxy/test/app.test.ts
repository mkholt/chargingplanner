import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { APP_ORIGIN, createTestApp } from './helpers';
import { API_KEY, KEY_EXPIRES_AT, OTHER_VIN, skodaApi, VIN, vehicleBody } from './mocks/skodaApi';

const PROBLEM_JSON = 'application/problem+json';
const DAY_MS = 24 * 60 * 60 * 1000;

const issueValidToken = async (proxy: ReturnType<typeof createTestApp>) => {
  const res = await proxy.issueToken({ apiKey: API_KEY, vin: VIN });
  expect(res.status).toBe(201);
  const { token } = (await res.json()) as { token: string };
  skodaApi.requests.length = 0;
  return token;
};

describe('GET /healthz', () => {
  it('reports ok with security headers', async () => {
    const res = await createTestApp().request('/healthz');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
  });
});

describe('routing', () => {
  it('answers unknown routes with a problem', async () => {
    const res = await createTestApp().request('/v1/charging');

    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe(PROBLEM_JSON);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:not-found', status: 404 });
  });

  it.each(['PUT', 'DELETE', 'PATCH'])('does not offer %s on vehicles', async (method) => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    const res = await proxy.request(`/v1/vehicles/${VIN}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(404);
    expect(skodaApi.requests).toHaveLength(0);
  });
});

describe('CORS', () => {
  const preflight = (origin: string) =>
    createTestApp().request('/v1/tokens', {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

  it('allows the configured origin', async () => {
    const res = await preflight(APP_ORIGIN);

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(APP_ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });

  it('does not allow other origins', async () => {
    const res = await preflight('https://evil.example.com');

    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('exposes only the forwarded Škoda headers', async () => {
    const res = await createTestApp().request('/healthz', { headers: { Origin: APP_ORIGIN } });

    expect(res.headers.get('Access-Control-Expose-Headers')).toBe(
      'RateLimit-Limit,RateLimit-Remaining,RateLimit-Reset,Retry-After,X-API-Key-Expires-At'
    );
  });
});

describe('POST /v1/tokens', () => {
  it('issues a token bound to the VIN, expiring with the Škoda key', async () => {
    const proxy = createTestApp();

    const res = await proxy.issueToken({ apiKey: API_KEY, vin: VIN });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, string>;
    expect(body).toEqual({ token: expect.any(String), vin: VIN, expiresAt: KEY_EXPIRES_AT });
    expect(JSON.stringify(body)).not.toContain(API_KEY);
    expect(skodaApi.requests).toHaveLength(1);
    expect(skodaApi.requests[0].apiKey).toBe(API_KEY);
    expect(skodaApi.requests[0].url.searchParams.get('include')).toBe('info');
  });

  it('caps the token lifetime to a year', async () => {
    skodaApi.respondWith(() =>
      HttpResponse.json(vehicleBody(VIN), { headers: { 'X-API-Key-Expires-At': '2099-01-01T00:00:00Z' } })
    );

    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: VIN });

    const { expiresAt } = (await res.json()) as { expiresAt: string };
    expect((Date.parse(expiresAt) - Date.now()) / DAY_MS).toBeCloseTo(365, 0);
  });

  it('refuses a Škoda key that has already expired', async () => {
    skodaApi.respondWith(() =>
      HttpResponse.json(vehicleBody(VIN), { headers: { 'X-API-Key-Expires-At': '2020-01-01T00:00:00Z' } })
    );

    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: VIN });

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:invalid-api-key' });
  });

  it('falls back to 30 days when Škoda does not report the key expiry', async () => {
    skodaApi.respondWith(() => HttpResponse.json(vehicleBody(VIN)));

    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: VIN });

    const { expiresAt } = (await res.json()) as { expiresAt: string };
    const days = (Date.parse(expiresAt) - Date.now()) / DAY_MS;
    expect(days).toBeCloseTo(30, 0);
  });

  it.each([
    ['an unknown key', { apiKey: 'wrong-key', vin: VIN }],
    ['a key for another vehicle', { apiKey: API_KEY, vin: OTHER_VIN }],
  ])('refuses %s', async (_, body) => {
    const res = await createTestApp().issueToken(body);

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:invalid-api-key' });
  });

  it('refuses a key when Škoda does not know the vehicle', async () => {
    skodaApi.respondWith(() => HttpResponse.json({ status: 404 }, { status: 404 }));

    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: VIN });

    expect(res.status).toBe(422);
  });

  it.each([
    ['a missing VIN', { apiKey: API_KEY }],
    ['an invalid VIN', { apiKey: API_KEY, vin: 'TMBJR7NX5PY00000I' }],
    ['an empty key', { apiKey: '', vin: VIN }],
    ['a key with non-ASCII characters', { apiKey: 'nøgle-1234', vin: VIN }],
    ['a key with whitespace', { apiKey: 'key 1234', vin: VIN }],
  ])('rejects %s without calling Škoda', async (_, body) => {
    const res = await createTestApp().issueToken(body);

    expect(res.status).toBe(400);
    expect(res.headers.get('Content-Type')).toBe(PROBLEM_JSON);
    expect(skodaApi.requests).toHaveLength(0);
  });

  it('does not echo submitted values in validation errors', async () => {
    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: 'not-a-vin' });

    const text = await res.text();
    expect(text).not.toContain(API_KEY);
    expect(text).not.toContain('not-a-vin');
  });

  it('rejects a non-JSON body', async () => {
    const res = await createTestApp().request('/v1/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ apiKey: API_KEY, vin: VIN }),
    });

    expect(res.status).toBe(400);
    expect(skodaApi.requests).toHaveLength(0);
  });

  it('rejects malformed JSON', async () => {
    const res = await createTestApp().request('/v1/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"apiKey":',
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:invalid-request' });
  });

  it('rejects oversized bodies', async () => {
    const res = await createTestApp().issueToken({ apiKey: 'x'.repeat(4000), vin: VIN });

    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:payload-too-large' });
  });

  it('rate limits issuance per client IP', async () => {
    const proxy = createTestApp();
    for (let i = 0; i < 5; i++) {
      expect((await proxy.issueToken({ apiKey: 'wrong-key', vin: VIN })).status).toBe(422);
    }

    const limited = await proxy.issueToken({ apiKey: API_KEY, vin: VIN });
    const otherClient = await proxy.issueToken({ apiKey: API_KEY, vin: VIN }, '198.51.100.7');

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(otherClient.status).toBe(201);
  });

  it('groups IPv6 clients by /64 when rate limiting', async () => {
    const proxy = createTestApp();
    for (let i = 1; i <= 5; i++) {
      expect((await proxy.issueToken({ apiKey: 'wrong-key', vin: VIN }, `2001:db8::${i}`)).status).toBe(422);
    }

    const sameNetwork = await proxy.issueToken({ apiKey: API_KEY, vin: VIN }, '2001:db8::99');
    const otherNetwork = await proxy.issueToken({ apiKey: API_KEY, vin: VIN }, '2001:db8:0:1::1');

    expect(sameNetwork.status).toBe(429);
    expect(otherNetwork.status).toBe(201);
  });

  it('caps issuance across all clients', async () => {
    const proxy = createTestApp();
    for (let i = 1; i <= 30; i++) {
      expect((await proxy.issueToken({ apiKey: API_KEY, vin: VIN }, `198.51.100.${i}`)).status).toBe(201);
    }

    const res = await proxy.issueToken({ apiKey: API_KEY, vin: VIN }, '198.51.100.200');

    expect(res.status).toBe(429);
    expect(skodaApi.requests).toHaveLength(30);
  });

  it('does not count invalid requests towards the global cap', async () => {
    const proxy = createTestApp();
    for (let i = 1; i <= 30; i++) {
      expect((await proxy.issueToken({ apiKey: API_KEY, vin: 'invalid' }, `198.51.100.${i}`)).status).toBe(400);
    }

    expect((await proxy.issueToken({ apiKey: API_KEY, vin: VIN }, '198.51.100.200')).status).toBe(201);
  });

  it.each([
    ['its Retry-After', { 'Retry-After': '17' }, '17'],
    ['a default Retry-After', {}, '60'],
  ])('passes Škoda rate limiting through with %s', async (_, headers, retryAfter) => {
    skodaApi.respondWith(() => new HttpResponse(null, { status: 429, headers }));

    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: VIN });

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe(retryAfter);
  });

  it('reports Škoda being unreachable as 502', async () => {
    skodaApi.respondWith(() => HttpResponse.error());

    const res = await createTestApp().issueToken({ apiKey: API_KEY, vin: VIN });

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:upstream-unavailable' });
  });
});

describe('GET /v1/vehicles/:vin', () => {
  it('returns the vehicle with Škoda rate limit headers and nothing else from upstream', async () => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    const res = await proxy.getVehicle(VIN, token);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(vehicleBody(VIN));
    expect(res.headers.get('RateLimit-Remaining')).toBe('99');
    expect(res.headers.get('X-API-Key-Expires-At')).toBe(KEY_EXPIRES_AT);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(res.headers.get('X-Internal-Header')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(skodaApi.requests[0].apiKey).toBe(API_KEY);
    expect(skodaApi.requests[0].url.searchParams.get('include')).toBe('info,charging');
  });

  it('forwards a narrowed include', async () => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    await proxy.getVehicle(VIN, token, '?include=charging');

    expect(skodaApi.requests[0].url.searchParams.get('include')).toBe('charging');
  });

  it.each(['location', 'info,location', 'charging,'])('refuses include=%s', async (include) => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    const res = await proxy.getVehicle(VIN, token, `?include=${include}`);

    expect(res.status).toBe(400);
    expect(skodaApi.requests).toHaveLength(0);
  });

  it('refuses another VIN without calling Škoda', async () => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    const res = await proxy.getVehicle(OTHER_VIN, token);

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:vin-not-allowed' });
    expect(skodaApi.requests).toHaveLength(0);
  });

  it.each([
    ['no token', undefined],
    ['a forged token', 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..abc.def.ghi'],
  ])('rejects %s', async (_, token) => {
    const proxy = createTestApp();

    const res = await proxy.getVehicle(VIN, token);

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toMatch(/^Bearer/);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:unauthorized' });
    expect(skodaApi.requests).toHaveLength(0);
  });

  it('rejects tokens issued by a proxy with other secrets', async () => {
    const token = await issueValidToken(createTestApp());

    const res = await createTestApp().getVehicle(VIN, token);

    expect(res.status).toBe(401);
  });

  it('serves repeated reads from the cache without stale rate limit headers', async () => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    await proxy.getVehicle(VIN, token);
    const second = await proxy.getVehicle(VIN, token);

    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(vehicleBody(VIN));
    expect(second.headers.get('RateLimit-Remaining')).toBeNull();
    expect(second.headers.get('X-API-Key-Expires-At')).toBe(KEY_EXPIRES_AT);
    expect(skodaApi.requests).toHaveLength(1);
  });

  it('shares the cache entry regardless of include order', async () => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);

    await proxy.getVehicle(VIN, token, '?include=info,charging');
    await proxy.getVehicle(VIN, token, '?include=charging,info');

    expect(skodaApi.requests).toHaveLength(1);
  });

  it('keeps cache entries separate per Škoda key', async () => {
    skodaApi.respondWith(() =>
      HttpResponse.json(vehicleBody(VIN), { headers: { 'X-API-Key-Expires-At': KEY_EXPIRES_AT } })
    );
    const proxy = createTestApp();
    const issue = async (apiKey: string) =>
      ((await (await proxy.issueToken({ apiKey, vin: VIN })).json()) as { token: string }).token;
    const first = await issue(API_KEY);
    const second = await issue('another-skoda-key');
    skodaApi.requests.length = 0;

    await proxy.getVehicle(VIN, first);
    await proxy.getVehicle(VIN, second);

    expect(skodaApi.requests.map((request) => request.apiKey)).toEqual([API_KEY, 'another-skoda-key']);
  });

  it('does not cache when CACHE_TTL_SECONDS is 0', async () => {
    const proxy = createTestApp({ cacheTtlSeconds: 0 });
    const token = await issueValidToken(proxy);

    await proxy.getVehicle(VIN, token);
    await proxy.getVehicle(VIN, token);

    expect(skodaApi.requests).toHaveLength(2);
  });

  it.each([
    [401, 401, 'key-revoked'],
    [403, 403, 'vehicle-access-denied'],
    [404, 404, 'vehicle-not-found'],
    [500, 502, 'upstream-unavailable'],
    [503, 502, 'upstream-unavailable'],
  ])('maps Škoda %i to %i %s', async (upstreamStatus, status, type) => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);
    skodaApi.respondWith(
      () => HttpResponse.json({ detail: 'upstream detail', status: upstreamStatus }, { status: upstreamStatus })
    );

    const res = await proxy.getVehicle(VIN, token);

    expect(res.status).toBe(status);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ type: `urn:skoda-proxy:problem:${type}` });
    expect(text).not.toContain('upstream detail');
  });

  it.each([
    ['its Retry-After', { 'Retry-After': '12' }, '12'],
    ['a default Retry-After', {}, '60'],
  ])('passes Škoda rate limiting through with %s', async (_, headers, retryAfter) => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);
    skodaApi.respondWith(
      () => new HttpResponse(null, { status: 429, headers: { ...headers, 'RateLimit-Remaining': '0' } })
    );

    const res = await proxy.getVehicle(VIN, token);

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:rate-limited' });
    expect(res.headers.get('Retry-After')).toBe(retryAfter);
    expect(res.headers.get('RateLimit-Remaining')).toBe('0');
  });

  it('does not follow upstream redirects', async () => {
    const proxy = createTestApp();
    const token = await issueValidToken(proxy);
    const attackerHits: string[] = [];
    skodaApi.server.use(
      http.all('https://attacker.example.com/*', ({ request }) => {
        attackerHits.push(request.url);
        return HttpResponse.json(vehicleBody(VIN));
      })
    );
    skodaApi.respondWith(
      () => new HttpResponse(null, { status: 302, headers: { Location: 'https://attacker.example.com/' } })
    );

    const res = await proxy.getVehicle(VIN, token);

    expect(res.status).toBe(502);
    expect(attackerHits).toHaveLength(0);
  });

  it('rate limits per token', async () => {
    const proxy = createTestApp({ cacheTtlSeconds: 0 });
    const token = await issueValidToken(proxy);
    for (let i = 0; i < 30; i++) {
      expect((await proxy.getVehicle(VIN, token)).status).toBe(200);
    }

    const res = await proxy.getVehicle(VIN, token);

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ type: 'urn:skoda-proxy:problem:rate-limited' });
  });

  it('rate limits unauthenticated attempts per client IP', async () => {
    const proxy = createTestApp();
    for (let i = 0; i < 60; i++) {
      await proxy.getVehicle(VIN, 'bogus');
    }

    expect((await proxy.getVehicle(VIN, 'bogus')).status).toBe(429);
  });

  it('only trusts X-Forwarded-For from configured proxies', async () => {
    const proxy = createTestApp({ trustedProxies: ['loopback'] });
    for (let i = 0; i < 60; i++) {
      await proxy.request(`/v1/vehicles/${VIN}`, {}, '127.0.0.1', '203.0.113.50');
    }

    const sameClient = await proxy.request(`/v1/vehicles/${VIN}`, {}, '127.0.0.1', '203.0.113.50');
    const otherClient = await proxy.request(`/v1/vehicles/${VIN}`, {}, '127.0.0.1', '203.0.113.51');
    const spoofed = await proxy.request(`/v1/vehicles/${VIN}`, {}, '198.51.100.9', '203.0.113.50');

    expect(sameClient.status).toBe(429);
    expect(otherClient.status).toBe(401);
    expect(spoofed.status).toBe(401);
  });
});

describe('logging', () => {
  it('never logs the API key, the token or the full VIN', async () => {
    const proxy = createTestApp();
    const issued = await proxy.issueToken({ apiKey: API_KEY, vin: VIN });
    const { token } = (await issued.json()) as { token: string };
    await proxy.getVehicle(VIN, token);
    await proxy.getVehicle(OTHER_VIN, token);
    await proxy.getVehicle(VIN.toLowerCase(), token);
    await proxy.request(`/v1/vehicles/${VIN}%2F..`, { headers: { Authorization: `Bearer ${token}` } });
    await proxy.request(`/v1/vehicles/${VIN}%00`, { headers: { Authorization: `Bearer ${token}` } });
    await proxy.request(`/v1/${VIN}`);
    await proxy.issueToken({ apiKey: API_KEY, vin: 'invalid' });

    const logs = proxy.logs();
    expect(logs).toContain('"route":"/v1/vehicles/:vin"');
    expect(logs).toContain('"vin":"…0001"');
    expect(logs).not.toContain(API_KEY);
    expect(logs).not.toContain(token);
    for (const vin of [VIN, OTHER_VIN]) {
      expect(logs.toUpperCase()).not.toContain(vin);
    }
  });
});
