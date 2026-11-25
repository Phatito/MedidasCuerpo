import { derivar } from './metrics'
import { diasEntre } from './numbers'
import { CAMPOS_NUMERICOS, type CampoNumerico, type Medicion, type Persona } from './types'

export type Metrica = CampoNumerico | 'imc' | 'grasaKg' | 'pesoSinGrasaKg'
export type Periodo = '1m' | '3m' | '1a' | 'todo'

const EXTRA_METRICAS = ['imc', 'grasaKg', 'pesoSinGrasaKg'] as const

/** Si un texto (por ejemplo de la dirección) es el nombre de una medida conocida. */
export function esMedida(x: string): x is Metrica {
  return (CAMPOS_NUMERICOS as string[]).includes(x) || (EXTRA_METRICAS as readonly string[]).includes(x)
}

const DIAS: Record<Exclude<Periodo, 'todo'>, number> = { '1m': 31, '3m': 92, '1a': 366 }

export function valorMetrica(p: Persona, m: Medicion, metrica: Metrica): number | null {
  if (metrica === 'imc') return derivar(p, m).imc
  if (metrica === 'grasaPct') return derivar(p, m).grasaPct
  if (metrica === 'grasaKg') return derivar(p, m).masaGrasaKg
  if (metrica === 'pesoSinGrasaKg') return derivar(p, m).masaMagraKg
  return m[metrica] ?? null
}

/** Los puntos de una métrica dentro del período, ordenados por fecha. */
export function serieMetrica(p: Persona, ms: Medicion[], metrica: Metrica, periodo: Periodo, hoy: string): { fecha: string; valor: number }[] {
  return [...ms]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .filter((m) => periodo === 'todo' || diasEntre(m.fecha, hoy) <= DIAS[periodo])
    .flatMap((m) => {
      const valor = valorMetrica(p, m, metrica)
      return valor == null ? [] : [{ fecha: m.fecha, valor }]
    })
}
