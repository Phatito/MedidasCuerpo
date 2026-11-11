import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { fechaLegible, formatear, hoyIso, idMedicion, parseNumero } from '../domain/numbers'
import { CAMPOS_BASCULA, CAMPOS_NUMERICOS, CAMPOS_PERIMETROS, ETIQUETAS, type CampoNumerico, type Medicion, type Persona } from '../domain/types'
import { validarValor } from '../domain/validation'
import { guardarMedicion, listarMediciones } from '../storage/db'

interface Props {
  persona: Persona
  fechaInicial?: string
  onVerEvolucion: () => void
}

type Textos = Record<CampoNumerico, string>
const VACIO = Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, ''])) as Textos
const aTexto = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))

export function Medir({ persona, fechaInicial, onVerEvolucion }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [fecha, setFecha] = useState(fechaInicial ?? hoyIso())
  const [textos, setTextos] = useState<Textos>(VACIO)
  const [nota, setNota] = useState('')
  const [errores, setErrores] = useState<Partial<Record<CampoNumerico | 'fecha', string>>>({})
  const [guardada, setGuardada] = useState(false)

  const cargadas = mediciones != null
  const existente = mediciones?.find((m) => m.fecha === fecha)
  const anterior = mediciones?.filter((m) => m.fecha < fecha).at(-1)

  // Al cambiar de persona o de fecha, el formulario muestra lo que ya hay guardado ese día.
  useEffect(() => {
    if (!cargadas) return
    setTextos(existente ? (Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, aTexto(existente[c])])) as Textos) : VACIO)
    setNota(existente?.nota ?? '')
    setErrores({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id, fecha, cargadas])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setGuardada(false)
    const err: typeof errores = {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) err.fecha = 'Elige una fecha'
    else if (fecha > hoyIso()) err.fecha = 'La fecha no puede ser futura'
    const medicion: Medicion = { id: idMedicion(persona.id, fecha), personaId: persona.id, fecha, pesoKg: 0, origen: 'manual' }
    for (const campo of CAMPOS_NUMERICOS) {
      const texto = textos[campo].trim()
      if (texto === '') {
        if (campo === 'pesoKg') err.pesoKg = 'El peso es obligatorio'
        continue
      }
      const valor = parseNumero(texto)
      if (valor == null) err[campo] = 'Escribe solo un número, por ejemplo 72,5'
      else {
        const fuera = validarValor(campo, valor)
        if (fuera) err[campo] = fuera
        else medicion[campo] = valor
      }
    }
    if (nota.trim()) medicion.nota = nota.trim()
    setErrores(err)
    if (Object.keys(err).length > 0) return
    await guardarMedicion(medicion)
    setGuardada(true)
  }

  const campo = (c: CampoNumerico) => {
    const { nombre, unidad } = ETIQUETAS[c]
    const previo = anterior?.[c]
    return (
      <div className="field" key={c}>
        <label htmlFor={`medir-${c}`}>
          {nombre} ({unidad})
        </label>
        <input
          id={`medir-${c}`}
          inputMode="decimal"
          autoComplete="off"
          value={textos[c]}
          onChange={(e) => {
            setTextos({ ...textos, [c]: e.target.value })
            setGuardada(false)
          }}
        />
        {errores[c] ? (
          <span className="error">{errores[c]}</span>
        ) : (
          previo != null && <span className="hint num">antes: {formatear(previo)}</span>
        )}
      </div>
    )
  }

  // Hasta que carguen las mediciones guardadas no se muestra el formulario:
  // así nada de lo que la persona escriba se pierde cuando llegan los datos.
  if (!cargadas) return <p className="muted">Cargando…</p>

  return (
    <form className="stack" onSubmit={enviar} noValidate>
      <div className="card stack">
        <div className="form">
          <div className="field">
            <label htmlFor="medir-fecha">Fecha</label>
            <input id="medir-fecha" type="date" max={hoyIso()} value={fecha} onChange={(e) => { setFecha(e.target.value); setGuardada(false) }} />
            {errores.fecha && <span className="error">{errores.fecha}</span>}
          </div>
        </div>
        {existente && <p className="muted small">Ya hay una medición del {fechaLegible(fecha)}; al guardar se actualizará.</p>}
        {anterior && <p className="muted small">Medición anterior: {fechaLegible(anterior.fecha)}.</p>}
      </div>
      <div className="card">
        <fieldset>
          <legend>Báscula</legend>
          <div className="form">{CAMPOS_BASCULA.map(campo)}</div>
          <p className="muted small">Solo el peso es obligatorio. Si tu báscula o tu reporte InBody entrega los demás valores, cópialos aquí.</p>
        </fieldset>
      </div>
      <div className="card">
        <fieldset>
          <legend>Perímetros</legend>
          <div className="form">{CAMPOS_PERIMETROS.map(campo)}</div>
          <p className="muted small">Mide siempre a la misma hora y en el mismo punto. Con cuello y cintura (y cadera en mujeres) la app estima el % de grasa si no lo tienes.</p>
        </fieldset>
      </div>
      <div className="card">
        <div className="field">
          <label htmlFor="medir-nota">Nota (opcional)</label>
          <input id="medir-nota" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </div>
      <div className="row">
        <button className="btn primary" type="submit">{existente ? 'Actualizar medición' : 'Guardar medición'}</button>
        {guardada && (
          <span className="notice ok" role="status">
            Medición guardada.{' '}
            <button type="button" className="btn link" onClick={onVerEvolucion}>Ver evolución</button>
          </span>
        )}
      </div>
    </form>
  )
}
