import { readFileSync } from 'node:fs';

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
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Fluent UI (Griffel) inserts <style> elements at runtime
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // The Škoda proxy is served from the app's own origin (/api/skoda), so 'self' covers it
    `connect-src 'self' ${priceApiOrigin}`,
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

/** The release workflow sets the package version from the release tag before building */
const appVersion: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Like the production web server: /api/skoda goes to the proxy (npm run proxy:dev) without the prefix
    proxy: {
      '/api/skoda': {
        target: 'http://localhost:8080',
        rewrite: path => path.replace(/^\/api\/skoda/, ''),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
        // The Škoda proxy lives under /api/skoda: never answer it with the cached app page
        navigateFallbackDenylist: [/^\/api\//],
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
