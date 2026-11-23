import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { cuadritos, mensajesDe } from '../domain/cifras'
import { resumenFicha, type ClaveTarjeta } from '../domain/ficha'
import { interpretar, NOTA_ORIENTACION } from '../domain/insights'
import { derivar } from '../domain/metrics'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { serieMetrica, valorMetrica, type Metrica, type Periodo } from '../domain/series'
import { tendenciaPeso } from '../domain/trend'
import { CAMPOS_NUMERICOS, type Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { etiqueta, GUIA_ESTADOS, Mensajes, Tarjeta, TARJETA, textoMeta, useAngosto } from './Cifra'
import { Consumo } from './Consumo'
import { Muesca } from './Icono'
import { Grafico } from './Grafico'

const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: '3m', nombre: '3 meses' },
  { id: '1a', nombre: '1 año' },
  { id: 'todo', nombre: 'Todo' },
]
const RAPIDAS: Metrica[] = ['pesoKg', 'grasaPct', 'musculoKg', 'cinturaCm']
const NOMBRE_RAPIDA: Partial<Record<Metrica, string>> = { pesoKg: 'Peso', grasaPct: 'Grasa', musculoKg: 'Músculo', cinturaCm: 'Cintura' }
const EXTRAS: Metrica[] = ['imc', 'grasaKg', 'pesoSinGrasaKg']
const esTarjeta = (m: Metrica): m is ClaveTarjeta => m in TARJETA

