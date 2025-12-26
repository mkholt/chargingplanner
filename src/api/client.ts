import createClient from 'openapi-fetch';

import type { paths } from '@/types/stromligning';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://stromligning.dk';

export const apiClient = createClient<paths>({
  baseUrl: API_BASE,
});
