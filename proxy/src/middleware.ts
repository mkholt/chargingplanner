import { zValidator } from '@hono/zod-validator';
import type { Context, ValidationTargets } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import type { z } from 'zod';

import type { AppEnv } from '@proxy/env';
import { problem } from '@proxy/problem';

const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Fixed-window rate limit per key. Our own RateLimit-* headers are not sent, so the
 * Škoda RateLimit-* headers passed through on vehicle reads stay unambiguous.
 */
export const limitRequests = ({
  limit,
  keyGenerator,
}: {
  limit: number;
  keyGenerator: (c: Context<AppEnv>) => string;
}) =>
  rateLimiter<AppEnv>({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: false,
    keyGenerator,
    handler: (c) => {
      const resetTime = c.get('rateLimit').resetTime;
      const retryAfter = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : RATE_LIMIT_WINDOW_MS / 1000;
      return problem(c, 429, 'rate-limited', 'Too many requests', { 'Retry-After': String(retryAfter) });
    },
  });

/** zod validation that answers with an RFC 9457 problem, naming offending fields but never echoing values. */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.') || target))];
      return problem(c, 400, 'invalid-request', `Invalid request: ${fields.join(', ')}`);
    }
  });
