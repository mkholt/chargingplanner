import createClient from 'openapi-fetch';

import type { components, paths } from '@/types/skoda';

/** Fixed upstream host. Nothing in an incoming request can change where the proxy connects. */
export const SKODA_API_BASE = 'https://public.api.connect.skoda-auto.cz';
const UPSTREAM_TIMEOUT_MS = 10_000;

/** Upstream response headers passed through to the browser. Everything else is dropped. */
export const FORWARDED_HEADERS = [
  'RateLimit-Limit',
  'RateLimit-Remaining',
  'RateLimit-Reset',
  'Retry-After',
  'X-API-Key-Expires-At',
] as const;

export type UpstreamResult = {
  status: number;
  body: unknown;
  headers: Record<string, string>;
};

export class UpstreamUnavailableError extends Error {}

export type SkodaClient = {
  getVehicle: (
    vin: string,
    apiKey: string,
    include: components['schemas']['VehiclePart'][]
  ) => Promise<UpstreamResult>;
};

export const createSkodaClient = (): SkodaClient => {
  const client = createClient<paths>({
    baseUrl: SKODA_API_BASE,
    redirect: 'error',
    // Resolve fetch per call so test interceptors (MSW) apply
    fetch: (request) => globalThis.fetch(request),
    // Škoda expects include=info,charging (OpenAPI explode: false)
    querySerializer: { array: { style: 'form', explode: false } },
  });

  return {
    getVehicle: async (vin, apiKey, include) => {
      try {
        const { data, response } = await client.GET('/api/v1/vehicles/{vin}', {
          params: { path: { vin }, query: { include } },
          headers: { 'X-API-Key': apiKey },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        const headers: Record<string, string> = {};
        for (const name of FORWARDED_HEADERS) {
          const value = response.headers.get(name);
          if (value !== null) headers[name] = value;
        }
        return {
          status: response.status,
          body: data,
          headers,
        };
      } catch (cause) {
        throw new UpstreamUnavailableError('Škoda API request failed', { cause });
      }
    },
  };
};
