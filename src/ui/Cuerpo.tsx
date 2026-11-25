import type React from 'react'
import type { CampoPerimetro, MedidaFigura } from '../domain/ficha'
import { formatear } from '../domain/numbers'
import { ETIQUETAS, type Sexo } from '../domain/types'
import { contorno, SILUETA, ZONAS } from './silueta'

interface Props {
  sexo: Sexo
  medidas: MedidaFigura[]
  /** La zona elegida (brilla) y qué hacer al tocar una: con esto, cada zona es un botón. */
  seleccionada?: CampoPerimetro
  onElegir?: (c: CampoPerimetro) => void
}

// Nombres cortos para que los rótulos quepan al costado de la figura.
const ROTULO: Record<CampoPerimetro, string> = {
  cuelloCm: 'Cuello',
  pechoCm: 'Pecho',
  brazoIzqCm: 'Brazo izq.',
  brazoDerCm: 'Brazo der.',
  brazoCm: 'Brazo',
  cinturaCm: 'Cintura',
  caderaCm: 'Cadera',
  musloIzqCm: 'Muslo izq.',
  musloDerCm: 'Muslo der.',
  musloCm: 'Muslo',
}

const IZQ_X = -15
const DER_X = 215
const CODO = 18

export function Cuerpo({ sexo, medidas, seleccionada, onElegir }: Props) {
  const descripcion =
    medidas.length === 0
      ? 'Figura del cuerpo, sin perímetros registrados'
      : 'Figura del cuerpo con ' +
        medidas
          .map(
            (m) =>
              `${ETIQUETAS[m.campo].nombre.toLowerCase()} ${formatear(m.valor)} cm` +
              (m.cambio == null ? '' : ` (${m.cambio < 0 ? 'bajó' : 'subió'}${m.leve ? ' levemente' : ''} ${formatear(Math.abs(m.cambio))})`),
          )
          .join(', ')
  return (
    <svg className="body-fig" data-sexo={sexo} viewBox="-110 10 420 430" role="img" aria-label={descripcion}>
      <defs>
        <clipPath id={`pieza-${sexo}`}>
          <path d={contorno(SILUETA[sexo])} />
        </clipPath>
      </defs>
      {/* Pieza del molde: papel calco, costura punteada hacia dentro, línea de corte y línea del hilo. */}
      <g className="sil">
        <circle className="pieza" cx="100" cy="42" r="25" />
        <rect className="pieza" x="89" y="60" width="22" height="24" />
        <path className="pieza" d={contorno(SILUETA[sexo])} />
        <g clipPath={`url(#pieza-${sexo})`}>
          <path className="costura-ancha" d={contorno(SILUETA[sexo])} />
          <path className="costura-tapa" d={contorno(SILUETA[sexo])} />
        </g>
        <path className="corte" d={`${contorno(SILUETA[sexo])} M89 66 L89 80 M111 66 L111 80`} />
        <circle className="corte" cx="100" cy="42" r="25" />
        <path className="hilo" d="M100 112 L100 222" />
        <path className="hilo-punta" d="M100 106 L95.5 116 L104.5 116 Z M100 228 L95.5 218 L104.5 218 Z" />
      </g>
      {medidas.map((m) => {
        const z = ZONAS[sexo][m.campo]
        const der = z.lado === 'der'
        const borde = der ? z.x + z.w : z.x - z.w
        const fin = der ? DER_X : IZQ_X
        const codo = der ? fin - CODO : fin + CODO
        const textoX = der ? DER_X + 7 : IZQ_X - 7
        const ancla = der ? 'start' : 'end'
        return (
          <g
            key={m.campo}
            data-medida={m.campo}
            className={`${onElegir ? 'zona-tocable' : ''}${seleccionada === m.campo ? ' elegida' : ''}`}
            {...(onElegir
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': seleccionada === m.campo,
                  'aria-label': `${ETIQUETAS[m.campo].nombre}: ${formatear(m.valor)} cm. Ver su historia`,
                  onClick: () => onElegir(m.campo),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onElegir(m.campo)
                    }
                  },
                }
              : {})}
          >
            {onElegir && (
              <>
                {/* Áreas de toque: la banda sobre la figura y el rótulo. */}
                <rect className="toque" x={z.x - z.w - 8} y={z.y - 16} width={2 * z.w + 16} height={32} />
                <rect className="toque" x={der ? DER_X - 4 : IZQ_X - 96} y={z.rotuloY - 26} width={100} height={60} />
                {seleccionada === m.campo && <path className="band-brillo" d={`M${z.x - z.w} ${z.y} Q${z.x} ${z.y + 7} ${z.x + z.w} ${z.y}`} />}
              </>
            )}
            {/* Antes: la medida anterior como línea punteada, a su escala, bajo la de ahora. */}
            {m.cambio != null && m.valor - m.cambio > 0 && (() => {
              const w = (z.w * (m.valor - m.cambio)) / m.valor
              return <path className="band-antes" d={`M${z.x - w} ${z.y + 5} Q${z.x} ${z.y + 12} ${z.x + w} ${z.y + 5}`} />
            })()}
            <path className="band" d={`M${z.x - z.w} ${z.y} Q${z.x} ${z.y + 7} ${z.x + z.w} ${z.y}`} />
            <path className="lead" d={`M${borde} ${z.y} L${codo} ${z.y} L${fin} ${z.rotuloY}`} />
            {/* Muesca del molde donde la línea de cota toca la pieza. */}
            <path className="pin" d={der ? `M${borde} ${z.y} L${borde + 7} ${z.y - 4.5} L${borde + 7} ${z.y + 4.5} Z` : `M${borde} ${z.y} L${borde - 7} ${z.y - 4.5} L${borde - 7} ${z.y + 4.5} Z`} />
            <text className="lab" x={textoX} y={z.rotuloY - 8} textAnchor={ancla}>{ROTULO[m.campo]}</text>
            <text className="val" x={textoX} y={z.rotuloY + 10} textAnchor={ancla}>{formatear(m.valor)} cm</text>
            {m.cambio != null && (
              <g className={`chg ${m.sentido ?? 'neutro'}${m.leve ? ' leve' : ''}`}>
                {(() => {
                  // La muesca va hacia afuera del rótulo; el número, a su lado.
                  const mx = der ? textoX : textoX - 9
                  const my = z.rotuloY + 17
                  const d = m.cambio < 0 ? `M${mx} ${my} h9 l-4.5 8 z` : `M${mx} ${my + 8} h9 l-4.5 -8 z`
                  return <path className="chg-muesca" d={d} />
                })()}
                <text x={der ? textoX + 13 : textoX - 13} y={z.rotuloY + 26} textAnchor={ancla}>
                  {formatear(Math.abs(m.cambio))}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
