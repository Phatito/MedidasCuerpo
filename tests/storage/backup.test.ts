import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { exportarRespaldo, leerRespaldo, restaurarRespaldo } from '../../src/storage/backup'
import { borrarTodo, guardarAjustes, guardarMediciones, guardarPersona, leerAjustes, listarMediciones, listarPersonas } from '../../src/storage/db'
import { m, persona } from '../domain/helpers'

const MENSAJE = 'El archivo no es un respaldo de MedidasCuerpo'

beforeEach(async () => {
  await borrarTodo()
  await guardarPersona(persona())
  await guardarMediciones([m('2026-11-05', { pesoKg: 72.5 }), m('2026-11-12', { pesoKg: 72 })])
  await guardarAjustes({ diaRecordatorio: 2, horaRecordatorio: '08:00' })
})

test('exportar, borrar todo y restaurar devuelve los mismos datos', async () => {
  const json = JSON.stringify(await exportarRespaldo())
  await borrarTodo()
  expect(await listarPersonas()).toEqual([])
  await restaurarRespaldo(leerRespaldo(json))
  expect(await listarPersonas()).toEqual([persona()])
  expect((await listarMediciones('p1')).map((x) => x.pesoKg)).toEqual([72.5, 72])
  expect(await leerAjustes()).toMatchObject({ diaRecordatorio: 2, horaRecordatorio: '08:00' })
})

test('restaurar reemplaza los datos, no los mezcla', async () => {
  const respaldo = await exportarRespaldo()
  await guardarPersona(persona({ id: 'extra', nombre: 'Extra' }))
  await restaurarRespaldo(respaldo)
  expect((await listarPersonas()).map((x) => x.id)).toEqual(['p1'])
})

describe('archivos que no son un respaldo', () => {
  test.each([
    ['otro JSON', '{"hola":1}'],
    ['texto que no es JSON', 'no es json'],
    ['versión desconocida', JSON.stringify({ app: 'MedidasCuerpo', version: 2, personas: [], mediciones: [] })],
    ['medición sin peso', JSON.stringify({ app: 'MedidasCuerpo', version: 1, personas: [], mediciones: [{ id: 'x', personaId: 'p', fecha: '2026-01-01' }] })],
    ['persona sin nombre', JSON.stringify({ app: 'MedidasCuerpo', version: 1, personas: [{ id: 'x' }], mediciones: [] })],
    ['null', 'null'],
  ])('%s se rechaza', (_nombre, json) => {
    expect(() => leerRespaldo(json)).toThrow(MENSAJE)
  })

  test('un intento fallido deja los datos intactos', async () => {
    expect(() => leerRespaldo('{"hola":1}')).toThrow(MENSAJE)
    expect(await listarPersonas()).toHaveLength(1)
    expect(await listarMediciones('p1')).toHaveLength(2)
  })
})
