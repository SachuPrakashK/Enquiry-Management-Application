import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4201',
    channel: process.env['PLAYWRIGHT_CHANNEL'] || 'msedge',
    headless: true,
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/serve.mjs',
    url: 'http://127.0.0.1:4201/api/statuses',
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [['list']],
  outputDir: '.test-output/browser-results',
});
