import { derivar } from './metrics'
import { diasEntre } from './numbers'
import type { CampoNumerico, Medicion, Persona } from './types'

export type Metrica = CampoNumerico | 'imc' | 'grasaKg' | 'pesoSinGrasaKg'
export type Periodo = '3m' | '1a' | 'todo'

const DIAS: Record<Exclude<Periodo, 'todo'>, number> = { '3m': 92, '1a': 366 }

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
