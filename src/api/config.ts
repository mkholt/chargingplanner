// Centralized API configuration
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://stromligning.dk';
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
/** Path of the Škoda proxy on the app's own origin; the web server strips it before passing requests on */
export const SKODA_PROXY_PATH = '/api/skoda';
/**
 * The Škoda proxy is served from the app's own origin, so tokens never leave it and the CSP needs no extra source.
 * Whether one is deployed there is detected at runtime (SkodaProxyContext).
 */
export const SKODA_PROXY_URL = `${window.location.origin}${SKODA_PROXY_PATH}`;
