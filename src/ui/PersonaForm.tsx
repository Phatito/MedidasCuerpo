import { useState, type FormEvent } from 'react'
import { parseNumero } from '../domain/numbers'
import type { Objetivo, Persona, Sexo } from '../domain/types'
import { validarValor } from '../domain/validation'

interface Props {
  persona?: Persona
  onGuardar: (p: Persona) => void | Promise<void>
  onCancelar: () => void
}

export function PersonaForm({ persona, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(persona?.nombre ?? '')
  const [sexo, setSexo] = useState<Sexo>(persona?.sexo ?? 'hombre')
  const [fechaNacimiento, setFechaNacimiento] = useState(persona?.fechaNacimiento ?? '')
  const [estatura, setEstatura] = useState(persona ? String(persona.estaturaCm).replace('.', ',') : '')
  const [objetivo, setObjetivo] = useState<Objetivo>(persona?.objetivo ?? 'bajar_grasa')
  const [errores, setErrores] = useState<{ nombre?: string; estatura?: string }>({})

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const err: typeof errores = {}
    if (!nombre.trim()) err.nombre = 'Escribe un nombre'
    const est = parseNumero(estatura)
    if (est == null) err.estatura = 'Escribe la estatura en centímetros, por ejemplo 170'
    else err.estatura = validarValor('estaturaCm', est) ?? undefined
    setErrores(err)
    if (err.nombre || err.estatura || est == null) return
    await onGuardar({
      id: persona?.id ?? crypto.randomUUID(),
      nombre: nombre.trim(),
      sexo,
      fechaNacimiento,
      estaturaCm: est,
      objetivo,
      creadaEn: persona?.creadaEn ?? new Date().toISOString(),
    })
  }

  return (
    <form className="card stack" onSubmit={enviar} noValidate>
      <h3>{persona ? `Editar a ${persona.nombre}` : 'Nueva persona'}</h3>
      <div className="form">
        <div className="field">
          <label htmlFor="persona-nombre">Nombre</label>
          <input id="persona-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          {errores.nombre && <span className="error">{errores.nombre}</span>}
        </div>
        <div className="field">
          <label htmlFor="persona-sexo">Sexo</label>
          <select id="persona-sexo" value={sexo} onChange={(e) => setSexo(e.target.value as Sexo)}>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
          </select>
          <span className="hint">Se usa para estimar el % de grasa.</span>
        </div>
        <div className="field">
          <label htmlFor="persona-estatura">Estatura (cm)</label>
          <input id="persona-estatura" inputMode="decimal" value={estatura} onChange={(e) => setEstatura(e.target.value)} />
          {errores.estatura && <span className="error">{errores.estatura}</span>}
        </div>
        <div className="field">
          <label htmlFor="persona-nacimiento">Fecha de nacimiento (opcional)</label>
          <input id="persona-nacimiento" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
          <span className="hint">Indícala si es menor de 18 años: las interpretaciones son para adultos.</span>
        </div>
        <div className="field">
          <label htmlFor="persona-objetivo">Objetivo</label>
          <select id="persona-objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value as Objetivo)}>
            <option value="bajar_grasa">Bajar grasa</option>
            <option value="ganar_musculo">Ganar músculo</option>
            <option value="mantener">Mantener</option>
          </select>
        </div>
      </div>
      <div className="row">
        <button className="btn primary" type="submit">Guardar persona</button>
        <button className="btn" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
