import { borrarTodo, db, marcarTodoPendiente, reiniciarCambios } from '../storage/db'
import { ErrorApi, llamar } from './api'
import { derivarLlaves, nuevaSal } from './cripto'
import { avisarSinSesion, sincronizarAhora } from './motor'

export const ERROR_SESION = 'Usuario o frase secreta incorrectos'
const USUARIO = /^[a-z0-9._-]{3,30}$/
const MIN_FRASE = 12

/** La sesión guardada en este dispositivo. Las llaves son CryptoKey no extraíbles. */
export interface Sesion {
  usuario: string
  token: string
  cifrado: CryptoKey
  ids: CryptoKey
  cursor: number
}

export type DecisionDatosAjenos = 'subir' | 'reemplazar' | 'cancelar'

export async function leerSesion(): Promise<Sesion | null> {
  const fila = await db.sesion.get('actual')
  return fila ? (fila as unknown as Sesion) : null
}
export async function guardarCursor(cursor: number): Promise<void> {
  await db.sesion.update('actual', { cursor })
}
/** Cierra la sesión solo en este dispositivo (sin avisar al servidor). */
export async function olvidarSesion(): Promise<void> {
  await db.sesion.delete('actual')
}

export async function sesionActual(): Promise<{ usuario: string } | null> {
  const s = await leerSesion()
  return s ? { usuario: s.usuario } : null
}

function validar(usuario: string, frase: string): string {
  const nombre = usuario.trim().toLowerCase()
  if (!USUARIO.test(nombre)) throw new Error('El nombre de usuario debe tener de 3 a 30 letras, números, puntos, guiones o guiones bajos.')
  if (frase.length < MIN_FRASE) throw new Error(`La frase secreta debe tener al menos ${MIN_FRASE} caracteres.`)
  return nombre
}

export async function crearCuenta(usuario: string, frase: string, siHayDatosAjenos: () => Promise<DecisionDatosAjenos> = async () => 'subir'): Promise<boolean> {
  const nombre = validar(usuario, frase)
  const sal = nuevaSal()
  const llaves = await derivarLlaves(frase, sal)
  await llamar('POST', '/cuenta', { cuerpo: { usuario: nombre, sal, llaveAcceso: llaves.acceso } })
  return entrar(nombre, llaves, siHayDatosAjenos)
}

export async function iniciarSesion(usuario: string, frase: string, siHayDatosAjenos: () => Promise<DecisionDatosAjenos>): Promise<boolean> {
  const nombre = usuario.trim().toLowerCase()
  let sal: string
  try {
    sal = (await llamar<{ sal: string }>('GET', `/sal?usuario=${encodeURIComponent(nombre)}`)).sal
  } catch (e) {
    // Usuario inexistente: el mismo mensaje que una frase incorrecta.
    if (e instanceof ErrorApi && e.estado === 404) throw new Error(ERROR_SESION)
    throw e
  }
  return entrar(nombre, await derivarLlaves(frase, sal), siHayDatosAjenos)
}

async function entrar(usuario: string, llaves: Awaited<ReturnType<typeof derivarLlaves>>, siHayDatosAjenos: () => Promise<DecisionDatosAjenos>): Promise<boolean> {
  let token: string
  try {
    token = (await llamar<{ token: string }>('POST', '/sesion', { cuerpo: { usuario, llaveAcceso: llaves.acceso } })).token
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 401) throw new Error(ERROR_SESION)
    throw e
  }

  // ¿Qué hacer con lo que ya hay en este dispositivo?
  const hayDatos = (await db.personas.count()) + (await db.mediciones.count()) > 0
  const ultimo = (await db.sesion.get('ultimo'))?.usuario as string | undefined
  if (hayDatos && ultimo && ultimo !== usuario) {
    const decision = await siHayDatosAjenos()
    if (decision === 'cancelar') {
      await llamar('DELETE', '/sesion', { token }).catch(() => undefined)
      return false
    }
    if (decision === 'reemplazar') await borrarTodo()
    else {
      await reiniciarCambios()
      await marcarTodoPendiente()
    }
  } else {
    if (ultimo !== usuario) await reiniciarCambios()
    await marcarTodoPendiente()
  }

  const sesion: Sesion = { usuario, token, cifrado: llaves.cifrado, ids: llaves.ids, cursor: 0 }
  await db.sesion.put({ clave: 'actual', ...sesion })
  await db.sesion.put({ clave: 'ultimo', usuario })
  await sincronizarAhora()
  return true
}

export async function cerrarSesion(opciones: { borrarDatosLocales?: boolean } = {}): Promise<void> {
  const s = await leerSesion()
  if (s) await llamar('DELETE', '/sesion', { token: s.token }).catch(() => undefined)
  await olvidarSesion()
  if (opciones.borrarDatosLocales) await borrarTodo()
  avisarSinSesion()
}

export async function borrarCuenta(): Promise<void> {
  const s = await leerSesion()
  if (!s) return
  await llamar('DELETE', '/cuenta', { token: s.token })
  await olvidarSesion()
  avisarSinSesion()
}
