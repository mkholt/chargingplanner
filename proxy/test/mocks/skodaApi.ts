import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { components } from '@/types/skoda';
import { SKODA_API_BASE } from '@proxy/upstream';

export const VIN = 'TMBJR7NX5PY000001';
export const OTHER_VIN = 'TMBAH7NX1PY000002';
export const API_KEY = 'skoda-test-api-key-1234567890';
export const KEY_EXPIRES_AT = '2027-03-01T00:00:00.000Z';

export type RecordedRequest = { url: URL; apiKey: string | null };

export const vehicleBody = (vin: string) =>
  ({
    vehicle: {
      vin,
      name: 'Enyaq',
      charging: {
        isVehicleInSavedLocation: false,
        status: { state: 'READY_FOR_CHARGING', battery: { stateOfChargeInPercent: 64 } },
      },
    },
    errors: [],
  }) satisfies components['schemas']['VehicleResponse'];

const problemResponse = (status: number, type: string) =>
  HttpResponse.json(
    { type: `${SKODA_API_BASE}/problems/${type}`, title: 'Error', status, detail: 'upstream detail' },
    { status, headers: { 'Content-Type': 'application/problem+json' } }
  );

const requests: RecordedRequest[] = [];
const vehiclePath = `${SKODA_API_BASE}/api/v1/vehicles/:vin`;

// Mirrors the Škoda API: unknown keys get 401, a valid key for another vehicle gets 403
const vehicleHandler = http.get(vehiclePath, ({ request, params }) => {
  const apiKey = request.headers.get('X-API-Key');
  requests.push({ url: new URL(request.url), apiKey });
  if (apiKey !== API_KEY) return problemResponse(401, 'api-key-expired');
  if (params.vin !== VIN) return problemResponse(403, 'api-key-not-authorized');
  return HttpResponse.json(vehicleBody(VIN), {
    headers: {
      'X-API-Key-Expires-At': KEY_EXPIRES_AT,
      'RateLimit-Limit': '100',
      'RateLimit-Remaining': '99',
      'RateLimit-Reset': '30',
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
  respondWith: (resolver: (request: Request) => Response | Promise<Response>) =>
    server.use(
      http.get(vehiclePath, ({ request }) => {
        requests.push({ url: new URL(request.url), apiKey: request.headers.get('X-API-Key') });
        return resolver(request);
      })
    ),
  reset: () => {
    server.resetHandlers();
    requests.length = 0;
  },
};
