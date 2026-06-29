import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const API_HEALTH = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/health`;

/**
 * Playwright config for the TaskFlow happy-path e2e. Boots the API and web dev
 * servers (reusing already-running ones locally) before running the suite.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @taskflow/api dev',
      url: API_HEALTH,
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @taskflow/web dev',
      url: WEB_URL,
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '../..',
    },
  ],
});
