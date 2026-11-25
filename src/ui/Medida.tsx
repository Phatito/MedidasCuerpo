import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { cuadritos, mensajesDe } from '../domain/cifras'
import { PERIMETROS, resumenFicha, type CampoPerimetro, type ClaveTarjeta } from '../domain/ficha'
import { interpretar, NOTA_ORIENTACION } from '../domain/insights'
import { derivar } from '../domain/metrics'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { serieMetrica, valorMetrica, type Metrica, type Periodo } from '../domain/series'
import { tendenciaPeso } from '../domain/trend'
import { CAMPOS_NUMERICOS, CAMPOS_PERIMETROS, type Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { etiqueta, GUIA_ESTADOS, Mensajes, Tarjeta, TARJETA, textoMeta } from './Cifra'
import { Consumo } from './Consumo'
import { Muesca } from './Icono'
import { Composicion } from './Composicion'
import { ExplorarCuerpo } from './ExplorarCuerpo'
import { GraficoVivo, MiniCurva } from './GraficoVivo'
import { informeSemanal } from '../domain/semana'

const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: '1m', nombre: '1M' },
  { id: '3m', nombre: '3M' },
  { id: '1a', nombre: '1A' },
  { id: 'todo', nombre: 'Todo' },
]
const ORDEN_SEGMENTOS: Metrica[] = ['pesoKg', 'grasaPct', 'musculoKg', 'aguaPct', 'grasaVisceral', 'grasaKg', 'pesoSinGrasaKg', 'imc']
// Para el color del cambio: si bajar es bueno o malo.
const TONO: Partial<Record<Metrica, 'bajar' | 'subir' | 'neutro'>> = {
  grasaPct: 'bajar', grasaKg: 'bajar', grasaVisceral: 'bajar', musculoKg: 'subir', musculoTotalKg: 'subir', pesoSinGrasaKg: 'subir', aguaPct: 'subir', proteinaPct: 'subir',
}

const EXTRAS: Metrica[] = ['imc', 'grasaKg', 'pesoSinGrasaKg']
const esTarjeta = (m: Metrica): m is ClaveTarjeta => m in TARJETA

/** Pantalla de una medida: su valor, estado, gráfico y lo que indica. */
export function PantallaMedida({ persona, medida, onCambiar }: { persona: Persona; medida: Metrica; onCambiar: (m: Metrica) => void }) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  const [periodo, setPeriodo] = useState<Periodo>('3m')
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const hoy = hoyIso()
  const r = resumenFicha(persona, mediciones, { hoy })
  const { nombre, unidad } = etiqueta(medida)
  const disponibles = [...CAMPOS_NUMERICOS, ...EXTRAS].filter((k) => mediciones.some((m) => valorMetrica(persona, m, k) != null))
  // Las medidas de la báscula (y las que salen de ella) como tarjetas tocables; los perímetros van en el cuerpo.
  const segmentos = [...ORDEN_SEGMENTOS, ...disponibles.filter((k) => !ORDEN_SEGMENTOS.includes(k))].filter(
    (k) => disponibles.includes(k) && !(CAMPOS_PERIMETROS as Metrica[]).includes(k),
  )
  const composicion = informeSemanal(persona, mediciones, hoy)?.barras ?? []

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

  // Los perímetros se exploran sobre el cuerpo.
  if ((PERIMETROS as Metrica[]).includes(medida)) {
    return (
      <div className="stack medida-pantalla">
        <h1>
          Medidas con cinta · {persona.nombre}
        </h1>
        <ExplorarCuerpo persona={persona} mediciones={mediciones} medida={medida as CampoPerimetro} onCambiar={onCambiar} />
        <Mensajes mensajes={mensajes} titulo="Qué indica" />
        {mensajes.length > 0 && <p className="muted small">{NOTA_ORIENTACION}</p>}
      </div>
    )
  }
  const imc = r.tarjetas.find((t) => t.clave === 'imc')

  return (
    <div className="stack medida-pantalla">
      <h1>
        {nombre} · {persona.nombre}
      </h1>

      {/* En pantallas anchas: el gráfico a la izquierda; la cifra, las tarjetas y lo demás a la derecha. */}
      <div className="peso-layout">
        <div className="pl-col pl-izq">
          <div className="pl-grafico">
        {puntos.length > 0 && (
          <section className="card stack panel-grafico" aria-label="Gráfico">
            <div className="pastillas" role="group" aria-label="Período">
              {PERIODOS.map((p) => (
                <button key={p.id} type="button" className="pastilla" aria-pressed={periodoVisto === p.id} onClick={() => setPeriodo(p.id)}>
                  {p.nombre}
                </button>
              ))}
            </div>
            <GraficoVivo
              puntos={puntos}
              unidad={unidad}
              etiqueta={nombre}
              tendencia={tendencia}
              meta={medida === 'pesoKg' ? persona.metaPesoKg ?? null : null}
              tono={TONO[medida] ?? (medida === 'pesoKg' ? (persona.objetivo === 'ganar_musculo' ? 'subir' : persona.objetivo === 'bajar_grasa' ? 'bajar' : 'neutro') : 'neutro')}
              decimales={medida === 'grasaVisceral' || medida === 'metabolismoBasalKcal' || medida === 'edadCorporal' || medida === 'frecuenciaCardiacaLpm' ? 0 : 1}
            />
            {medida === 'pesoKg' && puntos.length > 1 && (
              <p className="muted small">
                <i className="leyenda-linea" /> La tendencia es un promedio que da más importancia a las pesadas recientes y suaviza las subidas y bajadas de un día. <i className="leyenda-punto" /> Cada pesada.
              </p>
            )}
            {hayEstimada && <p className="muted small">Incluye valores estimados a partir de los perímetros (fórmula de la Marina de EE. UU.), no medidos por una báscula.</p>}
          </section>
        )}

          </div>
          <div className="pl-comp">
        {composicion.length > 1 && (medida === 'pesoKg' || medida === 'grasaPct' || medida === 'grasaKg' || medida === 'pesoSinGrasaKg') && (
          <section className="card stack" aria-labelledby="composicion-t">
            <h3 id="composicion-t">Grasa y masa magra por pesada</h3>
            <Composicion barras={composicion.slice(-10)} />
          </section>
        )}
          </div>
        </div>
        <div className="pl-col pl-der">
          <div className="pl-cifra stack">
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

          </div>
          <div className="pl-segmentos">
        <section aria-label="Medidas de la báscula" className="segmentos">
          {segmentos.map((k) => {
            const serie = serieMetrica(persona, mediciones, k, 'todo', hoy)
            const u = serie[serie.length - 1]
            return (
              <button key={k} type="button" className="segmento" aria-pressed={medida === k} onClick={() => onCambiar(k)}>
                <span className="segmento-n">{etiqueta(k).nombre}</span>
                <span className="segmento-v num">
                  {formatear(u.valor, k === 'grasaVisceral' || k === 'metabolismoBasalKcal' || k === 'edadCorporal' || k === 'frecuenciaCardiacaLpm' ? 0 : 1)} <small>{etiqueta(k).unidad}</small>
                </span>
                <MiniCurva puntos={serie.slice(-12)} />
              </button>
            )
          })}
        </section>

          </div>
          <div className="pl-extra stack">
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

          </div>
        </div>
      </div>
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
      <h1>Todas las cifras · {persona.nombre}</h1>
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
