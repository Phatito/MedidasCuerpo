import { useState, type FormEvent } from 'react'
import { conConsumo, consumoVigente, KCAL_MAX, KCAL_MIN, sinConsumo } from '../domain/consumo'
import { fechaLegible, hoyIso, parseNumero } from '../domain/numbers'
import type { Persona } from '../domain/types'
import { guardarPersona } from '../storage/db'

const miles = (n: number) => n.toLocaleString('es-CL')

/** Consumo diario de kcal que anota la persona, editable en el tiempo: cada valor rige desde su fecha. */
export function Consumo({ persona }: { persona: Persona }) {
  const hoy = hoyIso()
  const vigente = consumoVigente(persona, hoy)
  const [abierto, setAbierto] = useState(false)
  const [kcal, setKcal] = useState('')
  const [desde, setDesde] = useState(hoy)
  const [error, setError] = useState<string | null>(null)
  const historial = [...(persona.consumos ?? [])].reverse()

  function abrir() {
    setKcal(vigente != null ? String(vigente) : '')
    setDesde(hoy)
    setError(null)
    setAbierto(!abierto)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    // "2.500" se lee como dos mil quinientos.
    const n = parseNumero(/^\d{1,3}(\.\d{3})+$/.test(kcal.trim()) ? kcal.trim().replace(/\./g, '') : kcal)
    if (n == null || n < KCAL_MIN || n > KCAL_MAX) return setError(`Debe estar entre ${miles(KCAL_MIN)} y ${miles(KCAL_MAX)}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return setError('Elige desde qué fecha')
    try {
      await guardarPersona(conConsumo(persona, desde, Math.round(n)))
      setAbierto(false)
    } catch {
      setError('No se pudo guardar.')
    }
  }

  return (
    <div className="consumo">
      <button type="button" className="chip-btn consumo-boton" aria-expanded={abierto} onClick={abrir}>
        {vigente != null ? `Consumo: ${miles(vigente)} kcal/día ✎` : 'Anotar consumo ✎'}
      </button>
      {abierto && (
        <form className="stack consumo-form" onSubmit={guardar} noValidate>
          <p className="muted small">Cuánto comes al día, en total y aproximado. Con esto y tu peso se estima tu gasto real.</p>
          <div className="row consumo-campos">
            <div className="field">
              <label htmlFor="consumo-kcal">kcal al día</label>
              <input id="consumo-kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="consumo-desde">Desde</label>
              <input id="consumo-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row">
            <button type="submit" className="btn primary">Guardar consumo</button>
            <button type="button" className="btn" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
          {historial.length > 0 && (
            <ul className="consumo-historial" aria-label="Historial de consumo">
              {historial.map((c) => (
                <li key={c.desde}>
                  <span className="num">
                    {miles(c.kcal)} desde el {fechaLegible(c.desde)}
                  </span>
                  <button type="button" className="btn link danger" onClick={() => void guardarPersona(sinConsumo(persona, c.desde))} aria-label={`Quitar ${miles(c.kcal)} desde el ${fechaLegible(c.desde)}`}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
    </div>
  )
}
