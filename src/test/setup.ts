import { afterAll, afterEach, beforeAll } from 'vitest';

import '@/i18n'; // Initialize i18n for tests
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset handlers after each test (removes any runtime handlers added during tests)
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
