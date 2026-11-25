import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sentidoCambio, zonaDeCampo } from '../domain/cinta'
import type { CampoPerimetro } from '../domain/ficha'
import { fechaLegible, formatear, hoyIso, idMedicion, parseNumero } from '../domain/numbers'
import { ETIQUETAS, type Medicion, type Persona } from '../domain/types'
import { validarValor } from '../domain/validation'
import { guardarMedicion, listarMediciones } from '../storage/db'
import { Icono, Muesca } from './Icono'
import { Maniqui } from './Maniqui'

/** De arriba hacia abajo, para no ir y volver con la cinta. */
export const PASOS: CampoPerimetro[] = ['cuelloCm', 'pechoCm', 'brazoDerCm', 'brazoIzqCm', 'cinturaCm', 'caderaCm', 'musloDerCm', 'musloIzqCm']

const CONSEJO: Record<string, string> = {
  cuelloCm: 'Bajo la nuez, con la cinta horizontal.',
  pechoCm: 'A la altura de los pezones, después de soltar el aire.',
  brazoDerCm: 'A mitad del brazo, relajado y colgando.',
  brazoIzqCm: 'A mitad del brazo, relajado y colgando.',
  cinturaCm: 'A la altura del ombligo, sin meter la barriga.',
  caderaCm: 'En la parte más ancha de los glúteos.',
  musloDerCm: 'A mitad del muslo, de pie y con el peso repartido.',
  musloIzqCm: 'A mitad del muslo, de pie y con el peso repartido.',
}
// Si antes se midió sin lado, esa medida sirve de "la vez pasada" para los dos lados.
const SIN_LADO: Partial<Record<CampoPerimetro, CampoPerimetro>> = { brazoDerCm: 'brazoCm', brazoIzqCm: 'brazoCm', musloDerCm: 'musloCm', musloIzqCm: 'musloCm' }

type Textos = Partial<Record<CampoPerimetro, string>>
interface BorradorCinta {
  fecha: string
  textos: Textos
  paso: number
}
const aTexto = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))
const r1 = (x: number) => Math.round(x * 10) / 10

function leerBorrador(clave: string): BorradorCinta | null {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as BorradorCinta) : null
  } catch {
    return null
  }
}
function escribirBorrador(clave: string, b: BorradorCinta | null) {
  try {
    if (b) localStorage.setItem(clave, JSON.stringify(b))
    else localStorage.removeItem(clave)
  } catch {
    /* sin almacenamiento: el borrador dura solo esta visita */
  }
}

interface Props {
  persona: Persona
  fecha?: string
  onListo: (aviso: string) => void
}

