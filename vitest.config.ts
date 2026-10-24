import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/test/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/polyfills.ts', 'src/test/setup.ts'],
    // Same URL as MOCK_SKODA.PROXY_URL; the Škoda connection is only available with a build-time proxy URL
    env: { VITE_SKODA_PROXY_URL: 'https://skoda-proxy.example' },
  },
});
