import createClient from 'openapi-fetch';

import type { paths } from '@/types/stromligning';
import { API_BASE } from './config';

export const apiClient = createClient<paths>({
  baseUrl: API_BASE,
  // Resolve fetch per call so MSW, which patches fetch after this module loads, intercepts requests
  fetch: (request) => globalThis.fetch(request),
});
