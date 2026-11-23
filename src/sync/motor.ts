import { alCambiarLocal, aplicarRemotas, marcarSubidas, pendientesDeSubir, type ContenidoPieza } from '../storage/db'
import { ErrorApi, hayServidor, llamar } from './api'
import { cifrar, descifrar, idOpaco } from './cripto'
import { guardarCursor, leerSesion, olvidarSesion } from './sesion'

export type EstadoSync =
  | { tipo: 'sin-sesion' }
  | { tipo: 'al-dia'; desde: number }
  | { tipo: 'sincronizando' }
  | { tipo: 'sin-conexion' }
  | { tipo: 'error'; motivo: string }
  | { tipo: 'sesion-terminada' }

const SUBIDA_POR_LLAMADA = 40
// El servidor no acepta piezas de más de 16 KB.
const MAX_PIEZA = 16 * 1024
const ESPERA_TRAS_CAMBIO = 3_000
const CADA = 5 * 60_000

let estado: EstadoSync = { tipo: 'sin-sesion' }
const oyentes = new Set<(e: EstadoSync) => void>()
function fijar(e: EstadoSync) {
  estado = e
  for (const fn of oyentes) fn(e)
}
export function suscribirEstado(fn: (e: EstadoSync) => void): () => void {
  oyentes.add(fn)
  fn(estado)
  return () => oyentes.delete(fn)
}
export const avisarSinSesion = () => fijar({ tipo: 'sin-sesion' })

let enCurso: Promise<void> | null = null

/** Un ciclo: subir lo pendiente (cifrado) y bajar lo nuevo desde el último cursor. */
export function sincronizarAhora(): Promise<void> {
  if (!enCurso) enCurso = ciclo().finally(() => (enCurso = null))
  return enCurso
}

async function ciclo(): Promise<void> {
  const s = await leerSesion()
  if (!s || !hayServidor()) {
    fijar({ tipo: 'sin-sesion' })
    return
  }
  fijar({ tipo: 'sincronizando' })
  try {
    // Subir, de a 40 piezas.
    // Se cifra todo primero: una pieza demasiado grande queda pendiente, pero no frena al resto.
    const porId = new Map<string, ContenidoPieza>()
    const listas: { id: string; cifrado: string; editadoEn: number }[] = []
    let grandes = 0
    for (const p of await pendientesDeSubir()) {
      const id = await idOpaco(s.ids, p.idLogico)
      const cifrado = await cifrar(s.cifrado, p)
      if (cifrado.length > MAX_PIEZA) {
        grandes++
        continue
      }
      porId.set(id, p)
      listas.push({ id, cifrado, editadoEn: p.editadoEn })
    }
    for (let i = 0; i < listas.length; i += SUBIDA_POR_LLAMADA) {
      const piezas = listas.slice(i, i + SUBIDA_POR_LLAMADA)
      const r = await llamar<{ aceptadas: string[]; rechazadas: string[] }>('POST', '/piezas', { cuerpo: piezas, token: s.token })
      const marca = (ids: string[]) => ids.map((id) => porId.get(id)!).filter(Boolean).map((p) => ({ idLogico: p.idLogico, editadoEn: p.editadoEn }))
      await marcarSubidas(marca(r.aceptadas), marca(r.rechazadas))
    }

    // Bajar todo lo nuevo y aplicarlo de una vez (una persona puede llegar en una página posterior a sus mediciones).
    let cursor = s.cursor
    const recibidas: ContenidoPieza[] = []
    for (;;) {
      const r = await llamar<{ piezas: { id: string; cifrado: string; editadoEn: number }[]; cursor: number; hayMas: boolean }>('GET', `/piezas?desde=${cursor}`, { token: s.token })
      for (const p of r.piezas) {
        try {
          recibidas.push(await descifrar<ContenidoPieza>(s.cifrado, p.cifrado))
        } catch {
          // Una pieza que no se puede descifrar (dañada) se ignora.
        }
      }
      cursor = r.cursor
      if (!r.hayMas) break
    }
    if (recibidas.length) await aplicarRemotas(recibidas)
    await guardarCursor(cursor)
    if (grandes) fijar({ tipo: 'error', motivo: 'Una medición es demasiado grande para sincronizar (revisa si tiene una nota muy larga).' })
    else fijar({ tipo: 'al-dia', desde: Date.now() })
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 401) {
      await olvidarSesion()
      fijar({ tipo: 'sesion-terminada' })
    } else if (e instanceof ErrorApi && e.estado === 0) fijar({ tipo: 'sin-conexion' })
    else fijar({ tipo: 'error', motivo: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

/** Sincroniza al abrir, al volver la conexión, 3 s después de cada cambio local y cada 5 minutos. */
export function programarSincronizacion(): () => void {
  let espera: ReturnType<typeof setTimeout> | undefined
  const ya = () => void sincronizarAhora()
  const luego = () => {
    clearTimeout(espera)
    espera = setTimeout(ya, ESPERA_TRAS_CAMBIO)
  }
  const sinRed = () => fijar({ tipo: 'sin-conexion' })
  ya()
  window.addEventListener('online', ya)
  window.addEventListener('offline', sinRed)
  const quitarCambios = alCambiarLocal(luego)
  const intervalo = setInterval(ya, CADA)
  return () => {
    clearTimeout(espera)
    clearInterval(intervalo)
    quitarCambios()
    window.removeEventListener('online', ya)
    window.removeEventListener('offline', sinRed)
  }
}
