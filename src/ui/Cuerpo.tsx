import type { CampoPerimetro, MedidaFigura } from '../domain/ficha'
import { formatear } from '../domain/numbers'
import { ETIQUETAS, type Sexo } from '../domain/types'

interface Props {
  sexo: Sexo
  medidas: MedidaFigura[]
}

interface Zona {
  /** Altura, centro y medio ancho de la banda sobre la figura. */
  y: number
  x: number
  w: number
  /** Lado de la imagen donde va el rótulo y altura del rótulo (separada de la banda para que no se pisen). */
  lado: 'izq' | 'der'
  rotuloY: number
}

// Mitad derecha de cada silueta (de frente); la izquierda es su espejo sobre x = 100.
const SILUETA: Record<Sexo, string> = {
  hombre:
    'M100 78 L111 78 Q134 80 146 92 Q157 102 159 124 L164 190 L170 246 Q171 259 163 259 Q156 259 155 246 L148 196 L140 132 L138 128 Q133 160 130 184 Q136 206 140 228 L138 300 Q136 330 132 350 L130 410 Q130 424 118 424 L108 424 L106 350 L102 250 L100 248 Z',
  mujer:
    'M100 78 L109 78 Q128 80 139 91 Q149 100 151 122 L156 188 L162 244 Q163 257 155 257 Q148 257 147 244 L141 194 L134 132 L132 128 Q131 158 124 180 Q136 204 144 232 L140 300 Q137 330 132 350 L130 410 Q130 424 118 424 L108 424 L106 350 L102 250 L100 248 Z',
}

// La figura está de frente: el lado izquierdo de la persona queda a la derecha de la imagen.
const ZONAS: Record<Sexo, Record<CampoPerimetro, Zona>> = {
  hombre: {
    cuelloCm: { y: 70, x: 100, w: 12, lado: 'der', rotuloY: 66 },
    pechoCm: { y: 112, x: 100, w: 38, lado: 'izq', rotuloY: 92 },
    brazoIzqCm: { y: 150, x: 153, w: 8, lado: 'der', rotuloY: 150 },
    brazoDerCm: { y: 150, x: 47, w: 8, lado: 'izq', rotuloY: 150 },
    brazoCm: { y: 150, x: 153, w: 8, lado: 'der', rotuloY: 150 },
    cinturaCm: { y: 184, x: 100, w: 30, lado: 'izq', rotuloY: 210 },
    caderaCm: { y: 228, x: 100, w: 40, lado: 'der', rotuloY: 228 },
    musloIzqCm: { y: 290, x: 121, w: 16, lado: 'der', rotuloY: 290 },
    musloDerCm: { y: 290, x: 79, w: 16, lado: 'izq', rotuloY: 290 },
    musloCm: { y: 290, x: 79, w: 16, lado: 'izq', rotuloY: 290 },
  },
  mujer: {
    cuelloCm: { y: 70, x: 100, w: 10, lado: 'der', rotuloY: 66 },
    pechoCm: { y: 114, x: 100, w: 33, lado: 'izq', rotuloY: 92 },
    brazoIzqCm: { y: 150, x: 145, w: 8, lado: 'der', rotuloY: 150 },
    brazoDerCm: { y: 150, x: 55, w: 8, lado: 'izq', rotuloY: 150 },
    brazoCm: { y: 150, x: 145, w: 8, lado: 'der', rotuloY: 150 },
    cinturaCm: { y: 180, x: 100, w: 24, lado: 'izq', rotuloY: 210 },
    caderaCm: { y: 232, x: 100, w: 44, lado: 'der', rotuloY: 232 },
    musloIzqCm: { y: 292, x: 122, w: 17, lado: 'der', rotuloY: 292 },
    musloDerCm: { y: 292, x: 78, w: 17, lado: 'izq', rotuloY: 292 },
    musloCm: { y: 292, x: 78, w: 17, lado: 'izq', rotuloY: 292 },
  },
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

export function Cuerpo({ sexo, medidas }: Props) {
  const descripcion =
    medidas.length === 0
      ? 'Figura del cuerpo, sin perímetros registrados'
      : 'Figura del cuerpo con ' +
        medidas
          .map(
            (m) =>
              `${ETIQUETAS[m.campo].nombre.toLowerCase()} ${formatear(m.valor)} cm` +
              (m.cambio == null ? '' : ` (${m.cambio < 0 ? 'bajó' : 'subió'} ${formatear(Math.abs(m.cambio))})`),
          )
          .join(', ')
  return (
    <svg className="body-fig" data-sexo={sexo} viewBox="-110 10 420 430" role="img" aria-label={descripcion}>
      <defs>
        <linearGradient id="cuerpo-relleno" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sil-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sil-bottom)' }} />
        </linearGradient>
      </defs>
      <g className="sil">
        <circle cx="100" cy="42" r="25" />
        <rect x="89" y="62" width="22" height="20" rx="6" />
        <path d={SILUETA[sexo]} />
        <path d={SILUETA[sexo]} transform="translate(200 0) scale(-1 1)" />
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
          <g key={m.campo} data-medida={m.campo}>
            <path className="band" d={`M${z.x - z.w} ${z.y} Q${z.x} ${z.y + 7} ${z.x + z.w} ${z.y}`} />
            <path className="lead" d={`M${borde} ${z.y} L${codo} ${z.y} L${fin} ${z.rotuloY}`} />
            <circle className="pin" cx={borde} cy={z.y} r={3.5} />
            <text className="lab" x={textoX} y={z.rotuloY - 8} textAnchor={ancla}>{ROTULO[m.campo]}</text>
            <text className="val" x={textoX} y={z.rotuloY + 10} textAnchor={ancla}>{formatear(m.valor)} cm</text>
            {m.cambio != null && (
              <text className="chg" x={textoX} y={z.rotuloY + 26} textAnchor={ancla}>
                {m.cambio < 0 ? '▼' : '▲'} {formatear(Math.abs(m.cambio))}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
