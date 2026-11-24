import type { CampoNumerico } from './types'
import { validarValor } from './validation'

/** Una palabra reconocida en la imagen, con su caja en píxeles. */
export interface PalabraOcr {
  texto: string
  x0: number
  y0: number
  x1: number
  y1: number
}
export type LineaOcr = PalabraOcr[]

export type CampoCaptura =
  | 'pesoKg'
  | 'grasaPct'
  | 'aguaPct'
  | 'musculoKg'
  | 'grasaVisceral'
  | 'musculoTotalKg'
  | 'masaOseaKg'
  | 'proteinaPct'
  | 'metabolismoBasalKcal'
  | 'edadCorporal'
  | 'frecuenciaCardiacaLpm'

export interface LecturaCaptura {
  /** AAAA-MM-DD */
  fecha: string | null
  /** HH:MM */
  hora: string | null
  valores: Partial<Record<CampoCaptura, number>>
  /** Campos leídos que no se pudieron comprobar con otros datos del informe, o que no cuadran. */
  revisar: CampoCaptura[]
}

const ORDEN: CampoCaptura[] = [
  'pesoKg', 'grasaPct', 'aguaPct', 'musculoKg', 'grasaVisceral', 'musculoTotalKg', 'masaOseaKg', 'proteinaPct',
  'metabolismoBasalKcal', 'edadCorporal', 'frecuenciaCardiacaLpm',
]

type Clave =
  | 'grasaPct' | 'aguaPct' | 'aguaKg' | 'grasaKg' | 'sinGrasaKg' | 'musculoKg' | 'grasaVisceral' | 'musculoTotalKg'
  | 'musculoPct' | 'oseaKg' | 'oseaPct' | 'proteinaPct' | 'proteinaKg' | 'metabolismoBasalKcal' | 'edadCorporal' | 'frecuenciaCardiacaLpm'

// Rótulos del informe de Xiaomi Home (sin tildes). Se buscan del más largo al más corto, y cada palabra se usa una sola vez,
// así "Masa muscular" no se confunde con "Masa muscular esquelética" ni "Grasa corporal" con "Porcentaje de grasa corporal".
const ROTULOS: [Clave, string][] = (
  [
    ['grasaPct', 'porcentaje de grasa corporal'],
    ['grasaVisceral', 'calificacion de grasa visceral'],
    ['sinGrasaKg', 'peso corporal sin grasa'],
    ['aguaKg', 'masa de agua corporal'],
    ['musculoKg', 'masa muscular esqueletica'],
    ['oseaPct', 'porcentaje mineral oseo'],
    ['oseaKg', 'contenido mineral oseo'],
    ['proteinaPct', 'porcentaje de proteinas'],
    ['musculoPct', 'porcentaje de musculo'],
    ['metabolismoBasalKcal', 'indice metabolico basal'],
    ['aguaPct', 'agua corporal'],
    ['grasaKg', 'grasa corporal'],
    ['proteinaKg', 'masa proteica'],
    ['edadCorporal', 'edad corporal'],
    ['frecuenciaCardiacaLpm', 'frecuencia cardiaca'],
    ['musculoTotalKg', 'masa muscular'],
  ] as [Clave, string][]
).sort((a, b) => b[1].split(' ').length - a[1].split(' ').length)

const TOLERANCIA_PESO = 0.15
const TOLERANCIA_PUNTOS = 0.3

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const redondear1 = (n: number) => Math.round(n * 10) / 10

/** El número con que empieza una palabra, con un solo decimal: "33,619" → 33,6; "45,0rg" → 45; "1712Kcal" → 1712. */
function numero(texto: string): number | null {
  const r = /^(\d{1,4})(?:[.,](\d))?/.exec(texto)
  if (!r) return null
  return Number(r[1]) + (r[2] ? Number(r[2]) / 10 : 0)
}

/** Une "13," con "9xg" cuando el lector separó el decimal en otra palabra. */
function unirDecimales(linea: LineaOcr): LineaOcr {
  const salida: PalabraOcr[] = []
  for (let i = 0; i < linea.length; i++) {
    const w = linea[i]
    const sig = linea[i + 1]
    if (/^\d{1,4}[.,]$/.test(w.texto) && sig && /^\d/.test(sig.texto)) {
      salida.push({ ...w, texto: w.texto + sig.texto, x1: sig.x1, y1: Math.max(w.y1, sig.y1) })
      i++
    } else salida.push(w)
  }
  return salida
}

