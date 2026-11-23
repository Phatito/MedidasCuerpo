import { describe, expect, test } from 'vitest'
import { conConsumo } from '../../src/domain/consumo'
import { ritmoSemanalPct } from '../../src/domain/energia'
import { informeSemanal } from '../../src/domain/semana'
import type { Medicion } from '../../src/domain/types'
import { m, persona } from './helpers'

const sumar = (f: string, d: number) => new Date(Date.parse(f + 'T00:00:00Z') + d * 86_400_000).toISOString().slice(0, 10)
const FIN = '2026-11-23'
/** Pesadas semanales que terminan en FIN, con los pesos dados (el último es FIN). */
const semanales = (pesos: number[], extra: (i: number) => Partial<Medicion> = () => ({})): Medicion[] =>
  pesos.map((pesoKg, i) => m(sumar(FIN, (i - pesos.length + 1) * 7), { pesoKg, ...extra(i) }))
const codigos = (i: ReturnType<typeof informeSemanal>) => i!.acciones.map((a) => a.codigo)

describe('informe semanal: qué cambió', () => {
  test('desglose de grasa y masa magra entre las dos últimas mediciones', () => {
    const inf = informeSemanal(persona(), semanales([80, 79], (i) => ({ grasaPct: [25, 24][i] })), FIN)!
    expect(inf.anterior).toBe(sumar(FIN, -7))
    expect(inf.composicion!.grasaKg).toBeCloseTo(-1.04, 1)
    expect(inf.composicion!.magraKg).toBeCloseTo(0.04, 1)
    expect(inf.composicionTotal).toMatchObject({ desde: sumar(FIN, -7) })
    expect(inf.barras).toHaveLength(2)
    expect(inf.cambioTendenciaKg!).toBeLessThan(0)
  })

  test('sin % de grasa no hay desglose ni barras', () => {
    const inf = informeSemanal(persona({ estaturaCm: 0 }), semanales([80, 79]), FIN)!
    expect(inf.composicion).toBeNull()
    expect(inf.composicionTotal).toBeNull()
    expect(inf.barras).toEqual([])
  })

  test('una sola medición: sin anterior ni revisión; dos el mismo día no rompen', () => {
    const una = informeSemanal(persona(), [m(FIN, { pesoKg: 80 })], FIN)!
    expect(una.anterior).toBeNull()
    expect(una.cambioTendenciaKg).toBeNull()
    expect(una.revision).toEqual([])
    const dos = informeSemanal(persona(), [m(FIN, { pesoKg: 80 }), { ...m(FIN, { pesoKg: 81 }), id: 'otra' }], FIN)!
    expect(dos.anterior).toBeNull()
    expect(informeSemanal(persona(), [], FIN)).toBeNull()
  })
})

describe('informe semanal: pesada atípica', () => {
  test('2 kg sobre la tendencia anterior es atípica; 0,8 kg no', () => {
    expect(informeSemanal(persona(), semanales([80, 80, 80, 82]), FIN)!.atipica).toMatchObject({ sentido: 'sobre' })
    expect(informeSemanal(persona(), semanales([80, 80, 80, 78]), FIN)!.atipica).toMatchObject({ sentido: 'bajo' })
    expect(informeSemanal(persona(), semanales([80, 80, 80, 80.8]), FIN)!.atipica).toBeNull()
  })
})

describe('informe semanal: qué hacer', () => {
  const rapido = semanales([100, 98.7, 97.4, 96.1, 94.8, 93.5, 92.2])

  test('bajar más de 1 %/sem pide comer más', () => {
    expect(ritmoSemanalPct(persona(), rapido)!).toBeLessThan(-1)
    expect(codigos(informeSemanal(persona(), rapido, FIN))[0]).toBe('muy-rapido')
    // Bajar rápido pero parejo no es una pesada atípica.
    expect(informeSemanal(persona(), rapido, FIN)!.atipica).toBeNull()
  })

  test('masa magra −0,6 kg pide proteger el músculo con el rango de proteína', () => {
    const inf = informeSemanal(persona(), semanales([80, 79.6], (i) => ({ grasaPct: [25, 25.4][i] })), FIN)!
    expect(inf.composicion!.magraKg).toBeLessThan(-0.5)
    const a = inf.acciones.find((x) => x.codigo === 'proteger-musculo')!
    expect(a.texto).toMatch(/130–175 g/)
  })

  test('con IMC ≥ 30 la proteína se calcula sobre el peso de IMC 25', () => {
    const inf = informeSemanal(persona(), semanales([110, 109.6], (i) => ({ grasaPct: [35, 35.4][i] })), FIN)!
    expect(inf.acciones.find((x) => x.codigo === 'proteger-musculo')!.texto).toMatch(/115–160 g/)
  })

  test('nunca más de 2 acciones', () => {
    const ms = semanales([100, 98.7, 97.4, 96.1, 94.8, 93.5, 92.2, 90.9], (i) => ({ grasaPct: i === 7 ? 30 : 28 }))
    const inf = informeSemanal(persona(), ms, FIN)!
    expect(inf.acciones).toHaveLength(2)
    expect(codigos(inf)).toEqual(['muy-rapido', 'proteger-musculo'])
  })

  test('estancado bajando grasa con consumo y estimación: baja a la kcal recomendada', () => {
    const p = conConsumo(persona(), '2026-01-01', 2500)
    const inf = informeSemanal(p, semanales([90, 89.9, 89.8, 89.7, 89.6, 89.5, 89.4, 89.3]), FIN)!
    expect(inf.gasto).toMatchObject({ estado: 'ok' })
    const reco = inf.gasto!.estado === 'ok' ? inf.gasto!.recomendadaKcal : 0
    expect(codigos(inf)).toEqual(['estancado'])
    expect(inf.acciones[0].texto).toContain(reco.toLocaleString('es-CL'))
  })

  test('sin consumo pide anotarlo; con consumo pero sin estimación pide seguir anotando', () => {
    expect(codigos(informeSemanal(persona(), semanales([80, 79.9]), FIN))).toContain('anota-consumo')
    const p = conConsumo(persona(), sumar(FIN, -7), 2500)
    const inf = informeSemanal(p, semanales([80, 79.9]), FIN)!
    expect(codigos(inf)).toEqual(['sigue-anotando'])
    expect(inf.acciones[0].texto).toMatch(/\d semanas?/)
  })

  test('consumo a ±150 de lo recomendado: sigue con tu consumo actual', () => {
    const p = conConsumo(persona({ objetivo: 'mantener' }), '2026-01-01', 2400)
    const inf = informeSemanal(p, semanales([70, 70, 70, 70, 70, 70, 70, 70]), FIN)!
    expect(codigos(inf)).toEqual(['vas-bien'])
    expect(inf.acciones[0].texto).toMatch(/sigue con tu consumo actual \(~2\.400 kcal\)/)
  })

  test('la edad no cambia el informe: un menor recibe acciones y estimación igual que un adulto', () => {
    const inf = informeSemanal(persona({ fechaNacimiento: '2015-01-01' }), rapido, FIN)!
    expect(codigos(inf)[0]).toBe('muy-rapido')
    expect(inf.gasto).not.toBeNull()
  })

  test('datos de hace 30 días: viejo, sin acciones ni kcal', () => {
    const inf = informeSemanal(persona(), rapido, sumar(FIN, 30))!
    expect(inf.vieja).toBe(true)
    expect(inf.acciones).toEqual([])
    expect(inf.gasto).toBeNull()
  })
})

