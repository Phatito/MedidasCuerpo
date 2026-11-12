import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { derivar } from '../domain/metrics'
import { fechaLegible, formatear } from '../domain/numbers'
import type { Persona } from '../domain/types'
import { borrarMedicion, listarMediciones } from '../storage/db'

interface Props {
  persona: Persona
  onEditar: (fecha: string) => void
  onMedir: () => void
}

const celda = (n: number | null | undefined, decimales = 1) => (n == null ? '–' : formatear(n, decimales))

export function Historial({ persona, onEditar, onMedir }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [porBorrar, setPorBorrar] = useState<string | null>(null)

  if (mediciones == null) return <p className="muted">Cargando…</p>
  if (mediciones.length === 0) {
    return (
      <div className="card empty">
        <p>Todavía no hay mediciones de {persona.nombre}.</p>
        <button className="btn primary" onClick={onMedir}>Registrar la primera</button>
      </div>
    )
  }

  // Las columnas de medidas antiguas sin lado solo se muestran si alguna medición las tiene.
  const haySinLado = { brazoCm: mediciones.some((m) => m.brazoCm != null), musloCm: mediciones.some((m) => m.musloCm != null) }

  return (
    <div className="card table-scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso (kg)</th>
            <th>Grasa (%)</th>
            <th>Músculo (kg)</th>
            <th>Visceral</th>
            <th>Cintura (cm)</th>
            <th>Cadera (cm)</th>
            <th>Brazo izq. (cm)</th>
            <th>Brazo der. (cm)</th>
            <th>Muslo izq. (cm)</th>
            <th>Muslo der. (cm)</th>
            {haySinLado.brazoCm && <th>Brazo (sin lado)</th>}
            {haySinLado.musloCm && <th>Muslo (sin lado)</th>}
            <th>IMC</th>
            <th><span className="small">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {[...mediciones].reverse().map((m) => {
            const d = derivar(persona, m)
            return (
              <tr key={m.id}>
                <td>{fechaLegible(m.fecha)}</td>
                <td>{celda(m.pesoKg)}</td>
                <td>
                  {celda(d.grasaPct)}
                  {d.grasaEstimada && <span className="muted small"> est.</span>}
                </td>
                <td>{celda(m.musculoKg)}</td>
                <td>{celda(m.grasaVisceral, 0)}</td>
                <td>{celda(m.cinturaCm)}</td>
                <td>{celda(m.caderaCm)}</td>
                <td>{celda(m.brazoIzqCm)}</td>
                <td>{celda(m.brazoDerCm)}</td>
                <td>{celda(m.musloIzqCm)}</td>
                <td>{celda(m.musloDerCm)}</td>
                {haySinLado.brazoCm && <td>{celda(m.brazoCm)}</td>}
                {haySinLado.musloCm && <td>{celda(m.musloCm)}</td>}
                <td>{celda(d.imc)}</td>
                <td>
                  {porBorrar === m.id ? (
                    <>
                      <button className="btn link danger" onClick={() => borrarMedicion(m.id).then(() => setPorBorrar(null))}>Sí, eliminar</button>
                      <button className="btn link" onClick={() => setPorBorrar(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="btn link" onClick={() => onEditar(m.fecha)}>Editar</button>
                      <button className="btn link danger" onClick={() => setPorBorrar(m.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="muted small">"est." indica un % de grasa estimado a partir de los perímetros, no medido por una báscula.</p>
    </div>
  )
}
