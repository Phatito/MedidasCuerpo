import Dexie, { type Table } from 'dexie'
import type { Ajustes, Medicion, Persona } from '../domain/types'
import { debeAplicarse } from '../sync/fusion'

type FilaAjustes = Ajustes & { clave: string }
const CLAVE_AJUSTES = 'principal'
const AJUSTES_POR_DEFECTO: Ajustes = { diaRecordatorio: 0, horaRecordatorio: '09:00' }

/** Lo que la sincronización sabe de cada pieza local: cuándo se editó y si falta subirla. */
export interface Cambio {
  /** `persona:<id>`, `medicion:<id>` o `ajustes` */
  idLogico: string
  editadoEn: number
  pendiente: 0 | 1
  borrado: 0 | 1
}

type AjustesSincronizados = Omit<Ajustes, 'ultimoRespaldo'>
export type ContenidoPieza =
  | { tipo: 'persona'; idLogico: string; editadoEn: number; datos: Persona }
  | { tipo: 'medicion'; idLogico: string; editadoEn: number; datos: Medicion }
  | { tipo: 'ajustes'; idLogico: 'ajustes'; editadoEn: number; datos: AjustesSincronizados }
  | { tipo: 'persona' | 'medicion' | 'ajustes'; idLogico: string; editadoEn: number; borrado: true }

/** Datos de la sesión de sincronización en este dispositivo (usuario, token, llaves, cursor). */
export interface FilaSesion {
  clave: string
  [campo: string]: unknown
}

class BaseDatos extends Dexie {
  personas!: Table<Persona, string>
  mediciones!: Table<Medicion, string>
  ajustes!: Table<FilaAjustes, string>
  cambios!: Table<Cambio, string>
  sesion!: Table<FilaSesion, string>

  constructor() {
    super('medidascuerpo')
    this.version(1).stores({
      personas: 'id, creadaEn',
      mediciones: 'id, personaId, [personaId+fecha]',
      ajustes: 'clave',
    })
    // Versión 2: sincronización. Las tablas de antes no cambian.
    this.version(2).stores({
      cambios: 'idLogico, pendiente',
      sesion: 'clave',
    })
  }
}

export const db = new BaseDatos()

const idPersona = (id: string) => `persona:${id}`
const idMedicion = (id: string) => `medicion:${id}`
const ID_AJUSTES = 'ajustes'

/** Avisa a quien escuche (el motor de sincronización) que hubo un cambio local. */
const oyentes = new Set<() => void>()
export function alCambiarLocal(fn: () => void): () => void {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}
function avisar() {
  for (const fn of oyentes) fn()
}

function registrar(idLogico: string, borrado = false, editadoEn = Date.now()): Promise<string> {
  return db.cambios.put({ idLogico, editadoEn, pendiente: 1, borrado: borrado ? 1 : 0 })
}

export function listarPersonas(): Promise<Persona[]> {
  return db.personas.orderBy('creadaEn').toArray()
}

export async function guardarPersona(p: Persona): Promise<void> {
  await db.transaction('rw', db.personas, db.cambios, async () => {
    await db.personas.put(p)
    await registrar(idPersona(p.id))
  })
  avisar()
}

export async function borrarPersona(id: string): Promise<void> {
  await db.transaction('rw', db.personas, db.mediciones, db.cambios, async () => {
    const ids = (await db.mediciones.where('personaId').equals(id).primaryKeys()) as string[]
    const ahora = Date.now()
    for (const m of ids) await registrar(idMedicion(m), true, ahora)
    await registrar(idPersona(id), true, ahora)
    await db.mediciones.where('personaId').equals(id).delete()
    await db.personas.delete(id)
  })
  avisar()
}

export function listarMediciones(personaId: string): Promise<Medicion[]> {
  return db.mediciones.where('[personaId+fecha]').between([personaId, Dexie.minKey], [personaId, Dexie.maxKey]).toArray()
}

export function listarTodasLasMediciones(): Promise<Medicion[]> {
  return db.mediciones.toArray()
}

export async function guardarMedicion(m: Medicion): Promise<void> {
  await guardarMediciones([m])
}

export async function guardarMediciones(ms: Medicion[]): Promise<void> {
  await db.transaction('rw', db.mediciones, db.cambios, async () => {
    await db.mediciones.bulkPut(ms)
    const ahora = Date.now()
    await db.cambios.bulkPut(ms.map((m) => ({ idLogico: idMedicion(m.id), editadoEn: ahora, pendiente: 1 as const, borrado: 0 as const })))
  })
  avisar()
}

export async function contarExistentes(ids: string[]): Promise<number> {
  const encontradas = await db.mediciones.bulkGet(ids)
  return encontradas.filter((x) => x != null).length
}

export async function borrarMedicion(id: string): Promise<void> {
  await db.transaction('rw', db.mediciones, db.cambios, async () => {
    await db.mediciones.delete(id)
    await registrar(idMedicion(id), true)
  })
  avisar()
}

export async function leerAjustes(): Promise<Ajustes> {
  const fila = await db.ajustes.get(CLAVE_AJUSTES)
  if (!fila) return { ...AJUSTES_POR_DEFECTO }
  const { clave: _clave, ...ajustes } = fila
  return ajustes
}

export async function guardarAjustes(a: Ajustes): Promise<void> {
  await db.transaction('rw', db.ajustes, db.cambios, async () => {
    await db.ajustes.put({ ...a, clave: CLAVE_AJUSTES })
    await registrar(ID_AJUSTES)
  })
  avisar()
}

