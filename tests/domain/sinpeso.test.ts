import { describe, expect, test } from 'vitest'
import { leerCinta } from '../../src/domain/cinta'
import { filasAMediciones, medicionesACsv, parseCsv, sugerirAsignacion } from '../../src/domain/csv'
import { resumenFicha } from '../../src/domain/ficha'
import { interpretar } from '../../src/domain/insights'
import { conPeso, fusionarMedicion, medicionCompleta } from '../../src/domain/medicion'
import { informeSemanal } from '../../src/domain/semana'
import { m, persona } from './helpers'

const sinPeso = (fecha: string, campos = {}) => {
  const x = m(fecha, campos)
  delete x.pesoKg
  return x
}
const p = persona()

describe('mediciones sin peso (solo cinta)', () => {
  const ms = [m('2026-11-09', { pesoKg: 80, cinturaCm: 90 }), m('2026-11-16', { pesoKg: 79.5 }), sinPeso('2026-11-18', { cinturaCm: 89 })]

  test('la ficha toma el peso de la última pesada y la figura de la cinta', () => {
    const r = resumenFicha(p, ms, { hoy: '2026-11-18' })
    expect(r.tarjetas.find((t) => t.clave === 'pesoKg')!.ultimaPesada).toBe(79.5)
    expect(r.fechaPerimetros).toBe('2026-11-18')
    expect(r.medidas.find((x) => x.campo === 'cinturaCm')!.valor).toBe(89)
  })

  test('Tu semana compara pesadas y lee la cinta', () => {
    const inf = informeSemanal(p, ms, '2026-11-18')!
    expect(inf.cambioTendenciaKg).not.toBeNull()
    expect(inf.cinta!.veredicto).toBe('pierde-grasa')
  })

  test('los comentarios no fallan', () => {
    expect(() => interpretar(p, ms)).not.toThrow()
    expect(interpretar(p, ms)[0].codigo).toBe('cinta')
  })

  test('la lectura de la cinta no inventa un cambio de peso', () => {
    expect(leerCinta(p, ms)!.dPesoKg).toBe(0)
  })

  test('una persona solo con cinta no rompe nada', () => {
    const solo = [sinPeso('2026-11-09', { cinturaCm: 90 }), sinPeso('2026-11-16', { cinturaCm: 89.5 })]
    const r = resumenFicha(p, solo, { hoy: '2026-11-16' })
    expect(r.tarjetas.find((t) => t.clave === 'pesoKg')).toBeUndefined()
    expect(r.medidas).toHaveLength(1)
    expect(() => informeSemanal(p, solo, '2026-11-16')).not.toThrow()
    expect(() => interpretar(p, solo)).not.toThrow()
  })

  test('conPeso deja solo las pesadas', () => {
    expect(conPeso(ms).map((x) => x.fecha)).toEqual(['2026-11-09', '2026-11-16'])
  })
})

describe('unir por día', () => {
  test('lo nuevo completa los campos sin borrar los otros', () => {
    const previa = m('2026-11-18', { pesoKg: 80, grasaPct: 22, origen: 'csv' })
    const nueva = sinPeso('2026-11-18', { cinturaCm: 89, origen: 'manual' })
    expect(fusionarMedicion(previa, nueva)).toMatchObject({ pesoKg: 80, grasaPct: 22, cinturaCm: 89 })
    expect(fusionarMedicion(undefined, nueva)).toEqual(nueva)
  })

  test('una medición vale con peso o con algún perímetro', () => {
    expect(medicionCompleta(sinPeso('2026-11-18', { cinturaCm: 89 }))).toBe(true)
    expect(medicionCompleta(m('2026-11-18'))).toBe(true)
    expect(medicionCompleta(sinPeso('2026-11-18'))).toBe(false)
  })
})

describe('CSV sin peso', () => {
  test('exporta la celda vacía y la vuelve a importar', () => {
    const csv = medicionesACsv([sinPeso('2026-11-18', { cinturaCm: 89 })])
    const { columnas, filas } = parseCsv(csv.replace(/^﻿/, ''))
    const r = filasAMediciones(filas, sugerirAsignacion(columnas), 'p1')
    expect(r.errores).toEqual([])
    expect(r.mediciones[0]).toMatchObject({ fecha: '2026-11-18', cinturaCm: 89 })
    expect(r.mediciones[0].pesoKg).toBeUndefined()
  })

  test('una fila sin peso ni medidas es un error', () => {
    const r = filasAMediciones([['2026-11-18', '', '']], { fecha: 0, pesoKg: 1, cinturaCm: 2 } as unknown as Parameters<typeof filasAMediciones>[1], 'p1')
    expect(r.errores[0].motivo).toMatch(/peso/)
  })
})
