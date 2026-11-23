import { describe, expect, test } from 'vitest'
import { cuadritos, mensajesDe } from '../../src/domain/cifras'
import type { Mensaje } from '../../src/domain/insights'
import { m, persona } from './helpers'

const p = persona({ fechaNacimiento: '1990-01-01' })
const HOY = '2026-11-23'

describe('cuadritos de la ficha', () => {
  test('grasa, músculo, cintura y visceral, en ese orden', () => {
    const ms = [
      m('2026-11-16', { pesoKg: 90, grasaPct: 28, musculoKg: 36, cinturaCm: 96, grasaVisceral: 14 }),
      m('2026-11-23', { pesoKg: 89.5, grasaPct: 27.5, musculoKg: 36.2, cinturaCm: 95, grasaVisceral: 14 }),
    ]
    const c = cuadritos(p, ms, HOY)
    expect(c.map((x) => x.medida)).toEqual(['grasaPct', 'musculoKg', 'cinturaCm', 'grasaVisceral'])
    expect(c[2]).toMatchObject({ valor: 95, cambio: -1, tono: 'bien', unidad: 'cm', desde: '2026-11-16', fecha: '2026-11-23' })
    expect(c[0].clasificacion).not.toBeNull()
  })
  test('si falta alguna, se completa con IMC y las siguientes', () => {
    const c = cuadritos(p, [m('2026-11-23', { pesoKg: 80, cinturaCm: 90 })], HOY)
    expect(c.map((x) => x.medida)).toEqual(['cinturaCm', 'imc'])
  })
  test('sin mediciones no hay cuadritos', () => expect(cuadritos(p, [], HOY)).toEqual([]))
})

describe('mensajes por medida', () => {
  const msg = (codigo: Mensaje['codigo']): Mensaje => ({ codigo, tono: 'neutro', titulo: codigo, texto: '' })
  const todos = (['tendencia', 'alerta_cintura', 'alerta_visceral', 'imc', 'pierde_musculo', 'gana_grasa', 'desde_inicio'] as const).map(msg)
  test('cada medida recibe los suyos', () => {
    expect(mensajesDe('cinturaCm', todos).map((x) => x.codigo)).toEqual(['alerta_cintura'])
    expect(mensajesDe('grasaVisceral', todos).map((x) => x.codigo)).toEqual(['alerta_visceral'])
    expect(mensajesDe('musculoKg', todos).map((x) => x.codigo)).toEqual(['pierde_musculo'])
    expect(mensajesDe('grasaPct', todos).map((x) => x.codigo)).toEqual(['gana_grasa'])
    expect(mensajesDe('pesoKg', todos).map((x) => x.codigo)).toEqual(['tendencia', 'imc', 'desde_inicio'])
    expect(mensajesDe('masaOseaKg', todos)).toEqual([])
  })
})
