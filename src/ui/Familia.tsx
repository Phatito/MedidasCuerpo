import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { diasEntre, fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { estadoMedicion } from '../domain/reminders'
import type { Medicion, Persona } from '../domain/types'
import { borrarPersona, guardarPersona, leerAjustes, listarTodasLasMediciones } from '../storage/db'
import { PersonaForm } from './PersonaForm'

interface Props {
  personas: Persona[]
  onMedir: (personaId: string) => void
  onIrDatos: () => void
  onVerFicha: (personaId: string) => void
}

const DIAS_SIN_RESPALDO = 30

export function Familia({ personas, onMedir, onIrDatos, onVerFicha }: Props) {
  const ajustes = useLiveQuery(leerAjustes, [])
  const mediciones = useLiveQuery(listarTodasLasMediciones, [], [] as Medicion[])
  const [editando, setEditando] = useState<Persona | 'nueva' | null>(null)
  const [porBorrar, setPorBorrar] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const hoy = hoyIso()

  const porPersona = new Map<string, Medicion[]>()
  for (const m of mediciones) porPersona.set(m.personaId, [...(porPersona.get(m.personaId) ?? []), m])
  const ultima = (id: string) => (porPersona.get(id) ?? []).reduce<Medicion | null>((u, m) => (!u || m.fecha > u.fecha ? m : u), null)

  const avisoRespaldo =
    ajustes == null || mediciones.length === 0
      ? null
      : ajustes.ultimoRespaldo == null
        ? 'Todavía no has hecho un respaldo de tus datos.'
        : diasEntre(ajustes.ultimoRespaldo, hoy) > DIAS_SIN_RESPALDO
          ? 'Hace más de 30 días que no respaldas tus datos.'
          : null

  async function guardar(p: Persona) {
    setFallo(null)
    try {
      await guardarPersona(p)
      setEditando(null)
    } catch {
      setFallo('No se pudo guardar a la persona. Puede que el navegador se haya quedado sin espacio; inténtalo de nuevo.')
    }
  }

  async function borrar(id: string) {
    setFallo(null)
    try {
      await borrarPersona(id)
      setPorBorrar(null)
    } catch {
      setFallo('No se pudo borrar a la persona; inténtalo de nuevo.')
    }
  }

  return (
    <>
      <div className="head">
        <h2>Familia</h2>
        {editando == null && personas.length > 0 && (
          <button className="btn primary" onClick={() => setEditando('nueva')}>Agregar persona</button>
        )}
      </div>

      {avisoRespaldo && (
        <div className="notice warn row">
          <span>{avisoRespaldo} Viven solo en este navegador.</span>
          <button className="btn" onClick={onIrDatos}>Hacer respaldo</button>
        </div>
      )}

      {fallo && <p className="notice bad" role="alert">{fallo}</p>}

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
                    {estado.diasDesde === 0 && ' (hoy)'}
                    {estado.diasDesde != null && estado.diasDesde > 0 && ` (hace ${estado.diasDesde} ${estado.diasDesde === 1 ? 'día' : 'días'})`}
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
                    <button className="btn danger" onClick={() => borrar(p.id)}>Sí, borrar</button>
                    <button className="btn" onClick={() => setPorBorrar(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <button className="btn primary" onClick={() => onVerFicha(p.id)}>Ver ficha</button>
                  <button className="btn" onClick={() => onMedir(p.id)}>Registrar medición</button>
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
