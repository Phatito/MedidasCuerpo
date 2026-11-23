import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Versión del lector de capturas: nombra su carpeta en ocr/ y su caché.
const VERSION_LECTOR: string = JSON.parse(readFileSync(new URL('./node_modules/tesseract.js/package.json', import.meta.url), 'utf8')).version

// GitHub Pages sirve la app bajo /MedidasCuerpo/; otros hosts (Vercel) la sirven en la raíz con VITE_BASE=/.
const base = process.env.VITE_BASE ?? '/MedidasCuerpo/'

export default defineConfig({
  base,
  define: { __VERSION_LECTOR__: JSON.stringify(VERSION_LECTOR) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'favicon.svg', 'apple-touch-icon.png', 'logo.svg'],
      // La tipografía también se guarda en el dispositivo: sin esto la app sin conexión caería a la fuente del sistema.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        // El lector de capturas (unos 6 MB) no se precarga: se guarda la primera vez que se usa y desde ahí funciona sin conexión.
        globIgnores: ['ocr/**'],
        runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.includes('/ocr/'), handler: 'CacheFirst', options: { cacheName: `lector-ocr-${VERSION_LECTOR}` } }],
      },
      manifest: {
        name: 'Mesura',
        short_name: 'Mesura',
        description: 'Control semanal de peso y medidas corporales de la familia',
        lang: 'es',
        display: 'standalone',
        start_url: base,
        scope: base,
        theme_color: '#0e1220',
        background_color: '#0e1220',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
