import { useLiveQuery } from 'dexie-react-hooks'
import { consumoVigente } from '../domain/consumo'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { informeSemanal, type InformeSemanal } from '../domain/semana'
import type { Medicion, Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'

const miles = (n: number) => n.toLocaleString('es-CL')
const ddmm = (f: string) => fechaLegible(f).slice(0, 5)
/** Cambio en kg con flecha; el lector de pantalla oye "bajó" o "subió" en vez de la flecha. */
function Cambio({ kg }: { kg: number }) {
  const [flecha, palabra] = kg < -0.05 ? ['▼', 'bajó'] : kg > 0.05 ? ['▲', 'subió'] : ['=', 'sin cambio:']
  return (
    <>
      <span aria-hidden="true">{flecha}</span>
      <span className="sr-only">{palabra}</span> {formatear(Math.abs(kg))} kg
    </>
  )
}
const NOTA = 'Estimaciones orientativas a partir de tus datos, no indicación médica.'

function Partes({ inf, persona, hoy }: { inf: InformeSemanal; persona: Persona; hoy: string }) {
  const consumo = consumoVigente(persona, hoy)
  const g = inf.gasto
  return (
    <>
      <div className="semana-cambio">
        <h4>Qué cambió</h4>
        {inf.cambioTendenciaKg != null && (
          <p className="num">
            Peso de tendencia: <b><Cambio kg={inf.cambioTendenciaKg} /></b> desde el {ddmm(inf.anterior!)}
          </p>
        )}
        {inf.composicion && (
          <div className="semana-cifras num">
            <span className="cifra grasa">
              Grasa <b><Cambio kg={inf.composicion.grasaKg} /></b>
            </span>
            <span className="cifra magra">
              Masa magra <b><Cambio kg={inf.composicion.magraKg} /></b>
            </span>
          </div>
        )}
        {inf.composicionTotal && (
          <p className="muted small num">
            Desde el {fechaLegible(inf.composicionTotal.desde)}: grasa <Cambio kg={inf.composicionTotal.grasaKg} />, masa magra <Cambio kg={inf.composicionTotal.magraKg} />.
          </p>
        )}
      </div>

      {inf.atipica && (
        <p className="notice warn small num">
          Esta pesada está {formatear(Math.abs(inf.atipica.diferenciaKg))} kg {inf.atipica.sentido} tu tendencia:{' '}
          {inf.atipica.sentido === 'sobre' ? 'suele ser agua o sal, no grasa.' : 'suele ser deshidratación o comida reciente, no grasa.'} Pésate siempre igual: en
          ayunas, tras ir al baño.
        </p>
      )}

      {inf.vieja && (
        <p className="notice info small">Tu última medición es del {ddmm(inf.fecha)}: mídete para recibir un plan nuevo.</p>
      )}

      {g && (
        <p className="small num semana-gasto">
          {g.estado === 'ok' ? (
            <>
              Gasto real estimado: <b>~{miles(g.gastoKcal)} kcal/día</b> (confianza {g.confianza})
              {consumo != null && ` · anotaste ${miles(consumo)} kcal/día`}. Para tu objetivo: <b>~{miles(g.recomendadaKcal)} kcal/día</b>
              {g.pisoAplicado && ' (el mínimo recomendado; no bajes de ahí)'}.
            </>
          ) : (
            <>
              Faltan semanas para estimar tu gasto:{' '}
              {[
                g.faltanPesadas > 0 && `${g.faltanPesadas} ${g.faltanPesadas === 1 ? 'pesada' : 'pesadas'} más`,
                g.faltanDias > 0 && `${g.faltanDias} ${g.faltanDias === 1 ? 'día' : 'días'} más de datos`,
                g.faltanDiasConsumo > 0 && `${g.faltanDiasConsumo} ${g.faltanDiasConsumo === 1 ? 'día' : 'días'} con consumo anotado`,
              ]
                .filter(Boolean)
                .join(', ')}
              .
            </>
          )}
        </p>
      )}

      {inf.acciones.length > 0 && (
        <div>
          <h4>Qué hacer</h4>
          <ol className="semana-acciones">
            {inf.acciones.map((a) => (
              <li key={a.codigo}>{a.texto}</li>
            ))}
          </ol>
        </div>
      )}

      {inf.revision.length > 0 && (
        <div>
          <h4>La semana pasada</h4>
          <ul className="semana-revision">
            {inf.revision.map((r) => (
              <li key={r.codigo} className={r.cumplida ? 'si' : 'no'}>
                <span aria-hidden="true">{r.cumplida ? '✓' : '✗'}</span> <span className="sr-only">{r.cumplida ? 'Cumplido:' : 'Pendiente:'}</span> {r.texto}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

/** Tarjeta "Tu semana" de la ficha. */
export function TarjetaSemana({ persona, mediciones, onVerInforme }: { persona: Persona; mediciones: Medicion[]; onVerInforme: () => void }) {
  const hoy = hoyIso()
  const inf = informeSemanal(persona, mediciones, hoy)
  if (!inf) return null
  return (
    <section className="card stack semana-card" aria-labelledby="semana-titulo">
      <h3 id="semana-titulo">Tu semana · {ddmm(inf.fecha)}</h3>
      {inf.anterior == null ? (
        <p className="muted small">Con tu segunda medición verás aquí tu semana: qué cambió, si la pesada es confiable y qué hacer.</p>
      ) : (
        <>
          <Partes inf={inf} persona={persona} hoy={hoy} />
          <button type="button" className="btn link" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={onVerInforme}>
            Ver informe completo →
          </button>
          <p className="muted small">{NOTA}</p>
        </>
      )}
    </section>
  )
}

/** Barras apiladas de grasa y masa magra por medición (las últimas 12). */
function Barras({ barras }: { barras: InformeSemanal['barras'] }) {
  const vistas = barras.slice(-12)
  const max = Math.max(...vistas.map((b) => b.grasaKg + b.magraKg))
  const ancho = 30
  const alto = 150
  const w = vistas.length * ancho
  const descripcion =
    'Grasa y masa magra por medición: ' + vistas.map((b) => `${ddmm(b.fecha)}, ${formatear(b.grasaKg)} kg de grasa y ${formatear(b.magraKg)} kg de masa magra`).join('; ')
  return (
    <figure className="barras">
      <svg viewBox={`0 0 ${w} ${alto + 18}`} role="img" aria-label={descripcion} preserveAspectRatio="xMidYMax meet">
        {vistas.map((b, i) => {
          const hMagra = (b.magraKg / max) * alto
          const hGrasa = (b.grasaKg / max) * alto
          const x = i * ancho + 6
          return (
            <g key={b.fecha}>
              <rect x={x} y={alto - hMagra} width={ancho - 12} height={hMagra} rx={3} className="b-magra" />
              <rect x={x} y={alto - hMagra - hGrasa} width={ancho - 12} height={Math.max(0, hGrasa - 2)} rx={3} className="b-grasa" />
              <text x={x + (ancho - 12) / 2} y={alto + 13} textAnchor="middle" className="b-fecha">
                {ddmm(b.fecha)}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="leyenda small">
        <span className="ley grasa">Grasa</span> <span className="ley magra">Masa magra</span>
      </figcaption>
    </figure>
  )
}

/** Pantalla "Tu semana" con el informe completo. */
export function PantallaSemana({ persona }: { persona: Persona }) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const hoy = hoyIso()
  const inf = informeSemanal(persona, mediciones, hoy)
  return (
    <div className="stack semana-pantalla">
      <h2>Tu semana · {persona.nombre}</h2>
      {!inf || inf.anterior == null ? (
        <p className="muted">Con tu segunda medición verás aquí tu semana.</p>
      ) : (
        <>
          <section className="card stack">
            <p className="muted small">
              {fechaLegible(inf.anterior)} → {fechaLegible(inf.fecha)}
            </p>
            <Partes inf={inf} persona={persona} hoy={hoy} />
          </section>
          {inf.barras.length > 0 && (
            <section className="card stack" aria-labelledby="barras-titulo">
              <h3 id="barras-titulo">Grasa y masa magra</h3>
              <Barras barras={inf.barras} />
            </section>
          )}
        </>
      )}
      <details className="guide card">
        <summary>Cómo se calcula</summary>
        <ul>
          <li>
            <b>Qué cambió:</b> la tendencia del peso suaviza las subidas y bajadas de un día. La masa magra es el peso menos la grasa (peso × % de grasa).
          </li>
          <li>
            <b>Pesada atípica:</b> si la pesada se aleja de tu tendencia anterior más de 1 kg (o 1,2 % del peso), probablemente es agua, sal o comida.
          </li>
          <li>
            <b>Gasto real:</b> tu consumo anotado menos el cambio de tu tendencia, contando ~7.700 kcal por kg (la energía aproximada de un kg de grasa).
            Usa las últimas 4 semanas (confianza media) o 6 semanas con datos suficientes (confianza alta).
          </li>
          <li>
            <b>Kcal recomendadas:</b> tu gasto más el ritmo de tu objetivo (bajar grasa −0,5 % del peso por semana; ganar músculo +0,25 %; mantener 0).
            Nunca menos de 1.200 kcal (mujeres) o 1.500 kcal (hombres).
          </li>
        </ul>
      </details>
      <p className="muted small">{NOTA}</p>
    </div>
  )
}
