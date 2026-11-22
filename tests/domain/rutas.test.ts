import { describe, expect, test } from 'vitest'
import { escribirRuta, leerRuta, personaInicio } from '../../src/domain/rutas'
import { persona } from './helpers'

describe('leerRuta', () => {
  test('ficha de una persona', () => expect(leerRuta('#/p/abc')).toEqual({ pantalla: 'ficha', personaId: 'abc' }))
  test('registrar con fecha', () =>
    expect(leerRuta('#/p/abc/registrar?fecha=2026-11-17')).toEqual({ pantalla: 'registrar', personaId: 'abc', fecha: '2026-11-17' }))
  test('registrar con una fecha inválida la ignora', () => expect(leerRuta('#/p/abc/registrar?fecha=xx')).toEqual({ pantalla: 'registrar', personaId: 'abc' }))
  test('registrar sin fecha', () => expect(leerRuta('#/p/abc/registrar')).toEqual({ pantalla: 'registrar', personaId: 'abc' }))
  test('mediciones', () => expect(leerRuta('#/p/abc/mediciones')).toEqual({ pantalla: 'mediciones', personaId: 'abc' }))
  test('familia y ajustes', () => {
    expect(leerRuta('#/familia')).toEqual({ pantalla: 'familia' })
    expect(leerRuta('#/ajustes')).toEqual({ pantalla: 'ajustes' })
  })
  test.each(['', '#', '#/', '#/nada/raro', '#/p/', '#/p/abc/otra', 'basura'])('%j lleva al inicio', (h) =>
    expect(leerRuta(h)).toEqual({ pantalla: 'inicio' }))
  test('un id con caracteres codificados se decodifica', () => expect(leerRuta('#/p/a%20b')).toEqual({ pantalla: 'ficha', personaId: 'a b' }))
})

test('escribirRuta y leerRuta son inversas', () => {
  for (const h of ['#/p/abc', '#/p/abc/registrar', '#/p/abc/registrar?fecha=2026-11-17', '#/p/abc/mediciones', '#/familia', '#/ajustes', '#/']) {
    expect(escribirRuta(leerRuta(h))).toBe(h)
  }
})

describe('personaInicio', () => {
  const a = persona({ id: 'a', creadaEn: '2026-01-02T00:00:00.000Z' })
  const b = persona({ id: 'b', creadaEn: '2026-01-01T00:00:00.000Z' })
  test('la principal si existe', () => expect(personaInicio([a, b], 'a')?.id).toBe('a'))
  test('si la principal no existe, la creada primero', () => expect(personaInicio([a, b], 'zz')?.id).toBe('b'))
  test('sin principal, la creada primero', () => expect(personaInicio([a, b], undefined)?.id).toBe('b'))
  test('sin personas, null', () => expect(personaInicio([], 'a')).toBeNull())
})
