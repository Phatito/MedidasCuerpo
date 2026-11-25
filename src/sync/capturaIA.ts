import { lecturaDesdeIA } from '../domain/capturaIA'
import type { LecturaCaptura } from '../domain/capturaXiaomi'
import { hayServidor, llamar } from './api'
import { leerSesion } from './sesion'

const ANCHO_MAXIMO = 1280
const ALTO_MAXIMO = 14000
const MAX_BASE64 = 3_800_000

/** Hay IA para leer capturas con conexión (con o sin cuenta; con cuenta el límite diario es mayor). */
export async function puedeLeerConIA(): Promise<boolean> {
  return hayServidor() && navigator.onLine
}

/**
 * Manda las capturas a tu servidor, que se las pasa a Gemini para leerlas (no se guardan).
 * Devuelve null si no se pudo leer nada; lanza si el servidor o la conexión fallan.
 */
export async function leerConIA(imagenes: Blob[]): Promise<LecturaCaptura | null> {
  const sesion = await leerSesion()
  const preparadas = await Promise.all(imagenes.map(aJpeg))
  const r = await llamar<{ lectura: unknown }>('POST', '/leer-captura', { cuerpo: { imagenes: preparadas }, token: sesion?.token })
  return lecturaDesdeIA(r.lectura)
}

/** JPEG de hasta 1280 px de ancho: nítido para leer y liviano para enviar. */
async function aJpeg(imagen: Blob): Promise<{ tipo: string; datos: string }> {
  const mapa = await createImageBitmap(imagen)
  const escala = Math.min(1, ANCHO_MAXIMO / mapa.width, ALTO_MAXIMO / mapa.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(mapa.width * escala)
  lienzo.height = Math.round(mapa.height * escala)
  const ctx = lienzo.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
  mapa.close()
  for (const calidad of [0.9, 0.8, 0.65, 0.5]) {
    const datos = lienzo.toDataURL('image/jpeg', calidad).split(',')[1]
    if (datos.length <= MAX_BASE64) return { tipo: 'image/jpeg', datos }
  }
  return { tipo: 'image/jpeg', datos: lienzo.toDataURL('image/jpeg', 0.4).split(',')[1] }
}
