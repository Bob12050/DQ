import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://localhost:5173/',
  },
  projects: [
    {
      name: 'iphone-landscape-844',
      use: { ...devices['iPhone 12'], viewport: { width: 844, height: 390 } },
    },
    {
      name: 'iphone-landscape-932',
      use: { ...devices['iPhone 14 Pro Max'], viewport: { width: 932, height: 430 } },
    },
    {
      name: 'iphone-portrait',
      use: { ...devices['iPhone 12'], viewport: { width: 390, height: 844 } },
    },
  ],
});
