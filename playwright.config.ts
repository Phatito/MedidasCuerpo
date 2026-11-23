import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 15000,
  expect: { timeout: 5000 },
  use: { baseURL: 'http://localhost:4173/MedidasCuerpo/', trace: 'off' },
  webServer: [
    {
      // La compilación de pruebas apunta al servidor de sincronización local.
      command: 'VITE_SYNC_URL=http://localhost:8787 npm run build && npm run preview',
      url: 'http://localhost:4173/MedidasCuerpo/',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'node --experimental-strip-types servidor/dev.ts 8787',
      url: 'http://localhost:8787/piezas',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
})
