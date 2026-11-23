import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { expect, test } from 'vitest'
import { m, persona } from '../domain/helpers'

test('una base de la versión 1 se abre con la versión 2 sin perder datos', async () => {
  // La base tal como la dejaba la app antes de la sincronización.
  const vieja = new Dexie('medidascuerpo')
  vieja.version(1).stores({ personas: 'id, creadaEn', mediciones: 'id, personaId, [personaId+fecha]', ajustes: 'clave' })
  await vieja.table('personas').put(persona({ nombre: 'Ana' }))
  await vieja.table('mediciones').put(m('2026-11-05', { pesoKg: 72.5 }))
  vieja.close()

  const { listarPersonas, listarMediciones, db } = await import('../../src/storage/db')
  expect((await listarPersonas())[0].nombre).toBe('Ana')
  expect((await listarMediciones('p1'))[0].pesoKg).toBe(72.5)
  expect(db.verno).toBeGreaterThanOrEqual(2)
  expect(await db.cambios.count()).toBe(0)
})
