import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

// Reporter output folders are resolved against the current working directory,
// while testDir/outputDir are resolved against this config file. Pin both to
// the repository root so artifacts land in the same place from any cwd.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Enable parallel test execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4, // Use more workers locally
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(repoRoot, 'playwright-report'), open: 'never' }],
  ],
  outputDir: path.join(repoRoot, 'test-results'),
  timeout: 30000, // 30 seconds per test (reduced from 60)
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 seconds for actions (reduced from 15)
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to enable Firefox testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    // Uncomment after running: npx playwright install webkit
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_USE_MOCK_API: 'true',
    },
  },
});
