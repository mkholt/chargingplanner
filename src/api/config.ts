// Centralized API configuration
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://stromligning.dk';
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
/**
 * Škoda proxy URL, fixed at build time. Users can't change it: Škoda tokens are only ever sent here.
 * Without it, the Škoda connection is not available.
 */
export const SKODA_PROXY_URL = import.meta.env.VITE_SKODA_PROXY_URL || '';
