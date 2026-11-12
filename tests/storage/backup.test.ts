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

describe('respaldos editados a mano', () => {
  const base = () => ({
    app: 'MedidasCuerpo', version: 1, exportadoEn: '',
    personas: [{ id: 'a', nombre: 'Ana', sexo: 'mujer', fechaNacimiento: '', estaturaCm: 165, objetivo: 'mantener', creadaEn: '2026-01-01T00:00:00.000Z' }],
    mediciones: [{ id: 'a_2026-10-01', personaId: 'a', fecha: '2026-10-01', pesoKg: 60, origen: 'manual' }] as Record<string, unknown>[],
    ajustes: { diaRecordatorio: 0, horaRecordatorio: '09:00' },
  })
  const conMedicion = (extra: Record<string, unknown>) => {
    const r = base()
    r.mediciones[0] = { ...r.mediciones[0], ...extra }
    return JSON.stringify(r)
  }

  test('el respaldo base es válido', () => {
    expect(leerRespaldo(JSON.stringify(base())).personas).toHaveLength(1)
  })
  test.each([
    ['un perímetro como texto', conMedicion({ cinturaCm: '88' })],
    ['una fecha mal formada', conMedicion({ fecha: '01/10/2026' })],
    ['una medición de una persona que no está en el archivo', conMedicion({ personaId: 'zzz' })],
    ['un peso fuera de rango', conMedicion({ pesoKg: 9000 })],
  ])('%s se rechaza', (_n, json) => {
    expect(() => leerRespaldo(json)).toThrow(MENSAJE)
  })
  test('un sexo desconocido se rechaza', () => {
    const r = base()
    r.personas[0].sexo = 'otro'
    expect(() => leerRespaldo(JSON.stringify(r))).toThrow(MENSAJE)
  })
})

describe('meta de peso y campos por lado en el respaldo', () => {
  const base = (persona: Record<string, unknown> = {}, medicion: Record<string, unknown> = {}) =>
    JSON.stringify({
      app: 'MedidasCuerpo', version: 1, exportadoEn: '',
      personas: [{ id: 'a', nombre: 'Ana', sexo: 'mujer', fechaNacimiento: '', estaturaCm: 165, objetivo: 'mantener', creadaEn: '2026-01-01T00:00:00.000Z', ...persona }],
      mediciones: [{ id: 'a_2026-10-01', personaId: 'a', fecha: '2026-10-01', pesoKg: 60, origen: 'manual', ...medicion }],
      ajustes: { diaRecordatorio: 0, horaRecordatorio: '09:00' },
    })
  test('un respaldo anterior, sin los campos nuevos, sigue siendo válido', () => {
    expect(leerRespaldo(base()).personas[0].nombre).toBe('Ana')
  })
  test('una meta válida y campos por lado se aceptan', () => {
    const r = leerRespaldo(base({ metaPesoKg: 58 }, { brazoIzqCm: 28, musloDerCm: 52 }))
    expect(r.personas[0].metaPesoKg).toBe(58)
    expect(r.mediciones[0].brazoIzqCm).toBe(28)
  })
  test.each([
    ['meta como texto', base({ metaPesoKg: '58' })],
    ['meta fuera de rango', base({ metaPesoKg: 9000 })],
    ['brazo izquierdo como texto', base({}, { brazoIzqCm: '28' })],
  ])('%s se rechaza', (_n, json) => {
    expect(() => leerRespaldo(json)).toThrow(MENSAJE)
  })
})
