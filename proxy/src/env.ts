import type { IncomingMessage } from 'node:http';

import type { RateLimitInfo } from 'hono-rate-limiter';

import type { VehicleTokenClaims } from '@proxy/tokens';

export type AppEnv = {
  Bindings: {
    /** Set by @hono/node-server; absent when the app is invoked directly (tests). */
    incoming?: IncomingMessage;
  };
  Variables: {
    /** Client IP (IPv6 grouped by /64), used as the per-client rate-limit key. */
    clientKey: string;
    vehicleToken: VehicleTokenClaims;
    /** Validated VIN of the request, logged masked. */
    vin: string | undefined;
    rateLimit: RateLimitInfo;
  };
};
