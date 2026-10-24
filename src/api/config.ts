// Centralized API configuration
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://stromligning.dk';
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
/** Optional build-time default for the Škoda proxy URL (users can change it in settings) */
export const SKODA_PROXY_DEFAULT_URL = import.meta.env.VITE_SKODA_PROXY_URL || '';
