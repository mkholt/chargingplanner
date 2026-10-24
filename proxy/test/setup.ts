import { afterAll, afterEach, beforeAll } from 'vitest';

import { skodaApi } from './mocks/skodaApi';

// Any request that is not explicitly mocked fails the test: the proxy must never reach the real API
beforeAll(() => skodaApi.server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => skodaApi.reset());
afterAll(() => skodaApi.server.close());
