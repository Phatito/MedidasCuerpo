import { describe, expect, test } from 'vitest'
import { clasificar, type MedidaConEstado } from '../../src/domain/estados'
import { persona } from './helpers'

const F = '2026-11-17'
const hombre36 = persona({ fechaNacimiento: '1990-01-01' })
const estado = (medida: MedidaConEstado, valor: number, p = hombre36) => clasificar(medida, valor, p, F)?.nombre

describe('IMC (OMS)', () => {
  test.each([
    [18.4, 'Bajo'], [18.5, 'Normal'], [24.9, 'Normal'], [25, 'Sobrepeso'], [29.9, 'Sobrepeso'], [30, 'Obesidad'],
  ])('%d → %s', (v, nombre) => expect(estado('imc', v)).toBe(nombre))
})

describe('% de grasa por sexo y edad', () => {
  test('hombre de 36 años', () => {
    expect(estado('grasaPct', 7.9)).toBe('Bajo')
    expect(estado('grasaPct', 8)).toBe('Estándar')
    expect(estado('grasaPct', 19.9)).toBe('Estándar')
    expect(estado('grasaPct', 20)).toBe('Alto')
    expect(estado('grasaPct', 25)).toBe('Muy alto')
  })
  test('hombre de 50 años', () => {
    const p = persona({ fechaNacimiento: '1976-01-01' })
    expect(estado('grasaPct', 21.9, p)).toBe('Estándar')
    expect(estado('grasaPct', 22, p)).toBe('Alto')
  })
  test('hombre de 65 años', () => {
    const p = persona({ fechaNacimiento: '1961-01-01' })
    expect(estado('grasaPct', 29.9, p)).toBe('Alto')
    expect(estado('grasaPct', 30, p)).toBe('Muy alto')
  })
  test('mujeres', () => {
    const m30 = persona({ sexo: 'mujer', fechaNacimiento: '1996-01-01' })
    expect(estado('grasaPct', 20.9, m30)).toBe('Bajo')
    expect(estado('grasaPct', 21, m30)).toBe('Estándar')
    expect(estado('grasaPct', 33, m30)).toBe('Alto')
    expect(estado('grasaPct', 39, m30)).toBe('Muy alto')
    expect(estado('grasaPct', 34, persona({ sexo: 'mujer', fechaNacimiento: '1981-01-01' }))).toBe('Alto')
    expect(estado('grasaPct', 42, persona({ sexo: 'mujer', fechaNacimiento: '1956-01-01' }))).toBe('Muy alto')
  })
  test('sin fecha de nacimiento se usa la franja de 18 a 39 años', () => {
    const p = persona({ fechaNacimiento: '', estaturaCm: 175 })
    expect(estado('grasaPct', 20, p)).toBe('Alto')
    expect(estado('grasaPct', 19.9, p)).toBe('Estándar')
  })
})

test('grasa visceral', () => {
  expect(estado('grasaVisceral', 9)).toBe('Estándar')
  expect(estado('grasaVisceral', 10)).toBe('Alto')
  expect(estado('grasaVisceral', 14)).toBe('Alto')
  expect(estado('grasaVisceral', 15)).toBe('Muy alto')
})

test('agua corporal por sexo', () => {
  expect(estado('aguaPct', 49.9)).toBe('Bajo')
  expect(estado('aguaPct', 50)).toBe('Estándar')
  expect(estado('aguaPct', 65)).toBe('Estándar')
  expect(estado('aguaPct', 65.1)).toBe('Alto')
  const mujer = persona({ sexo: 'mujer' })
  expect(estado('aguaPct', 44.9, mujer)).toBe('Bajo')
  expect(estado('aguaPct', 60, mujer)).toBe('Estándar')
  expect(estado('aguaPct', 60.1, mujer)).toBe('Alto')
})

test('proteína', () => {
  expect(estado('proteinaPct', 15.9)).toBe('Bajo')
  expect(estado('proteinaPct', 16)).toBe('Estándar')
  expect(estado('proteinaPct', 20)).toBe('Estándar')
  expect(estado('proteinaPct', 20.1)).toBe('Alto')
})

test('la edad no quita el estado: un menor también lo recibe', () => {
  expect(clasificar('imc', 30, persona({ fechaNacimiento: '2015-01-01' }), F)?.estado).toBe('muy')
})

test('estado y tramos coinciden', () => {
  const c = clasificar('grasaPct', 22, hombre36, F)!
  expect(c.estado).toBe('alto')
  expect(c.tramos.map((t) => t.nombre)).toEqual(['Bajo', 'Estándar', 'Alto', 'Muy alto'])
  expect(c.tramos[c.tramo].nombre).toBe('Alto')
})

test('la posición en la barra va de 0 a 1 y crece con el valor', () => {
  const medidas: [MedidaConEstado, number[]][] = [
    ['imc', [10, 18, 22, 27, 33, 60]],
    ['grasaPct', [2, 8, 15, 22, 29, 60]],
    ['grasaVisceral', [1, 5, 12, 16, 40]],
    ['aguaPct', [30, 49, 58, 66, 80]],
    ['proteinaPct', [5, 15, 18, 22, 40]],
  ]
  for (const [medida, valores] of medidas) {
    const pos = valores.map((v) => clasificar(medida, v, hombre36, F)!.posicion)
    for (const x of pos) expect(x >= 0 && x <= 1).toBe(true)
    for (let i = 1; i < pos.length; i++) expect(pos[i]).toBeGreaterThanOrEqual(pos[i - 1])
  }
  expect(clasificar('grasaPct', 29, hombre36, F)!.posicion).toBeGreaterThan(0.75)
})
