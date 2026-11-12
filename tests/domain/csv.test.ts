import { describe, expect, test } from 'vitest'
import { filasAMediciones, medicionesACsv, parseCsv, sugerirAsignacion } from '../../src/domain/csv'
import { m } from './helpers'

describe('CSV exportado desde Excel en español', () => {
  const texto = '﻿Fecha;Peso;"Cintura";Nota\r\n05/11/2026;72,5;88;"dijo ""bien"""\r\n\r\n12/11/2026;72;87,5;\r\n'
  const { columnas, filas } = parseCsv(texto)

  test('quita el BOM y separa por punto y coma', () => {
    expect(columnas).toEqual(['Fecha', 'Peso', 'Cintura', 'Nota'])
    expect(filas).toHaveLength(2)
  })
  test('respeta comillas y comillas escapadas', () => {
    expect(filas[0][3]).toBe('dijo "bien"')
  })
  test('sugiere la asignación por nombre de columna', () => {
    expect(sugerirAsignacion(columnas)).toMatchObject({ fecha: 0, pesoKg: 1, cinturaCm: 2, nota: 3, caderaCm: null })
  })
  test('convierte filas en mediciones', () => {
    const r = filasAMediciones(filas, sugerirAsignacion(columnas), 'p1')
    expect(r.errores).toEqual([])
    expect(r.mediciones[0]).toEqual({
      id: 'p1_2026-11-05', personaId: 'p1', fecha: '2026-11-05', pesoKg: 72.5, cinturaCm: 88, nota: 'dijo "bien"', origen: 'csv',
    })
    expect(r.mediciones[1]).toEqual({
      id: 'p1_2026-11-12', personaId: 'p1', fecha: '2026-11-12', pesoKg: 72, cinturaCm: 87.5, origen: 'csv',
    })
  })
})

test('separador coma y encabezados en inglés con tildes y mayúsculas', () => {
  const { columnas, filas } = parseCsv('Date,Weight,Body Fat,MÚSCULO\n2026-11-05,72.5,21.3,34\n')
  const r = filasAMediciones(filas, sugerirAsignacion(columnas), 'p1')
  expect(r.mediciones[0]).toMatchObject({ fecha: '2026-11-05', pesoKg: 72.5, grasaPct: 21.3, musculoKg: 34 })
})

test('las filas inválidas se informan con su número y no se importan', () => {
  const { columnas, filas } = parseCsv('fecha;peso\n05/11/2026;\n06/11/2026;900\nayer;70\n07/11/2026;70\n')
  const r = filasAMediciones(filas, sugerirAsignacion(columnas), 'p1')
  expect(r.mediciones.map((x) => x.fecha)).toEqual(['2026-11-07'])
  expect(r.errores.map((e) => e.fila)).toEqual([2, 3, 4])
  expect(r.errores[0].motivo).toContain('peso')
  expect(r.errores[2].motivo).toContain('fecha')
})

test('sin columna de fecha o de peso asignada, todas las filas fallan', () => {
  const { columnas, filas } = parseCsv('a;b\n1;2\n')
  const r = filasAMediciones(filas, sugerirAsignacion(columnas), 'p1')
  expect(r.mediciones).toEqual([])
  expect(r.errores).toHaveLength(1)
})

test('exportar e importar reproduce las mediciones', () => {
  const ms = [
    m('2026-11-01', { pesoKg: 72.5, grasaPct: 21.3, cinturaCm: 88, nota: 'con ; y "comillas", ok', origen: 'csv' }),
    m('2026-11-08', { pesoKg: 72, origen: 'csv' }),
  ]
  const { columnas, filas } = parseCsv(medicionesACsv(ms))
  expect(filasAMediciones(filas, sugerirAsignacion(columnas), 'p1').mediciones).toEqual(ms)
})

test('texto vacío no rompe', () => {
  expect(parseCsv('')).toEqual({ columnas: [], filas: [] })
})

describe('codificación del archivo', () => {
  test('un CSV guardado por Excel en Windows-1252 conserva tildes', async () => {
    const { decodificarTexto } = await import('../../src/domain/csv')
    const latin1 = Uint8Array.from('Fecha;Peso;Músculo;Nota\r\n05/11/2026;72,5;34;después de almorzar\r\n', (c) => c.charCodeAt(0))
    const { columnas, filas } = parseCsv(decodificarTexto(latin1))
    expect(columnas[2]).toBe('Músculo')
    expect(sugerirAsignacion(columnas).musculoKg).toBe(2)
    expect(filas[0][3]).toBe('después de almorzar')
  })
  test('un CSV en UTF-8 se lee igual que antes', async () => {
    const { decodificarTexto } = await import('../../src/domain/csv')
    expect(decodificarTexto(new TextEncoder().encode('Músculo;ñandú'))).toBe('Músculo;ñandú')
  })
})

