import { describe, expect, test } from 'vitest'
import { leerCapturaXiaomi, type LineaOcr, type PalabraOcr } from '../../src/domain/capturaXiaomi'

// Números inventados. Ancho de la imagen preparada: 620 px.
const ANCHO = 620
const p = (texto: string, x0: number, y0: number, alto = 20): PalabraOcr => ({ texto, x0, y0, x1: x0 + texto.length * 10, y1: y0 + alto })
/** Varias palabras seguidas en una línea, empezando en x0. */
function frase(texto: string, x0: number, y0: number, alto = 20): PalabraOcr[] {
  let x = x0
  return texto.split(' ').map((t) => {
    const w = p(t, x, y0, alto)
    x = w.x1 + 10
    return w
  })
}
/** Una fila de tarjetas: la línea de valores y, 30 px más abajo, la de rótulos (columna izquierda en 20, derecha en 320). */
function fila(y: number, izq: [string, string] | null, der: [string, string] | null): LineaOcr[] {
  const valores: PalabraOcr[] = []
  const rotulos: PalabraOcr[] = []
  if (izq) {
    valores.push(p(izq[0], 20, y, 24))
    rotulos.push(...frase(izq[1], 20, y + 30))
  }
  if (der) {
    valores.push(p(der[0], 320, y, 24))
    rotulos.push(...frase(der[1], 320, y + 30))
  }
  return [valores, rotulos]
}

const encabezado: LineaOcr[] = [[p('Ana', 20, 10)], [p('15/11/2026', 20, 40), p('07:45', 140, 40)], [p('82', 250, 80, 60), p(',4', 330, 100, 30)]]
const composicion: LineaOcr[] = [
  ...fila(200, ['25,1', 'IMC'], ['22,7%', 'Porcentaje de grasa corporal']),
  ...fila(300, null, ['45,0kg', 'Masa de agua corporal']),
  ...fila(360, null, ['18,7rg', 'Grasa corporal']),
]
const tarjetas: LineaOcr[] = [
  ...fila(500, ['54,6%', 'Agua corporal'], ['16,9%', 'Porcentaje de proteínas']),
  ...fila(600, ['3,9%', 'Porcentaje mineral óseo'], ['33,619', 'Masa muscular esquelética']),
  ...fila(700, ['9,0', 'Calificación de grasa visceral'], ['1712Kcal', 'Índice metabólico basal']),
  ...fila(800, ['63,7kg', 'Peso corporal sin grasa'], null),
]

