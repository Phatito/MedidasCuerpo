import { expect, test } from 'vitest'
import { serieMetrica } from '../../src/domain/series'
import { m, persona } from './helpers'

const p = persona({ estaturaCm: 200 })
const ms = [
  m('2025-06-01', { pesoKg: 100, grasaPct: 30 }),
  m('2026-03-01', { pesoKg: 96 }),
  m('2026-09-01', { pesoKg: 92, grasaPct: 25 }),
  m('2026-11-15', { pesoKg: 90, grasaPct: 24 }),
]
const HOY = '2026-11-20'

test('el período deja solo las mediciones dentro de él', () => {
  expect(serieMetrica(p, ms, 'pesoKg', '3m', HOY).map((x) => x.fecha)).toEqual(['2026-09-01', '2026-11-15'])
  expect(serieMetrica(p, ms, 'pesoKg', '1a', HOY).map((x) => x.fecha)).toEqual(['2026-03-01', '2026-09-01', '2026-11-15'])
  expect(serieMetrica(p, ms, 'pesoKg', 'todo', HOY)).toHaveLength(4)
})
test('una medición sin el dato no aparece', () => {
  expect(serieMetrica(p, ms, 'grasaPct', 'todo', HOY).map((x) => x.valor)).toEqual([30, 25, 24])
})
test('IMC y masa grasa se calculan', () => {
  expect(serieMetrica(p, ms, 'imc', 'todo', HOY)[0].valor).toBeCloseTo(25)
  expect(serieMetrica(p, ms, 'grasaKg', 'todo', HOY)[0].valor).toBeCloseTo(30)
  expect(serieMetrica(p, ms, 'pesoSinGrasaKg', 'todo', HOY)[0].valor).toBeCloseTo(70)
})
test('las mediciones salen ordenadas por fecha', () => {
  expect(serieMetrica(p, [...ms].reverse(), 'pesoKg', 'todo', HOY).map((x) => x.fecha)).toEqual(ms.map((x) => x.fecha))
})
