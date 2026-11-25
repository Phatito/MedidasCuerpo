import type { Clasificacion } from './estados'
import { resumenFicha } from './ficha'
import type { Mensaje, Tono } from './insights'
import { serieMetrica, type Metrica } from './series'
import type { Medicion, Persona } from './types'

/** Un cuadrito de la ficha: una medida clave con su valor, cambio y estado. */
export interface Cuadrito {
  medida: Metrica
  valor: number
  /** Frente a la medición anterior que tenga el dato; null si no hay o no cambió. */
  cambio: number | null
  /** Fecha de la medición con la que se compara el cambio. */
  desde: string | null
  /** Fecha de la medición de donde sale el valor. */
  fecha: string
  tono: Tono
  clasificacion: Clasificacion | null
  estimada: boolean
  unidad: string
}

// Las cuatro que eligió el usuario y, si falta alguna, las que la reemplazan, en orden.
const PRIORIDAD: Metrica[] = ['grasaPct', 'musculoKg', 'cinturaCm', 'grasaVisceral', 'imc', 'aguaPct', 'grasaKg', 'pesoSinGrasaKg']
const MAXIMO = 4

/** Hasta 4 medidas clave para la ficha, según lo que la persona tenga medido. */
export function cuadritos(p: Persona, ms: Medicion[], hoy: string): Cuadrito[] {
  if (!ms.length) return []
  const r = resumenFicha(p, ms, { hoy })
  const out: Cuadrito[] = []
  for (const medida of PRIORIDAD) {
    if (out.length >= MAXIMO) break
    if (medida === 'cinturaCm') {
      const serie = serieMetrica(p, ms, 'cinturaCm', 'todo', hoy)
      const ultima = serie[serie.length - 1]
      if (!ultima) continue
      const previa = serie[serie.length - 2]
      const cambio = previa && previa.valor !== ultima.valor ? Math.round((ultima.valor - previa.valor) * 10) / 10 : null
      out.push({ medida, valor: ultima.valor, cambio, desde: cambio == null ? null : previa.fecha, fecha: ultima.fecha, tono: cambio == null ? 'neutro' : cambio < 0 ? 'bien' : 'atencion', clasificacion: null, estimada: false, unidad: 'cm' })
      continue
    }
    const t = r.tarjetas.find((x) => x.clave === medida)
    if (!t) continue
    out.push({ medida, valor: t.valor, cambio: t.cambio, desde: t.desde, fecha: t.fecha, tono: t.tono, clasificacion: t.clasificacion, estimada: t.estimada, unidad: '' })
  }
  return out
}

const DE_MEDIDA: Partial<Record<Metrica, Mensaje['codigo'][]>> = {
  pesoKg: ['primera_medicion', 'tendencia', 'ritmo_rapido', 'baja_sin_datos', 'sube_sin_datos', 'sin_cambios', 'recomposicion', 'imc', 'desde_inicio', 'baja_peso_grasa'],
  musculoKg: ['pierde_musculo', 'gana_musculo'],
  pesoSinGrasaKg: ['pierde_musculo', 'gana_musculo'],
  cinturaCm: ['cinta', 'recomposicion', 'alerta_cintura'],
  caderaCm: ['cinta'],
  pechoCm: ['cinta'],
  cuelloCm: ['cinta'],
  brazoCm: ['cinta'],
  brazoIzqCm: ['cinta'],
  brazoDerCm: ['cinta'],
  musloCm: ['cinta'],
  musloIzqCm: ['cinta'],
  musloDerCm: ['cinta'],
  grasaPct: ['cinta', 'gana_grasa', 'baja_sin_grasa', 'recomposicion'],
  grasaKg: ['cinta', 'gana_grasa', 'baja_sin_grasa', 'recomposicion'],
  grasaVisceral: ['alerta_visceral'],
  imc: ['imc'],
}

/** Los mensajes de "Qué indican tus cambios" que corresponden a una medida, en su orden. */
export function mensajesDe(medida: Metrica, mensajes: Mensaje[]): Mensaje[] {
  const codigos = DE_MEDIDA[medida] ?? []
  return mensajes.filter((x) => codigos.includes(x.codigo))
}
