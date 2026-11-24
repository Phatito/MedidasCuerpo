import type { CampoCaptura, LecturaCaptura } from './capturaXiaomi'
import { parseFecha } from './numbers'
import { validarValor } from './validation'

const CAMPOS: CampoCaptura[] = [
  'pesoKg', 'grasaPct', 'aguaPct', 'musculoKg', 'grasaVisceral', 'musculoTotalKg', 'masaOseaKg', 'proteinaPct',
  'metabolismoBasalKcal', 'edadCorporal', 'frecuenciaCardiacaLpm',
]
const ENTEROS = new Set<CampoCaptura>(['grasaVisceral', 'metabolismoBasalKcal', 'edadCorporal', 'frecuenciaCardiacaLpm'])

/** Convierte lo que devolvió la IA en una lectura: solo números dentro de rango y una fecha que exista. */
export function lecturaDesdeIA(datos: unknown): LecturaCaptura | null {
  if (typeof datos !== 'object' || datos === null) return null
  const d = datos as Record<string, unknown>
  const valores: Partial<Record<CampoCaptura, number>> = {}
  for (const campo of CAMPOS) {
    const v = d[campo]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    const n = ENTEROS.has(campo) ? Math.round(v) : Math.round(v * 10) / 10
    if (validarValor(campo, n) == null) valores[campo] = n
  }
  if (Object.keys(valores).length === 0) return null
  const fecha = typeof d.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) && parseFecha(d.fecha.split('-').reverse().join('/')) === d.fecha ? d.fecha : null
  const hora = fecha && typeof d.hora === 'string' && /^\d{1,2}:\d{2}$/.test(d.hora) ? d.hora.padStart(5, '0') : null
  return { fecha, hora, valores, revisar: [], fuente: 'ia' }
}
