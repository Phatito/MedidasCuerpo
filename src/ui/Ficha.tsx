import { useLiveQuery } from 'dexie-react-hooks'
import { leerCinta } from '../domain/cinta'
import { cuadritos, type Cuadrito } from '../domain/cifras'
import { resumenFicha } from '../domain/ficha'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { informeSemanal } from '../domain/semana'
import type { Metrica } from '../domain/series'
import { tendenciaPeso } from '../domain/trend'
import type { Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { OBJETIVO, Tarjeta } from './Cifra'
import { CabezaCinta, FilasCinta, medidasConBase, useBaseCinta } from './Cinta'
import { Cuerpo } from './Cuerpo'
import { Icono, Muesca } from './Icono'

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
  grasaVisceral: 'Visceral',
  imc: 'IMC',
  aguaPct: 'Agua',
  grasaKg: 'Grasa',
  pesoSinGrasaKg: 'Peso sin grasa',
}
const UNIDAD: Partial<Record<Metrica, string>> = { grasaPct: '%', musculoKg: 'kg', cinturaCm: 'cm', grasaVisceral: 'nivel', imc: '', aguaPct: '%', grasaKg: 'kg', pesoSinGrasaKg: 'kg' }

/** Tarjeta de un perímetro (la cintura) con el mismo formato que las de la báscula. */
function TarjetaPerimetro({ c, ultimaFecha, onAbrir }: { c: Cuadrito; ultimaFecha: string; onAbrir: () => void }) {
  return (
    <article className="tile tocable" data-clave={c.medida}>
      <h3 className="k">
        <button type="button" className="tile-abrir" onClick={onAbrir}>
          {NOMBRE[c.medida] ?? c.medida}
        </button>
      </h3>
      <div className="tile-fila">
        <span className="v num">
          {formatear(c.valor)} <small>{UNIDAD[c.medida]}</small>
        </span>
      </div>
      {c.cambio != null && c.desde && (
        <p className={`d ${c.tono}`}>
          <Muesca cambio={c.cambio} /> {formatear(Math.abs(c.cambio))} {UNIDAD[c.medida]} desde el {fechaLegible(c.desde)}
        </p>
      )}
      {c.fecha !== ultimaFecha && <p className="d fecha-vieja">del {fechaLegible(c.fecha)}</p>}
    </article>
  )
}

/** Ficha: lo importante a la vista; el detalle, a un toque. */
export function Ficha({ persona, onMedir, onVerMediciones, onVerSemana, onVerMedida, onVerCifras }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [base, setBase] = useBaseCinta()
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
  const cinta = leerCinta(persona, mediciones, base)
  const medidas = medidasConBase(r.medidas, cinta, mediciones)

  return (
    <div className="ficha-c">
      <section className="card hero" aria-labelledby="ficha-nombre">
        <div className="pieza-rotulo">
          <h1 id="ficha-nombre">{persona.nombre}</h1>
          <p className="muted small">
            Objetivo: {OBJETIVO[persona.objetivo]}
            {r.ultima && ` · ${fechaLegible(r.ultima.fecha).slice(0, 5)}`}
          </p>
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
                  <Muesca cambio={cambioSemana} /> {formatear(Math.abs(cambioSemana))} kg desde el {fechaLegible(previaFecha!).slice(0, 5)}
                </span>
              )}
              {peso.cambio != null && peso.desde && (
                <span className="muted">
                  {' '}
                  · <Muesca cambio={peso.cambio} /> {formatear(Math.abs(peso.cambio))} kg desde el inicio
                </span>
              )}
            </span>
            <Icono nombre="abrir" className="ver-mas" />
          </button>
        ) : (
          <div className="stack">
            <p>Todavía no hay mediciones de {persona.nombre}.</p>
            <p className="muted small">Con la primera verás aquí sus números; con la segunda, cómo van cambiando.</p>
          </div>
        )}
      </section>

      {cs.length > 0 && (
        <section aria-label="Cifras principales" className="tiles cifras-ficha">
          {cs.map((c) => {
            const t = r.tarjetas.find((x) => x.clave === c.medida)
            return t ? (
              <Tarjeta key={c.medida} t={t} ultimaFecha={r.ultima!.fecha} onAbrir={() => onVerMedida(c.medida)} />
            ) : (
              <TarjetaPerimetro key={c.medida} c={c} ultimaFecha={r.ultima!.fecha} onAbrir={() => onVerMedida(c.medida)} />
            )
          })}
        </section>
      )}

      <section className="card stack figura" {...(cinta ? { 'aria-labelledby': 'cinta-titulo' } : { 'aria-label': 'Perímetros' })}>
        {cinta && <CabezaCinta lectura={cinta} base={base} onBase={setBase} />}
        <Cuerpo sexo={persona.sexo} medidas={medidas} />
        {r.fechaPerimetros && <p className="pieza-pie muted small">Perímetros del {fechaLegible(r.fechaPerimetros)}</p>}
        {r.ultima && r.medidas.length === 0 && <p className="muted small">Registra perímetros para verlos sobre la figura.</p>}
        {r.asimetrias.map((a) => (
          <p className="muted small" key={a.zona}>
            {a.zona === 'brazo' ? 'Brazo' : 'Muslo'} {a.mayor === 'izq' ? 'izquierdo' : 'derecho'} {formatear(a.diferencia)} cm mayor que el {a.mayor === 'izq' ? 'derecho' : 'izquierdo'}.
          </p>
        ))}
        {cinta && <FilasCinta lectura={cinta} onVerMedida={onVerMedida} />}
      </section>

      {lineaSemana && (
        <button type="button" className="linea-semana" onClick={onVerSemana}>
          <Icono nombre="semana" />
          <span className="linea-semana-t">
            <b>Tu semana.</b> {lineaSemana}
          </span>
          <Icono nombre="abrir" />
        </button>
      )}



      {r.ultima && (
        <nav className="card enlaces" aria-label="Más detalle">
          <button type="button" className="enlace" onClick={onVerCifras}>
            <span>Todas las cifras</span>
            <Icono nombre="abrir" />
          </button>
          <button type="button" className="enlace" onClick={onVerMediciones}>
            <span>Todas las mediciones</span>
            <Icono nombre="abrir" />
          </button>
        </nav>
      )}

      <button type="button" className="btn primary grande medir-fijo" onClick={onMedir}>
        <Icono nombre="mas" /> Registrar medición
      </button>
    </div>
  )
}
