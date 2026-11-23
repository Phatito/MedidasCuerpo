import { useEffect, useState } from 'react'
import type { Clasificacion } from '../domain/estados'
import type { ClaveTarjeta, TarjetaFicha } from '../domain/ficha'
import type { Mensaje } from '../domain/insights'
import { fechaLegible, formatear } from '../domain/numbers'
import type { Metrica } from '../domain/series'
import type { ProyeccionMeta } from '../domain/trend'
import { ETIQUETAS, type Objetivo } from '../domain/types'
import { Muesca } from './Icono'

export const OBJETIVO: Record<Objetivo, string> = { bajar_grasa: 'bajar grasa', ganar_musculo: 'ganar músculo', mantener: 'mantener' }
export const TARJETA: Record<ClaveTarjeta, { nombre: string; unidad: string; decimales: 0 | 1; unidadCambio: string }> = {
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

/** Nombre y unidad de cualquier medida, para títulos y gráficos. */
export const etiqueta = (m: Metrica): { nombre: string; unidad: string } =>
  m === 'imc' ? { nombre: 'IMC', unidad: 'kg/m²' } : m === 'grasaKg' ? { nombre: 'Grasa corporal (kg)', unidad: 'kg' } : m === 'pesoSinGrasaKg' ? { nombre: 'Peso sin grasa', unidad: 'kg' } : ETIQUETAS[m]

// Los niveles y conteos enteros (visceral, kcal, años, lpm) se muestran sin decimal; el resto, con uno.
export const decimalesDe = (clave: ClaveTarjeta, n: number) => (TARJETA[clave].decimales === 0 && Number.isInteger(n) ? 0 : 1)

export function LineaCambio({ t }: { t: TarjetaFicha }) {
  if (t.cambio == null || t.desde == null) return null
  return (
    <>
      <Muesca cambio={t.cambio} /> {formatear(Math.abs(t.cambio), decimalesDe(t.clave, t.cambio))}
      {TARJETA[t.clave].unidadCambio} desde el {fechaLegible(t.desde)}
    </>
  )
}

export function textoMeta(m: ProyeccionMeta): string {
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
export function BarraRango({ c }: { c: Clasificacion }) {
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

/** Tarjeta de una cifra. Con `onAbrir`, toda la tarjeta se toca para ver su gráfico. */
export function Tarjeta({ t, ultimaFecha, onAbrir }: { t: TarjetaFicha; ultimaFecha: string; onAbrir?: () => void }) {
  const def = TARJETA[t.clave]
  const hayCambio = t.cambio != null && t.desde != null
  return (
    <article className={`tile ${onAbrir ? 'tocable' : ''}`} data-clave={t.clave}>
      <h3 className="k">
        {onAbrir ? (
          <button type="button" className="tile-abrir" onClick={onAbrir}>
            {def.nombre}
            {t.estimada && ' (estimada)'}
          </button>
        ) : (
          <>
            {def.nombre}
            {t.estimada && ' (estimada)'}
          </>
        )}
      </h3>
      <div className="tile-fila">
        <span className="v num">
          {formatear(t.valor, decimalesDe(t.clave, t.valor))} <small>{def.unidad}</small>
        </span>
        {t.clasificacion && <span className={`estado st-${t.clasificacion.estado}`}>{t.clasificacion.nombre}</span>}
      </div>
      {t.clasificacion && <BarraRango c={t.clasificacion} />}
      {(hayCambio || t.referencia) && (
        <p className="d">
          <LineaCambio t={t} />
          {hayCambio && t.referencia && ' · '}
          {t.referencia}
        </p>
      )}
      {/* Un valor que no es de la última medición dice de cuándo es, para no leerlo como actual. */}
      {t.fecha !== ultimaFecha && <p className="d fecha-vieja">del {fechaLegible(t.fecha)}</p>}
    </article>
  )
}

/** Mensajes de "Qué indican tus cambios". */
export function Mensajes({ mensajes, titulo = 'Qué indican tus cambios' }: { mensajes: Mensaje[]; titulo?: string }) {
  if (!mensajes.length) return null
  return (
    <section className="stack" aria-label={titulo}>
      <h3>{titulo}</h3>
      {mensajes.map((msg) => (
        <article className={`card insight ${msg.tono}`} key={msg.codigo}>
          <span className="sr-only">{ROTULO[msg.tono]}:</span>
          <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{msg.titulo}</h4>
          <p>{msg.texto}</p>
        </article>
      ))}
    </section>
  )
}

export const GUIA_ESTADOS =
  'Los estados son orientación general: IMC según la OMS; % de grasa por sexo y edad según Gallagher y otros (2000); grasa visceral, agua y proteína según la escala habitual de las básculas domésticas. Músculo, hueso y metabolismo no tienen un rango que sirva para todos, así que solo se muestra su cambio.'

/** True mientras la pantalla mida a lo más `px` de ancho. */
export function useAngosto(px: number): boolean {
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
