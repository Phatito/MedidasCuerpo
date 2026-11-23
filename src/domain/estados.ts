import type { Persona } from './types'

/**
 * Estado de una medida frente a rangos de referencia.
 *
 * Fuentes de los cortes:
 * - IMC: Organización Mundial de la Salud.
 * - % de grasa por sexo y edad: Gallagher et al., "Healthy percentage body fat ranges", Am J Clin Nutr 2000.
 * - Grasa visceral, agua y proteína: escala habitual de las básculas domésticas de bioimpedancia.
 * Son orientación general, no diagnóstico.
 */
export type Estado = 'bajo' | 'ok' | 'alto' | 'muy'
export type MedidaConEstado = 'imc' | 'grasaPct' | 'grasaVisceral' | 'aguaPct' | 'proteinaPct'

/** `hasta` es el límite superior exclusivo del tramo; null = sin tope. */
export interface Tramo {
  hasta: number | null
  estado: Estado
  nombre: string
}

export interface Clasificacion {
  estado: Estado
  nombre: string
  tramos: Tramo[]
  /** Índice del tramo donde cae el valor. */
  tramo: number
  /** Posición del valor en toda la barra, de 0 a 1 (cada tramo ocupa el mismo ancho). */
  posicion: number
}

const cuatro = (a: number, b: number, c: number, nombres = ['Bajo', 'Estándar', 'Alto', 'Muy alto']): Tramo[] => [
  { hasta: a, estado: 'bajo', nombre: nombres[0] },
  { hasta: b, estado: 'ok', nombre: nombres[1] },
  { hasta: c, estado: 'alto', nombre: nombres[2] },
  { hasta: null, estado: 'muy', nombre: nombres[3] },
]

const tres = (a: number, b: number): Tramo[] => [
  { hasta: a, estado: 'bajo', nombre: 'Bajo' },
  { hasta: b, estado: 'ok', nombre: 'Estándar' },
  { hasta: null, estado: 'alto', nombre: 'Alto' },
]

// Límites del % de grasa: [bajo hasta, estándar hasta, alto hasta] por franja de edad (18–39, 40–59, 60+).
const GRASA: Record<Persona['sexo'], [number, number, number][]> = {
  hombre: [[8, 20, 25], [11, 22, 28], [13, 25, 30]],
  mujer: [[21, 33, 39], [23, 34, 40], [24, 36, 42]],
}

function edad(p: Persona, fecha: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fechaNacimiento)) return null
  const [an, mn, dn] = p.fechaNacimiento.split('-').map(Number)
  const [ar, mr, dr] = fecha.split('-').map(Number)
  return ar - an - (mr < mn || (mr === mn && dr < dn) ? 1 : 0)
}

function tramosDe(medida: MedidaConEstado, p: Persona, fecha: string): Tramo[] {
  switch (medida) {
    case 'imc':
      return cuatro(18.5, 25, 30, ['Bajo', 'Normal', 'Sobrepeso', 'Obesidad'])
    case 'grasaPct': {
      const e = edad(p, fecha)
      const franja = e == null || e < 40 ? 0 : e < 60 ? 1 : 2
      const [a, b, c] = GRASA[p.sexo][franja]
      return cuatro(a, b, c)
    }
    case 'grasaVisceral':
      return [
        { hasta: 10, estado: 'ok', nombre: 'Estándar' },
        { hasta: 15, estado: 'alto', nombre: 'Alto' },
        { hasta: null, estado: 'muy', nombre: 'Muy alto' },
      ]
    case 'aguaPct':
      // El tope del estándar es inclusivo (65 % es estándar, 65,1 % es alto).
      return p.sexo === 'hombre' ? tres(50, 65.05) : tres(45, 60.05)
    case 'proteinaPct':
      return tres(16, 20.05)
  }
}

/** Límites [inferior, superior] de un tramo; los abiertos toman el ancho del tramo vecino. */
function limites(tramos: Tramo[], i: number): [number, number] {
  const inferior = i === 0 ? null : tramos[i - 1].hasta!
  const superior = tramos[i].hasta
  if (inferior != null && superior != null) return [inferior, superior]
  if (superior != null) {
    const ancho = tramos[i + 1].hasta != null ? tramos[i + 1].hasta! - superior : superior
    return [superior - ancho, superior]
  }
  const previo = i >= 2 ? tramos[i - 2].hasta! : 0
  return [inferior!, inferior! + (inferior! - previo)]
}

export function clasificar(medida: MedidaConEstado, valor: number, p: Persona, fecha: string): Clasificacion | null {
  const tramos = tramosDe(medida, p, fecha)
  const tramo = tramos.findIndex((t) => t.hasta == null || valor < t.hasta)
  const [inf, sup] = limites(tramos, tramo)
  const dentro = Math.min(1, Math.max(0, (valor - inf) / (sup - inf)))
  return { estado: tramos[tramo].estado, nombre: tramos[tramo].nombre, tramos, tramo, posicion: (tramo + dentro) / tramos.length }
}