interface Rotulo {
  clave: Clave
  x0: number
  y0: number
  alto: number
}

function buscarRotulos(lineas: LineaOcr[]): Rotulo[] {
  const hallados: Rotulo[] = []
  for (const linea of lineas) {
    const palabras = linea.map((w) => normalizar(w.texto))
    const usada = linea.map(() => false)
    for (const [clave, texto] of ROTULOS) {
      const buscadas = texto.split(' ')
      for (let i = 0; i + buscadas.length <= linea.length; i++) {
        if (buscadas.every((b, j) => !usada[i + j] && palabras[i + j] === b)) {
          for (let j = 0; j < buscadas.length; j++) usada[i + j] = true
          const w = linea[i]
          hallados.push({ clave, x0: w.x0, y0: Math.min(...linea.slice(i, i + buscadas.length).map((x) => x.y0)), alto: w.y1 - w.y0 })
        }
      }
    }
  }
  return hallados
}

/** El número de la línea justo encima del rótulo, en su misma columna. */
function valorDe(r: Rotulo, lineas: LineaOcr[], ancho: number): number | null {
  const arriba = lineas
    .map((l) => ({ l, abajo: Math.max(...l.map((w) => w.y1)) }))
    .filter(({ l, abajo }) => l.length > 0 && abajo <= r.y0 && r.y0 - abajo <= 3 * Math.max(r.alto, 1))
    .sort((a, b) => b.abajo - a.abajo)
  for (const { l } of arriba) {
    const candidatos = l
      .map((w) => ({ w, n: numero(w.texto) }))
      .filter((c): c is { w: PalabraOcr; n: number } => c.n != null && Math.abs(c.w.x0 - r.x0) < 0.15 * ancho)
      .sort((a, b) => Math.abs(a.w.x0 - r.x0) - Math.abs(b.w.x0 - r.x0))
    if (candidatos.length > 0) return candidatos[0].n
  }
  return null
}

/** El peso en números grandes, arriba del primer rótulo ("108" y ",6" pueden venir separados). */
function pesoGrande(lineas: LineaOcr[], limiteY: number): number | null {
  const todas = lineas.flat()
  // Tiene que ser bastante más alto que los números de las tarjetas, para no tomar uno de ellos.
  const altos = todas.filter((w) => numero(w.texto) != null).map((w) => w.y1 - w.y0).sort((a, b) => a - b)
  const mediana = altos[Math.floor((altos.length - 1) / 2)] ?? 0
  const palabras = todas.filter((w) => w.y1 <= limiteY)
  const grandes = palabras
    .filter((w) => /^\d{2,3}([.,]\d)?$/.test(w.texto) && w.y1 - w.y0 >= 1.8 * mediana)
    .sort((a, b) => b.y1 - b.y0 - (a.y1 - a.y0))
  const g = grandes[0]
  if (!g) return null
  if (/[.,]/.test(g.texto)) return numero(g.texto)
  const alto = g.y1 - g.y0
  const decimal = palabras.find((w) => w !== g && /^[.,]?\d$/.test(w.texto) && w.x0 >= g.x1 && w.x0 - g.x1 < 1.5 * alto && w.y0 < g.y1 && w.y1 > g.y0)
  return decimal ? Number(g.texto) + Number(decimal.texto.replace(/[.,]/, '')) / 10 : null
}

