const { defineConfig } = require('@playwright/test');

// E2E contra build local (site estático): nunca toca na produção nem na D1.
// Os endpoints /api/announcements e /api/stats são mockados por fixtures determinísticas nos specs.
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  webServer: {
    command: 'npx http-server . -p 4173 --silent',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
