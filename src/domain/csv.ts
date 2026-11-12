import { idMedicion, parseFecha, parseNumero } from './numbers'
import { CAMPOS_NUMERICOS, ETIQUETAS, type CampoNumerico, type Medicion } from './types'
import { validarValor } from './validation'

export type CampoCsv = 'fecha' | CampoNumerico | 'nota'
export type Asignacion = Record<CampoCsv, number | null>

// El orden importa: "grasa visceral" debe reconocerse antes que "grasa".
// Cada alias es una lista de palabras que deben aparecer completas en el encabezado.
const ALIAS: [CampoCsv, string[]][] = [
  ['fecha', ['fecha', 'date']],
  ['grasaVisceral', ['visceral']],
  ['grasaPct', ['grasa', 'body fat', 'fat']],
  ['musculoKg', ['musculo', 'muscle', 'muscular']],
  ['aguaPct', ['agua', 'water']],
  ['pesoKg', ['peso', 'weight']],
  ['cuelloCm', ['cuello', 'neck']],
  ['pechoCm', ['pecho', 'chest', 'torso']],
  ['cinturaCm', ['cintura', 'waist']],
  ['caderaCm', ['cadera', 'hip', 'hips']],
  // Las medidas por lado van antes que las "sin lado": "Brazo izquierdo" no debe caer en "Brazo".
  ['brazoIzqCm', ['brazo izquierdo', 'brazo izq', 'left arm', 'left biceps']],
  ['brazoDerCm', ['brazo derecho', 'brazo der', 'right arm', 'right biceps']],
  ['musloIzqCm', ['muslo izquierdo', 'muslo izq', 'pierna izquierda', 'pierna izq', 'left thigh', 'left leg']],
  ['musloDerCm', ['muslo derecho', 'muslo der', 'pierna derecha', 'pierna der', 'right thigh', 'right leg']],
  ['brazoCm', ['brazo', 'arm', 'biceps']],
  ['musloCm', ['muslo', 'thigh', 'pierna', 'leg']],
  ['nota', ['nota', 'notas', 'note', 'notes', 'comentario', 'comentarios']],
]
// Una columna de masa (kg) no es un porcentaje de grasa.
const NO_ES_PORCENTAJE = ['masa', 'mass', 'kg', 'free', 'libre', 'lean', 'magra']

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

/** Lee UTF-8 y, si los bytes no lo son (Excel suele guardar en Windows-1252), los lee como Windows-1252. */
export function decodificarTexto(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

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
  const palabras = nombres.map((n) => n.split(/[^a-z0-9]+/).filter(Boolean))
  const usadas = new Set<number>()
  const asignacion = Object.fromEntries(CAMPOS_CSV.map((c) => [c, null])) as Asignacion
  const asignar = (campo: CampoCsv, i: number) => {
    if (i < 0) return
    asignacion[campo] = i
    usadas.add(i)
  }
  // Primero los nombres exactos de los campos (los que usa el CSV que exporta esta app).
  for (const campo of CAMPOS_CSV) asignar(campo, nombres.findIndex((n, i) => !usadas.has(i) && n === campo.toLowerCase()))
  for (const [campo, alias] of ALIAS) {
    if (asignacion[campo] != null) continue
    asignar(
      campo,
      palabras.findIndex(
        (ps, i) =>
          !usadas.has(i) &&
          alias.some((a) => a.split(' ').every((palabra) => ps.includes(palabra))) &&
          !(campo === 'grasaPct' && ps.some((x) => NO_ES_PORCENTAJE.includes(x))),
      ),
    )
  }
  return asignacion
}

/** Un archivo usa mes/día/año si alguna fecha tiene más de 12 en la segunda posición y ninguna en la primera. */
function ordenDeFechas(textos: string[]): 'dma' | 'mda' {
  let segundaMayor = false
  for (const t of textos) {
    const r = /^(\d{1,2})[/-](\d{1,2})[/-]\d{4}/.exec(t)
    if (!r) continue
    if (Number(r[1]) > 12) return 'dma'
    if (Number(r[2]) > 12) segundaMayor = true
  }
  return segundaMayor ? 'mda' : 'dma'
}

export function filasAMediciones(
  filas: string[][],
  asignacion: Asignacion,
  personaId: string,
  opciones: { hoy?: string; columnas?: number } = {},
): { mediciones: Medicion[]; errores: { fila: number; motivo: string }[] } {
  const porFecha = new Map<string, { medicion: Medicion; fila: number }>()
  const errores: { fila: number; motivo: string }[] = []
  const celda = (fila: string[], campo: CampoCsv) => {
    const i = asignacion[campo]
    return i == null ? '' : (fila[i] ?? '').trim()
  }
  const orden = ordenDeFechas(filas.map((f) => celda(f, 'fecha')))

  filas.forEach((fila, idx) => {
    const numero = idx + 2 // la fila 1 es el encabezado
    const error = (motivo: string) => errores.push({ fila: numero, motivo })

    if (asignacion.fecha == null) return error('No hay una columna asignada a la fecha')
    if (asignacion.pesoKg == null) return error('No hay una columna asignada al peso')
    if (opciones.columnas != null && fila.slice(opciones.columnas).some((c) => c !== '')) {
      return error('Tiene más columnas que el encabezado; si usa coma decimal, el archivo debe separar con punto y coma')
    }
    const fecha = parseFecha(celda(fila, 'fecha'), orden)
    if (fecha == null) return error(`La fecha "${celda(fila, 'fecha')}" no es válida`)
    if (opciones.hoy != null && fecha > opciones.hoy) return error(`La fecha ${celda(fila, 'fecha')} es futura`)
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

    const previa = porFecha.get(fecha)
    if (previa) errores.push({ fila: previa.fila, motivo: `Fecha repetida en el archivo: se usa la fila ${numero}` })
    porFecha.set(fecha, { medicion, fila: numero })
  })
  errores.sort((a, b) => a.fila - b.fila)
  return { mediciones: [...porFecha.values()].map((x) => x.medicion), errores }
}

/** Formato que Excel en español abre directo: BOM, punto y coma, coma decimal. */
export function medicionesACsv(mediciones: Medicion[]): string {
  const escapar = (s: string) => (/[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const lineas = [CAMPOS_CSV.join(';')]
  for (const m of mediciones) {
    lineas.push(
      CAMPOS_CSV.map((c) => {
        const v = m[c]
        if (v == null) return ''
        return typeof v === 'number' ? String(v).replace('.', ',') : escapar(v)
      }).join(';'),
    )
  }
  return '﻿' + lineas.join('\r\n') + '\r\n'
}
