import { useLiveQuery } from 'dexie-react-hooks'
import { cuadritos, type Cuadrito } from '../domain/cifras'
import { resumenFicha } from '../domain/ficha'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { informeSemanal } from '../domain/semana'
import type { Metrica } from '../domain/series'
import { tendenciaPeso } from '../domain/trend'
import type { Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { OBJETIVO } from './Cifra'
import { Cuerpo } from './Cuerpo'
import { inicial } from './SelectorPerfil'

interface Props {
  persona: Persona
  onMedir: () => void
  onVerMediciones: () => void
  onVerSemana: () => void
  onVerMedida: (m: Metrica) => void
  onVerCifras: () => void
}

const NOMBRE: Partial<Record<Metrica, string>> = {
  grasaPct: 'Grasa',
  musculoKg: 'Músculo',
  cinturaCm: 'Cintura',
  grasaVisceral: 'Grasa visceral',
  imc: 'IMC',
  aguaPct: 'Agua',
  grasaKg: 'Grasa',
  pesoSinGrasaKg: 'Peso sin grasa',
}
const UNIDAD: Partial<Record<Metrica, string>> = { grasaPct: '%', musculoKg: 'kg', cinturaCm: 'cm', grasaVisceral: 'nivel', imc: '', aguaPct: '%', grasaKg: 'kg', pesoSinGrasaKg: 'kg' }
const ENTERO: Metrica[] = ['grasaVisceral']

const flecha = (n: number) => (n < 0 ? '▼' : '▲')

function CuadritoBoton({ c, onAbrir }: { c: Cuadrito; onAbrir: () => void }) {
  const dec = ENTERO.includes(c.medida) && Number.isInteger(c.valor) ? 0 : 1
  const nombre = NOMBRE[c.medida] ?? c.medida
  const unidad = UNIDAD[c.medida] ?? ''
  return (
    <button type="button" className="cuadrito" data-medida={c.medida} onClick={onAbrir} aria-label={`${nombre}${c.estimada ? ' (estimada)' : ''}: ${formatear(c.valor, dec)} ${unidad}${c.clasificacion ? `, ${c.clasificacion.nombre}` : ''}. Ver gráfico`}>
      <span className="cuadrito-k">{nombre}{c.estimada && ' (est.)'}</span>
      <span className="cuadrito-v num">
        {formatear(c.valor, dec)} <small>{unidad}</small>
      </span>
      <span className="cuadrito-pie">
        {c.clasificacion && <span className={`estado st-${c.clasificacion.estado}`}>{c.clasificacion.nombre}</span>}
        {c.cambio != null && (
          <span className={`cuadrito-cambio num ${c.tono}`}>
            {flecha(c.cambio)} {formatear(Math.abs(c.cambio), dec)}
          </span>
        )}
      </span>
    </button>
  )
}

/** Ficha: lo importante a la vista; el detalle, a un toque. */
export function Ficha({ persona, onMedir, onVerMediciones, onVerSemana, onVerMedida, onVerCifras }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const hoy = hoyIso()
  const r = resumenFicha(persona, mediciones, { hoy })
  const peso = r.tarjetas.find((t) => t.clave === 'pesoKg') ?? null
  const serie = tendenciaPeso(mediciones.map((m) => ({ fecha: m.fecha, valor: m.pesoKg })))
  const fechas = [...new Set(serie.map((s) => s.fecha))]
  const ultimaT = serie[serie.length - 1]
  const previaFecha = fechas.length > 1 ? fechas[fechas.length - 2] : null
  const previaT = previaFecha ? [...serie].reverse().find((s) => s.fecha === previaFecha) : null
  const cambioSemana = ultimaT && previaT ? ultimaT.tendencia - previaT.tendencia : null
  const informe = informeSemanal(persona, mediciones, hoy)
  const lineaSemana = !informe
    ? null
    : informe.anterior == null
      ? 'Con tu segunda medición verás aquí tu semana.'
      : informe.vieja
        ? `Tu última medición es del ${fechaLegible(informe.fecha).slice(0, 5)}: mídete para recibir un plan nuevo.`
        : (informe.acciones[0]?.texto ?? 'Mira qué cambió esta semana.')
  const cs = cuadritos(persona, mediciones, hoy)

  return (
    <div className="ficha-c">
      <section className="card hero" aria-labelledby="ficha-nombre">
        <div className="who-head">
          <span className="avatar" aria-hidden="true">{inicial(persona.nombre)}</span>
          <div style={{ minWidth: 0 }}>
            <h2 id="ficha-nombre">{persona.nombre}</h2>
            <p className="muted small">
              Objetivo: {OBJETIVO[persona.objetivo]}
              {r.ultima && ` · medido el ${fechaLegible(r.ultima.fecha).slice(0, 5)}`}
            </p>
          </div>
        </div>
        {peso ? (
          <button type="button" className="peso-boton" onClick={() => onVerMedida('pesoKg')} aria-label={`Peso de tendencia: ${formatear(peso.valor)} kg. Ver gráfico de peso`}>
            <span className="hero-k">Peso de tendencia</span>
            <span className="hero-v num">
              {formatear(peso.valor)} <small>kg</small>
            </span>
            <span className="small num peso-cambios">
              {cambioSemana != null && Math.abs(cambioSemana) >= 0.05 && (
                <span className={`hero-cambio ${cambioSemana < 0 ? (persona.objetivo === 'ganar_musculo' ? 'atencion' : 'bien') : persona.objetivo === 'bajar_grasa' ? 'atencion' : 'bien'}`}>
                  {flecha(cambioSemana)} {formatear(Math.abs(cambioSemana))} kg desde el {fechaLegible(previaFecha!).slice(0, 5)}
                </span>
              )}
              {peso.cambio != null && peso.desde && (
                <span className="muted">
                  {' '}
                  · {flecha(peso.cambio)} {formatear(Math.abs(peso.cambio))} kg desde el inicio
                </span>
              )}
            </span>
            <span className="ver-mas" aria-hidden="true">›</span>
          </button>
        ) : (
          <div className="stack">
            <p>Todavía no hay mediciones de {persona.nombre}.</p>
            <p className="muted small">Con la primera verás aquí sus números; con la segunda, cómo van cambiando.</p>
          </div>
        )}
        {lineaSemana && (
          <button type="button" className="linea-semana" onClick={onVerSemana}>
            <span className="linea-semana-k">Tu semana</span>
            <span className="linea-semana-t">{lineaSemana}</span>
            <span aria-hidden="true">›</span>
          </button>
        )}
      </section>

      {cs.length > 0 && (
        <section aria-label="Cifras principales" className="cuadritos">
          {cs.map((c) => (
            <CuadritoBoton key={c.medida} c={c} onAbrir={() => onVerMedida(c.medida)} />
          ))}
        </section>
      )}

      <section className="card stack figura" aria-label="Perímetros">
        <div className="head">
          <h3>Perímetros</h3>
          {r.fechaPerimetros && <span className="muted small">del {fechaLegible(r.fechaPerimetros)}</span>}
        </div>
        <Cuerpo sexo={persona.sexo} medidas={r.medidas} />
        {r.ultima && r.medidas.length === 0 && <p className="muted small">Registra perímetros para verlos sobre la figura.</p>}
        {r.asimetrias.map((a) => (
          <p className="muted small" key={a.zona}>
            {a.zona === 'brazo' ? 'Brazo' : 'Muslo'} {a.mayor === 'izq' ? 'izquierdo' : 'derecho'} {formatear(a.diferencia)} cm mayor que el {a.mayor === 'izq' ? 'derecho' : 'izquierdo'}.
          </p>
        ))}
      </section>

      {r.ultima && (
        <nav className="card enlaces" aria-label="Más detalle">
          <button type="button" className="enlace" onClick={onVerCifras}>
            <span>Todas las cifras</span>
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" className="enlace" onClick={onVerMediciones}>
            <span>Todas las mediciones</span>
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      )}

      <button type="button" className="btn primary grande medir-fijo" onClick={onMedir}>+ Registrar medición</button>
    </div>
  )
}
