import { describe, expect, test } from 'vitest'
import { conConsumo, consumoVigente, diasConConsumo, sinConsumo } from '../../src/domain/consumo'
import { persona } from './helpers'

const p = conConsumo(conConsumo(persona(), '2026-12-01', 2200), '2026-11-01', 2500)

describe('consumo de kcal', () => {
  test('el consumo vigente depende de la fecha', () => {
    expect(consumoVigente(p, '2026-10-31')).toBeNull()
    expect(consumoVigente(p, '2026-11-15')).toBe(2500)
    expect(consumoVigente(p, '2026-12-01')).toBe(2200)
    expect(consumoVigente(persona(), '2026-11-15')).toBeNull()
  })
  test('guardar en la misma fecha reemplaza y se mantiene el orden', () => {
    const q = conConsumo(p, '2026-11-01', 2600)
    expect(q.consumos).toEqual([{ desde: '2026-11-01', kcal: 2600 }, { desde: '2026-12-01', kcal: 2200 }])
    expect(p.consumos).toEqual([{ desde: '2026-11-01', kcal: 2500 }, { desde: '2026-12-01', kcal: 2200 }])
  })
  test('quitar una entrada', () => expect(sinConsumo(p, '2026-12-01').consumos).toEqual([{ desde: '2026-11-01', kcal: 2500 }]))
  test('días con consumo y promedio ponderado', () => {
    const r = diasConConsumo(p, '2026-11-20', '2026-12-10')
    expect(r.dias).toBe(20)
    expect(r.promedio).toBeCloseTo((11 * 2500 + 9 * 2200) / 20)
    expect(diasConConsumo(persona(), '2026-11-20', '2026-12-10')).toEqual({ dias: 0, promedio: null })
    expect(diasConConsumo(p, '2026-10-25', '2026-11-04')).toMatchObject({ dias: 3, promedio: 2500 })
  })
})
