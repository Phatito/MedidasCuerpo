import { describe, expect, test } from 'vitest'
import { proyeccionMeta, tendenciaPeso } from '../../src/domain/trend'

const semanal = (inicio: string, pesos: number[]) =>
  pesos.map((valor, i) => {
    const d = new Date(inicio + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 7 * i)
    return { fecha: d.toISOString().slice(0, 10), valor }
  })
const finitos = (x: unknown) => JSON.stringify(x).match(/NaN|Infinity|null,"ritmo/) === null && Object.values(x as object).every((v) => typeof v !== 'number' || Number.isFinite(v))

describe('tendenciaPeso', () => {
  test('sin pesadas no hay tendencia', () => expect(tendenciaPeso([])).toEqual([]))
  test('con una pesada la tendencia es esa pesada', () => {
    expect(tendenciaPeso([{ fecha: '2026-11-01', valor: 100 }])).toEqual([{ fecha: '2026-11-01', valor: 100, tendencia: 100 }])
  })
  test('una pesada semanal nueva aporta 1 − 0,9^7 de la diferencia', () => {
    const t = tendenciaPeso(semanal('2026-11-01', [100, 98]))
    expect(t[1].tendencia).toBeCloseTo(100 + (98 - 100) * (1 - 0.9 ** 7), 6)
    expect(t[1].tendencia).toBeCloseTo(98.957, 3)
  })
  test('suaviza una subida puntual', () => {
    const t = tendenciaPeso(semanal('2026-10-04', [103.9, 103.8, 102.7, 102.2, 103.0]))
    const ultima = t[4].tendencia
    expect(ultima).toBeGreaterThan(102.2)
    expect(ultima).toBeLessThan(103.0)
  })
  test('dos pesadas con la misma fecha no rompen el cálculo', () => {
    const t = tendenciaPeso([{ fecha: '2026-11-01', valor: 100 }, { fecha: '2026-11-01', valor: 99 }])
    expect(t[1].tendencia).toBeCloseTo(99.9, 6)
  })
  test('tras meses sin pesarse, la tendencia toma la pesada nueva', () => {
    const t = tendenciaPeso([{ fecha: '2026-01-01', valor: 100 }, { fecha: '2026-06-30', valor: 90 }])
    expect(t[1].tendencia).toBeCloseTo(90, 2)
  })
  test('ordena por fecha y no muta la entrada', () => {
    const entrada = [{ fecha: '2026-11-08', valor: 98 }, { fecha: '2026-11-01', valor: 100 }]
    expect(tendenciaPeso(entrada)).toEqual(tendenciaPeso([...entrada].reverse()))
    expect(entrada[0].fecha).toBe('2026-11-08')
  })
})

describe('proyeccionMeta', () => {
  const bajando = tendenciaPeso(semanal('2026-10-04', [100, 99.5, 99, 98.5, 98]))

  test('sin mediciones no hay proyección', () => expect(proyeccionMeta([], 90)).toBeNull())

  test('bajando hacia una meta más baja: fecha estimada', () => {
    const p = proyeccionMeta(bajando, 96)!
    expect(p.estado).toBe('estimada')
    expect(p.ritmoSemanalKg).toBeLessThan(0)
    expect(p.faltaKg).toBeLessThan(0)
    expect(p.fecha! > '2026-11-01').toBe(true)
    // Al ritmo de la tendencia: (meta − tendencia) / ritmo diario, hacia arriba.
    const ritmoDiario = (bajando[4].tendencia - bajando[0].tendencia) / 28
    const dias = Math.ceil((96 - bajando[4].tendencia) / ritmoDiario)
    const esperada = new Date('2026-11-01T00:00:00Z')
    esperada.setUTCDate(esperada.getUTCDate() + dias)
    expect(p.fecha).toBe(esperada.toISOString().slice(0, 10))
  })

  test('meta por encima estando en bajada: en contra, sin fecha', () => {
    expect(proyeccionMeta(bajando, 105)).toMatchObject({ estado: 'en_contra', fecha: null })
  })
  test('peso sin cambios: en contra, sin fecha', () => {
    expect(proyeccionMeta(tendenciaPeso(semanal('2026-10-04', [100, 100, 100, 100])), 95)).toMatchObject({ estado: 'en_contra', fecha: null })
  })
  test('una sola medición: sin datos', () => {
    expect(proyeccionMeta(tendenciaPeso([{ fecha: '2026-11-01', valor: 100 }]), 95)).toMatchObject({ estado: 'sin_datos', fecha: null, ritmoSemanalKg: null })
  })
  test('dos mediciones separadas por 3 días: sin datos', () => {
    const s = tendenciaPeso([{ fecha: '2026-11-01', valor: 100 }, { fecha: '2026-11-04', valor: 99 }])
    expect(proyeccionMeta(s, 95)?.estado).toBe('sin_datos')
  })
  test('solo cuentan los últimos 28 días para el ritmo', () => {
    const s = tendenciaPeso([{ fecha: '2026-01-01', valor: 110 }, { fecha: '2026-11-01', valor: 100 }])
    expect(proyeccionMeta(s, 95)?.estado).toBe('sin_datos')
  })
  test('a menos de 0,05 kg de la meta: alcanzada', () => {
    const s = tendenciaPeso([{ fecha: '2026-11-01', valor: 95.04 }])
    expect(proyeccionMeta(s, 95)).toMatchObject({ estado: 'alcanzada', fecha: null })
  })
  test('la meta quedó entre la primera tendencia y la actual: alcanzada', () => {
    expect(proyeccionMeta(bajando, 99.5)?.estado).toBe('alcanzada')
  })
  test('ritmo ínfimo hacia una meta lejana: sin fecha', () => {
    const s = tendenciaPeso(semanal('2026-10-04', [100, 99.99, 99.98, 99.97, 99.96]))
    expect(proyeccionMeta(s, 90)).toMatchObject({ estado: 'lejana', fecha: null })
  })
  test('ningún resultado contiene NaN ni Infinity', () => {
    const casos = [proyeccionMeta(bajando, 96), proyeccionMeta(bajando, 105), proyeccionMeta(bajando, bajando[4].tendencia), proyeccionMeta(tendenciaPeso([{ fecha: '2026-11-01', valor: 100 }]), 100)]
    for (const c of casos) expect(finitos(c)).toBe(true)
  })
})
