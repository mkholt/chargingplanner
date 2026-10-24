import { VIN_PATTERN } from '@/utils';
import type { components } from '@/types/skoda';

/** Mock Škoda proxy, at /api/skoda on any origin like the real one */
export const MOCK_SKODA = {
  PROXY_PATH: '/api/skoda',
  /** localStorage key: when set, the mock answers like a web server without a proxy (the app page) */
  ABSENT_STORAGE_KEY: 'mock-skoda-proxy-absent',
  VIN: 'TMBJJ7NE8L0123456',
  API_KEY: 'mock-skoda-api-key',
  /** Rejected by the mock proxy at issuance (422 invalid-api-key) */
  INVALID_API_KEY: 'invalid-skoda-api-key',
  /** Issues a token that the mock proxy later answers with 401 key-revoked */
  REVOKED_API_KEY: 'revoked-skoda-api-key',
  STATE_OF_CHARGE: 64,
  TARGET_STATE_OF_CHARGE: 90,
  VEHICLE_NAME: 'Enyaq iV 80',
  /** Token lifetime in days */
  TOKEN_DAYS: 90,
} as const;

const TOKEN_PREFIX = 'mock-token.';
const REVOKED_TOKEN_PREFIX = 'mock-revoked-token.';

const PROBLEM_TITLES = {
  'invalid-request': 'Invalid request',
  'invalid-api-key': 'The Škoda API key is not valid for this vehicle',
  unauthorized: 'Missing or invalid token',
  'key-revoked': 'The Škoda API key was revoked or has expired',
  'vin-not-allowed': 'The token is not valid for this vehicle',
} as const;

export type MockProblemType = keyof typeof PROBLEM_TITLES;

export function mockProblem(status: number, type: MockProblemType) {
  return {
    status,
    body: { type: `urn:skoda-proxy:problem:${type}`, title: PROBLEM_TITLES[type], status },
  };
}

/** Result of POST /v1/tokens: a token bound to the VIN, or a problem */
export function issueMockToken(apiKey: unknown, vin: unknown) {
  if (typeof apiKey !== 'string' || !apiKey || typeof vin !== 'string' || !VIN_PATTERN.test(vin)) {
    return mockProblem(400, 'invalid-request');
  }
  if (apiKey === MOCK_SKODA.INVALID_API_KEY) return mockProblem(422, 'invalid-api-key');

  const prefix = apiKey === MOCK_SKODA.REVOKED_API_KEY ? REVOKED_TOKEN_PREFIX : TOKEN_PREFIX;
  const expiresAt = new Date(Date.now() + MOCK_SKODA.TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { status: 201, body: { token: `${prefix}${vin}`, vin, expiresAt } };
}

/** Result of GET /v1/vehicles/{vin} for an Authorization header */
export function getMockVehicle(authorization: string | null, vin: string) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
  if (token?.startsWith(REVOKED_TOKEN_PREFIX)) return mockProblem(401, 'key-revoked');
  if (!token?.startsWith(TOKEN_PREFIX)) return mockProblem(401, 'unauthorized');
  if (token.slice(TOKEN_PREFIX.length) !== vin) return mockProblem(403, 'vin-not-allowed');

  const body: components['schemas']['VehicleResponse'] = {
    vehicle: {
      vin,
      name: MOCK_SKODA.VEHICLE_NAME,
      charging: {
        isVehicleInSavedLocation: true,
        status: {
          state: 'READY_FOR_CHARGING',
          battery: {
            stateOfChargeInPercent: MOCK_SKODA.STATE_OF_CHARGE,
            remainingCruisingRangeInMeters: 285_000,
          },
        },
        settings: {
          targetStateOfChargeInPercent: MOCK_SKODA.TARGET_STATE_OF_CHARGE,
        },
      },
    },
  };
  return { status: 200, body };
}
