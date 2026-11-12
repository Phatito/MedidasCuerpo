import type { Persona } from '../domain/types'

interface Props {
  personas: Persona[]
  activaId: string | null
  /** Ids de quienes tienen medición pendiente. */
  pendientes: Set<string>
  onElegir: (id: string) => void
}

export const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase() || '?'

export function PersonasBar({ personas, activaId, pendientes, onElegir }: Props) {
  if (personas.length === 0) return null
  return (
    <div className="people" aria-label="Personas" role="group">
      {personas.map((p) => (
        <button key={p.id} type="button" className="who" aria-pressed={p.id === activaId} onClick={() => onElegir(p.id)} title={p.nombre}>
          <span className="avatar" aria-hidden="true">{inicial(p.nombre)}</span>
          <span className="name">{p.nombre}</span>
          {pendientes.has(p.id) && <span className="due">· le toca</span>}
        </button>
      ))}
    </div>
  )
}
