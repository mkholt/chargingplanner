import type { components } from '@/types/skoda';

export type SkodaVehicle = components['schemas']['Vehicle'];
type VehicleResponse = components['schemas']['VehicleResponse'];

export type SkodaToken = {
  token: string;
  vin: string;
  /** ISO 8601 timestamp; the token and the Škoda key behind it stop working then */
  expiresAt: string;
};

/** Problem types the proxy returns (RFC 9457 `type` without the URN prefix) */
export type SkodaProblemType =
  | 'invalid-request'
  | 'unauthorized'
  | 'vin-not-allowed'
  | 'invalid-api-key'
  | 'key-revoked'
  | 'vehicle-access-denied'
  | 'vehicle-not-found'
  | 'rate-limited'
  | 'upstream-unavailable'
  | 'network-error'
  /** The proxy answered with something this app doesn't understand */
  | 'invalid-response'
  | 'unknown';

const PROBLEM_PREFIX = 'urn:skoda-proxy:problem:';

export class SkodaProxyError extends Error {
  readonly status: number;
  readonly problemType: SkodaProblemType;

  constructor(status: number, problemType: SkodaProblemType, message: string) {
    super(message);
    this.name = 'SkodaProxyError';
    this.status = status;
    this.problemType = problemType;
  }

  /** The token no longer grants access: the user has to link the car again */
  get requiresRelink(): boolean {
    return this.status === 401 || this.problemType === 'vin-not-allowed' || this.problemType === 'vehicle-access-denied';
  }
}

async function toError(response: Response): Promise<SkodaProxyError> {
  let problemType: SkodaProblemType = 'unknown';
  let title = response.statusText || `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { type?: unknown; title?: unknown };
    if (typeof body.type === 'string' && body.type.startsWith(PROBLEM_PREFIX)) {
      problemType = body.type.slice(PROBLEM_PREFIX.length) as SkodaProblemType;
    }
    if (typeof body.title === 'string') title = body.title;
  } catch {
    // Not a problem+json body (e.g. a reverse proxy error page)
  }
  return new SkodaProxyError(response.status, problemType, title);
}

async function request(input: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    // Resolve fetch per call so MSW, which patches fetch after this module loads, intercepts requests
    response = await globalThis.fetch(input, {
      ...init,
      // Tokens are bearer credentials: never send cookies and never follow redirects to another host
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
  } catch {
    throw new SkodaProxyError(0, 'network-error', 'Could not reach the Škoda proxy');
  }
  if (!response.ok) throw await toError(response);
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new SkodaProxyError(response.status, 'invalid-response', 'The Škoda proxy sent an invalid response');
  }
}

function invalidResponse(response: Response, detail: string): SkodaProxyError {
  return new SkodaProxyError(response.status, 'invalid-response', `The Škoda proxy sent an invalid response: ${detail}`);
}

/**
 * Exchange a Škoda API key for a proxy token bound to one VIN. The key is not stored anywhere.
 * The response must be a token for the requested VIN.
 */
export async function issueSkodaToken(baseUrl: string, apiKey: string, vin: string): Promise<SkodaToken> {
  const response = await request(`${baseUrl}/v1/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, vin }),
  });
  const body = (await readJson(response)) as Partial<Record<keyof SkodaToken, unknown>> | null;
  if (typeof body?.token !== 'string' || !body.token) throw invalidResponse(response, 'no token');
  if (body.vin !== vin) throw invalidResponse(response, 'token for another VIN');
  if (typeof body.expiresAt !== 'string' || Number.isNaN(Date.parse(body.expiresAt))) {
    throw invalidResponse(response, 'no expiry');
  }
  return { token: body.token, vin: body.vin, expiresAt: body.expiresAt };
}

/** Read the vehicle's info and charging state through the proxy */
export async function fetchSkodaVehicle(baseUrl: string, token: string, vin: string): Promise<SkodaVehicle> {
  const response = await request(`${baseUrl}/v1/vehicles/${encodeURIComponent(vin)}?include=info,charging`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await readJson(response)) as Partial<VehicleResponse> | null;
  if (typeof body?.vehicle !== 'object' || body.vehicle === null || body.vehicle.vin !== vin) {
    throw invalidResponse(response, 'no vehicle data for this VIN');
  }
  return body.vehicle;
}

/**
 * Check that the proxy answers (GET /healthz). False for anything else, such as the app's own page served by the
 * web server's fallback route when no proxy is deployed.
 */
export async function checkSkodaProxyHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await request(`${baseUrl}/healthz`, {});
    const body = (await response.json()) as { status?: unknown };
    return body.status === 'ok';
  } catch {
    return false;
  }
}
