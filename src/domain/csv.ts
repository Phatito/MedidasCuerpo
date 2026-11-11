import { idMedicion, parseFecha, parseNumero } from './numbers'
import { CAMPOS_NUMERICOS, ETIQUETAS, type CampoNumerico, type Medicion } from './types'
import { validarValor } from './validation'

export type CampoCsv = 'fecha' | CampoNumerico | 'nota'
export type Asignacion = Record<CampoCsv, number | null>

// El orden importa: "grasa visceral" debe reconocerse antes que "grasa".
const ALIAS: [CampoCsv, string[]][] = [
  ['fecha', ['fecha', 'date']],
  ['grasaVisceral', ['visceral']],
  ['grasaPct', ['grasa', 'body fat', 'fat']],
  ['musculoKg', ['musculo', 'muscle', 'muscular']],
  ['aguaPct', ['agua', 'water']],
  ['pesoKg', ['peso', 'weight']],
  ['cuelloCm', ['cuello', 'neck']],
  ['pechoCm', ['pecho', 'chest']],
  ['cinturaCm', ['cintura', 'waist']],
  ['caderaCm', ['cadera', 'hip']],
  ['brazoCm', ['brazo', 'arm']],
  ['musloCm', ['muslo', 'thigh']],
  ['nota', ['nota', 'note', 'comentario']],
]

export const CAMPOS_CSV: CampoCsv[] = ['fecha', ...CAMPOS_NUMERICOS, 'nota']

export function nombreCampoCsv(campo: CampoCsv): string {
  if (campo === 'fecha') return 'Fecha'
  if (campo === 'nota') return 'Nota'
  return ETIQUETAS[campo].nombre
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

function partirLinea(linea: string, sep: string): string[] {
  const celdas: string[] = []
  let actual = ''
  let enComillas = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (enComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"'
        i++
      } else if (c === '"') enComillas = false
      else actual += c
    } else if (c === '"') enComillas = true
    else if (c === sep) {
      celdas.push(actual.trim())
      actual = ''
    } else actual += c
  }
  celdas.push(actual.trim())
  return celdas
}

export function parseCsv(texto: string): { columnas: string[]; filas: string[][] } {
  const lineas = texto
    .replace(/^﻿/, '')
    .split(/\r\n|\n|\r/)
    .filter((l) => l.trim() !== '')
  if (lineas.length === 0) return { columnas: [], filas: [] }
  const cuenta = (c: string) => lineas[0].split(c).length - 1
  const sep = cuenta(';') > cuenta(',') ? ';' : cuenta('\t') > cuenta(',') ? '\t' : ','
  const [columnas, ...filas] = lineas.map((l) => partirLinea(l, sep))
  return { columnas, filas }
}

export function sugerirAsignacion(columnas: string[]): Asignacion {
  const nombres = columnas.map(normalizar)
  const usadas = new Set<number>()
  const asignacion = Object.fromEntries(CAMPOS_CSV.map((c) => [c, null])) as Asignacion
  for (const [campo, alias] of ALIAS) {
    const i = nombres.findIndex((n, idx) => !usadas.has(idx) && alias.some((a) => n.includes(a)))
    if (i >= 0) {
      asignacion[campo] = i
      usadas.add(i)
    }
  }
  return asignacion
}

export function filasAMediciones(
  filas: string[][],
  asignacion: Asignacion,
  personaId: string,
): { mediciones: Medicion[]; errores: { fila: number; motivo: string }[] } {
  const mediciones: Medicion[] = []
  const errores: { fila: number; motivo: string }[] = []
  const celda = (fila: string[], campo: CampoCsv) => {
    const i = asignacion[campo]
    return i == null ? '' : (fila[i] ?? '').trim()
  }

  filas.forEach((fila, idx) => {
    const numero = idx + 2 // la fila 1 es el encabezado
    const error = (motivo: string) => errores.push({ fila: numero, motivo })

    if (asignacion.fecha == null) return error('No hay una columna asignada a la fecha')
    if (asignacion.pesoKg == null) return error('No hay una columna asignada al peso')
    const fecha = parseFecha(celda(fila, 'fecha'))
    if (fecha == null) return error(`La fecha "${celda(fila, 'fecha')}" no es válida`)
    if (celda(fila, 'pesoKg') === '') return error('Falta el peso')

    const medicion: Medicion = { id: idMedicion(personaId, fecha), personaId, fecha, pesoKg: 0, origen: 'csv' }
    for (const campo of CAMPOS_NUMERICOS) {
      const texto = celda(fila, campo)
      if (texto === '') continue
      const nombre = ETIQUETAS[campo].nombre.toLowerCase()
      const valor = parseNumero(texto)
      if (valor == null) return error(`El valor de ${nombre} "${texto}" no es un número`)
      const fuera = validarValor(campo, valor)
      if (fuera) return error(`El valor de ${nombre} (${texto}) está fuera de rango: ${fuera.toLowerCase()}`)
      medicion[campo] = valor
    }
    const nota = celda(fila, 'nota')
    if (nota) medicion.nota = nota
    mediciones.push(medicion)
  })
  return { mediciones, errores }
}

export function medicionesACsv(mediciones: Medicion[]): string {
  const escapar = (s: string) => (/[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const lineas = [CAMPOS_CSV.join(',')]
  for (const m of mediciones) {
    lineas.push(
      CAMPOS_CSV.map((c) => {
        const v = m[c]
        return v == null ? '' : escapar(String(v))
      }).join(','),
    )
  }
  return lineas.join('\r\n') + '\r\n'
}
