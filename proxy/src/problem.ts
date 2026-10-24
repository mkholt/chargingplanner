import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

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
