import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Content-Security-Policy for production builds (docs/skoda-proxy-spec.md §7).
 * It limits where scripts load from and where data can be sent, which makes stealing
 * Škoda tokens through XSS harder. Not applied in development: Vite's dev server needs
 * an inline React Refresh script and a websocket.
 */
function buildCsp(env: Record<string, string>): string {
  const priceApiOrigin = new URL(env.VITE_API_BASE || 'https://stromligning.dk').origin;
  // With a build-time proxy URL, only that origin is allowed. Without one, users enter their own
  // proxy URL in the settings, so any https origin has to be allowed.
  const skodaProxySource = env.VITE_SKODA_PROXY_URL ? new URL(env.VITE_SKODA_PROXY_URL).origin : 'https:';
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Fluent UI (Griffel) inserts <style> elements at runtime
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${priceApiOrigin} ${skodaProxySource}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function contentSecurityPolicy(csp: string): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    // Right after the charset declaration, which has to stay first, and before any script
    transformIndexHtml: html => {
      const charset = /(<meta charset="UTF-8" \/>)/;
      if (!charset.test(html)) throw new Error('index.html needs <meta charset="UTF-8" /> to place the CSP after');
      return html.replace(charset, `$1\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tsconfigPaths(),
    contentSecurityPolicy(buildCsp(loadEnv(mode, process.cwd(), 'VITE_'))),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ev-charging-logo.svg'],
      manifest: {
        name: 'EV Charging Planner',
        short_name: 'EV Charge',
        description: 'Find the cheapest time to charge your electric vehicle',
        theme_color: '#0078D4',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Only price data is cached. Škoda proxy responses are never cached: they are per-user and
        // short-lived, and the proxy marks them `Cache-Control: no-store`.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/stromligning\.dk\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
}));
