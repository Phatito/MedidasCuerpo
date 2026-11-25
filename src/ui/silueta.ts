import type { CampoPerimetro } from '../domain/ficha'
import type { Sexo } from '../domain/types'

export interface Zona {
  /** Altura, centro y medio ancho de la banda sobre la figura. */
  y: number
  x: number
  w: number
  /** Lado de la imagen donde va el rótulo y altura del rótulo (separada de la banda para que no se pisen). */
  lado: 'izq' | 'der'
  rotuloY: number
}

// Mitad derecha de cada silueta (de frente); la izquierda es su espejo sobre x = 100.
export const SILUETA: Record<Sexo, string> = {
  hombre:
    'M100 78 L111 78 Q134 80 146 92 Q157 102 159 124 L164 190 L170 246 Q171 259 163 259 Q156 259 155 246 L148 196 L140 132 L138 128 Q133 160 130 184 Q136 206 140 228 L138 300 Q136 330 132 350 L130 410 Q130 424 118 424 L108 424 L106 350 L102 250 L100 248 Z',
  mujer:
    'M100 78 L109 78 Q128 80 139 91 Q149 100 151 122 L156 188 L162 244 Q163 257 155 257 Q148 257 147 244 L141 194 L134 132 L132 128 Q131 158 124 180 Q136 204 144 232 L140 300 Q137 330 132 350 L130 410 Q130 424 118 424 L108 424 L106 350 L102 250 L100 248 Z',
}

// La figura está de frente: el lado izquierdo de la persona queda a la derecha de la imagen.
export const ZONAS: Record<Sexo, Record<CampoPerimetro, Zona>> = {
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

/**
 * Contorno completo de la figura en un solo trazo: la mitad derecha y su espejo recorrido al revés.
 * Así la línea de corte del molde no dibuja la costura central ni los cruces entre piezas.
 */
export function contorno(mitad: string): string {
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

