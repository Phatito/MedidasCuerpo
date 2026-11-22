import type { LineaOcr } from '../domain/capturaXiaomi'
import { debeInvertir, tamanoOcr } from '../domain/imagen'

/**
 * Lee el texto de una imagen en este mismo navegador: la imagen nunca sale del dispositivo.
 * El lector (tesseract.js) se carga solo al usarlo, desde los archivos de `ocr/` del propio sitio.
 */
export async function reconocerImagen(imagen: Blob, alProgreso?: (fraccion: number) => void): Promise<{ lineas: LineaOcr[]; ancho: number }> {
  const lienzo = await preparar(imagen)
  const { createWorker } = await import('tesseract.js')
  const base = `${import.meta.env.BASE_URL}ocr`
  const worker = await createWorker('spa', 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: base,
    langPath: base,
    gzip: true,
    workerBlobURL: false,
    // El service worker ya guarda los archivos; no hace falta una segunda copia en IndexedDB.
    cacheMethod: 'none',
    logger: (m) => {
      if (m.status === 'recognizing text') alProgreso?.(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(lienzo, {}, { blocks: true, text: false })
    const lineas: LineaOcr[] = []
    for (const bloque of data.blocks ?? [])
      for (const parrafo of bloque.paragraphs)
        for (const linea of parrafo.lines) lineas.push(linea.words.map((w) => ({ texto: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 })))
    return { lineas, ancho: lienzo.width }
  } finally {
    await worker.terminate()
  }
}

/** Gris, invertida si es una captura en modo oscuro, y a 620 px de ancho. */
async function preparar(imagen: Blob): Promise<HTMLCanvasElement> {
  const mapa = await createImageBitmap(imagen)
  const { ancho, alto } = tamanoOcr(mapa.width, mapa.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mapa, 0, 0, ancho, alto)
  mapa.close()
  const pixeles = ctx.getImageData(0, 0, ancho, alto)
  const d = pixeles.data
  let suma = 0
  for (let i = 0; i < d.length; i += 4) {
    const gris = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    d[i] = d[i + 1] = d[i + 2] = gris
    suma += gris
  }
  if (debeInvertir(suma / (d.length / 4))) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i]
  ctx.putImageData(pixeles, 0, 0)
  return lienzo
}
