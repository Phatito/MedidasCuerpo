import type { Persona } from './types'

/** Rango aceptado para el consumo diario de kcal que anota la persona. */
export const KCAL_MIN = 800
export const KCAL_MAX = 6000

type Consumo = { desde: string; kcal: number }

const ordenados = (cs: Consumo[]) => [...cs].sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0))

/** Consumo vigente en una fecha: la última entrada con desde ≤ fecha; antes de la primera, null. */
export function consumoVigente(p: Persona, fecha: string): number | null {
  let vigente: number | null = null
  for (const c of ordenados(p.consumos ?? [])) {
    if (c.desde > fecha) break
    vigente = c.kcal
  }
  return vigente
}

/** Agrega el consumo desde esa fecha, o reemplaza el que ya había en la misma fecha. */
export function conConsumo(p: Persona, desde: string, kcal: number): Persona {
  return { ...p, consumos: ordenados([...(p.consumos ?? []).filter((c) => c.desde !== desde), { desde, kcal }]) }
}

export function sinConsumo(p: Persona, desde: string): Persona {
  return { ...p, consumos: (p.consumos ?? []).filter((c) => c.desde !== desde) }
}

const DIA = 86_400_000
const ms = (f: string) => Date.parse(`${f}T00:00:00Z`)
const fechaDe = (t: number) => new Date(t).toISOString().slice(0, 10)

/** Días de [desde, hasta) con consumo vigente y su promedio (cada día pesa lo mismo). */
export function diasConConsumo(p: Persona, desde: string, hasta: string): { dias: number; promedio: number | null } {
  let dias = 0
  let suma = 0
  for (let t = ms(desde); t < ms(hasta); t += DIA) {
    const k = consumoVigente(p, fechaDe(t))
    if (k != null) {
      dias++
      suma += k
    }
  }
  return { dias, promedio: dias ? suma / dias : null }
}
