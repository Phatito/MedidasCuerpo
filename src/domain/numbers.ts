export function parseNumero(s: string): number | null {
  const limpio = s.trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null
  return Number(limpio)
}

function fechaValida(a: number, m: number, d: number): string | null {
  const f = new Date(Date.UTC(a, m - 1, d))
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** `orden` indica cómo leer fechas con barras: día/mes/año (por defecto) o mes/día/año. */
export function parseFecha(s: string, orden: 'dma' | 'mda' = 'dma'): string | null {
  const t = s.trim()
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t)
  if (r) return fechaValida(Number(r[1]), Number(r[2]), Number(r[3]))
  r = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(t)
  if (!r) return null
  return orden === 'dma' ? fechaValida(Number(r[3]), Number(r[2]), Number(r[1])) : fechaValida(Number(r[3]), Number(r[1]), Number(r[2]))
}

export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
}

export function idMedicion(personaId: string, fecha: string): string {
  return `${personaId}_${fecha}`
}

export function formatear(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace('.', ',')
}

export function hoyIso(ahora: Date = new Date()): string {
  const a = ahora.getFullYear()
  const m = String(ahora.getMonth() + 1).padStart(2, '0')
  const d = String(ahora.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function fechaLegible(fecha: string): string {
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}
