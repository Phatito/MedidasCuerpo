import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fechaLegible, formatear, hoyIso, idMedicion, parseNumero } from '../domain/numbers'
import { CAMPOS_BASCULA, CAMPOS_NUMERICOS, CAMPOS_PERIMETROS, CAMPOS_SIN_LADO, ETIQUETAS, type CampoNumerico, type Medicion, type Persona } from '../domain/types'
import { validarValor } from '../domain/validation'
import { guardarMedicion, listarMediciones } from '../storage/db'

/** Lo escrito y aún no guardado; App lo conserva por persona para que no se pierda al cambiar de persona o de pantalla. */
export interface Borrador {
  fecha: string
  textos: Record<CampoNumerico, string>
  nota: string
}

interface Props {
  persona: Persona
  fechaInicial?: string
  borrador?: Borrador
  onBorrador?: (b: Borrador | null) => void
  onVerEvolucion: () => void
}

type Textos = Record<CampoNumerico, string>
const VACIO = Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, ''])) as Textos
const aTexto = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))

export function Medir({ persona, fechaInicial, borrador, onBorrador, onVerEvolucion }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [fecha, setFecha] = useState(fechaInicial ?? borrador?.fecha ?? hoyIso())
  const [textos, setTextos] = useState<Textos>(borrador?.textos ?? VACIO)
  const [nota, setNota] = useState(borrador?.nota ?? '')
  const [recuperado, setRecuperado] = useState(borrador != null)
  const [errores, setErrores] = useState<Partial<Record<CampoNumerico | 'fecha', string>>>({})
  const [guardada, setGuardada] = useState(false)
  const [falloGuardar, setFalloGuardar] = useState(false)
  // "Sucio": la persona escribió algo que aún no se guarda. Mientras lo esté, nada reemplaza lo escrito.
  const sucio = useRef(borrador != null)
  const diaVisto = useRef(hoyIso())
  const fechaActual = useRef(fecha)
  fechaActual.current = fecha

  const cargadas = mediciones != null
  const existente = mediciones?.find((m) => m.fecha === fecha)
  const anterior = mediciones?.filter((m) => m.fecha < fecha).at(-1)

  // Al cambiar de persona o de fecha, el formulario muestra lo que ya hay guardado ese día.
  useEffect(() => {
    if (!cargadas || sucio.current) return
    setTextos(existente ? (Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, aTexto(existente[c])])) as Textos) : VACIO)
    setNota(existente?.nota ?? '')
    setErrores({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id, fecha, cargadas])

  // Mientras haya algo sin guardar, App guarda una copia para devolverla si la persona se va y vuelve.
  useEffect(() => {
    if (sucio.current) onBorrador?.({ fecha, textos, nota })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, textos, nota])

  // Si la ventana quedó abierta de un día para otro, al volver a ella el formulario pasa al día de hoy
  // (salvo que haya algo sin guardar o que la persona haya elegido otra fecha).
  useEffect(() => {
    function alVolver() {
      const hoy = hoyIso()
      if (hoy === diaVisto.current) return
      if (!sucio.current && fechaActual.current === diaVisto.current) {
        setFecha(hoy)
        setGuardada(false)
      }
      diaVisto.current = hoy
    }
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

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
    setFalloGuardar(false)
    try {
      await guardarMedicion(medicion)
    } catch {
      setFalloGuardar(true)
      return
    }
    sucio.current = false
    onBorrador?.(null)
    setRecuperado(false)
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
            sucio.current = true
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
      {recuperado && <p className="notice" role="status">Recuperamos lo que habías escrito sin guardar.</p>}
      <div className="card stack">
        <div className="form">
          <div className="field">
            <label htmlFor="medir-fecha">Fecha</label>
            <input id="medir-fecha" type="date" max={hoyIso()} value={fecha} onChange={(e) => { setFecha(e.target.value); setGuardada(false) }} />
            {errores.fecha && <span className="error">{errores.fecha}</span>}
          </div>
        </div>
        {existente && <p className="notice warn small">Ya hay una medición del {fechaLegible(fecha)}; al guardar se reemplazará.</p>}
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
          {/* Las medidas sin lado ya no se piden; solo aparecen si la medición cargada las trae, para no perderlas. */}
          <div className="form">{CAMPOS_PERIMETROS.filter((c) => !CAMPOS_SIN_LADO.includes(c) || existente?.[c] != null || textos[c] !== '').map(campo)}</div>
          <p className="muted small">Mide siempre a la misma hora y en el mismo punto. Con cuello y cintura (y cadera en mujeres) la app estima el % de grasa si no lo tienes.</p>
        </fieldset>
      </div>
      <div className="card">
        <div className="field">
          <label htmlFor="medir-nota">Nota (opcional)</label>
          <input id="medir-nota" value={nota} onChange={(e) => { sucio.current = true; setNota(e.target.value) }} />
        </div>
      </div>
      <div className="row">
        <button className="btn primary" type="submit">{existente ? 'Actualizar medición' : 'Guardar medición'}</button>
        {falloGuardar && (
          <span className="notice bad" role="alert">
            No se pudo guardar la medición. Puede que el navegador se haya quedado sin espacio; lo que escribiste sigue aquí, inténtalo de nuevo.
          </span>
        )}
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