describe('pendientes menores de la revisión', () => {
  const importar = (texto: string, hoy = '2026-11-11') => {
    const { columnas, filas } = parseCsv(texto)
    return filasAMediciones(filas, sugerirAsignacion(columnas), 'p1', { hoy, columnas: columnas.length })
  }

  test('una fila con más celdas que el encabezado se rechaza en vez de truncar el decimal', () => {
    const r = importar('Fecha,Peso\n05/11/2026,72,5\n06/11/2026,72\n')
    expect(r.mediciones.map((x) => x.pesoKg)).toEqual([72])
    expect(r.errores).toEqual([{ fila: 2, motivo: expect.stringContaining('más columnas') }])
  })

  test('fechas repetidas en el archivo: queda la última y se informa la anterior', () => {
    const r = importar('fecha;peso\n05/11/2026;72\n05/11/2026;73\n')
    expect(r.mediciones).toHaveLength(1)
    expect(r.mediciones[0].pesoKg).toBe(73)
    expect(r.errores).toEqual([{ fila: 2, motivo: expect.stringContaining('repetida') }])
  })

  test('las fechas futuras se rechazan', () => {
    const r = importar('fecha;peso\n12/11/2026;72\n11/11/2026;72\n')
    expect(r.mediciones.map((x) => x.fecha)).toEqual(['2026-11-11'])
    expect(r.errores[0].motivo).toContain('futura')
  })

  test('un archivo con fechas mes/día/año se reconoce por sus días mayores a 12', () => {
    const r = importar('date,weight\n10/05/2026,72\n10/25/2026,71\n')
    expect(r.errores).toEqual([])
    expect(r.mediciones.map((x) => x.fecha)).toEqual(['2026-10-05', '2026-10-25'])
  })

  test('la sugerencia de columnas no confunde masas ni palabras parecidas', () => {
    const a = sugerirAsignacion(['Date', 'Weight', 'Fat Free Mass', 'Masa grasa (kg)', 'Body Fat (%)', 'Warm up', 'Championship'])
    expect(a).toMatchObject({ fecha: 0, pesoKg: 1, grasaPct: 4, brazoCm: null, caderaCm: null })
  })

  test('el CSV exportado se abre bien en Excel en español: BOM, punto y coma y coma decimal', () => {
    const texto = medicionesACsv([m('2026-11-01', { pesoKg: 72.5, cinturaCm: 88 })])
    expect(texto.startsWith('﻿')).toBe(true)
    expect(texto).toContain('2026-11-01;72,5;')
  })
})

describe('medidas por lado', () => {
  test('reconoce los encabezados de la hoja del entrenador', () => {
    const a = sugerirAsignacion(['Fecha', 'Peso', 'Torso', 'Brazo izquierdo', 'Brazo derecho', 'Cintura', 'Cadera', 'Pierna izquierda', 'Pierna derecha'])
    expect(a).toMatchObject({
      fecha: 0, pesoKg: 1, pechoCm: 2, brazoIzqCm: 3, brazoDerCm: 4, cinturaCm: 5, caderaCm: 6, musloIzqCm: 7, musloDerCm: 8, brazoCm: null, musloCm: null,
    })
  })
  test('columnas con y sin lado a la vez van cada una a su campo', () => {
    expect(sugerirAsignacion(['Fecha', 'Peso', 'Brazo', 'Brazo izquierdo', 'Pierna'])).toMatchObject({ brazoCm: 2, brazoIzqCm: 3, musloCm: 4, musloIzqCm: null })
  })
  test('encabezados en inglés', () => {
    expect(sugerirAsignacion(['date', 'weight', 'Left Arm', 'Right Thigh', 'Left leg'])).toMatchObject({ brazoIzqCm: 2, musloDerCm: 3, musloIzqCm: 4 })
  })
  test('exportar e importar conserva los cuatro campos por lado', () => {
    const ms = [m('2026-11-01', { pesoKg: 90, brazoIzqCm: 35, brazoDerCm: 36.5, musloIzqCm: 55, musloDerCm: 55.5, brazoCm: 34, origen: 'csv' })]
    const { columnas, filas } = parseCsv(medicionesACsv(ms))
    expect(filasAMediciones(filas, sugerirAsignacion(columnas), 'p1').mediciones).toEqual(ms)
  })
})
