import { useLiveQuery } from 'dexie-react-hooks'
import { resumenFicha, type ClaveTarjeta, type TarjetaFicha } from '../domain/ficha'
import { fechaLegible, formatear } from '../domain/numbers'
import type { ProyeccionMeta } from '../domain/trend'
import type { Objetivo, Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { Cuerpo } from './Cuerpo'
import { Grafico } from './Grafico'
import { inicial } from './PersonasBar'

interface Props {
  persona: Persona
  onMedir: () => void
  onVerEvolucion: () => void
}

const OBJETIVO: Record<Objetivo, string> = { bajar_grasa: 'bajar grasa', ganar_musculo: 'ganar músculo', mantener: 'mantener' }
const TARJETA: Record<ClaveTarjeta, { nombre: string; unidad: string; decimales: number; unidadCambio: string }> = {
  pesoKg: { nombre: 'Peso de tendencia', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  grasaPct: { nombre: 'Grasa corporal', unidad: '%', decimales: 1, unidadCambio: ' puntos' },
  musculoKg: { nombre: 'Masa muscular', unidad: 'kg', decimales: 1, unidadCambio: ' kg' },
  grasaVisceral: { nombre: 'Grasa visceral', unidad: 'nivel', decimales: 0, unidadCambio: '' },
}
const ROTULO = { bien: 'Bien', atencion: 'Atención', neutro: 'Dato' } as const

const decimalesDe = (clave: ClaveTarjeta, n: number) => (TARJETA[clave].decimales === 0 && Number.isInteger(n) ? 0 : 1)

function detalle(t: TarjetaFicha): string | null {
  // Los niveles enteros (grasa visceral) se muestran sin decimal; el resto, con uno.
  const cambio =
    t.cambio == null || t.desde == null
      ? null
      : `${t.cambio < 0 ? '▼' : '▲'} ${formatear(Math.abs(t.cambio), decimalesDe(t.clave, t.cambio))}${TARJETA[t.clave].unidadCambio} desde el ${fechaLegible(t.desde)}`
  return [t.nota, cambio].filter(Boolean).join(' · ') || null
}

const ZONA = { brazo: 'Brazo', muslo: 'Muslo' } as const

function textoMeta(m: ProyeccionMeta): string {
  const ritmo = m.ritmoSemanalKg == null ? '' : `${m.ritmoSemanalKg < 0 ? '−' : '+'}${formatear(Math.abs(m.ritmoSemanalKg), 2)} kg por semana`
  switch (m.estado) {
    case 'alcanzada':
      return 'Meta alcanzada.'
    case 'sin_datos':
      return 'Faltan mediciones para estimar una fecha.'
    case 'en_contra':
      return m.ritmoSemanalKg === 0 ? 'Tu tendencia está estable: a este ritmo no llegarías a la meta.' : `Al ritmo actual (${ritmo}) te alejas de la meta.`
    case 'lejana':
      return `A este ritmo (${ritmo}) faltan más de dos años.`
    case 'estimada':
      return `Fecha estimada: ${fechaLegible(m.fecha!)}, al ritmo actual de ${ritmo}.`
  }
}

export function Ficha({ persona, onMedir, onVerEvolucion }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  if (mediciones == null) return <p className="muted">Cargando…</p>
  const r = resumenFicha(persona, mediciones)

  return (
    <div className="ficha">
      <section className="card stack">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <span className="avatar big" aria-hidden="true">{inicial(persona.nombre)}</span>
          <div style={{ minWidth: 0 }}>
            <h2>{persona.nombre}</h2>
            <p className="muted small">
              {formatear(persona.estaturaCm, 0)} cm · objetivo: {OBJETIVO[persona.objetivo]}
              {r.ultima && ` · última medición ${fechaLegible(r.ultima.fecha)}`}
            </p>
          </div>
        </div>
        <Cuerpo sexo={persona.sexo} medidas={r.medidas} />
        {r.ultima && r.medidas.length === 0 && <p className="muted small">Registra perímetros para verlos sobre la figura.</p>}
        {r.asimetrias.map((a) => (
          <p className="muted small" key={a.zona}>
            {ZONA[a.zona]} {a.mayor === 'izq' ? 'izquierdo' : 'derecho'} {formatear(a.diferencia)} cm mayor que el {a.mayor === 'izq' ? 'derecho' : 'izquierdo'}.
          </p>
        ))}
      </section>

      <div className="side">
        {!r.ultima && (
          <div className="card stack">
            <p>Todavía no hay mediciones de {persona.nombre}.</p>
            <p className="muted small">Con la primera verás aquí sus números; con la segunda, cómo van cambiando.</p>
          </div>
        )}
        {r.tarjetas.length > 0 && (
          <div className="tiles">
            {r.tarjetas.map((t) => {
              const def = TARJETA[t.clave]
              const texto = detalle(t)
              return (
                <div className="tile" key={t.clave}>
                  <div className="k">
                    {def.nombre}
                    {t.estimada && ' (estimada)'}
                  </div>
                  <div className="v">
                    {formatear(t.valor, decimalesDe(t.clave, t.valor))} <small>{def.unidad}</small>
                  </div>
                  {t.ultimaPesada != null && <div className="d">Última pesada: {formatear(t.ultimaPesada)} kg</div>}
                  {texto && <div className={`d ${t.tono}`}>{texto}</div>}
                </div>
              )
            })}
          </div>
        )}
        {r.serie.length > 0 && (
          <div className="card stack">
            <div className="head">
              <h3>Peso</h3>
              <span className="muted small">{r.serie.length === 1 ? 'primera medición' : `últimas ${r.serie.length} mediciones`}</span>
            </div>
            <Grafico puntos={r.serie} unidad="kg" compacto tendencia={r.serie.map((s) => ({ fecha: s.fecha, valor: s.tendencia }))} />
            {r.serie.length > 1 && (
              <div className="legend">
                <span><i />Cada pesada</span>
                <span><i className="trend" />Tendencia</span>
              </div>
            )}
          </div>
        )}
        {r.meta && persona.metaPesoKg != null && (
          <div className="card stack">
            <div className="head">
              <h3>Meta</h3>
              <span className="num" style={{ fontWeight: 800 }}>{formatear(persona.metaPesoKg)} kg</span>
            </div>
            {r.meta.estado !== 'alcanzada' && (
              <p className="num">
                {r.meta.faltaKg < 0 ? 'Faltan por bajar' : 'Faltan por subir'} {formatear(Math.abs(r.meta.faltaKg))} kg desde tu peso de tendencia.
              </p>
            )}
            <p className="muted small num">{textoMeta(r.meta)}</p>
          </div>
        )}
        {r.mensaje && (
          <div className={`say ${r.mensaje.tono}`}>
            <span className={`pill ${r.mensaje.tono}`} style={{ alignSelf: 'flex-start' }}>{ROTULO[r.mensaje.tono]}</span>
            <h4>{r.mensaje.titulo}</h4>
            <p>{r.mensaje.texto}</p>
            <button type="button" className="btn link" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={onVerEvolucion}>Ver todo en Evolución</button>
          </div>
        )}
        <div className="row">
          <button type="button" className="btn primary" onClick={onMedir}>Registrar medición de esta semana</button>
        </div>
      </div>
    </div>
  )
}
