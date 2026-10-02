import { defineConfig, devices } from '@playwright/test';

// Set E2E_BASE_URL to run the same tests against a deployed site, e.g.
//   E2E_BASE_URL=https://tallyproof.pages.dev pnpm test:e2e
const remote = process.env['E2E_BASE_URL'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: remote ?? 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  ...(remote
    ? {}
    : {
        webServer: {
          command: 'pnpm exec astro preview --port 4321',
          url: 'http://localhost:4321',
          reuseExistingServer: true,
          timeout: 60000,
        },
      }),
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
