import { diasConConsumo } from './consumo'
import { diasEntre } from './numbers'
import { tendenciaPeso, type PuntoTendencia } from './trend'
import type { Medicion, Objetivo, Persona } from './types'

/** Energía aproximada de un kg de grasa corporal. */
export const KCAL_POR_KG = 7700
/** Ritmo objetivo por semana, en % del peso de tendencia. */
export const RITMO_OBJETIVO_PCT: Record<Objetivo, number> = { bajar_grasa: -0.5, ganar_musculo: 0.25, mantener: 0 }
const DIAS_RITMO = 14

export type EstimacionGasto =
  | { estado: 'ok'; gastoKcal: number; recomendadaKcal: number; pisoAplicado: boolean; confianza: 'media' | 'alta'; diasVentana: 28 | 42; consumoPromedio: number }
  | { estado: 'faltan'; faltanPesadas: number; faltanDias: number; faltanDiasConsumo: number }

const redondear = (x: number, a: number) => Math.round(x / a) * a

function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha + 'T00:00:00Z') + dias * 86_400_000).toISOString().slice(0, 10)
}

export function serieDePeso(ms: Medicion[], hasta?: string): PuntoTendencia[] {
  return tendenciaPeso(ms.filter((m) => hasta == null || m.fecha <= hasta).map((m) => ({ fecha: m.fecha, valor: m.pesoKg })))
}

/**
 * Cambio de la tendencia del peso por semana, en % del peso, sobre los últimos 14 días
 * (o desde la pesada anterior más cercana si no hay otra en ese lapso). Null sin dos fechas distintas.
 */
export function ritmoSemanalPct(_p: Persona, ms: Medicion[], hasta?: string): number | null {
  const serie = serieDePeso(ms, hasta)
  const ultima = serie[serie.length - 1]
  if (!ultima) return null
  const previas = serie.filter((s) => s.fecha < ultima.fecha)
  if (!previas.length) return null
  const corte = sumarDias(ultima.fecha, -DIAS_RITMO)
  const base = previas.find((s) => s.fecha >= corte) ?? previas[previas.length - 1]
  const dias = diasEntre(base.fecha, ultima.fecha)
  return (((ultima.tendencia - base.tendencia) / dias) * 7 * 100) / ultima.tendencia
}

interface Ventana {
  pesadas: number
  dias: number
  diasConsumo: number
  promedio: number | null
  cambioKg: number
}

/**
 * Ventana que termina en la última pesada y empieza en la pesada más reciente con al menos `minDias`
 * de anterioridad (sin pasar de `tope` días), para no depender de pesarse en un día exacto.
 */
function ventana(p: Persona, serie: PuntoTendencia[], minDias: number, tope: number): Ventana {
  const ultima = serie[serie.length - 1]
  const dentro = serie.filter((s) => s.fecha >= sumarDias(ultima.fecha, -tope))
  const limite = sumarDias(ultima.fecha, -minDias)
  const candidatas = dentro.filter((s) => s.fecha <= limite)
  const primera = candidatas.length ? candidatas[candidatas.length - 1] : dentro[0]
  const usadas = dentro.filter((s) => s.fecha >= primera.fecha)
  const consumo = diasConConsumo(p, primera.fecha, ultima.fecha)
  return {
    pesadas: new Set(usadas.map((s) => s.fecha)).size,
    dias: diasEntre(primera.fecha, ultima.fecha),
    diasConsumo: consumo.dias,
    promedio: consumo.promedio,
    cambioKg: ultima.tendencia - primera.tendencia,
  }
}

/**
 * Gasto diario real estimado a partir del consumo anotado y del cambio de la tendencia del peso:
 * gasto = consumo promedio − cambio × 7.700 / días. Es una estimación, no una medición.
 */
export function estimarGasto(p: Persona, ms: Medicion[]): EstimacionGasto {
  const serie = serieDePeso(ms)
  if (!serie.length) return { estado: 'faltan', faltanPesadas: 3, faltanDias: 21, faltanDiasConsumo: 21 }
  const larga = ventana(p, serie, 42, 56)
  const alta = larga.pesadas >= 6 && larga.dias >= 42 && larga.diasConsumo >= Math.round(larga.dias * (35 / 42))
  const v = alta ? larga : ventana(p, serie, 21, 35)
  if (!alta && (v.pesadas < 3 || v.dias < 21 || v.diasConsumo < 21 || v.promedio == null)) {
    return {
      estado: 'faltan',
      faltanPesadas: Math.max(0, 3 - v.pesadas),
      faltanDias: Math.max(0, 21 - v.dias),
      faltanDiasConsumo: Math.max(0, 21 - v.diasConsumo),
    }
  }
  const promedio = v.promedio as number
  const gastoKcal = redondear(promedio - (v.cambioKg * KCAL_POR_KG) / v.dias, 10)
  const pesoTendencia = serie[serie.length - 1].tendencia
  const ritmoKg = (RITMO_OBJETIVO_PCT[p.objetivo] / 100) * pesoTendencia
  const piso = p.sexo === 'mujer' ? 1200 : 1500
  const bruta = redondear(gastoKcal + (ritmoKg * KCAL_POR_KG) / 7, 50)
  return {
    estado: 'ok',
    gastoKcal,
    recomendadaKcal: Math.max(piso, bruta),
    pisoAplicado: bruta < piso,
    confianza: alta ? 'alta' : 'media',
    diasVentana: alta ? 42 : 28,
    consumoPromedio: promedio,
  }
}
