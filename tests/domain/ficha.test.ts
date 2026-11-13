import { describe, expect, test } from 'vitest'
import { PERIMETROS, resumenFicha } from '../../src/domain/ficha'
import { m, persona } from './helpers'

const p = persona()
const tarjeta = (r: ReturnType<typeof resumenFicha>, clave: string) => r.tarjetas.find((t) => t.clave === clave)

test('sin mediciones todo está vacío', () => {
  expect(resumenFicha(p, [])).toEqual({ ultima: null, fechaPerimetros: null, medidas: [], asimetrias: [], tarjetas: [], serie: [], meta: null, mensaje: null })
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

  test('si la última medición es solo peso, la figura usa la última que tenga perímetros', () => {
    const r = resumenFicha(p, [
      m('2026-10-30', { cinturaCm: 92, brazoIzqCm: 38, brazoDerCm: 38 }),
      m('2026-11-06', { cinturaCm: 90, brazoIzqCm: 37, brazoDerCm: 39 }),
      m('2026-11-13', { pesoKg: 80 }),
    ])
    expect(r.medidas).toEqual([
      { campo: 'brazoIzqCm', valor: 37, cambio: -1 },
      { campo: 'brazoDerCm', valor: 39, cambio: 1 },
      { campo: 'cinturaCm', valor: 90, cambio: -2 },
    ])
    expect(r.fechaPerimetros).toBe('2026-11-06')
    expect(r.asimetrias).toEqual([{ zona: 'brazo', mayor: 'der', diferencia: 2 }])
  })
  test('sin perímetros en ninguna medición no hay fecha de perímetros', () => {
    expect(resumenFicha(p, [m('2026-11-01'), m('2026-11-08')])).toMatchObject({ medidas: [], fechaPerimetros: null })
  })
  test('con perímetros en la última medición solo aparecen los de esa medición, en orden fijo', () => {
    const r = resumenFicha(p, [m('2026-11-01', { pechoCm: 100 }), m('2026-11-08', { musloCm: 58, cuelloCm: 39, caderaCm: 104 })])
    expect(r.medidas.map((x) => x.campo)).toEqual(['cuelloCm', 'caderaCm', 'musloCm'])
    expect(PERIMETROS).toEqual(['cuelloCm', 'pechoCm', 'brazoIzqCm', 'brazoDerCm', 'brazoCm', 'cinturaCm', 'caderaCm', 'musloIzqCm', 'musloDerCm', 'musloCm'])
  })
})

describe('tarjetas', () => {
  const serie = [m('2026-09-09', { pesoKg: 84.2, grasaPct: 29.5, musculoKg: 35 }), m('2026-10-10', { pesoKg: 83 }), m('2026-11-11', { pesoKg: 81.7, grasaPct: 26.8, musculoKg: 34 })]

  test('el peso se compara con la primera medición y es favorable si el objetivo es bajar grasa', () => {
    expect(tarjeta(resumenFicha(persona({ objetivo: 'bajar_grasa' }), serie), 'pesoKg')).toMatchObject({ cambio: -2.5, desde: '2026-09-09', tono: 'bien', ultimaPesada: 81.7 })
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
  expect(r.serie).toHaveLength(10)
  expect(r.serie[9]).toMatchObject({ fecha: '2026-10-14', valor: 93 })
  // La tendencia se calcula con todas las pesadas, no solo con las 10 que se muestran.
  expect(r.serie[0].tendencia).not.toBe(r.serie[0].valor)
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

test('grasa estimada antes y medida ahora: no se comparan entre sí', () => {
  const r = resumenFicha(p, [m('2026-11-01', { cuelloCm: 40, cinturaCm: 90 }), m('2026-11-08', { grasaPct: 22 })])
  expect(tarjeta(r, 'grasaPct')).toMatchObject({ valor: 22, estimada: false, cambio: null })
})

test('grasa visceral 9,5 no es elevada y conserva su decimal', () => {
  expect(tarjeta(resumenFicha(p, [m('2026-11-01', { grasaVisceral: 9.5 })]), 'grasaVisceral')).toMatchObject({ valor: 9.5, tono: 'neutro', nota: null })
})

describe('medidas por lado', () => {
  test('diferencia entre lados desde 1 cm', () => {
    expect(resumenFicha(p, [m('2026-11-01', { brazoIzqCm: 38, brazoDerCm: 39.5 })]).asimetrias).toEqual([{ zona: 'brazo', mayor: 'der', diferencia: 1.5 }])
    expect(resumenFicha(p, [m('2026-11-01', { musloIzqCm: 61, musloDerCm: 60 })]).asimetrias).toEqual([{ zona: 'muslo', mayor: 'izq', diferencia: 1 }])
  })
  test('0,9 cm de diferencia o un solo lado medido no se mencionan', () => {
    expect(resumenFicha(p, [m('2026-11-01', { brazoIzqCm: 38, brazoDerCm: 38.9 })]).asimetrias).toEqual([])
    expect(resumenFicha(p, [m('2026-11-01', { brazoIzqCm: 38 })]).asimetrias).toEqual([])
  })
  test('una medida sin lado no se dibuja si esa extremidad tiene medida por lado', () => {
    const r = resumenFicha(p, [m('2026-11-01', { brazoIzqCm: 38, brazoCm: 37, musloCm: 58 })])
    expect(r.medidas.map((x) => x.campo)).toEqual(['brazoIzqCm', 'musloCm'])
  })
  test('el cambio de cada lado se calcula por separado', () => {
    const r = resumenFicha(p, [m('2026-11-01', { brazoIzqCm: 38, brazoDerCm: 39 }), m('2026-11-08', { brazoIzqCm: 37, brazoDerCm: 39.5 })])
    expect(r.medidas).toEqual([{ campo: 'brazoIzqCm', valor: 37, cambio: -1 }, { campo: 'brazoDerCm', valor: 39.5, cambio: 0.5 }])
  })
})

describe('peso de tendencia y meta', () => {
  const subida = [m('2026-10-09', { pesoKg: 103.9 }), m('2026-10-16', { pesoKg: 103.8 }), m('2026-10-23', { pesoKg: 102.7 }), m('2026-10-30', { pesoKg: 102.2 }), m('2026-11-06', { pesoKg: 103 })]
  test('la tarjeta del peso muestra la tendencia, no la última pesada', () => {
    const t = tarjeta(resumenFicha(p, subida), 'pesoKg')!
    expect(t.ultimaPesada).toBe(103)
    expect(t.valor).toBeGreaterThan(102.2)
    expect(t.valor).toBeLessThan(103)
    expect(Number.isInteger(t.valor * 10)).toBe(true)
  })
  test('sin meta no hay proyección; con meta sí', () => {
    expect(resumenFicha(p, subida).meta).toBeNull()
    expect(resumenFicha(persona({ metaPesoKg: 95 }), subida).meta).toMatchObject({ faltaKg: expect.any(Number) })
  })
  test('a un menor no se le muestra la meta', () => {
    expect(resumenFicha(persona({ metaPesoKg: 30, fechaNacimiento: '2016-01-01', estaturaCm: 135 }), subida).meta).toBeNull()
  })
  test('la proyección usa la fecha de hoy', () => {
    expect(resumenFicha(persona({ metaPesoKg: 95 }), subida, { hoy: '2027-03-01' }).meta?.estado).toBe('sin_datos')
  })
})
