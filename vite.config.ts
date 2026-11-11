import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/MedidasCuerpo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'MedidasCuerpo',
        short_name: 'Medidas',
        description: 'Control semanal de peso y medidas corporales de la familia',
        lang: 'es',
        display: 'standalone',
        start_url: '/MedidasCuerpo/',
        scope: '/MedidasCuerpo/',
        theme_color: '#0e7c7b',
        background_color: '#eef2f1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