/** Pantalla de una medida: su valor, estado, gráfico y lo que indica. */
export function PantallaMedida({ persona, medida, onCambiar }: { persona: Persona; medida: Metrica; onCambiar: (m: Metrica) => void }) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [periodo, setPeriodo] = useState<Periodo>('3m')
  const angosto = useAngosto(640)
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const hoy = hoyIso()
  const r = resumenFicha(persona, mediciones, { hoy })
  const { nombre, unidad } = etiqueta(medida)
  const disponibles = [...CAMPOS_NUMERICOS, ...EXTRAS].filter((k) => mediciones.some((m) => valorMetrica(persona, m, k) != null))
  const masOpciones = disponibles.filter((k) => !RAPIDAS.includes(k))

  const enPeriodo = serieMetrica(persona, mediciones, medida, periodo, hoy)
  const periodoVisto: Periodo = enPeriodo.length < 2 ? 'todo' : periodo
  const puntos = periodoVisto === periodo ? enPeriodo : serieMetrica(persona, mediciones, medida, 'todo', hoy)
  const tendencia =
    medida === 'pesoKg'
      ? tendenciaPeso(serieMetrica(persona, mediciones, 'pesoKg', 'todo', hoy))
          .filter((t) => puntos.some((p) => p.fecha === t.fecha))
          .map((t) => ({ fecha: t.fecha, valor: t.tendencia }))
      : undefined
  const hayEstimada = (medida === 'grasaPct' || medida === 'grasaKg' || medida === 'pesoSinGrasaKg') && mediciones.some((m) => derivar(persona, m).grasaEstimada)
  const tarjeta = esTarjeta(medida) ? r.tarjetas.find((t) => t.clave === medida) : undefined
  const cuadrito = medida === 'cinturaCm' ? cuadritos(persona, mediciones, hoy).find((c) => c.medida === 'cinturaCm') : undefined
  const mensajes = mensajesDe(medida, r.ultima ? interpretar(persona, mediciones) : [])
  const imc = r.tarjetas.find((t) => t.clave === 'imc')

  return (
    <div className="stack medida-pantalla">
      <h2>
        {nombre} · {persona.nombre}
      </h2>

      {tarjeta && <Tarjeta t={tarjeta} ultimaFecha={r.ultima!.fecha} />}
      {!tarjeta && puntos.length > 0 && (
        <article className="tile">
          <h3 className="k">{nombre}</h3>
          <span className="v num">
            {formatear(puntos[puntos.length - 1].valor)} <small>{unidad}</small>
          </span>
          {cuadrito?.cambio != null && (
            <p className={`d ${cuadrito.tono}`}>
              <Muesca cambio={cuadrito.cambio} /> {formatear(Math.abs(cuadrito.cambio))} {unidad} desde la medición anterior
            </p>
          )}
          <p className="d">del {fechaLegible(puntos[puntos.length - 1].fecha)}</p>
        </article>
      )}

      {medida === 'pesoKg' && tarjeta && (
        <section className="card stack">
          <p className="small num">Última pesada: {formatear(tarjeta.ultimaPesada!)} kg</p>
          <div className="chips">
            {imc && (
              <button type="button" className={`chip chip-link ${imc.clasificacion ? `st-${imc.clasificacion.estado}` : ''}`} onClick={() => onCambiar('imc')}>
                IMC {formatear(imc.valor)}
                {imc.clasificacion && ` · ${imc.clasificacion.nombre}`}
              </button>
            )}
          </div>
          {r.meta && persona.metaPesoKg != null && (
            <div className="meta-texto">
              <h3 className="small">Meta: {formatear(persona.metaPesoKg)} kg</h3>
              {r.meta.estado !== 'alcanzada' && (
                <p className="small num">
                  {r.meta.faltaKg < 0 ? 'Faltan por bajar' : 'Faltan por subir'} {formatear(Math.abs(r.meta.faltaKg))} kg desde tu peso de tendencia.
                </p>
              )}
              <p className="muted small num">{textoMeta(r.meta)}</p>
            </div>
          )}
          <Consumo persona={persona} />
        </section>
      )}

      {puntos.length > 0 && (
        <section className="card stack" aria-label="Gráfico">
          <div className="grafico-controles">
            <div className="chips" role="group" aria-label="Medida del gráfico">
              {RAPIDAS.filter((k) => disponibles.includes(k)).map((k) => (
                <button key={k} type="button" className="chip-btn" aria-pressed={medida === k} onClick={() => onCambiar(k)}>
                  {NOMBRE_RAPIDA[k]}
                </button>
              ))}
              {masOpciones.length > 0 && (
                <select
                  aria-label="Más medidas"
                  className={`chip-select ${masOpciones.includes(medida) ? 'activo' : ''}`}
                  value={masOpciones.includes(medida) ? medida : ''}
                  onChange={(e) => e.target.value && onCambiar(e.target.value as Metrica)}
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
          <Grafico puntos={puntos} unidad={unidad} tendencia={tendencia} lienzoChico={angosto} />
          {medida === 'pesoKg' && puntos.length > 1 && (
            <p className="muted small">La tendencia es un promedio que da más importancia a las pesadas recientes y suaviza las subidas y bajadas de un día.</p>
          )}
          {hayEstimada && <p className="muted small">Incluye valores estimados a partir de los perímetros (fórmula de la Marina de EE. UU.), no medidos por una báscula.</p>}
        </section>
      )}
      {puntos.length === 0 && <p className="muted">Todavía no hay datos de {nombre.toLowerCase()}.</p>}

      <Mensajes mensajes={mensajes} titulo="Qué indica" />
      {mensajes.length > 0 && <p className="muted small">{NOTA_ORIENTACION}</p>}
      {tarjeta?.clasificacion && (
        <details className="guide">
          <summary>Cómo leer estas cifras</summary>
          <p className="muted small">{GUIA_ESTADOS}</p>
        </details>
      )}
    </div>
  )
}

/** Todas las cifras de la última medición; cada una abre su gráfico. */
export function TodasLasCifras({ persona, onVerMedida }: { persona: Persona; onVerMedida: (m: Metrica) => void }) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const r = resumenFicha(persona, mediciones, { hoy: hoyIso() })
  const mensajes = r.ultima ? interpretar(persona, mediciones) : []
  return (
    <div className="stack">
      <h2>Todas las cifras · {persona.nombre}</h2>
      {r.ultima ? (
        <>
          <section aria-label="Medidas">
            <div className="tiles">
              {r.tarjetas.map((t) => (
                <Tarjeta key={t.clave} t={t} ultimaFecha={r.ultima!.fecha} onAbrir={() => onVerMedida(t.clave)} />
              ))}
            </div>
          </section>
          <details className="guide">
            <summary>Cómo leer estas cifras</summary>
            <p className="muted small">{GUIA_ESTADOS}</p>
          </details>
          <Mensajes mensajes={mensajes} />
          {mensajes.length > 0 && <p className="muted small">{NOTA_ORIENTACION}</p>}
        </>
      ) : (
        <p className="muted">Todavía no hay mediciones.</p>
      )}
    </div>
  )
}
