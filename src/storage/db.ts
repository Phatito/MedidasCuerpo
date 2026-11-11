import Dexie, { type Table } from 'dexie'
import type { Ajustes, Medicion, Persona } from '../domain/types'

type FilaAjustes = Ajustes & { clave: string }
const CLAVE_AJUSTES = 'principal'
const AJUSTES_POR_DEFECTO: Ajustes = { diaRecordatorio: 0, horaRecordatorio: '09:00' }

class BaseDatos extends Dexie {
  personas!: Table<Persona, string>
  mediciones!: Table<Medicion, string>
  ajustes!: Table<FilaAjustes, string>

  constructor() {
    super('medidascuerpo')
    this.version(1).stores({
      personas: 'id, creadaEn',
      mediciones: 'id, personaId, [personaId+fecha]',
      ajustes: 'clave',
    })
  }
}

export const db = new BaseDatos()

export function listarPersonas(): Promise<Persona[]> {
  return db.personas.orderBy('creadaEn').toArray()
}

export async function guardarPersona(p: Persona): Promise<void> {
  await db.personas.put(p)
}

export async function borrarPersona(id: string): Promise<void> {
  await db.transaction('rw', db.personas, db.mediciones, async () => {
    await db.mediciones.where('personaId').equals(id).delete()
    await db.personas.delete(id)
  })
}

export function listarMediciones(personaId: string): Promise<Medicion[]> {
  return db.mediciones.where('[personaId+fecha]').between([personaId, Dexie.minKey], [personaId, Dexie.maxKey]).toArray()
}

export function listarTodasLasMediciones(): Promise<Medicion[]> {
  return db.mediciones.toArray()
}

export async function guardarMedicion(m: Medicion): Promise<void> {
  await db.mediciones.put(m)
}

export async function guardarMediciones(ms: Medicion[]): Promise<void> {
  await db.mediciones.bulkPut(ms)
}

export async function contarExistentes(ids: string[]): Promise<number> {
  const encontradas = await db.mediciones.bulkGet(ids)
  return encontradas.filter((x) => x != null).length
}

export async function borrarMedicion(id: string): Promise<void> {
  await db.mediciones.delete(id)
}

export async function leerAjustes(): Promise<Ajustes> {
  const fila = await db.ajustes.get(CLAVE_AJUSTES)
  if (!fila) return { ...AJUSTES_POR_DEFECTO }
  const { clave: _clave, ...ajustes } = fila
  return ajustes
}

export async function guardarAjustes(a: Ajustes): Promise<void> {
  await db.ajustes.put({ ...a, clave: CLAVE_AJUSTES })
}

export async function borrarTodo(): Promise<void> {
  await db.transaction('rw', db.personas, db.mediciones, db.ajustes, async () => {
    await Promise.all([db.personas.clear(), db.mediciones.clear(), db.ajustes.clear()])
  })
}
