import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent, type MutableRefObject } from 'react'
import { fechaLegible, formatear, hoyIso, idMedicion, parseNumero } from '../domain/numbers'
import { CAMPOS_BASCULA, CAMPOS_BASCULA_EXTRA, CAMPOS_NUMERICOS, CAMPOS_PERIMETROS, CAMPOS_SIN_LADO, ETIQUETAS, type CampoNumerico, type Medicion, type Persona } from '../domain/types'
import type { CampoCaptura, LecturaCaptura } from '../domain/capturaXiaomi'
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
  /** Se llama tras guardar bien; Registrar lo usa para volver a la ficha. */
  onGuardada?: (fecha: string) => void
  /** Lo leído de una captura de Xiaomi Home; cada lectura nueva trae otro `id`. */
  lectura?: { id: number; datos: LecturaCaptura; imagenUrl: string }
  /** Registrar lee aquí si hay algo sin guardar y cuándo se escribió por última vez. */
  estado?: MutableRefObject<{ sucio: boolean; editadoEn: number }>
  /** "bascula": solo peso (y lo demás de la báscula, plegado); las medidas con cinta van aparte y se conservan.
   *  "completo": todo junto, para editar una medición guardada. */
  modo?: 'bascula' | 'completo'
}

const CAMPOS_BASCULA_TODOS: CampoNumerico[] = [...CAMPOS_BASCULA, ...CAMPOS_BASCULA_EXTRA]
const MAS_BASCULA: CampoNumerico[] = CAMPOS_BASCULA_TODOS.filter((c) => c !== 'pesoKg')
type Textos = Record<CampoNumerico, string>
const VACIO = Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, ''])) as Textos
const aTexto = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))

