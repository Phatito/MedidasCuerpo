import { describe, expect, test } from 'vitest'
import { PERIMETROS, resumenFicha } from '../../src/domain/ficha'
import { m, persona } from './helpers'

const p = persona()
const tarjeta = (r: ReturnType<typeof resumenFicha>, clave: string) => r.tarjetas.find((t) => t.clave === clave)

test('sin mediciones todo está vacío', () => {
  expect(resumenFicha(p, [])).toEqual({ ultima: null, medidas: [], tarjetas: [], pesos: [], mensaje: null })
})

describe('medidas sobre la figura', () => {
  test('con una sola medición no hay cambio', () => {
    const r = resumenFicha(p, [m('2026-11-01', { pesoKg: 80, cinturaCm: 90 })])
    expect(r.medidas).toEqual([{ campo: 'cinturaCm', valor: 90, cambio: null }])
    expect(tarjeta(r, 'pesoKg')).toMatchObject({ valor: 80, cambio: null, desde: null })
  })

  test('el cambio se calcula contra la última medición que tenga ese perímetro', () => {
    const r = resumenFicha(p, [m('2026-11-01', { cinturaCm: 92 }), m('2026-11-08'), m('2026-11-15', { cinturaCm: 90.5 })])
    expect(r.medidas).toEqual([{ campo: 'cinturaCm', valor: 90.5, cambio: -1.5 }])
  })

  test('un cambio que redondea a cero no se muestra', () => {
    const r = resumenFicha(p, [m('2026-11-01', { cinturaCm: 90 }), m('2026-11-08', { cinturaCm: 90.04 })])
    expect(r.medidas[0].cambio).toBeNull()
  })

  test('solo aparecen los perímetros de la última medición, en orden fijo', () => {
    const r = resumenFicha(p, [m('2026-11-01', { pechoCm: 100 }), m('2026-11-08', { musloCm: 58, cuelloCm: 39, caderaCm: 104 })])
    expect(r.medidas.map((x) => x.campo)).toEqual(['cuelloCm', 'caderaCm', 'musloCm'])
    expect(PERIMETROS).toEqual(['cuelloCm', 'pechoCm', 'brazoCm', 'cinturaCm', 'caderaCm', 'musloCm'])
  })
})

describe('tarjetas', () => {
  const serie = [m('2026-09-09', { pesoKg: 84.2, grasaPct: 29.5, musculoKg: 35 }), m('2026-10-10', { pesoKg: 83 }), m('2026-11-11', { pesoKg: 81.7, grasaPct: 26.8, musculoKg: 34 })]

  test('el peso se compara con la primera medición y es favorable si el objetivo es bajar grasa', () => {
    expect(tarjeta(resumenFicha(persona({ objetivo: 'bajar_grasa' }), serie), 'pesoKg')).toMatchObject({ valor: 81.7, cambio: -2.5, desde: '2026-09-09', tono: 'bien' })
  })
  test('con otro objetivo el peso no se colorea', () => {
    expect(tarjeta(resumenFicha(persona({ objetivo: 'ganar_musculo' }), serie), 'pesoKg')?.tono).toBe('neutro')
  })
  test('grasa que baja es favorable; músculo que baja es atención', () => {
    const r = resumenFicha(p, serie)
    expect(tarjeta(r, 'grasaPct')).toMatchObject({ valor: 26.8, cambio: -2.7, tono: 'bien', estimada: false })
    expect(tarjeta(r, 'musculoKg')).toMatchObject({ cambio: -1, tono: 'atencion' })
  })
  test('grasa medida antes y solo estimada ahora: se marca estimada y no se compara', () => {
    const r = resumenFicha(p, [m('2026-11-01', { grasaPct: 25 }), m('2026-11-08', { cuelloCm: 40, cinturaCm: 90 })])
    expect(tarjeta(r, 'grasaPct')).toMatchObject({ estimada: true, cambio: null, desde: null })
  })
  test('grasa visceral: 10 es elevada, 9 no', () => {
    expect(tarjeta(resumenFicha(p, [m('2026-11-01', { grasaVisceral: 10 })]), 'grasaVisceral')).toMatchObject({ tono: 'atencion', nota: 'Elevada' })
    expect(tarjeta(resumenFicha(p, [m('2026-11-01', { grasaVisceral: 9 })]), 'grasaVisceral')).toMatchObject({ tono: 'neutro', nota: null })
  })
  test('solo hay tarjetas para los datos presentes en la última medición', () => {
    expect(resumenFicha(p, [m('2026-11-01', { musculoKg: 35 }), m('2026-11-08')]).tarjetas.map((t) => t.clave)).toEqual(['pesoKg'])
  })
  test('en un menor de edad nada se colorea', () => {
    const nino = persona({ fechaNacimiento: '2020-06-01', estaturaCm: 115, objetivo: 'bajar_grasa' })
    const r = resumenFicha(nino, [m('2026-11-01', { pesoKg: 20, grasaVisceral: 12 }), m('2026-11-08', { pesoKg: 21, grasaVisceral: 12 })])
    expect(r.tarjetas.map((t) => t.tono)).toEqual(['neutro', 'neutro'])
    expect(r.tarjetas.every((t) => t.nota === null)).toBe(true)
  })
})

test('la tendencia trae las últimas 10 mediciones', () => {
  const ms = Array.from({ length: 14 }, (_, i) => m(`2026-10-${String(i + 1).padStart(2, '0')}`, { pesoKg: 80 + i }))
  const r = resumenFicha(p, ms)
  expect(r.pesos).toHaveLength(10)
  expect(r.pesos[9]).toEqual({ fecha: '2026-10-14', valor: 93 })
})

test('el mensaje es la primera interpretación', () => {
  const r = resumenFicha(p, [m('2026-11-01', { pesoKg: 80, cinturaCm: 90 }), m('2026-11-08', { pesoKg: 80.2, cinturaCm: 88.5 })])
  expect(r.mensaje?.codigo).toBe('recomposicion')
})

test('la entrada desordenada da el mismo resultado', () => {
  const a = m('2026-11-01', { pesoKg: 80, cinturaCm: 90 })
  const b = m('2026-11-08', { pesoKg: 79, cinturaCm: 88 })
  expect(resumenFicha(p, [b, a])).toEqual(resumenFicha(p, [a, b]))
})
