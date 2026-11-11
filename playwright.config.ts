import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 15000,
  expect: { timeout: 5000 },
  use: { baseURL: 'http://localhost:4173/MedidasCuerpo/', trace: 'off' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/MedidasCuerpo/',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
