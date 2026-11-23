import { describe, expect, test } from 'vitest'
import { conConsumo } from '../../src/domain/consumo'
import { estimarGasto, ritmoSemanalPct } from '../../src/domain/energia'
import type { Medicion, Persona } from '../../src/domain/types'
import { persona } from './helpers'

const sumar = (f: string, d: number) => new Date(Date.parse(f + 'T00:00:00Z') + d * 86_400_000).toISOString().slice(0, 10)
const FIN = '2026-11-23'

/** Pesadas cada `cada` días, desde `semanas` antes de FIN, cambiando `kgSemana` por semana. */
function pesadas(desdeKg: number, kgSemana: number, semanas: number, cada = 7): Medicion[] {
  const r: Medicion[] = []
  for (let d = -semanas * 7, i = 0; d <= 0; d += cada, i++) {
    r.push({ id: `m${i}`, personaId: 'p1', fecha: sumar(FIN, d), pesoKg: desdeKg + (kgSemana * (d + semanas * 7)) / 7 })
  }
  return r
}
const conKcal = (p: Persona, kcal: number, desde = '2026-01-01') => conConsumo(p, desde, kcal)

describe('gasto real estimado', () => {
  const tres = pesadas(80, -0.3, 3).filter((_, i) => i !== 1) // 3 pesadas en 21 días
  const ms = pesadas(100, -0.5, 12)
  const p = conKcal(persona(), 2500)

  test('con 12 semanas bajando 0,5 kg/sem a 2.500 kcal el gasto ronda 3.050, confianza alta', () => {
    const g = estimarGasto(p, ms)
    if (g.estado !== 'ok') throw new Error('se esperaba estimación')
    expect(Math.abs(g.gastoKcal - 3050)).toBeLessThanOrEqual(60)
    expect(g.gastoKcal % 10).toBe(0)
    expect(g.confianza).toBe('alta')
    expect(g.diasVentana).toBe(42)
    expect(g.consumoPromedio).toBe(2500)
  })

  test('kcal recomendadas = gasto + ritmo objetivo × 7.700 / 7, redondeadas a 50', () => {
    const g = estimarGasto(p, ms)
    if (g.estado !== 'ok') throw new Error('se esperaba estimación')
    expect(g.recomendadaKcal % 50).toBe(0)
    // peso de tendencia ≈ 94 kg → −0,5 % ≈ −0,47 kg/sem ≈ −517 kcal/día
    expect(Math.abs(g.recomendadaKcal - (g.gastoKcal - 0.005 * 94 * 1100))).toBeLessThanOrEqual(50)
    expect(g.pisoAplicado).toBe(false)
  })

  test('con 3 pesadas en 21 días la confianza es media con ventana de 28', () => {
    const g = estimarGasto(p, tres)
    expect(g).toMatchObject({ estado: 'ok', confianza: 'media', diasVentana: 28 })
  })

  test('sin datos suficientes dice qué falta', () => {
    expect(estimarGasto(p, pesadas(80, -0.3, 3).slice(2))).toMatchObject({ estado: 'faltan', faltanPesadas: 1 })
    expect(estimarGasto(persona(), tres)).toMatchObject({ estado: 'faltan', faltanPesadas: 0, faltanDias: 0, faltanDiasConsumo: 21 })
    expect(estimarGasto(p, [])).toMatchObject({ estado: 'faltan', faltanPesadas: 3 })
  })

  test('nunca recomienda menos del piso: 1.200 en mujeres', () => {
    const g = estimarGasto(conKcal(persona({ sexo: 'mujer' }), 1300), pesadas(60, 0, 8))
    expect(g).toMatchObject({ estado: 'ok', gastoKcal: 1300, recomendadaKcal: 1200, pisoAplicado: true })
  })

  test('mantener recomienda el gasto; ganar músculo suma', () => {
    const quieto = pesadas(70, 0, 8)
    expect(estimarGasto(conKcal(persona({ objetivo: 'mantener' }), 2400), quieto)).toMatchObject({ gastoKcal: 2400, recomendadaKcal: 2400 })
    const g = estimarGasto(conKcal(persona({ objetivo: 'ganar_musculo' }), 2400), quieto)
    expect(g).toMatchObject({ recomendadaKcal: 2600 }) // 0,25 % de 70 kg ≈ 0,175 kg/sem ≈ +193 kcal
  })

  test('consumo que cambia a mitad de la ventana pondera los días de cada valor', () => {
    const q = conConsumo(conKcal(persona({ objetivo: 'mantener' }), 2500), sumar(FIN, -14), 2200)
    const g = estimarGasto(q, pesadas(70, 0, 8))
    if (g.estado !== 'ok') throw new Error('se esperaba estimación')
    expect(g.consumoPromedio).toBeCloseTo((28 * 2500 + 14 * 2200) / 42)
  })
})

describe('ritmo semanal', () => {
  test('bajando 0,5 kg/sem desde 100 kg ≈ −0,5 %', () => {
    expect(ritmoSemanalPct(persona(), pesadas(100, -0.5, 12))!).toBeCloseTo(-0.53, 1)
  })
  test('con hasta se corta en esa fecha', () => {
    const ms = [...pesadas(100, 0, 6), { id: 'x', personaId: 'p1', fecha: sumar(FIN, 7), pesoKg: 90 }]
    expect(ritmoSemanalPct(persona(), ms, FIN)!).toBeCloseTo(0, 5)
  })
  test('una sola pesada o dos el mismo día no dan ritmo', () => {
    expect(ritmoSemanalPct(persona(), pesadas(80, 0, 0))).toBeNull()
    const m = pesadas(80, 0, 0)[0]
    expect(ritmoSemanalPct(persona(), [m, { ...m, id: 'b', pesoKg: 81 }])).toBeNull()
  })
})
