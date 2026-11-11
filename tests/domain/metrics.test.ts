import { describe, expect, test } from 'vitest'
import { derivar } from '../../src/domain/metrics'
import { m, persona } from './helpers'

const p = persona()
const p180 = persona({ estaturaCm: 180 })
const mujer = persona({ sexo: 'mujer', estaturaCm: 165 })
const base = m('2026-11-01')

describe('derivar', () => {
  test('calcula el IMC y su categoría', () => {
    const d = derivar(p, base)
    expect(d.imc).toBeCloseTo(24.22, 2)
    expect(d.categoriaImc).toBe('normal')
  })

  test('categorías de IMC en sus límites', () => {
    expect(derivar(p, m('2026-11-01', { pesoKg: 50 })).categoriaImc).toBe('bajo_peso')
    expect(derivar(p, m('2026-11-01', { pesoKg: 80 })).categoriaImc).toBe('sobrepeso')
    expect(derivar(p, m('2026-11-01', { pesoKg: 90 })).categoriaImc).toBe('obesidad')
  })

  test('sin grasa ni perímetros no inventa valores', () => {
    const d = derivar(p, base)
    expect(d.grasaPct).toBeNull()
    expect(d.masaGrasaKg).toBeNull()
    expect(d.masaMagraKg).toBeNull()
    expect(d.cinturaEstatura).toBeNull()
    expect(d.cinturaCadera).toBeNull()
  })

  test('usa el % de grasa medido y calcula masas', () => {
    expect(derivar(p, { ...base, grasaPct: 20 })).toMatchObject({
      grasaPct: 20,
      grasaEstimada: false,
      masaGrasaKg: 14,
      masaMagraKg: 56,
    })
  })

  test('el medido gana al estimado', () => {
    const d = derivar(p180, { ...base, grasaPct: 20, cuelloCm: 40, cinturaCm: 90 })
    expect(d.grasaPct).toBe(20)
    expect(d.grasaEstimada).toBe(false)
  })

  test('estima la grasa de un hombre con cuello y cintura', () => {
    const d = derivar(p180, { ...base, cuelloCm: 40, cinturaCm: 90 })
    expect(d.grasaPct).toBeCloseTo(18.4, 0)
    expect(d.grasaEstimada).toBe(true)
  })

  test('una mujer sin cadera no tiene estimación', () => {
    expect(derivar(mujer, { ...base, cuelloCm: 32, cinturaCm: 75 }).grasaPct).toBeNull()
  })

  test('estima la grasa de una mujer con cadera', () => {
    const d = derivar(mujer, { ...base, cuelloCm: 32, cinturaCm: 75, caderaCm: 98 })
    expect(d.grasaPct).toBeGreaterThan(20)
    expect(d.grasaPct).toBeLessThan(35)
    expect(d.grasaEstimada).toBe(true)
  })

  test('cintura menor o igual al cuello no estima', () => {
    expect(derivar(p, { ...base, cuelloCm: 40, cinturaCm: 40 }).grasaPct).toBeNull()
  })

  test('relaciones de cintura', () => {
    const d = derivar(p, { ...base, cinturaCm: 85, caderaCm: 100 })
    expect(d.cinturaEstatura).toBeCloseTo(0.5, 2)
    expect(d.cinturaCadera).toBeCloseTo(0.85, 2)
  })
})
