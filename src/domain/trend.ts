import { diasEntre } from './numbers'

export interface PuntoTendencia {
  fecha: string
  valor: number
  tendencia: number
}

export type EstadoMeta = 'alcanzada' | 'sin_datos' | 'en_contra' | 'lejana' | 'estimada'

export interface ProyeccionMeta {
  estado: EstadoMeta
  /** Meta menos tendencia actual, a un decimal: negativo si hay que bajar. */
  faltaKg: number
  ritmoSemanalKg: number | null
  fecha: string | null
}

/** Cada día que pasa, la tendencia se acerca un 10 % a la pesada nueva. */
const RETENCION_DIARIA = 0.9
const VENTANA_RITMO_DIAS = 28
const DIAS_MINIMOS_PARA_RITMO = 7
const MAXIMO_DIAS_PROYECCION = 730
const TOLERANCIA_META_KG = 0.05

/**
 * Promedio exponencial que considera los días entre pesadas: suaviza las subidas y
 * bajadas de un día sin quedarse atrás cuando pasan semanas entre mediciones.
 */
export function tendenciaPeso(pesadas: { fecha: string; valor: number }[]): PuntoTendencia[] {
  const orden = [...pesadas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const serie: PuntoTendencia[] = []
  for (const p of orden) {
    const previa = serie[serie.length - 1]
    if (!previa) {
      serie.push({ ...p, tendencia: p.valor })
      continue
    }
    const dias = Math.max(1, diasEntre(previa.fecha, p.fecha))
    const aporte = 1 - RETENCION_DIARIA ** dias
    serie.push({ ...p, tendencia: previa.tendencia + (p.valor - previa.tendencia) * aporte })
  }
  return serie
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Cuánto falta para la meta y, al ritmo de las últimas cuatro semanas, cuándo se alcanzaría. */
export function proyeccionMeta(serie: PuntoTendencia[], metaKg: number): ProyeccionMeta | null {
  const ultima = serie[serie.length - 1]
  if (!ultima) return null
  const falta = metaKg - ultima.tendencia
  const base = { faltaKg: Math.round(falta * 10) / 10, ritmoSemanalKg: null, fecha: null }

  const cruzada = (serie[0].tendencia - metaKg) * falta > 0
  if (Math.abs(falta) < TOLERANCIA_META_KG || cruzada) return { ...base, estado: 'alcanzada', faltaKg: Math.abs(falta) < TOLERANCIA_META_KG ? 0 : base.faltaKg }

  const inicio = serie.find((p) => diasEntre(p.fecha, ultima.fecha) <= VENTANA_RITMO_DIAS)!
  const lapso = diasEntre(inicio.fecha, ultima.fecha)
  if (lapso < DIAS_MINIMOS_PARA_RITMO) return { ...base, estado: 'sin_datos' }

  const ritmoDiario = (ultima.tendencia - inicio.tendencia) / lapso
  const ritmoSemanalKg = Math.round(ritmoDiario * 7 * 100) / 100
  if (ritmoDiario === 0 || Math.sign(ritmoDiario) !== Math.sign(falta)) return { ...base, ritmoSemanalKg, estado: 'en_contra' }

  const dias = Math.ceil(falta / ritmoDiario)
  if (dias > MAXIMO_DIAS_PROYECCION) return { ...base, ritmoSemanalKg, estado: 'lejana' }
  return { ...base, ritmoSemanalKg, estado: 'estimada', fecha: sumarDias(ultima.fecha, dias) }
}
