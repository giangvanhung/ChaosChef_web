// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  // Nhiều test dùng PeerJS THẬT qua mạng Internet (cloud signaling + TURN công
  // cộng) — chạy song song dễ đụng độ / vượt rate-limit, nên chạy tuần tự.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8934',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node ./tests/static-server.js',
    url: 'http://127.0.0.1:8934/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
