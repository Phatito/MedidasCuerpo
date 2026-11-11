import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  borrarMedicion, borrarPersona, borrarTodo, contarExistentes, guardarAjustes, guardarMedicion, guardarMediciones,
  guardarPersona, leerAjustes, listarMediciones, listarPersonas,
} from '../../src/storage/db'
import { m, persona } from '../domain/helpers'

beforeEach(async () => {
  await borrarTodo()
})

describe('mediciones', () => {
  test('guardar dos veces el mismo día deja una sola, con el último valor', async () => {
    await guardarMedicion(m('2026-11-05', { pesoKg: 72.5 }))
    await guardarMedicion(m('2026-11-05', { pesoKg: 72 }))
    const ms = await listarMediciones('p1')
    expect(ms).toHaveLength(1)
    expect(ms[0].pesoKg).toBe(72)
  })

  test('se listan por fecha ascendente aunque se guarden al revés', async () => {
    await guardarMediciones([m('2026-11-12'), m('2026-10-01'), m('2026-11-05')])
    expect((await listarMediciones('p1')).map((x) => x.fecha)).toEqual(['2026-10-01', '2026-11-05', '2026-11-12'])
  })

  test('solo se listan las de la persona pedida', async () => {
    await guardarMediciones([m('2026-11-05'), { ...m('2026-11-05'), id: 'p2_2026-11-05', personaId: 'p2' }])
    expect(await listarMediciones('p2')).toHaveLength(1)
  })

  test('borrar una medición', async () => {
    await guardarMediciones([m('2026-11-05'), m('2026-11-12')])
    await borrarMedicion('p1_2026-11-05')
    expect((await listarMediciones('p1')).map((x) => x.fecha)).toEqual(['2026-11-12'])
  })

  test('contarExistentes cuenta los ids ya guardados', async () => {
    await guardarMediciones([m('2026-11-05'), m('2026-11-12')])
    expect(await contarExistentes(['p1_2026-11-05', 'p1_2026-12-01'])).toBe(1)
  })
})

describe('personas', () => {
  test('se listan por orden de creación', async () => {
    await guardarPersona(persona({ id: 'b', nombre: 'Beto', creadaEn: '2026-02-01T00:00:00.000Z' }))
    await guardarPersona(persona({ id: 'a', nombre: 'Ana', creadaEn: '2026-01-01T00:00:00.000Z' }))
    expect((await listarPersonas()).map((x) => x.nombre)).toEqual(['Ana', 'Beto'])
  })

  test('borrar una persona borra sus mediciones y no las de otros', async () => {
    await guardarPersona(persona({ id: 'p1' }))
    await guardarPersona(persona({ id: 'p2' }))
    await guardarMediciones([m('2026-11-05'), { ...m('2026-11-05'), id: 'p2_2026-11-05', personaId: 'p2' }])
    await borrarPersona('p1')
    expect(await listarMediciones('p1')).toEqual([])
    expect(await listarMediciones('p2')).toHaveLength(1)
    expect((await listarPersonas()).map((x) => x.id)).toEqual(['p2'])
  })
})

describe('ajustes', () => {
  test('por defecto: domingo a las 09:00', async () => {
    expect(await leerAjustes()).toEqual({ diaRecordatorio: 0, horaRecordatorio: '09:00' })
  })
  test('se guardan y se leen', async () => {
    await guardarAjustes({ diaRecordatorio: 3, horaRecordatorio: '20:30', ultimoRespaldo: '2026-11-01' })
    expect(await leerAjustes()).toEqual({ diaRecordatorio: 3, horaRecordatorio: '20:30', ultimoRespaldo: '2026-11-01' })
  })
})
