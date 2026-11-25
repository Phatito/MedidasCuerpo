import { CAMPOS_PERIMETROS, type Medicion } from './types'

/** Una medición con peso (de la báscula). Las de solo cinta no lo tienen. */
export type ConPeso = Medicion & { pesoKg: number }

export function tienePeso(m: Medicion): m is ConPeso {
  return m.pesoKg != null
}

/** Solo las pesadas, para todo lo que trabaja con el peso (tendencia, ritmo, gasto, IMC…). */
export function conPeso(ms: Medicion[]): ConPeso[] {
  return ms.filter(tienePeso)
}

/** Una medición vale si tiene peso o al menos un perímetro. */
export function medicionCompleta(m: Medicion): boolean {
  return m.pesoKg != null || CAMPOS_PERIMETROS.some((c) => m[c] != null)
}

/**
 * Guardar en un día que ya tiene medición la completa en vez de reemplazarla:
 * el peso de la mañana y la cinta de la tarde quedan en una sola medición.
 */
export function fusionarMedicion(previa: Medicion | undefined, nueva: Medicion): Medicion {
  if (!previa) return nueva
  const definidos = Object.fromEntries(Object.entries(nueva).filter(([, v]) => v !== undefined))
  return { ...previa, ...definidos } as Medicion
}
