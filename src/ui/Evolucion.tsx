import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { interpretar, NOTA_ORIENTACION, type Tono } from '../domain/insights'
import { derivar } from '../domain/metrics'
import { ETIQUETAS, type CampoNumerico, type Medicion, type Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { Grafico } from './Grafico'

interface Props {
  persona: Persona
  onMedir: () => void
}

type Metrica = CampoNumerico | 'imc'
const ORDEN: Metrica[] = ['pesoKg', 'grasaPct', 'musculoKg', 'grasaVisceral', 'cinturaCm', 'caderaCm', 'pechoCm', 'brazoCm', 'musloCm', 'imc']
const ROTULO: Record<Tono, string> = { bien: 'Bien', atencion: 'Atención', neutro: 'Dato' }

function valor(p: Persona, m: Medicion, metrica: Metrica): number | null {
  if (metrica === 'imc') return derivar(p, m).imc
  if (metrica === 'grasaPct') return derivar(p, m).grasaPct
  return m[metrica] ?? null
}

const etiqueta = (metrica: Metrica) => (metrica === 'imc' ? { nombre: 'IMC', unidad: 'kg/m²' } : ETIQUETAS[metrica])

export function Evolucion({ persona, onMedir }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [elegida, setElegida] = useState<Metrica>('pesoKg')

  if (mediciones == null) return <p className="muted">Cargando…</p>
  if (mediciones.length === 0) {
    return (
      <div className="card empty">
        <p>Todavía no hay mediciones de {persona.nombre}.</p>
        <button className="btn primary" onClick={onMedir}>Registrar la primera</button>
      </div>
    )
  }

  const disponibles = ORDEN.filter((k) => mediciones.some((m) => valor(persona, m, k) != null))
  const metrica = disponibles.includes(elegida) ? elegida : 'pesoKg'
  const puntos = mediciones.flatMap((m) => {
    const v = valor(persona, m, metrica)
    return v == null ? [] : [{ fecha: m.fecha, valor: v }]
  })
  const hayEstimada = metrica === 'grasaPct' && mediciones.some((m) => derivar(persona, m).grasaEstimada)
  const mensajes = interpretar(persona, mediciones)

  return (
    <>
      <div className="card stack">
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="evolucion-metrica">Métrica</label>
          <select id="evolucion-metrica" value={metrica} onChange={(e) => setElegida(e.target.value as Metrica)}>
            {disponibles.map((k) => (
              <option key={k} value={k}>{etiqueta(k).nombre}</option>
            ))}
          </select>
        </div>
        <Grafico puntos={puntos} unidad={etiqueta(metrica).unidad} />
        {hayEstimada && (
          <p className="muted small">Incluye valores estimados a partir de los perímetros (fórmula de la Marina de EE. UU.), no medidos por una báscula.</p>
        )}
      </div>

      <h3>Qué dicen tus números</h3>
      <div className="stack">
        {mensajes.map((msg) => (
          <article className={`card insight ${msg.tono}`} key={msg.codigo}>
            <span className={`pill tag ${msg.tono}`}>{ROTULO[msg.tono]}</span>
            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{msg.titulo}</h4>
            <p>{msg.texto}</p>
          </article>
        ))}
        <p className="muted small">{NOTA_ORIENTACION}</p>
      </div>
    </>
  )
}
