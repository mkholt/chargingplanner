import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { UpstreamResult } from '@proxy/upstream';

export type ProblemType =
  | 'invalid-request'
  | 'unauthorized'
  | 'vin-not-allowed'
  | 'invalid-api-key'
  | 'key-revoked'
  | 'vehicle-access-denied'
  | 'vehicle-not-found'
  | 'payload-too-large'
  | 'rate-limited'
  | 'upstream-unavailable'
  | 'not-found'
  | 'internal-error';

/** RFC 9457 problem details response. */
export const problem = (
  c: Context,
  status: ContentfulStatusCode,
  type: ProblemType,
  title: string,
  headers: Record<string, string> = {}
) =>
  c.body(
    JSON.stringify({ type: `urn:skoda-proxy:problem:${type}`, title, status }),
    status,
    { ...headers, 'Content-Type': 'application/problem+json' }
  );

/** Upstream outcomes every route handles the same way: rate limiting is passed through, anything else is a 502. */
export const upstreamProblem = (c: Context, result: UpstreamResult) =>
  result.status === 429
    ? problem(c, 429, 'rate-limited', 'Škoda API rate limit exceeded', {
        ...result.headers,
        'Retry-After': result.headers['Retry-After'] ?? '60',
      })
    : problem(c, 502, 'upstream-unavailable', 'Škoda API is unavailable');
