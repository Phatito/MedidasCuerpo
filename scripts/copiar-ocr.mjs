// Copia los archivos del lector de capturas (tesseract.js) a public/ocr/, para servirlos desde el propio sitio:
// la app no pide nada a otros dominios. Se ejecuta antes de `dev` y de `build`.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'public', 'ocr')
const archivos = [
  'node_modules/tesseract.js/dist/worker.min.js',
  'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'node_modules/@tesseract.js-data/spa/4.0.0/spa.traineddata.gz',
]
mkdirSync(destino, { recursive: true })
for (const a of archivos) copyFileSync(join(raiz, a), join(destino, a.split('/').pop()))
console.log(`Lector de capturas: ${archivos.length} archivos en public/ocr`)
