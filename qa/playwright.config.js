const { defineConfig, devices } = require('@playwright/test');

const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4200';
const backendPort = process.env.PORT || '3001';
const backendUrl = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;
const startServers = process.env.QA_START_SERVERS !== '0';

if (!process.env.LOGIN_RATE_LIMIT_MAX) {
  process.env.LOGIN_RATE_LIMIT_MAX = '1000';
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: require.resolve('./scripts/global-setup'),
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: startServers
    ? [
        {
          command: 'npm run dev --prefix ../Backend',
          url: `${backendUrl}/health`,
          reuseExistingServer: true,
          timeout: 120_000
        },
        {
          command: 'npm start --prefix ../frontend -- --host 127.0.0.1 --port 4200',
          url: frontendUrl,
          reuseExistingServer: true,
          timeout: 180_000
        }
      ]
    : undefined
});
