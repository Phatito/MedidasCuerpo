import type { Medicion, Persona, Sexo } from './types'

export type CategoriaImc = 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad'

export interface Derivados {
  imc: number | null
  categoriaImc: CategoriaImc | null
  cinturaEstatura: number | null
  cinturaCadera: number | null
  grasaPct: number | null
  grasaEstimada: boolean
  masaGrasaKg: number | null
  masaMagraKg: number | null
}

function categoria(imc: number): CategoriaImc {
  if (imc < 18.5) return 'bajo_peso'
  if (imc < 25) return 'normal'
  if (imc < 30) return 'sobrepeso'
  return 'obesidad'
}

/** Fórmula de perímetros de la Marina de EE. UU. (centímetros). */
export function grasaMarina(
  sexo: Sexo,
  estaturaCm: number,
  cuelloCm: number | undefined,
  cinturaCm: number | undefined,
  caderaCm: number | undefined,
): number | null {
  if (cuelloCm == null || cinturaCm == null || !(estaturaCm > 0)) return null
  let pct: number
  if (sexo === 'hombre') {
    const x = cinturaCm - cuelloCm
    if (x <= 0) return null
    pct = 495 / (1.0324 - 0.19077 * Math.log10(x) + 0.15456 * Math.log10(estaturaCm)) - 450
  } else {
    if (caderaCm == null) return null
    const x = cinturaCm + caderaCm - cuelloCm
    if (x <= 0) return null
    pct = 495 / (1.29579 - 0.35004 * Math.log10(x) + 0.221 * Math.log10(estaturaCm)) - 450
  }
  if (!Number.isFinite(pct) || pct < 2 || pct > 75) return null
  return pct
}

export function derivar(p: Persona, m: Medicion): Derivados {
  const estaturaOk = p.estaturaCm > 0
  const imc = estaturaOk ? m.pesoKg / (p.estaturaCm / 100) ** 2 : null
  const estimada = m.grasaPct == null ? grasaMarina(p.sexo, p.estaturaCm, m.cuelloCm, m.cinturaCm, m.caderaCm) : null
  const grasaPct = m.grasaPct ?? estimada
  const masaGrasaKg = grasaPct == null ? null : (m.pesoKg * grasaPct) / 100
  return {
    imc,
    categoriaImc: imc == null ? null : categoria(imc),
    cinturaEstatura: m.cinturaCm != null && estaturaOk ? m.cinturaCm / p.estaturaCm : null,
    cinturaCadera: m.cinturaCm != null && m.caderaCm != null && m.caderaCm > 0 ? m.cinturaCm / m.caderaCm : null,
    grasaPct,
    grasaEstimada: m.grasaPct == null && estimada != null,
    masaGrasaKg,
    masaMagraKg: masaGrasaKg == null ? null : m.pesoKg - masaGrasaKg,
  }
}