export function Medir({ persona, fechaInicial, borrador, onBorrador, onVerEvolucion, onGuardada, lectura, estado, modo = 'completo' }: Props) {
  const bascula = modo === 'bascula'
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [fecha, setFecha] = useState(fechaInicial ?? borrador?.fecha ?? hoyIso())
  const [textos, setTextos] = useState<Textos>(borrador?.textos ?? VACIO)
  const [nota, setNota] = useState(borrador?.nota ?? '')
  const [recuperado, setRecuperado] = useState(borrador != null)
  const [errores, setErrores] = useState<Partial<Record<CampoNumerico | 'fecha', string>>>({})
  const [guardada, setGuardada] = useState(false)
  const [falloGuardar, setFalloGuardar] = useState(false)
  // Marcas de los campos que vienen de una captura: comprobados o para revisar con la imagen.
  const [marcas, setMarcas] = useState<Partial<Record<CampoNumerico, 'ok' | 'revisar'>>>({})
  const [ampliada, setAmpliada] = useState(false)
  const tituloLectura = useRef<HTMLHeadingElement>(null)
  const [enfocarLectura, setEnfocarLectura] = useState(0)

  // Cada vez que la persona escribe algo.
  function editado() {
    sucio.current = true
    if (estado) estado.current.editadoEn = Date.now()
  }
  useEffect(() => {
    if (estado) estado.current.sucio = sucio.current
  })
  // Tras aplicar una captura, el foco va al resultado para que se anuncie.
  useEffect(() => {
    if (enfocarLectura) tituloLectura.current?.focus()
  }, [enfocarLectura])
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

  // Una captura leída: la fecha pasa a la de la captura, se carga lo guardado ese día y encima van los campos leídos.
  // Un campo que no se pudo leer conserva lo guardado. Nada se guarda hasta pulsar Guardar.
  useEffect(() => {
    if (!lectura || !cargadas) return
    const { datos } = lectura
    const dia = datos.fecha ?? fecha
    const guardada = mediciones?.find((m) => m.fecha === dia)
    const base = guardada ? (Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, aTexto(guardada[c])])) as Textos) : VACIO
    const leidos = Object.entries(datos.valores) as [CampoCaptura, number][]
    sucio.current = true
    setFecha(dia)
    setTextos({ ...base, ...Object.fromEntries(leidos.map(([c, v]) => [c, aTexto(v)])) })
    const notaGuardada = guardada?.nota ?? ''
    setNota(notaGuardada || (datos.hora ? `Xiaomi Home ${datos.hora}` : ''))
    setMarcas(Object.fromEntries(leidos.map(([c]) => [c, datos.revisar.includes(c) ? 'revisar' : 'ok'])))
    setEnfocarLectura((n) => n + 1)
    setErrores({})
    setGuardada(false)
    setRecuperado(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectura?.id, cargadas])

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
    // En la báscula se conserva lo demás de ese día (las medidas con cinta); solo se reescriben los campos de la báscula.
    const camposForm = bascula ? CAMPOS_BASCULA_TODOS : CAMPOS_NUMERICOS
    const medicion: Medicion = { id: idMedicion(persona.id, fecha), personaId: persona.id, fecha, origen: 'manual' }
    if (bascula && existente) {
      for (const c of CAMPOS_PERIMETROS) if (existente[c] != null) medicion[c] = existente[c]
    }
    for (const campo of camposForm) {
      const texto = textos[campo].trim()
      if (texto === '') {
        if (campo === 'pesoKg' && (bascula || !CAMPOS_PERIMETROS.some((c) => textos[c].trim() !== ''))) {
          err.pesoKg = bascula ? 'El peso es obligatorio' : 'Escribe el peso o alguna medida con cinta'
        }
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
    onGuardada?.(fecha)
  }

  const campo = (c: CampoNumerico) => {
    const { nombre, unidad } = ETIQUETAS[c]
    // El último valor registrado de ese campo, aunque la medición anterior haya sido solo de peso.
    const previo = mediciones?.filter((m) => m.fecha < fecha && m[c] != null).at(-1)?.[c]
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
          aria-describedby={marcas[c] ? `marca-${c}` : undefined}
          onChange={(e) => {
            editado()
            setTextos({ ...textos, [c]: e.target.value })
            setGuardada(false)
            // Corregido a mano: ya no es "de la captura".
            if (marcas[c]) {
              const { [c]: _quitada, ...resto } = marcas
              setMarcas(resto)
            }
          }}
        />
        {marcas[c] && (
          <span id={`marca-${c}`} className={`marca ${marcas[c] === 'revisar' ? 'revisar' : 'desde-captura'}`}>
            {marcas[c] === 'revisar' ? 'revisa con la imagen' : 'de la captura'}
          </span>
        )}
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
      {lectura && enfocarLectura > 0 && (
        <div className="card captura-leida">
          <button type="button" className={`captura-mini ${ampliada ? 'ampliada' : ''}`} onClick={() => setAmpliada(!ampliada)} aria-pressed={ampliada} aria-label="Ampliar la captura">
            <img src={lectura.imagenUrl} alt="Tu captura" />
          </button>
          <div className="stack">
            <h3 ref={tituloLectura} tabIndex={-1}>Captura leída</h3>
            <p className="notice info">Revisa los valores y pulsa Guardar.</p>
            {lectura.datos.fuente === 'ia' ? (
              <p className="muted small">Leída con IA (Gemini). Compara los valores con tu captura antes de guardar.</p>
            ) : (
              <p className="muted small">
                Los campos marcados <span className="marca desde-captura">de la captura</span> cuadran con otras cifras del mismo informe; los marcados{' '}
                <span className="marca revisar">revisa con la imagen</span> no se pudieron comprobar: compáralos con tu captura.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="card stack">
        <div className="form">
          <div className="field">
            <label htmlFor="medir-fecha">Fecha</label>
            <input id="medir-fecha" type="date" max={hoyIso()} value={fecha} onChange={(e) => { if (estado) estado.current.editadoEn = Date.now(); setFecha(e.target.value); setGuardada(false) }} />
            {errores.fecha && <span className="error">{errores.fecha}</span>}
          </div>
        </div>
        {existente && (
          <p className="notice warn small">
            {bascula
              ? `Ya hay una medición del ${fechaLegible(fecha)}: se actualizan los datos de la báscula y se conservan las medidas con cinta.`
              : `Ya hay una medición del ${fechaLegible(fecha)}; al guardar se reemplazará.`}
          </p>
        )}
        {anterior && <p className="muted small">Medición anterior: {fechaLegible(anterior.fecha)}.</p>}
      </div>
      <div className="card">
        <fieldset>
          <legend>Báscula</legend>
          <div className="form">{(bascula ? ['pesoKg' as CampoNumerico] : CAMPOS_BASCULA).map(campo)}</div>
          <details className="guide" open={(bascula ? MAS_BASCULA : CAMPOS_BASCULA_EXTRA).some((c) => textos[c] !== '') || undefined}>
            <summary>Más de la báscula</summary>
            <div className="form">{(bascula ? MAS_BASCULA : CAMPOS_BASCULA_EXTRA).map(campo)}</div>
            <p className="muted small">Masa muscular total, masa ósea, proteína, metabolismo basal, edad corporal y frecuencia cardíaca, como en el informe de básculas como la Xiaomi.</p>
          </details>
          <p className="muted small">
            {bascula
              ? 'Con una báscula básica, basta el peso. Si tienes la captura de Xiaomi Home, úsala: llena todo sola.'
              : 'Escribe el peso o alguna medida con cinta. Si tu báscula o tu reporte InBody entrega los demás valores, cópialos aquí.'}
          </p>
        </fieldset>
      </div>
      {!bascula && <div className="card">
        <fieldset>
          <legend>Perímetros</legend>
          {/* Las medidas sin lado ya no se piden; solo aparecen si la medición cargada las trae, para no perderlas. */}
          <div className="form">{CAMPOS_PERIMETROS.filter((c) => !CAMPOS_SIN_LADO.includes(c) || existente?.[c] != null || textos[c] !== '').map(campo)}</div>
          <details className="guide">
            <summary>Cómo medir cada zona</summary>
            <ul>
              <li><b>Cuello:</b> bajo la nuez, con la cinta horizontal.</li>
              <li><b>Pecho:</b> a la altura de los pezones, después de soltar el aire.</li>
              <li><b>Brazo:</b> a mitad del brazo, relajado y colgando.</li>
              <li><b>Cintura:</b> a la altura del ombligo, sin meter la barriga.</li>
              <li><b>Cadera:</b> en la parte más ancha de los glúteos.</li>
              <li><b>Muslo:</b> a mitad del muslo, de pie y con el peso repartido.</li>
              <li>Siempre en el mismo punto, en ayunas y a la misma hora.</li>
            </ul>
          </details>
          <p className="muted small">Mide siempre a la misma hora y en el mismo punto. Con cuello y cintura (y cadera en mujeres) la app estima el % de grasa si no lo tienes.</p>
        </fieldset>
      </div>}
      <div className="card">
        <div className="field">
          <label htmlFor="medir-nota">Nota (opcional)</label>
          <input id="medir-nota" maxLength={1000} value={nota} onChange={(e) => { editado(); setNota(e.target.value) }} />
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
