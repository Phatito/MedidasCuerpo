import { parseFecha } from '../domain/numbers'
import { CAMPOS_NUMERICOS, type Ajustes, type Medicion, type Persona } from '../domain/types'
import { validarValor } from '../domain/validation'
import { db, horaDeEdicion, leerAjustes } from './db'

export interface Respaldo {
  app: 'MedidasCuerpo'
  version: 1
  exportadoEn: string
  personas: Persona[]
  mediciones: Medicion[]
  ajustes: Ajustes
}

// La app se llamaba MedidasCuerpo: ese identificador interno del archivo de respaldo se conserva para que los respaldos de antes y de ahora sean compatibles.
const MENSAJE_INVALIDO = 'El archivo no es un respaldo de Mesura'

export async function exportarRespaldo(): Promise<Respaldo> {
  return {
    app: 'MedidasCuerpo',
    version: 1,
    exportadoEn: new Date().toISOString(),
    personas: await db.personas.toArray(),
    mediciones: await db.mediciones.toArray(),
    ajustes: await leerAjustes(),
  }
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const esTexto = (x: unknown) => typeof x === 'string' && x !== ''

function personaValida(x: unknown): boolean {
  return (
    esObjeto(x) &&
    esTexto(x.id) &&
    esTexto(x.nombre) &&
    (x.sexo === 'hombre' || x.sexo === 'mujer') &&
    typeof x.estaturaCm === 'number' &&
    validarValor('estaturaCm', x.estaturaCm) == null &&
    (x.metaPesoKg == null || (typeof x.metaPesoKg === 'number' && validarValor('pesoKg', x.metaPesoKg) == null))
  )
}

function medicionValida(x: unknown, idsPersonas: Set<unknown>): boolean {
  if (!esObjeto(x) || !esTexto(x.id) || !idsPersonas.has(x.personaId)) return false
  if (typeof x.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.fecha) || parseFecha(x.fecha) !== x.fecha) return false
  if (typeof x.pesoKg !== 'number') return false
  // Un campo opcional presente debe ser un número dentro de rango: un texto rompería las pantallas.
  return CAMPOS_NUMERICOS.every((c) => x[c] == null || (typeof x[c] === 'number' && validarValor(c, x[c] as number) == null))
}

export function leerRespaldo(json: string): Respaldo {
  let dato: unknown
  try {
    dato = JSON.parse(json)
  } catch {
    throw new Error(MENSAJE_INVALIDO)
  }
  if (
    !esObjeto(dato) ||
    dato.app !== 'MedidasCuerpo' ||
    dato.version !== 1 ||
    !Array.isArray(dato.personas) ||
    !Array.isArray(dato.mediciones) ||
    !dato.personas.every(personaValida)
  ) {
    throw new Error(MENSAJE_INVALIDO)
  }
  const idsPersonas = new Set(dato.personas.map((p) => (p as { id: unknown }).id))
  if (!dato.mediciones.every((m) => medicionValida(m, idsPersonas))) throw new Error(MENSAJE_INVALIDO)
  const a = esObjeto(dato.ajustes) ? dato.ajustes : {}
  return {
    app: 'MedidasCuerpo',
    version: 1,
    exportadoEn: typeof dato.exportadoEn === 'string' ? dato.exportadoEn : '',
    personas: dato.personas as Persona[],
    mediciones: dato.mediciones as Medicion[],
    ajustes: {
      diaRecordatorio: typeof a.diaRecordatorio === 'number' && a.diaRecordatorio >= 0 && a.diaRecordatorio <= 6 ? a.diaRecordatorio : 0,
      horaRecordatorio: typeof a.horaRecordatorio === 'string' && /^\d{2}:\d{2}$/.test(a.horaRecordatorio) ? a.horaRecordatorio : '09:00',
      // Solo si apunta a alguien que viene en el respaldo.
      ...(typeof a.personaPrincipalId === 'string' && idsPersonas.has(a.personaPrincipalId) ? { personaPrincipalId: a.personaPrincipalId } : {}),
    },
  }
}

export async function restaurarRespaldo(r: Respaldo): Promise<void> {
  await db.transaction('rw', [db.personas, db.mediciones, db.ajustes, db.cambios], async () => {
    // Lo que había y no viene en el respaldo queda como borrado, para que la nube también lo borre.
    const ahora = Date.now()
    const restaurados = new Set([...r.personas.map((p) => `persona:${p.id}`), ...r.mediciones.map((m) => `medicion:${m.id}`), 'ajustes'])
    const antes = (await db.cambios.toArray()).filter((c) => !c.borrado && !restaurados.has(c.idLogico))
    const locales = [
      ...((await db.personas.toCollection().primaryKeys()) as string[]).map((id) => `persona:${id}`),
      ...((await db.mediciones.toCollection().primaryKeys()) as string[]).map((id) => `medicion:${id}`),
    ].filter((id) => !restaurados.has(id))
    await Promise.all([db.personas.clear(), db.mediciones.clear(), db.ajustes.clear()])
    await db.personas.bulkPut(r.personas)
    await db.mediciones.bulkPut(r.mediciones)
    await db.ajustes.put({ ...r.ajustes, clave: 'principal' })
    const borrados = new Set([...antes.map((c) => c.idLogico), ...locales])
    for (const idLogico of borrados) await db.cambios.put({ idLogico, editadoEn: await horaDeEdicion(idLogico, ahora), pendiente: 1, borrado: 1 })
    for (const idLogico of restaurados) await db.cambios.put({ idLogico, editadoEn: await horaDeEdicion(idLogico, ahora), pendiente: 1, borrado: 0 })
  })
}
