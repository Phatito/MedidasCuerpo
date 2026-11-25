import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { diasEntre, fechaLegible, formatear } from '../domain/numbers'

export interface Punto {
  fecha: string
  valor: number
}

interface Props {
  puntos: Punto[]
  unidad: string
  /** Nombre de lo que se grafica, para el lector de pantalla. */
  etiqueta: string
  /** Línea suavizada (el peso de tendencia). */
  tendencia?: Punto[]
  /** Línea de meta punteada. */
  meta?: number | null
  /** Para el color: si bajar es bueno, malo o da igual. */
  tono?: 'bajar' | 'subir' | 'neutro'
  decimales?: number
}

const VENTANA = 4

const ANCHO = 360
const ALTO = 210
const M = { izq: 8, der: 8, arriba: 34, abajo: 24 }

/**
 * Gráfico que se recorre: tocar o arrastrar elige el punto más cercano (con el teclado, las flechas).
 * La línea se dibuja al aparecer; con "reducir movimiento" queda quieta.
 */
export function GraficoVivo({ puntos, unidad, etiqueta, tendencia, meta, tono = 'neutro', decimales = 1 }: Props) {
  const id = useId().replace(/:/g, '')
  const lienzo = useRef<SVGSVGElement>(null)
  const [elegido, setElegido] = useState<number | null>(null)
  // Cada serie nueva redibuja la línea (la clave cambia).
  const clave = `${puntos.length}-${puntos[0]?.fecha}-${puntos[puntos.length - 1]?.fecha}-${puntos[puntos.length - 1]?.valor}`

  const g = useMemo(() => {
    if (!puntos.length) return null
    const valores = [...puntos, ...(tendencia ?? [])].map((p) => p.valor).concat(meta != null ? [meta] : [])
    let min = Math.min(...valores)
    let max = Math.max(...valores)
    const margen = max === min ? Math.max(0.5, Math.abs(max) * 0.02) : (max - min) * 0.12
    min -= margen
    max += margen
    const total = diasEntre(puntos[0].fecha, puntos[puntos.length - 1].fecha)
    const util = ANCHO - M.izq - M.der
    const alto = ALTO - M.arriba - M.abajo
    const x = (f: string) => (total === 0 ? M.izq + util / 2 : M.izq + (diasEntre(puntos[0].fecha, f) / total) * util)
    const y = (v: number) => M.arriba + (1 - (v - min) / (max - min)) * alto
    // Curva suave (Catmull-Rom a Bézier), sin pasarse de los puntos.
    const curva = (ps: Punto[]) => {
      const q = ps.map((p) => [x(p.fecha), y(p.valor)] as const)
      if (q.length === 1) return `M${q[0][0]},${q[0][1]}`
      let d = `M${q[0][0].toFixed(1)},${q[0][1].toFixed(1)}`
      for (let i = 0; i < q.length - 1; i++) {
        const p0 = q[i - 1] ?? q[i]
        const p1 = q[i]
        const p2 = q[i + 1]
        const p3 = q[i + 2] ?? p2
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
        d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
      }
      return d
    }
    // Tres líneas de guía con valores redondos.
    const marcas = [0.2, 0.5, 0.8].map((f) => min + (max - min) * f)
    return { x, y, curva, marcas, base: ALTO - M.abajo }
  }, [puntos, tendencia, meta])

  if (!g) return null
  // Sin tendencia (todo menos el peso), el promedio de las últimas 4 mediciones suaviza el ruido.
  const promedio = tendencia
    ? []
    : puntos
        .map((p, k) => (k < VENTANA - 1 ? null : { fecha: p.fecha, valor: puntos.slice(k - VENTANA + 1, k + 1).reduce((s, q) => s + q.valor, 0) / VENTANA }))
        .filter((p): p is Punto => p != null)
  const linea = tendencia && tendencia.length > 1 ? tendencia : puntos
  const ultimo = puntos[puntos.length - 1]
  const i = elegido ?? puntos.length - 1
  const sel = puntos[i]
  const previo = i > 0 ? puntos[i - 1] : null
  const cambio = previo ? sel.valor - previo.valor : null
  const sentido = cambio == null || Math.abs(cambio) < 0.05 ? 'neutro' : tono === 'neutro' ? 'neutro' : (cambio < 0) === (tono === 'bajar') ? 'bien' : 'atencion'
  const fmt = (v: number) => formatear(v, decimales)

  function elegirEn(clientX: number) {
    const r = lienzo.current?.getBoundingClientRect()
    if (!r) return
    const xv = ((clientX - r.left) / r.width) * ANCHO
    let mejor = 0
    puntos.forEach((p, k) => {
      if (Math.abs(g!.x(p.fecha) - xv) < Math.abs(g!.x(puntos[mejor].fecha) - xv)) mejor = k
    })
    setElegido(mejor)
  }
  const alTocar = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    elegirEn(e.clientX)
  }
  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    if (e.buttons || e.pointerType === 'mouse') elegirEn(e.clientX)
  }
  function teclas(e: KeyboardEvent<SVGSVGElement>) {
    const mover: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -i, End: puntos.length - 1 - i }
    if (!(e.key in mover)) return
    e.preventDefault()
    setElegido(Math.max(0, Math.min(puntos.length - 1, i + mover[e.key])))
  }

  const gx = g.x(sel.fecha)
  const gy = g.y(sel.valor)
  // El globo no se sale del lienzo.
  const globoX = Math.max(60, Math.min(ANCHO - 60, gx))
  const area = puntos.length > 1 ? `${g.curva(puntos)} L${g.x(ultimo.fecha).toFixed(1)},${g.base} L${g.x(puntos[0].fecha).toFixed(1)},${g.base} Z` : ''

  return (
    <div className="gv">
      <svg
        ref={lienzo}
        className="gv-lienzo"
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="slider"
        tabIndex={0}
        aria-label={`${etiqueta}: recorre las mediciones con las flechas`}
        aria-valuemin={0}
        aria-valuemax={puntos.length - 1}
        aria-valuenow={i}
        aria-valuetext={`${fechaLegible(sel.fecha)}: ${fmt(sel.valor)} ${unidad}`}
        onPointerDown={alTocar}
        onPointerMove={alMover}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setElegido(null)}
        onKeyDown={teclas}
      >
        <defs>
          <linearGradient id={`gv-area-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--costura)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--costura)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {g.marcas.map((v) => (
          <g key={v} className="gv-guia">
            <line x1={M.izq} x2={ANCHO - M.der} y1={g.y(v)} y2={g.y(v)} />
            <text x={ANCHO - M.der} y={g.y(v) - 3} textAnchor="end">
              {formatear(v, decimales)}
            </text>
          </g>
        ))}
        {meta != null && (
          <g className="gv-meta">
            <line x1={M.izq} x2={ANCHO - M.der} y1={g.y(meta)} y2={g.y(meta)} />
            <text x={M.izq + 2} y={g.y(meta) - 4}>
              Meta {fmt(meta)}
            </text>
          </g>
        )}
        <g key={clave} className="gv-dibujo">
          {area && <path className="gv-area" d={area} fill={`url(#gv-area-${id})`} />}
          {linea.length > 1 && <path className="gv-linea" d={g.curva(linea)} pathLength={100} />}
          {tendencia && tendencia.length > 1 && puntos.length > 1 && <path className="gv-pesadas" d={g.curva(puntos)} />}
          {promedio.length > 1 && <path className="gv-promedio" d={g.curva(promedio)} />}
          {promedio.length === 1 && <circle className="gv-promedio-punto" cx={g.x(promedio[0].fecha)} cy={g.y(promedio[0].valor)} r={4} />}
          {puntos.map((p, k) => (
            <circle key={p.fecha} className={`gv-punto${k === puntos.length - 1 ? ' ultimo' : ''}`} cx={g.x(p.fecha)} cy={g.y(p.valor)} r={k === puntos.length - 1 ? 4 : 2.6} style={{ animationDelay: `${0.3 + (k / puntos.length) * 0.6}s` }} />
          ))}
        </g>
        {/* Guía y globo del punto elegido. */}
        <line className="gv-cursor" x1={gx} x2={gx} y1={M.arriba - 4} y2={g.base} />
        <circle className={`gv-elegido ${sentido}`} cx={gx} cy={gy} r={6} />
        <g className="gv-globo" transform={`translate(${globoX} ${Math.max(14, gy - 20)})`}>
          <rect x="-58" y="-14" width="116" height="24" rx="12" />
          <text y="3.5" textAnchor="middle">
            {fmt(sel.valor)} {unidad} · {fechaLegible(sel.fecha).slice(0, 5)}
          </text>
        </g>
        <text className="gv-eje" x={M.izq} y={ALTO - 6}>
          {fechaLegible(puntos[0].fecha)}
        </text>
        {puntos.length > 1 && (
          <text className="gv-eje" x={ANCHO - M.der} y={ALTO - 6} textAnchor="end">
            {fechaLegible(ultimo.fecha)}
          </text>
        )}
      </svg>
      <p className="gv-lectura small num" aria-live="polite">
        <b>{fechaLegible(sel.fecha)}</b> · {fmt(sel.valor)} {unidad}
        {cambio != null && (
          <span className={`gv-cambio ${sentido}`}>
            {' '}
            · {Math.abs(cambio) < 0.05 ? 'sin cambio' : `${cambio < 0 ? 'bajó' : 'subió'} ${fmt(Math.abs(cambio))} ${unidad}`} frente al {fechaLegible(previo!.fecha).slice(0, 5)}
          </span>
        )}
        {puntos.length > 1 && elegido == null && <span className="muted"> · toca o arrastra para recorrer</span>}
      </p>
      {puntos.length === 1 && <p className="muted small">Registra otra medición para ver la línea.</p>}
      {promedio.length > 0 && (
        <p className="muted small">
          <i className="leyenda-promedio" /> Promedio de las últimas {VENTANA}
        </p>
      )}
    </div>
  )
}

/** Mini curva para las tarjetas. */
export function MiniCurva({ puntos, clase = '' }: { puntos: Punto[]; clase?: string }) {
  if (puntos.length < 2) return <svg className={`mini-curva ${clase}`} viewBox="0 0 80 26" aria-hidden="true" />
  const vs = puntos.map((p) => p.valor)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const pts = puntos.map((p, k) => `${(2 + (k * 76) / (puntos.length - 1)).toFixed(1)},${(max === min ? 13 : 23 - ((p.valor - min) * 20) / (max - min)).toFixed(1)}`)
  return (
    <svg className={`mini-curva ${clase}`} viewBox="0 0 80 26" aria-hidden="true" focusable="false">
      <polyline points={pts.join(' ')} />
    </svg>
  )
}