describe('leerCapturaXiaomi', () => {
  test('lee la fecha, el peso y los campos, y comprueba peso y porcentajes', () => {
    const r = leerCapturaXiaomi([...encabezado, ...composicion, ...tarjetas], ANCHO)
    expect(r).toEqual({
      fecha: '2026-11-15',
      hora: '07:45',
      // La masa ósea no tiene su tarjeta en estas líneas: se calcula con el porcentaje mineral óseo (3,9 % de 82,4 kg).
      valores: { pesoKg: 82.4, grasaPct: 22.7, aguaPct: 54.6, musculoKg: 33.6, grasaVisceral: 9, proteinaPct: 16.9, metabolismoBasalKcal: 1712, masaOseaKg: 3.2 },
      revisar: ['musculoKg', 'grasaVisceral', 'proteinaPct', 'metabolismoBasalKcal'],
    })
  })

  test('la réplica completa rellena los once campos', () => {
    const extra: LineaOcr[] = [
      ...fila(900, ['60,5kg', 'Masa muscular'], ['73,4%', 'Porcentaje de músculo']),
      ...fila(1000, ['3,2kg', 'Contenido mineral óseo'], ['13,9kg', 'Masa proteica']),
      ...fila(1100, ['31', 'Edad corporal'], ['72ipm', 'Frecuencia cardíaca']),
    ]
    // La réplica trae proteína 16,9 %, que con 13,9 kg / 82,4 kg (16,87 %) cuadra.
    const r = leerCapturaXiaomi([...encabezado, ...composicion, ...tarjetas, ...extra], ANCHO)
    expect(r.valores).toEqual({
      pesoKg: 82.4, grasaPct: 22.7, aguaPct: 54.6, musculoKg: 33.6, grasaVisceral: 9, proteinaPct: 16.9, metabolismoBasalKcal: 1712,
      musculoTotalKg: 60.5, masaOseaKg: 3.2, edadCorporal: 31, frecuenciaCardiacaLpm: 72,
    })
    expect(r.revisar).toEqual(expect.arrayContaining(['musculoKg', 'grasaVisceral', 'metabolismoBasalKcal', 'edadCorporal', 'frecuenciaCardiacaLpm']))
    expect(r.revisar).not.toContain('proteinaPct')
    expect(r.revisar).not.toContain('musculoTotalKg')
    expect(r.revisar).not.toContain('masaOseaKg')
  })

  test('"Masa muscular" no se confunde con la esquelética', () => {
    const r = leerCapturaXiaomi([...fila(100, ['60,5kg', 'Masa muscular'], ['33,6kg', 'Masa muscular esquelética'])], ANCHO)
    expect(r.valores).toMatchObject({ musculoKg: 33.6, musculoTotalKg: 60.5 })
  })

  test('sin peso grande, el peso es sin grasa + grasa y queda comprobado', () => {
    const r = leerCapturaXiaomi([...encabezado.slice(0, 2), ...composicion, ...tarjetas], ANCHO)
    expect(r.valores.pesoKg).toBe(82.4)
    expect(r.revisar).not.toContain('pesoKg')
  })

  test('peso grande que no cuadra: se usa la suma y se marca', () => {
    const grande: LineaOcr[] = [[p('88', 250, 80, 60), p(',4', 330, 100, 30)]]
    const r = leerCapturaXiaomi([...encabezado.slice(0, 2), ...grande, ...composicion, ...tarjetas], ANCHO)
    expect(r.valores.pesoKg).toBe(82.4)
    expect(r.revisar).toContain('pesoKg')
  })

  test('peso grande leído en una sola palabra', () => {
    const grande: LineaOcr[] = [[p('82,4', 250, 80, 60)]]
    expect(leerCapturaXiaomi([...grande, ...fila(500, ['9,0', 'Calificación de grasa visceral'], null)], ANCHO).valores.pesoKg).toBe(82.4)
  })

  test('porcentaje que no se leyó se calcula', () => {
    const sinGrasaPct: LineaOcr[] = [...fila(300, null, ['45,0kg', 'Masa de agua corporal']), ...fila(360, null, ['18,7rg', 'Grasa corporal'])]
    const r = leerCapturaXiaomi([...encabezado, ...sinGrasaPct, ...tarjetas], ANCHO)
    expect(r.valores.grasaPct).toBe(22.7)
    expect(r.revisar).not.toContain('grasaPct')
  })

  test('porcentaje que no cuadra se usa leído y se marca', () => {
    const malo: LineaOcr[] = [...fila(200, null, ['28,7%', 'Porcentaje de grasa corporal']), ...composicion.slice(2)]
    const r = leerCapturaXiaomi([...encabezado, ...malo, ...tarjetas], ANCHO)
    expect(r.valores.grasaPct).toBe(28.7)
    expect(r.revisar).toContain('grasaPct')
  })

  test('sin peso, todo lo leído queda para revisar', () => {
    const r = leerCapturaXiaomi([...fila(200, null, ['22,7%', 'Porcentaje de grasa corporal']), ...fila(700, ['9,0', 'Calificación de grasa visceral'], null)], ANCHO)
    expect(r.valores).toEqual({ grasaPct: 22.7, grasaVisceral: 9 })
    expect(r.revisar).toEqual(expect.arrayContaining(['grasaPct', 'grasaVisceral']))
  })

  test('un valor fuera de rango se descarta', () => {
    const r = leerCapturaXiaomi([...fila(700, ['99,0', 'Calificación de grasa visceral'], null)], ANCHO)
    expect(r.valores.grasaVisceral).toBeUndefined()
    expect(r.revisar).not.toContain('grasaVisceral')
  })

  test('un número lejos de la columna del rótulo no se toma', () => {
    const r = leerCapturaXiaomi([[p('9,0', 400, 700, 24)], frase('Calificación de grasa visceral', 20, 730)], ANCHO)
    expect(r.valores.grasaVisceral).toBeUndefined()
  })

  test('decimal separado por un espacio', () => {
    const r = leerCapturaXiaomi([...fila(600, null, ['13,', 'Masa proteica'])], ANCHO)
    expect(r.valores).toEqual({})
    const r2 = leerCapturaXiaomi([[p('13,', 320, 600, 24), p('9xg', 352, 600, 24)], frase('Masa muscular esquelética', 320, 630)], ANCHO)
    expect(r2.valores.musculoKg).toBe(13.9)
  })

  test('una imagen sin rótulos no devuelve valores', () => {
    expect(leerCapturaXiaomi([[p('Hola', 20, 10), p('mundo', 80, 10)]], ANCHO)).toEqual({ fecha: null, hora: null, valores: {}, revisar: [] })
  })
})
