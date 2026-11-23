import { esMedida, type Metrica } from './series'
import type { Persona } from './types'

/** Cada pantalla tiene su dirección en el hash, para que Atrás del navegador funcione. */
export type Ruta =
  | { pantalla: 'ficha'; personaId: string }
  | { pantalla: 'registrar'; personaId: string; fecha?: string }
  | { pantalla: 'mediciones'; personaId: string }
  | { pantalla: 'semana'; personaId: string }
  | { pantalla: 'medida'; personaId: string; medida: Metrica }
  | { pantalla: 'cifras'; personaId: string }
  | { pantalla: 'familia' }
  | { pantalla: 'ajustes' }
  | { pantalla: 'inicio' }

const INICIO: Ruta = { pantalla: 'inicio' }

export function leerRuta(hash: string): Ruta {
  const [camino, consulta = ''] = hash.replace(/^#/, '').split('?')
  const partes = camino.split('/').filter(Boolean)
  if (partes.length === 1 && partes[0] === 'familia') return { pantalla: 'familia' }
  if (partes.length === 1 && partes[0] === 'ajustes') return { pantalla: 'ajustes' }
  if (partes[0] !== 'p' || !partes[1] || partes.length > 4) return INICIO
  let personaId: string
  try {
    personaId = decodeURIComponent(partes[1])
  } catch {
    return INICIO
  }
  if (partes.length === 2) return { pantalla: 'ficha', personaId }
  if (partes[2] === 'm') return partes[3] && esMedida(partes[3]) ? { pantalla: 'medida', personaId, medida: partes[3] } : { pantalla: 'ficha', personaId }
  if (partes.length > 3) return INICIO
  if (partes[2] === 'cifras') return { pantalla: 'cifras', personaId }
  if (partes[2] === 'mediciones') return { pantalla: 'mediciones', personaId }
  if (partes[2] === 'semana') return { pantalla: 'semana', personaId }
  if (partes[2] === 'registrar') {
    const fecha = new URLSearchParams(consulta).get('fecha')
    return fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? { pantalla: 'registrar', personaId, fecha } : { pantalla: 'registrar', personaId }
  }
  return INICIO
}

export function escribirRuta(r: Ruta): string {
  switch (r.pantalla) {
    case 'inicio':
      return '#/'
    case 'familia':
      return '#/familia'
    case 'ajustes':
      return '#/ajustes'
    case 'ficha':
      return `#/p/${encodeURIComponent(r.personaId)}`
    case 'mediciones':
      return `#/p/${encodeURIComponent(r.personaId)}/mediciones`
    case 'semana':
      return `#/p/${encodeURIComponent(r.personaId)}/semana`
    case 'medida':
      return `#/p/${encodeURIComponent(r.personaId)}/m/${r.medida}`
    case 'cifras':
      return `#/p/${encodeURIComponent(r.personaId)}/cifras`
    case 'registrar':
      return `#/p/${encodeURIComponent(r.personaId)}/registrar${r.fecha ? `?fecha=${r.fecha}` : ''}`
  }
}

/** La ficha que se abre al iniciar: la persona principal o, si no está, la creada primero. */
export function personaInicio(personas: Persona[], principalId: string | undefined): Persona | null {
  const principal = personas.find((p) => p.id === principalId)
  if (principal) return principal
  return [...personas].sort((a, b) => a.creadaEn.localeCompare(b.creadaEn))[0] ?? null
}