/** Medidas con cinta, una por una, con el maniquí enseñando dónde poner la cinta. */
export function MedirCinta({ persona, fecha: fechaRuta, onListo }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const claveBorrador = `mesura.cinta.borrador.${persona.id}`
  const [borrador] = useState(() => (fechaRuta ? null : leerBorrador(claveBorrador)))
  const [fecha, setFecha] = useState(fechaRuta ?? borrador?.fecha ?? hoyIso())
  const [textos, setTextos] = useState<Textos>(borrador?.textos ?? {})
  // -1: inicio; 0..7: cada medida; 8: resumen.
  const [paso, setPaso] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)
  const cargado = useRef(false)
  const titulo = useRef<HTMLHeadingElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const tocado = useRef(borrador != null)

  const existente = mediciones?.find((m) => m.fecha === fecha)

  // Lo que ya hay guardado ese día se carga para corregirlo (salvo que haya un borrador a medias).
  useEffect(() => {
    if (!mediciones || tocado.current) return
    setTextos(Object.fromEntries(PASOS.map((c) => [c, aTexto(existente?.[c])])) as Textos)
    cargado.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediciones != null, fecha])

  // El borrador se guarda a cada cambio: si se sale a la mitad, se ofrece continuar.
  useEffect(() => {
    if (tocado.current && paso >= 0) escribirBorrador(claveBorrador, { fecha, textos, paso })
  }, [claveBorrador, fecha, textos, paso])

  // Cada paso nuevo anuncia su título y deja el cursor en la medida.
  useEffect(() => {
    if (paso < 0) return
    titulo.current?.focus({ preventScroll: true })
    if (paso < PASOS.length) {
      const t = setTimeout(() => entrada.current?.focus({ preventScroll: true }), 60)
      return () => clearTimeout(t)
    }
  }, [paso])

  if (!mediciones) return <p className="muted">Cargando…</p>

  const previoDe = (c: CampoPerimetro): number | null => {
    const antes = mediciones.filter((m) => m.fecha < fecha)
    const m = [...antes].reverse().find((x) => x[c] != null || (SIN_LADO[c] && x[SIN_LADO[c]!] != null))
    if (!m) return null
    return m[c] ?? m[SIN_LADO[c]!] ?? null
  }
  const valorDe = (c: CampoPerimetro): number | null => {
    const t = (textos[c] ?? '').trim()
    return t === '' ? null : parseNumero(t)
  }
  const hechas = PASOS.filter((c) => valorDe(c) != null)

  function ir(n: number) {
    setError(null)
    setPaso(n)
  }

  function siguiente(e: FormEvent) {
    e.preventDefault()
    const c = PASOS[paso]
    const t = (textos[c] ?? '').trim()
    if (t !== '') {
      const v = parseNumero(t)
      if (v == null) return setError('Escribe solo un número, por ejemplo 88,5')
      const fuera = validarValor(c, v)
      if (fuera) return setError(fuera)
    }
    ir(paso + 1)
  }

  async function guardar() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyIso()) return setError('Elige una fecha de hoy o anterior')
    if (hechas.length === 0) return setError('Escribe al menos una medida para guardar.')
    // Se completa la medición del día: el peso y lo demás de ese día se conservan.
    const base: Medicion = existente ? { ...existente } : { id: idMedicion(persona.id, fecha), personaId: persona.id, fecha, origen: 'manual' }
    for (const c of PASOS) {
      const v = valorDe(c)
      if (v == null) delete base[c]
      else base[c] = v
    }
    setFallo(false)
    try {
      await guardarMedicion(base)
    } catch {
      return setFallo(true)
    }
    escribirBorrador(claveBorrador, null)
    onListo(`Medidas del ${fechaLegible(fecha).slice(0, 5)} guardadas.`)
  }

  const nombre = (c: CampoPerimetro) => ETIQUETAS[c].nombre
  const actual = paso >= 0 && paso < PASOS.length ? PASOS[paso] : null

  const progreso = (
    <ol className="cinta-progreso" aria-label="Avance">
      {PASOS.map((c, i) => (
        <li
          key={c}
          className={`${i === paso ? 'actual' : ''} ${valorDe(c) != null ? 'hecha' : i < paso || paso === PASOS.length ? 'saltada' : ''}`}
          aria-current={i === paso ? 'step' : undefined}
        >
          <span className="sr-only">
            {nombre(c)}: {valorDe(c) != null ? 'medida' : i < paso ? 'saltada' : 'pendiente'}
          </span>
        </li>
      ))}
    </ol>
  )

  // Inicio: la fecha y empezar (o continuar el borrador).
  if (paso === -1) {
    return (
      <div className="stack medir-cinta">
        <h1>Medidas con cinta · {persona.nombre}</h1>
        <div className="card cinta-escena inicio">
          <Maniqui sexo={persona.sexo} campo={null} hechas={hechas} descripcion="El maniquí del molde, listo para medir." />
          <div className="stack cinta-intro">
            <p className="cinta-intro-t">8 medidas, de arriba a abajo. Te muestro dónde va la cinta en cada una.</p>
            <p className="muted small">Pegada a la piel, sin apretar. Siempre en el mismo punto y a la misma hora.</p>
            <div className="field">
              <label htmlFor="cinta-fecha">Fecha</label>
              <input id="cinta-fecha" type="date" max={hoyIso()} value={fecha} onChange={(e) => { tocado.current = false; setFecha(e.target.value) }} />
            </div>
            {existente && <p className="notice info small">Ya hay datos del {fechaLegible(fecha)}: se completan con estas medidas{existente.pesoKg != null ? ' y se conserva el peso' : ''}.</p>}
            {error && <p className="error" role="alert">{error}</p>}
            <button type="button" className="btn primary grande" onClick={() => ir(borrador && borrador.fecha === fecha ? Math.min(borrador.paso, PASOS.length) : 0)}>
              {borrador && borrador.fecha === fecha ? 'Continuar donde quedaste' : 'Empezar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Resumen: todas las medidas, cada una vuelve a su paso.
  if (paso === PASOS.length) {
    return (
      <div className="stack medir-cinta">
        <h1 ref={titulo} tabIndex={-1}>
          Listo · {fechaLegible(fecha).slice(0, 5)}
        </h1>
        {progreso}
        <div className="card cinta-escena">
          <Maniqui sexo={persona.sexo} campo={null} hechas={hechas} descripcion={`Resumen: ${hechas.length} de ${PASOS.length} medidas.`} />
          <ul className="cinta-resumen">
            {PASOS.map((c, i) => {
              const v = valorDe(c)
              const prev = previoDe(c)
              const d = v != null && prev != null ? r1(v - prev) : null
              const zona = zonaDeCampo(c)!
              return (
                <li key={c}>
                  <button type="button" className="cinta-fila" onClick={() => ir(i)} aria-label={`${nombre(c)}: ${v != null ? `${formatear(v)} cm` : 'saltada'}. Cambiar`}>
                    <span className="cinta-zona">{nombre(c)}</span>
                    <span className="cinta-valor num">{v != null ? <>{formatear(v)} <small>cm</small></> : <span className="muted">saltada</span>}</span>
                    <span className={`cinta-cambio num ${d != null ? sentidoCambio(zona, d, 0, 0) : ''}${d != null && d !== 0 && Math.abs(d) < 0.5 ? ' leve' : ''}`}>
                      {d == null ? '' : d === 0 ? '= 0' : <><Muesca cambio={d} /> {formatear(Math.abs(d))}</>}
                    </span>
                    <Icono nombre="editar" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {fallo && <p className="notice bad" role="alert">No se pudieron guardar las medidas. Lo que escribiste sigue aquí; inténtalo de nuevo.</p>}
        <div className="cinta-botones">
          <button type="button" className="btn" onClick={() => ir(PASOS.length - 1)}>
            <Icono nombre="volver" /> Atrás
          </button>
          <button type="button" className="btn primary grande" onClick={guardar}>
            <Icono nombre="si" /> Guardar medidas
          </button>
        </div>
      </div>
    )
  }

  // Un paso: la animación, el consejo y la medida.
  const c = actual!
  const prev = previoDe(c)
  const v = valorDe(c)
  const d = v != null && prev != null && validarValor(c, v) == null ? r1(v - prev) : null
  const zona = zonaDeCampo(c)!
  return (
    <div className="stack medir-cinta">
      <p className="cinta-paso-n muted small num">
        Medida {paso + 1} de {PASOS.length}
      </p>
      {progreso}
      <form className="card cinta-escena" onSubmit={siguiente} noValidate>
        <Maniqui sexo={persona.sexo} campo={c} previo={prev} hechas={hechas} descripcion={`Cómo medir: ${nombre(c).toLowerCase()}. ${CONSEJO[c]}`} />
        <div className="stack cinta-paso">
          <h1 ref={titulo} tabIndex={-1} className="cinta-paso-t">
            {nombre(c)}
          </h1>
          <p className="cinta-consejo">{CONSEJO[c]}</p>
          <div className="cinta-entrada">
            <label htmlFor="cinta-valor" className="sr-only">
              {nombre(c)} en centímetros
            </label>
            <input
              id="cinta-valor"
              ref={entrada}
              inputMode="decimal"
              autoComplete="off"
              placeholder={prev != null ? formatear(prev) : '0,0'}
              value={textos[c] ?? ''}
              aria-describedby="cinta-ayuda"
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                tocado.current = true
                setError(null)
                setTextos({ ...textos, [c]: e.target.value })
              }}
            />
            <span className="cinta-unidad">cm</span>
          </div>
          <p id="cinta-ayuda" className="small num cinta-ayuda" aria-live="polite">
            {error ? (
              <span className="error">{error}</span>
            ) : (
              <>
                {prev != null ? `La vez pasada: ${formatear(prev)} cm` : 'Primera vez que mides esta zona.'}
                {d != null && (
                  <span className={`cinta-cambio ${sentidoCambio(zona, d, 0, 0)}${d !== 0 && Math.abs(d) < 0.5 ? ' leve' : ''}`}>
                    {' '}
                    {d === 0 ? '· sin cambio' : <>· <Muesca cambio={d} /> {formatear(Math.abs(d))} cm{Math.abs(d) < 0.5 ? ' (leve)' : ''}</>}
                  </span>
                )}
              </>
            )}
          </p>
          <div className="cinta-botones">
            <button type="button" className="btn" onClick={() => ir(paso - 1)}>
              <Icono nombre="volver" /> Atrás
            </button>
            <button type="button" className="btn link" onClick={() => {
                // Saltar no borra lo guardado ese día; solo descarta lo que no sea un número válido.
                if (v == null || validarValor(c, v) != null) setTextos({ ...textos, [c]: (textos[c] ?? '').trim() === '' || v == null ? '' : textos[c] })
                ir(paso + 1)
              }}>
              Saltar
            </button>
            <button type="submit" className="btn primary">
              Siguiente <Icono nombre="abrir" />
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
