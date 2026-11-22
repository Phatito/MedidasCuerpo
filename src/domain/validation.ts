import type { CampoNumerico } from './types'

export const RANGOS: Record<CampoNumerico | 'estaturaCm', [number, number]> = {
  pesoKg: [2, 400],
  grasaPct: [2, 75],
  musculoKg: [1, 150],
  grasaVisceral: [1, 59],
  aguaPct: [20, 80],
  musculoTotalKg: [5, 200],
  masaOseaKg: [0.5, 10],
  proteinaPct: [5, 40],
  metabolismoBasalKcal: [500, 5000],
  edadCorporal: [5, 120],
  frecuenciaCardiacaLpm: [30, 220],
  cuelloCm: [5, 300],
  pechoCm: [5, 300],
  cinturaCm: [5, 300],
  caderaCm: [5, 300],
  brazoCm: [5, 300],
  musloCm: [5, 300],
  brazoIzqCm: [5, 300],
  brazoDerCm: [5, 300],
  musloIzqCm: [5, 300],
  musloDerCm: [5, 300],
  estaturaCm: [40, 250],
}

export function validarValor(campo: CampoNumerico | 'estaturaCm', v: number): string | null {
  const [min, max] = RANGOS[campo]
  if (!Number.isFinite(v) || v < min || v > max) return `Debe estar entre ${min} y ${max}`
  return null
}
