import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  }
});
