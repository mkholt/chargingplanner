import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { SKODA_API_BASE } from '@proxy/upstream';

export const VIN = 'TMBJR7NX5PY000001';
export const OTHER_VIN = 'TMBAH7NX1PY000002';
export const API_KEY = 'skoda-test-api-key-1234567890';
export const KEY_EXPIRES_AT = '2027-03-01T00:00:00.000Z';

export type RecordedRequest = { url: URL; apiKey: string | null };

export const vehicleBody = (vin: string) => ({
  vehicle: {
    vin,
    name: 'Enyaq',
    charging: { isVehicleInSavedLocation: false, status: { state: 'READY_FOR_CHARGING' } },
  },
  errors: [],
});

const requests: RecordedRequest[] = [];

const vehicleHandler = http.get(`${SKODA_API_BASE}/api/v1/vehicles/:vin`, ({ request, params }) => {
  const apiKey = request.headers.get('X-API-Key');
  requests.push({ url: new URL(request.url), apiKey });
  if (apiKey !== API_KEY || params.vin !== VIN) {
    return HttpResponse.json(
      { title: 'Unauthorized', status: 401 },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
    );
  }
  return HttpResponse.json(vehicleBody(VIN), {
    headers: {
      'X-API-Key-Expires-At': KEY_EXPIRES_AT,
      'RateLimit-Limit': '100',
      'RateLimit-Remaining': '99',
      'RateLimit-Reset': '30',
      traceid: 'trace-123',
      'Set-Cookie': 'upstream=secret',
      'X-Internal-Header': 'internal',
    },
  });
});

const server = setupServer(vehicleHandler);

export const skodaApi = {
  server,
  requests,
  /** Replaces the vehicle endpoint for the current test. */
  respondWith: (resolver: () => Response | Promise<Response>) =>
    server.use(http.get(`${SKODA_API_BASE}/api/v1/vehicles/:vin`, ({ request }) => {
      requests.push({ url: new URL(request.url), apiKey: request.headers.get('X-API-Key') });
      return resolver();
    })),
  reset: () => {
    server.resetHandlers();
    requests.length = 0;
  },
};
