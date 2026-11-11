import { diasEntre, fechaLegible, formatear } from '../domain/numbers'

interface Props {
  puntos: { fecha: string; valor: number }[]
  unidad: string
}

const ANCHO = 720
const ALTO = 280
const M = { izq: 52, der: 64, arriba: 18, abajo: 30 }
const VENTANA = 4

export function Grafico({ puntos, unidad }: Props) {
  if (puntos.length === 0) return null
  const valores = puntos.map((p) => p.valor)
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
      <div className="chart-scroll">
      <svg className="chart" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={`Evolución en ${unidad}, ${puntos.length} mediciones`}>
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
        {puntos.length > 1 && <path className="line" d={camino(puntos)} />}
        {promedio.length > 1 && <path className="avg" d={camino(promedio)} />}
        {puntos.map((p) => (
          <circle className="dot" key={p.fecha} cx={x(p.fecha)} cy={y(p.valor)} r={4.5}>
            <title>{`${fechaLegible(p.fecha)}: ${formatear(p.valor)} ${unidad}`}</title>
          </circle>
        ))}
        <text className="last" x={x(ultimo.fecha) + 10} y={y(ultimo.valor) + 4}>{formatear(ultimo.valor)}</text>
      </svg>
      </div>
      {puntos.length === 1 ? (
        <p className="muted small">Registra otra medición para ver la línea.</p>
      ) : (
        <div className="legend">
          <span><i />Cada medición ({unidad})</span>
          {promedio.length > 1 && <span><i className="avg" />Promedio de las últimas {VENTANA}</span>}
        </div>
      )}
    </div>
  )
}