export function leerCapturaXiaomi(lineasCrudas: LineaOcr[], anchoImagen: number): LecturaCaptura {
  const lineas = lineasCrudas.map(unirDecimales)

  let fecha: string | null = null
  let hora: string | null = null
  for (const l of lineas) {
    const r = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(l.map((w) => w.texto).join(' '))
    if (r) {
      // Solo una fecha que existe: el lector puede confundir cifras ("31/02").
      const [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])]
      const f = new Date(Date.UTC(a, m - 1, d))
      if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) break
      fecha = `${r[3]}-${r[2]}-${r[1]}`
      hora = r[4] ? `${r[4].padStart(2, '0')}:${r[5]}` : null
      break
    }
  }

  const rotulos = buscarRotulos(lineas)
  const leido: Partial<Record<Clave, number>> = {}
  for (const r of rotulos) {
    if (leido[r.clave] != null) continue
    const v = valorDe(r, lineas, anchoImagen)
    if (v != null) leido[r.clave] = v
  }

  const valores: Partial<Record<CampoCaptura, number>> = {}
  const revisar = new Set<CampoCaptura>()

  // Peso: el número grande, comprobado con "peso sin grasa + grasa".
  const grande = rotulos.length > 0 ? pesoGrande(lineas, Math.min(...rotulos.map((r) => r.y0))) : null
  const suma = leido.sinGrasaKg != null && leido.grasaKg != null ? redondear1(leido.sinGrasaKg + leido.grasaKg) : null
  if (suma != null) {
    valores.pesoKg = suma
    if (grande != null && Math.abs(grande - suma) > TOLERANCIA_PESO) revisar.add('pesoKg')
  } else if (grande != null) {
    valores.pesoKg = redondear1(grande)
    revisar.add('pesoKg')
  }
  const peso = valores.pesoKg

  // Un dato leído se comprueba con el calculado desde otros del informe; si no se leyó, se usa el calculado.
  function comprobar(campo: CampoCaptura, leidoV: number | undefined, calculado: number | null, tolerancia: number) {
    if (leidoV != null) {
      valores[campo] = leidoV
      if (calculado == null || Math.abs(leidoV - calculado) > tolerancia) revisar.add(campo)
    } else if (calculado != null) valores[campo] = redondear1(calculado)
  }
  const pct = (kg: number | undefined) => (kg != null && peso ? (kg / peso) * 100 : null)
  const kg = (porcentaje: number | undefined) => (porcentaje != null && peso ? (porcentaje * peso) / 100 : null)
  comprobar('grasaPct', leido.grasaPct, pct(leido.grasaKg), TOLERANCIA_PUNTOS)
  comprobar('aguaPct', leido.aguaPct, pct(leido.aguaKg), TOLERANCIA_PUNTOS)
  comprobar('proteinaPct', leido.proteinaPct, pct(leido.proteinaKg), TOLERANCIA_PUNTOS)
  comprobar('musculoTotalKg', leido.musculoTotalKg, kg(leido.musculoPct), TOLERANCIA_PESO)
  comprobar('masaOseaKg', leido.oseaKg, kg(leido.oseaPct), TOLERANCIA_PESO)
  // Sin otra cifra con que comprobarlos: siempre para revisar.
  for (const campo of ['musculoKg', 'grasaVisceral', 'metabolismoBasalKcal', 'edadCorporal', 'frecuenciaCardiacaLpm'] as const) {
    const v = leido[campo]
    if (v == null) continue
    valores[campo] = v
    revisar.add(campo)
  }

  // Lo que está fuera de rango no se usa.
  for (const campo of ORDEN) {
    const v = valores[campo]
    if (v != null && validarValor(campo as CampoNumerico, v)) {
      delete valores[campo]
      revisar.delete(campo)
    }
  }
  return { fecha, hora, valores, revisar: ORDEN.filter((c) => revisar.has(c)) }
}

/** Junta varias capturas del mismo informe: cada valor sale de la primera captura que lo tenga, con su marca de revisar. */
export function unirLecturas(lecturas: LecturaCaptura[]): LecturaCaptura {
  const valores: Partial<Record<CampoCaptura, number>> = {}
  const revisar: CampoCaptura[] = []
  let fecha: string | null = null
  let hora: string | null = null
  for (const l of lecturas) {
    if (fecha == null && l.fecha != null) [fecha, hora] = [l.fecha, l.hora]
    for (const campo of ORDEN) {
      const v = l.valores[campo]
      if (v == null || valores[campo] != null) continue
      valores[campo] = v
      if (l.revisar.includes(campo)) revisar.push(campo)
    }
  }
  return { fecha, hora, valores, revisar }
}