/** Borra todos los datos de este dispositivo, sin dejar borrados pendientes para la nube. */
export async function borrarTodo(): Promise<void> {
  await db.transaction('rw', db.personas, db.mediciones, db.ajustes, db.cambios, async () => {
    await Promise.all([db.personas.clear(), db.mediciones.clear(), db.ajustes.clear(), db.cambios.clear()])
  })
}

// ---------- Sincronización ----------

function tipoDe(idLogico: string): 'persona' | 'medicion' | 'ajustes' {
  return idLogico === ID_AJUSTES ? 'ajustes' : idLogico.startsWith('persona:') ? 'persona' : 'medicion'
}
const idReal = (idLogico: string) => idLogico.slice(idLogico.indexOf(':') + 1)

/** Las piezas pendientes con su contenido actual (o como borradas). */
export async function pendientesDeSubir(): Promise<ContenidoPieza[]> {
  const cambios = await db.cambios.where('pendiente').equals(1).toArray()
  const piezas: ContenidoPieza[] = []
  for (const c of cambios) {
    const tipo = tipoDe(c.idLogico)
    const base = { idLogico: c.idLogico, editadoEn: c.editadoEn }
    if (!c.borrado) {
      if (tipo === 'persona') {
        const datos = await db.personas.get(idReal(c.idLogico))
        if (datos) {
          piezas.push({ ...base, tipo, datos })
          continue
        }
      } else if (tipo === 'medicion') {
        const datos = await db.mediciones.get(idReal(c.idLogico))
        if (datos) {
          piezas.push({ ...base, tipo, datos })
          continue
        }
      } else {
        const { ultimoRespaldo: _local, ...datos } = await leerAjustes()
        piezas.push({ ...base, tipo, idLogico: ID_AJUSTES, datos })
        continue
      }
    }
    piezas.push({ ...base, tipo, borrado: true })
  }
  return piezas
}

/** Quita el pendiente de lo subido o rechazado, salvo que se haya editado otra vez mientras tanto. */
export async function marcarSubidas(subidas: { idLogico: string; editadoEn: number }[], rechazadas: { idLogico: string; editadoEn: number }[]): Promise<void> {
  await db.transaction('rw', db.cambios, async () => {
    for (const s of [...subidas, ...rechazadas]) {
      const c = await db.cambios.get(s.idLogico)
      if (c && c.editadoEn === s.editadoEn) await db.cambios.put({ ...c, pendiente: 0 })
    }
  })
}

/** Aplica piezas que llegan de la nube. Devuelve cuántas cambiaron algo en este dispositivo. */
export async function aplicarRemotas(piezas: ContenidoPieza[]): Promise<number> {
  let aplicadas = 0
  // Primero personas y ajustes, después mediciones: una medición necesita a su persona.
  const orden = [...piezas].sort((a, b) => Number(a.tipo === 'medicion') - Number(b.tipo === 'medicion'))
  await db.transaction('rw', db.personas, db.mediciones, db.ajustes, db.cambios, async () => {
    for (const p of orden) {
      if (!debeAplicarse(await db.cambios.get(p.idLogico), p.editadoEn)) continue
      const borrado = 'borrado' in p
      if (p.tipo === 'persona') {
        const id = idReal(p.idLogico)
        if (borrado) {
          for (const m of (await db.mediciones.where('personaId').equals(id).primaryKeys()) as string[]) {
            await db.cambios.put({ idLogico: idMedicion(m), editadoEn: p.editadoEn, pendiente: 0, borrado: 1 })
          }
          await db.mediciones.where('personaId').equals(id).delete()
          await db.personas.delete(id)
        } else await db.personas.put((p as Extract<ContenidoPieza, { datos: Persona }>).datos)
      } else if (p.tipo === 'medicion') {
        if (borrado) await db.mediciones.delete(idReal(p.idLogico))
        else {
          const datos = (p as Extract<ContenidoPieza, { datos: Medicion }>).datos
          // Una medición cuya persona ya no existe (se borró en otro dispositivo) no se muestra.
          if (!(await db.personas.get(datos.personaId))) continue
          await db.mediciones.put(datos)
        }
      } else if (!borrado) {
        const local = await db.ajustes.get(CLAVE_AJUSTES)
        const datos = (p as Extract<ContenidoPieza, { tipo: 'ajustes'; datos: AjustesSincronizados }>).datos
        // La fecha del último respaldo es de cada dispositivo.
        await db.ajustes.put({ ...datos, ...(local?.ultimoRespaldo ? { ultimoRespaldo: local.ultimoRespaldo } : {}), clave: CLAVE_AJUSTES })
      }
      await db.cambios.put({ idLogico: p.idLogico, editadoEn: p.editadoEn, pendiente: 0, borrado: borrado ? 1 : 0 })
      aplicadas++
    }
  })
  return aplicadas
}

/** Primera vez con cuenta: todo lo local queda pendiente; lo que no tenía registro, con editadoEn 0. */
export async function marcarTodoPendiente(): Promise<void> {
  await db.transaction('rw', db.personas, db.mediciones, db.ajustes, db.cambios, async () => {
    const ids = [
      ...((await db.personas.toCollection().primaryKeys()) as string[]).map(idPersona),
      ...((await db.mediciones.toCollection().primaryKeys()) as string[]).map(idMedicion),
      ...((await db.ajustes.get(CLAVE_AJUSTES)) ? [ID_AJUSTES] : []),
    ]
    for (const id of ids) {
      const c = await db.cambios.get(id)
      await db.cambios.put(c ? { ...c, pendiente: 1 } : { idLogico: id, editadoEn: 0, pendiente: 1, borrado: 0 })
    }
  })
}

export async function reiniciarCambios(): Promise<void> {
  await db.cambios.clear()
}