describe('informe semanal: revisión de la semana pasada', () => {
  test('la semana pasada iba muy rápido y ahora el ritmo es más suave: cumplida', () => {
    const ms = semanales([100, 98.5, 97, 95.5, 94, 92.5, 92.3, 92.2])
    const antes = informeSemanal(persona(), ms.slice(0, -1), sumar(FIN, -7))!
    expect(codigos(antes)[0]).toBe('muy-rapido')
    const ritmo = ritmoSemanalPct(persona(), ms)!
    expect(ritmo).toBeGreaterThan(-1)
    const inf = informeSemanal(persona(), ms, FIN)!
    expect(inf.revision.find((r) => r.codigo === 'muy-rapido')).toMatchObject({ cumplida: true })
  })

  test('anotar el consumo se cumple cuando ahora hay consumo', () => {
    const ms = semanales([80, 79.9, 79.8])
    const p = conConsumo(persona(), sumar(FIN, -3), 2500)
    const inf = informeSemanal(p, ms, FIN)!
    expect(inf.revision.find((r) => r.codigo === 'anota-consumo')).toMatchObject({ cumplida: true })
  })
})

describe('revisión final: casos de la revisión', () => {
  test('bajar parejo pesándose cada 14 días no es una pesada atípica', () => {
    const ms = Array.from({ length: 10 }, (_, i) => m(sumar(FIN, (i - 9) * 14), { pesoKg: 85 - i }))
    expect(informeSemanal(persona(), ms, FIN)!.atipica).toBeNull()
  })

  test('una baja de agua (pesada atípica) no pide proteger el músculo', () => {
    const inf = informeSemanal(persona(), semanales([85, 85, 85, 83.5], () => ({ grasaPct: 25 })), FIN)!
    expect(inf.atipica).toMatchObject({ sentido: 'bajo' })
    expect(codigos(inf)).not.toContain('proteger-musculo')
  })

  test('sin datos de grasa ni músculo ahora, la revisión no da por cumplido proteger el músculo', () => {
    const ms = [...semanales([80, 79.6], (i) => ({ grasaPct: [25, 25.4][i] })).map((x) => ({ ...x, fecha: sumar(x.fecha, -7), id: x.id + 'a' })), m(FIN, { pesoKg: 79.5 })]
    const inf = informeSemanal(persona(), ms, FIN)!
    expect(inf.revision.find((r) => r.codigo === 'proteger-musculo')).toBeUndefined()
  })

  test('los textos de lo que falta usan singular', () => {
    const p = conConsumo(persona(), sumar(FIN, -14), 2500)
    const inf = informeSemanal(p, semanales([80, 79.9, 79.8]), FIN)!
    expect(inf.acciones[0].texto).toMatch(/en 1 semana/)
  })
})

describe('pulido de la revisión', () => {
  test('con solo dos mediciones no hay revisión (la semana pasada no tuvo informe)', () => {
    expect(informeSemanal(persona(), semanales([80, 79.9]), FIN)!.revision).toEqual([])
  })
  test('seguir anotando se cumple cuando ya hay estimación; si no, no se evalúa', () => {
    const p = conConsumo(persona(), '2026-01-01', 2500)
    const ms = semanales([90, 89.5, 89, 88.5, 88, 87.5, 87, 86.5])
    // Una semana antes ya había estimación: no se pidió seguir anotando.
    const inf = informeSemanal(p, ms, FIN)!
    expect(inf.revision.find((r) => r.codigo === 'sigue-anotando')).toBeUndefined()
    const q = conConsumo(persona(), sumar(FIN, -14), 2500)
    const sin = informeSemanal(q, semanales([80, 79.9, 79.8]), FIN)!
    expect(sin.revision.find((r) => r.codigo === 'sigue-anotando')).toBeUndefined()
  })
})
