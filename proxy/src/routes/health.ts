import { Hono } from 'hono';

import type { AppEnv } from '@proxy/env';

export const healthRoutes = () => new Hono<AppEnv>().get('/healthz', (c) => c.json({ status: 'ok' }));
