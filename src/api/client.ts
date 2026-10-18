import createClient from 'openapi-fetch';

import type { paths } from '@/types/stromligning';
import { API_BASE } from './config';

export const apiClient = createClient<paths>({
  baseUrl: API_BASE,
  // Resolve fetch per request so interceptors installed after module load (e.g. MSW in tests) apply
  fetch: (request) => globalThis.fetch(request),
});
