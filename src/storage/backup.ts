import type { Ajustes, Medicion, Persona } from '../domain/types'
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
  return esObjeto(x) && esTexto(x.id) && esTexto(x.nombre) && typeof x.estaturaCm === 'number'
}

function medicionValida(x: unknown): boolean {
  return (
    esObjeto(x) && esTexto(x.id) && esTexto(x.personaId) && esTexto(x.fecha) && typeof x.pesoKg === 'number' && Number.isFinite(x.pesoKg)
  )
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
    !dato.personas.every(personaValida) ||
    !dato.mediciones.every(medicionValida)
  ) {
    throw new Error(MENSAJE_INVALIDO)
  }
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
