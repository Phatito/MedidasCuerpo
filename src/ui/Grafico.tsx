import { diasEntre, fechaLegible, formatear } from '../domain/numbers'

interface Props {
  puntos: { fecha: string; valor: number }[]
  unidad: string
  /** Versión pequeña para la Ficha: sin promedio ni leyenda. */
  compacto?: boolean
  /** Línea de tendencia (para el peso). Si viene, reemplaza al promedio de las últimas mediciones. */
  tendencia?: { fecha: string; valor: number }[]
}

const VENTANA = 4

export function Grafico({ puntos, unidad, compacto = false, tendencia }: Props) {
  if (puntos.length === 0) return null
  // El compacto usa un lienzo más chico para que su texto no se achique al escalar en columnas angostas.
  const ANCHO = compacto ? 360 : 720
  const ALTO = compacto ? 170 : 280
  const M = compacto ? { izq: 38, der: 44, arriba: 14, abajo: 26 } : { izq: 52, der: 64, arriba: 18, abajo: 30 }
  const valores = [...puntos, ...(tendencia ?? [])].map((p) => p.valor)
  let min = Math.min(...valores)
  let max = Math.max(...valores)
  const margen = max === min ? Math.max(1, Math.abs(max) * 0.02) : (max - min) * 0.1
  min -= margen
  max += margen

  const totalDias = diasEntre(puntos[0].fecha, puntos[puntos.length - 1].fecha)
  const anchoUtil = ANCHO - M.izq - M.der
  const altoUtil = ALTO - M.arriba - M.abajo
  const x = (fecha: string) => (totalDias === 0 ? M.izq + anchoUtil / 2 : M.izq + (diasEntre(puntos[0].fecha, fecha) / totalDias) * anchoUtil)
  const y = (v: number) => M.arriba + (1 - (v - min) / (max - min)) * altoUtil
  const camino = (ps: { fecha: string; valor: number }[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(p.fecha).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')

  const marcas = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3)
  const promedio = puntos
    .map((p, i) =>
      i < VENTANA - 1 ? null : { fecha: p.fecha, valor: puntos.slice(i - VENTANA + 1, i + 1).reduce((s, q) => s + q.valor, 0) / VENTANA },
    )
    .filter((p): p is { fecha: string; valor: number } => p != null)
  const ultimo = puntos[puntos.length - 1]

  return (
    <div className="stack">
      <div className={compacto ? undefined : 'chart-scroll'}>
      <svg className={compacto ? 'chart compact' : 'chart'} viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={`Evolución en ${unidad}, ${puntos.length} mediciones`}>
        {marcas.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={M.izq} x2={ANCHO - M.der} y1={y(v)} y2={y(v)} />
            <text className="axis" x={M.izq - 8} y={y(v) + 4} textAnchor="end">{formatear(v)}</text>
          </g>
        ))}
        {totalDias > 0 && (
          <>
            <text className="axis" x={M.izq} y={ALTO - 8} textAnchor="start">{fechaLegible(puntos[0].fecha)}</text>
            <text className="axis" x={ANCHO - M.der} y={ALTO - 8} textAnchor="end">{fechaLegible(ultimo.fecha)}</text>
          </>
        )}
        {totalDias === 0 && (
          <text className="axis" x={x(ultimo.fecha)} y={ALTO - 8} textAnchor="middle">{fechaLegible(ultimo.fecha)}</text>
        )}
        {puntos.length > 1 && (
          <path className="area" d={`${camino(puntos)} L${x(ultimo.fecha).toFixed(1)},${ALTO - M.abajo} L${x(puntos[0].fecha).toFixed(1)},${ALTO - M.abajo} Z`} />
        )}
        {puntos.length > 1 && <path className="line" d={camino(puntos)} />}
        {tendencia && tendencia.length > 1 && <path className="trend" d={camino(tendencia)} />}
        {!tendencia && !compacto && promedio.length > 1 && <path className="avg" d={camino(promedio)} />}
        {!tendencia && !compacto && promedio.length === 1 && <circle className="avg-dot" cx={x(promedio[0].fecha)} cy={y(promedio[0].valor)} r={5} />}
        {puntos.map((p) => (
          <circle className={p === ultimo ? 'dot end' : 'dot'} key={p.fecha} cx={x(p.fecha)} cy={y(p.valor)} r={4.5}>
            <title>{`${fechaLegible(p.fecha)}: ${formatear(p.valor)} ${unidad}`}</title>
          </circle>
        ))}
        <text className="last" x={x(ultimo.fecha) + 10} y={y(ultimo.valor) + 4}>{formatear(ultimo.valor)}</text>
      </svg>
      </div>
      {compacto ? null : puntos.length === 1 ? (
        <p className="muted small">Registra otra medición para ver la línea.</p>
      ) : (
        <div className="legend">
          <span><i />Cada medición ({unidad})</span>
          {tendencia && tendencia.length > 1 && <span><i className="trend" />Tendencia</span>}
          {!tendencia && promedio.length > 0 && <span><i className="avg" />Promedio de las últimas {VENTANA}</span>}
        </div>
      )}
    </div>
  )
}
