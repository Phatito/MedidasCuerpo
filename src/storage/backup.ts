import { parseFecha } from '../domain/numbers'
import { CAMPOS_NUMERICOS, type Ajustes, type Medicion, type Persona } from '../domain/types'
import { validarValor } from '../domain/validation'
import { db, leerAjustes } from './db'

export interface Respaldo {
  app: 'MedidasCuerpo'
  version: 1
  exportadoEn: string
  personas: Persona[]
  mediciones: Medicion[]
  ajustes: Ajustes
}

const MENSAJE_INVALIDO = 'El archivo no es un respaldo de MedidasCuerpo'

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
    },
  }
}

export async function restaurarRespaldo(r: Respaldo): Promise<void> {
  await db.transaction('rw', db.personas, db.mediciones, db.ajustes, async () => {
    await Promise.all([db.personas.clear(), db.mediciones.clear(), db.ajustes.clear()])
    await db.personas.bulkPut(r.personas)
    await db.mediciones.bulkPut(r.mediciones)
    await db.ajustes.put({ ...r.ajustes, clave: 'principal' })
  })
}
