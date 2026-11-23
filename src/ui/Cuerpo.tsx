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

/**
 * Contorno completo de la figura en un solo trazo: la mitad derecha y su espejo recorrido al revés.
 * Así la línea de corte del molde no dibuja la costura central ni los cruces entre piezas.
 */
function contorno(mitad: string): string {
  const tokens = mitad.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) ?? []
  type Seg = { tipo: 'L' | 'Q'; c?: [number, number]; a: [number, number] }
  let inicio: [number, number] = [0, 0]
  const segs: Seg[] = []
  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i++]
    const n = () => Number(tokens[i++])
    if (t === 'M') inicio = [n(), n()]
    else if (t === 'L') segs.push({ tipo: 'L', a: [n(), n()] })
    else if (t === 'Q') segs.push({ tipo: 'Q', c: [n(), n()], a: [n(), n()] })
  }
  const espejo = ([x, y]: [number, number]): [number, number] => [200 - x, y]
  const p = ([x, y]: [number, number]) => `${x} ${y}`
  let d = `M${p(inicio)}`
  for (const g of segs) d += g.tipo === 'L' ? ` L${p(g.a)}` : ` Q${p(g.c!)} ${p(g.a)}`
  // De vuelta por el lado izquierdo: cada tramo al revés, desde su punta hasta su origen.
  for (let k = segs.length - 1; k >= 0; k--) {
    const desde = k === 0 ? inicio : segs[k - 1].a
    const g = segs[k]
    d += g.tipo === 'L' ? ` L${p(espejo(desde))}` : ` Q${p(espejo(g.c!))} ${p(espejo(desde))}`
  }
  return d + ' Z'
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
          <g key={m.campo} data-medida={m.campo}>
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
              <g className="chg">
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
