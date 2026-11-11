import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { estadoMedicion } from '../domain/reminders'
import type { Medicion, Persona } from '../domain/types'
import { borrarPersona, guardarPersona, listarTodasLasMediciones } from '../storage/db'
import { PersonaForm } from './PersonaForm'

interface Props {
  personas: Persona[]
  onMedir: (personaId: string) => void
}

export function Familia({ personas, onMedir }: Props) {
  const mediciones = useLiveQuery(listarTodasLasMediciones, [], [] as Medicion[])
  const [editando, setEditando] = useState<Persona | 'nueva' | null>(null)
  const [porBorrar, setPorBorrar] = useState<string | null>(null)
  const hoy = hoyIso()

  const porPersona = new Map<string, Medicion[]>()
  for (const m of mediciones) porPersona.set(m.personaId, [...(porPersona.get(m.personaId) ?? []), m])
  const ultima = (id: string) => (porPersona.get(id) ?? []).reduce<Medicion | null>((u, m) => (!u || m.fecha > u.fecha ? m : u), null)

  async function guardar(p: Persona) {
    await guardarPersona(p)
    setEditando(null)
  }

  return (
    <>
      <div className="head">
        <h2>Familia</h2>
        {editando == null && personas.length > 0 && (
          <button className="btn primary" onClick={() => setEditando('nueva')}>Agregar persona</button>
        )}
      </div>

      {editando != null && (
        <PersonaForm persona={editando === 'nueva' ? undefined : editando} onGuardar={guardar} onCancelar={() => setEditando(null)} />
      )}

      {personas.length === 0 && editando == null && (
        <div className="card empty">
          <p>Agrega a la primera persona para empezar a registrar mediciones.</p>
          <button className="btn primary" onClick={() => setEditando('nueva')}>Agregar persona</button>
        </div>
      )}

      <div className="grid">
        {personas.map((p) => {
          const u = ultima(p.id)
          const estado = estadoMedicion(u?.fecha ?? null, hoy)
          const cantidad = porPersona.get(p.id)?.length ?? 0
          return (
            <article className="card person" key={p.id}>
              <div className="head">
                <h3>{p.nombre}</h3>
                <span className={`pill ${estado.pendiente ? 'due' : 'ok'}`}>{estado.pendiente ? 'Le toca medirse' : 'Al día'}</span>
              </div>
              {u ? (
                <div>
                  <div className="big num">{formatear(u.pesoKg)} kg</div>
                  <div className="muted small">
                    Última medición: {fechaLegible(u.fecha)}
                    {estado.diasDesde != null && ` (hace ${estado.diasDesde} ${estado.diasDesde === 1 ? 'día' : 'días'})`}
                  </div>
                </div>
              ) : (
                <div className="muted">Aún sin mediciones.</div>
              )}
              {porBorrar === p.id ? (
                <div className="stack">
                  <span className="error">
                    Se borrará a {p.nombre} y sus {cantidad} {cantidad === 1 ? 'medición' : 'mediciones'}. No se puede deshacer.
                  </span>
                  <div className="row">
                    <button className="btn danger" onClick={() => borrarPersona(p.id).then(() => setPorBorrar(null))}>Sí, borrar</button>
                    <button className="btn" onClick={() => setPorBorrar(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <button className="btn primary" onClick={() => onMedir(p.id)}>Registrar medición</button>
                  <button className="btn link" onClick={() => setEditando(p)}>Editar</button>
                  <button className="btn link danger" onClick={() => setPorBorrar(p.id)}>Eliminar</button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
