import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { Clasificacion } from '../domain/estados'
import { resumenFicha, type ClaveTarjeta, type TarjetaFicha } from '../domain/ficha'
import { interpretar, NOTA_ORIENTACION } from '../domain/insights'
import { derivar } from '../domain/metrics'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { serieMetrica, valorMetrica, type Metrica, type Periodo } from '../domain/series'
import { tendenciaPeso, type ProyeccionMeta } from '../domain/trend'
import { CAMPOS_NUMERICOS, ETIQUETAS, type Objetivo, type Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { Consumo } from './Consumo'
import { Cuerpo } from './Cuerpo'
import { Grafico } from './Grafico'
import { inicial } from './SelectorPerfil'
import { TarjetaSemana } from './TuSemana'

interface Props {
  persona: Persona
  onMedir: () => void
  onVerMediciones: () => void
  onVerSemana: () => void
}

const OBJETIVO: Record<Objetivo, string> = { bajar_grasa: 'bajar grasa', ganar_musculo: 'ganar músculo', mantener: 'mantener' }
const TARJETA: Record<ClaveTarjeta, { nombre: string; unidad: string; decimales: 0 | 1; unidadCambio: string }> = {
  pesoKg: { nombre: 'Peso de tendencia', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  grasaPct: { nombre: '% de grasa', unidad: '%', decimales: 1, unidadCambio: ' puntos' },
  grasaVisceral: { nombre: 'Grasa visceral', unidad: 'nivel', decimales: 0, unidadCambio: '' },
  musculoKg: { nombre: 'Músculo esquelético', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  aguaPct: { nombre: 'Agua corporal', unidad: '%', decimales: 1, unidadCambio: ' puntos' },
  imc: { nombre: 'IMC', unidad: 'kg/m²', decimales: 1, unidadCambio: '' },
  grasaKg: { nombre: 'Grasa corporal', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  pesoSinGrasaKg: { nombre: 'Peso sin grasa', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  musculoTotalKg: { nombre: 'Masa muscular total', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  proteinaPct: { nombre: 'Proteína', unidad: '%', decimales: 1, unidadCambio: ' puntos' },
  masaOseaKg: { nombre: 'Masa ósea', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  metabolismoBasalKcal: { nombre: 'Metabolismo basal', unidad: 'kcal', decimales: 0, unidadCambio: ' kcal' },
  edadCorporal: { nombre: 'Edad corporal', unidad: 'años', decimales: 0, unidadCambio: '' },
  frecuenciaCardiacaLpm: { nombre: 'Frecuencia cardíaca', unidad: 'lpm', decimales: 0, unidadCambio: '' },
}
const ROTULO = { bien: 'Bien', atencion: 'Atención', neutro: 'Dato' } as const
const ZONA = { brazo: 'Brazo', muslo: 'Muslo' } as const

// Las cuatro métricas a la vista; el resto va en "Más".
const RAPIDAS: Metrica[] = ['pesoKg', 'grasaPct', 'musculoKg', 'cinturaCm']
const NOMBRE_RAPIDA: Partial<Record<Metrica, string>> = { pesoKg: 'Peso', grasaPct: 'Grasa', musculoKg: 'Músculo', cinturaCm: 'Cintura' }
const EXTRAS: Metrica[] = ['imc', 'grasaKg', 'pesoSinGrasaKg']
const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: '3m', nombre: '3 meses' },
  { id: '1a', nombre: '1 año' },
  { id: 'todo', nombre: 'Todo' },
]

const etiqueta = (m: Metrica) =>
  m === 'imc' ? { nombre: 'IMC', unidad: 'kg/m²' } : m === 'grasaKg' ? { nombre: 'Grasa corporal (kg)', unidad: 'kg' } : m === 'pesoSinGrasaKg' ? { nombre: 'Peso sin grasa', unidad: 'kg' } : ETIQUETAS[m]

// Los niveles y conteos enteros (visceral, kcal, años, lpm) se muestran sin decimal; el resto, con uno.
const decimalesDe = (clave: ClaveTarjeta, n: number) => (TARJETA[clave].decimales === 0 && Number.isInteger(n) ? 0 : 1)

function lineaCambio(t: TarjetaFicha): string | null {
  if (t.cambio == null || t.desde == null) return null
  return `${t.cambio < 0 ? '▼' : '▲'} ${formatear(Math.abs(t.cambio), decimalesDe(t.clave, t.cambio))}${TARJETA[t.clave].unidadCambio} desde el ${fechaLegible(t.desde)}`
}

function textoMeta(m: ProyeccionMeta): string {
  const ritmo = m.ritmoSemanalKg == null ? '' : `${m.ritmoSemanalKg < 0 ? '−' : '+'}${formatear(Math.abs(m.ritmoSemanalKg), 2)} kg por semana`
  switch (m.estado) {
    case 'alcanzada':
      return 'Meta alcanzada.'
    case 'sin_datos':
      return 'Faltan mediciones recientes (al menos dos en las últimas cuatro semanas) para estimar una fecha.'
    case 'en_contra':
      return m.ritmoSemanalKg === 0 ? 'Tu tendencia está estable: a este ritmo no llegarías a la meta.' : `Al ritmo actual (${ritmo}) te alejas de la meta.`
    case 'lejana':
      return `A este ritmo (${ritmo}) faltan más de dos años.`
    case 'estimada':
      return `Fecha estimada: ${fechaLegible(m.fecha!)}, al ritmo actual de ${ritmo}.`
  }
}

/** Barra de rango: un tramo por estado, todos del mismo ancho, con un punto donde cae el valor. */
function BarraRango({ c }: { c: Clasificacion }) {
  const descripcion = `Rango: ${c.tramos.map((t) => t.nombre).join(', ')}. Tu valor está en ${c.nombre}.`
  return (
    <div className="rango" role="img" aria-label={descripcion}>
      {c.tramos.map((t, i) => (
        <span key={i} className={`tramo st-${t.estado}`} />
      ))}
      <span className="punto" style={{ left: `${(c.posicion * 100).toFixed(1)}%` }} />
    </div>
  )
}

function Tarjeta({ t, ultimaFecha }: { t: TarjetaFicha; ultimaFecha: string }) {
  const def = TARJETA[t.clave]
  const cambio = lineaCambio(t)
  return (
    <article className="tile" data-clave={t.clave}>
      <h3 className="k">
        {def.nombre}
        {t.estimada && ' (estimada)'}
      </h3>
      <div className="tile-fila">
        <span className="v num">
          {formatear(t.valor, decimalesDe(t.clave, t.valor))} <small>{def.unidad}</small>
        </span>
        {t.clasificacion && <span className={`estado st-${t.clasificacion.estado}`}>{t.clasificacion.nombre}</span>}
      </div>
      {t.clasificacion && <BarraRango c={t.clasificacion} />}
      {(cambio || t.referencia) && <p className="d">{[cambio, t.referencia].filter(Boolean).join(' · ')}</p>}
      {/* Un valor que no es de la última medición dice de cuándo es, para no leerlo como actual. */}
      {t.fecha !== ultimaFecha && <p className="d fecha-vieja">del {fechaLegible(t.fecha)}</p>}
    </article>
  )
}

/** True mientras la pantalla mida a lo más `px` de ancho. */
function useAngosto(px: number): boolean {
  const consulta = `(max-width: ${px}px)`
  const [angosto, setAngosto] = useState(() => window.matchMedia?.(consulta).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(consulta)
    if (!mq) return
    const alCambiar = () => setAngosto(mq.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [consulta])
  return angosto
}

export function Ficha({ persona, onMedir, onVerMediciones, onVerSemana }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [elegida, setElegida] = useState<Metrica>('pesoKg')
  const [periodo, setPeriodo] = useState<Periodo>('3m')
  const angosto = useAngosto(640)
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const hoy = hoyIso()
  const r = resumenFicha(persona, mediciones, { hoy })
  const peso = r.tarjetas.find((t) => t.clave === 'pesoKg') ?? null
  const imc = r.tarjetas.find((t) => t.clave === 'imc') ?? null
  const otras = r.tarjetas.filter((t) => t.clave !== 'pesoKg')

  // Métricas con datos, para el gráfico.
  const disponibles = [...CAMPOS_NUMERICOS, ...EXTRAS].filter((k) => mediciones.some((m) => valorMetrica(persona, m, k) != null))
  const metrica = disponibles.includes(elegida) ? elegida : 'pesoKg'
  // Si el período elegido deja menos de dos puntos, se muestra todo.
  const enPeriodo = serieMetrica(persona, mediciones, metrica, periodo, hoy)
  const periodoVisto: Periodo = enPeriodo.length < 2 ? 'todo' : periodo
  const puntos = periodoVisto === periodo ? enPeriodo : serieMetrica(persona, mediciones, metrica, 'todo', hoy)
  const tendencia =
    metrica === 'pesoKg'
      ? tendenciaPeso(serieMetrica(persona, mediciones, 'pesoKg', 'todo', hoy))
          .filter((t) => puntos.some((p) => p.fecha === t.fecha))
          .map((t) => ({ fecha: t.fecha, valor: t.tendencia }))
      : undefined
  const hayEstimada = metrica === 'grasaPct' && mediciones.some((m) => derivar(persona, m).grasaEstimada)
  const mensajes = r.ultima ? interpretar(persona, mediciones) : []
  const masOpciones = disponibles.filter((k) => !RAPIDAS.includes(k))

  return (
    <div className="ficha-a">
      <div className="col-izq">
        <section className="card hero" aria-labelledby="ficha-nombre">
          <div className="who-head">
            <span className="avatar big" aria-hidden="true">{inicial(persona.nombre)}</span>
            <div style={{ minWidth: 0 }}>
              <h2 id="ficha-nombre">{persona.nombre}</h2>
              <p className="muted small">
                {persona.estaturaCm} cm · objetivo: {OBJETIVO[persona.objetivo]}
                {r.ultima && ` · última medición ${fechaLegible(r.ultima.fecha)}`}
              </p>
            </div>
          </div>
          {peso ? (
            <>
              <p className="hero-k">Peso de tendencia</p>
              <p className="hero-v num">
                {formatear(peso.valor)} <small>kg</small>
              </p>
              <p className="small num">
                {peso.cambio != null && peso.desde && (
                  <span className={`hero-cambio ${peso.tono}`}>
                    {peso.cambio < 0 ? '▼' : '▲'} {formatear(Math.abs(peso.cambio))} kg desde el {fechaLegible(peso.desde)}
                  </span>
                )}{' '}
                <span className="muted">Última pesada: {formatear(peso.ultimaPesada!)} kg</span>
              </p>
              <div className="chips">
                {imc && (
                  <span className={`chip ${imc.clasificacion ? `st-${imc.clasificacion.estado}` : ''}`}>
                    IMC {formatear(imc.valor)}
                    {imc.clasificacion && ` · ${imc.clasificacion.nombre}`}
                  </span>
                )}
                {r.meta && persona.metaPesoKg != null && (
                  <span className="chip">
                    Meta {formatear(persona.metaPesoKg)} kg
                    {r.meta.estado !== 'alcanzada' && ` · faltan ${formatear(Math.abs(r.meta.faltaKg))}`}
                  </span>
                )}
              </div>
              {r.meta && persona.metaPesoKg != null && (
                <div className="meta-texto">
                  <h3 className="sr-only">Meta</h3>
                  {r.meta.estado !== 'alcanzada' && (
                    <p className="small num">
                      {r.meta.faltaKg < 0 ? 'Faltan por bajar' : 'Faltan por subir'} {formatear(Math.abs(r.meta.faltaKg))} kg desde tu peso de tendencia.
                    </p>
                  )}
                  <p className="muted small num">{textoMeta(r.meta)}</p>
                </div>
              )}
            </>
          ) : (
            <div className="stack">
              <p>Todavía no hay mediciones de {persona.nombre}.</p>
              <p className="muted small">Con la primera verás aquí sus números; con la segunda, cómo van cambiando.</p>
            </div>
          )}
          {/* El consumo de kcal sirve para estimar el gasto real. */}
          <Consumo persona={persona} />
          <button type="button" className="btn primary grande" onClick={onMedir}>+ Registrar medición</button>
        </section>

        <section className="card stack figura" aria-label="Perímetros">
          <div className="head">
            <h3>Perímetros</h3>
            {r.fechaPerimetros && <span className="muted small">del {fechaLegible(r.fechaPerimetros)}</span>}
          </div>
          <Cuerpo sexo={persona.sexo} medidas={r.medidas} />
          {r.ultima && r.medidas.length === 0 && <p className="muted small">Registra perímetros para verlos sobre la figura.</p>}
          {r.ultima && r.fechaPerimetros && r.fechaPerimetros !== r.ultima.fecha && (
            <p className="muted small">Perímetros del {fechaLegible(r.fechaPerimetros)}, la última vez que se midieron.</p>
          )}
          {r.asimetrias.map((a) => (
            <p className="muted small" key={a.zona}>
              {ZONA[a.zona]} {a.mayor === 'izq' ? 'izquierdo' : 'derecho'} {formatear(a.diferencia)} cm mayor que el {a.mayor === 'izq' ? 'derecho' : 'izquierdo'}.
            </p>
          ))}
          {r.ultima && (
            <button type="button" className="btn link" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={onVerMediciones}>
              Ver todas las mediciones →
            </button>
          )}
        </section>
      </div>

      <div className="col-der">
        {r.ultima && <TarjetaSemana persona={persona} mediciones={mediciones} onVerInforme={onVerSemana} />}
        {r.ultima && (
          <section className="card stack" aria-label="Gráfico">
            <div className="grafico-controles">
              <div className="chips" role="group" aria-label="Medida del gráfico">
                {RAPIDAS.filter((k) => disponibles.includes(k)).map((k) => (
                  <button key={k} type="button" className="chip-btn" aria-pressed={metrica === k} onClick={() => setElegida(k)}>
                    {NOMBRE_RAPIDA[k]}
                  </button>
                ))}
                {masOpciones.length > 0 && (
                  <select
                    aria-label="Más medidas"
                    className={`chip-select ${masOpciones.includes(metrica) ? 'activo' : ''}`}
                    value={masOpciones.includes(metrica) ? metrica : ''}
                    onChange={(e) => e.target.value && setElegida(e.target.value as Metrica)}
                  >
                    <option value="">Más…</option>
                    {masOpciones.map((k) => (
                      <option key={k} value={k}>{etiqueta(k).nombre}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="chips" role="group" aria-label="Período">
                {PERIODOS.map((p) => (
                  <button key={p.id} type="button" className="chip-btn chico" aria-pressed={periodoVisto === p.id} onClick={() => setPeriodo(p.id)}>
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>
            <h3 className="sr-only">{etiqueta(metrica).nombre}</h3>
            <Grafico puntos={puntos} unidad={etiqueta(metrica).unidad} tendencia={tendencia} lienzoChico={angosto} />
            {metrica === 'pesoKg' && puntos.length > 1 && (
              <p className="muted small">La tendencia es un promedio que da más importancia a las pesadas recientes y suaviza las subidas y bajadas de un día.</p>
            )}
            {hayEstimada && (
              <p className="muted small">Incluye valores estimados a partir de los perímetros (fórmula de la Marina de EE. UU.), no medidos por una báscula.</p>
            )}
          </section>
        )}

        {otras.length > 0 && (
          <section aria-label="Medidas">
            <div className="tiles">
              {otras.map((t) => (
                <Tarjeta key={t.clave} t={t} ultimaFecha={r.ultima!.fecha} />
              ))}
            </div>
            <details className="guide">
              <summary>Cómo leer estas cifras</summary>
              <p className="muted small">
                Los estados son orientación general: IMC según la OMS; % de grasa por sexo y edad según Gallagher y otros (2000); grasa visceral, agua y
                proteína según la escala habitual de las básculas domésticas. Músculo, hueso y metabolismo no tienen un rango que sirva para todos, así que
                solo se muestra su cambio. A menores de 18 años no se les asigna estado.
              </p>
            </details>
          </section>
        )}

        {mensajes.length > 0 && (
          <section className="stack" aria-labelledby="ficha-cambios">
            <h3 id="ficha-cambios">Qué indican tus cambios</h3>
            {mensajes.map((msg) => (
              <article className={`card insight ${msg.tono}`} key={msg.codigo}>
                <span className={`pill tag ${msg.tono}`}>{ROTULO[msg.tono]}</span>
                <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{msg.titulo}</h4>
                <p>{msg.texto}</p>
              </article>
            ))}
            <p className="muted small">{NOTA_ORIENTACION}</p>
          </section>
        )}
      </div>
    </div>
  )
}
