// Genera las imágenes de prueba de la captura de Xiaomi Home a partir de captura-xiaomi.html (números inventados).
// Uso: node e2e/fixtures/generar-capturas.cjs
const { chromium } = require('playwright')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
;(async () => {
  const dir = __dirname
  const html = 'file://' + path.join(dir, 'captura-xiaomi.html')
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 414, height: 900 }, deviceScaleFactor: 3 })
  await p.goto(html)
  await p.screenshot({ path: path.join(dir, 'captura-xiaomi.png'), fullPage: true })
  await p.goto(html + '?claro')
  await p.screenshot({ path: path.join(dir, 'captura-xiaomi-clara.png'), fullPage: true })
  await b.close()
  // La "comprimida", como llega por mensajería: 216 px de ancho.
  execFileSync('convert', [path.join(dir, 'captura-xiaomi.png'), '-resize', '216x', path.join(dir, 'captura-xiaomi-chica.png')])
})()
