import { useEffect, useState } from 'react'
import type { CampoPerimetro } from '../domain/ficha'
import { formatear } from '../domain/numbers'
import type { Sexo } from '../domain/types'
import { contorno, SILUETA, ZONAS } from './silueta'

/** Cuánto se acerca la cámara a cada zona: más a las chicas (cuello, brazos), menos al torso. */
const ACERCAR: Record<CampoPerimetro, number> = {
  cuelloCm: 2.5,
  pechoCm: 1.6,
  brazoDerCm: 2,
  brazoIzqCm: 2,
  brazoCm: 2,
  cinturaCm: 1.7,
  caderaCm: 1.6,
  musloDerCm: 1.8,
  musloIzqCm: 1.8,
  musloCm: 1.8,
}

const CENTRO_X = 100
const CENTRO_Y = 228

interface Props {
  sexo: Sexo
  /** La zona que se está midiendo; sin zona, el maniquí completo. */
  campo: CampoPerimetro | null
  /** La medida de la vez pasada: la cinta corre hasta ese número. */
  previo?: number | null
  /** Zonas ya medidas: quedan marcadas con su costura. */
  hechas?: CampoPerimetro[]
  descripcion: string
}

function useSinMovimiento(): boolean {
  const [quieto, setQuieto] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const cambio = () => setQuieto(mq.matches)
    mq.addEventListener?.('change', cambio)
    return () => mq.removeEventListener?.('change', cambio)
  }, [])
  return quieto
}

/** El número de la cinta corre desde abajo hasta la medida anterior, como cuando se ajusta la cinta. */
function useContador(meta: number | null | undefined, clave: string, quieto: boolean): number | null {
  const [valor, setValor] = useState<number | null>(meta ?? null)
  useEffect(() => {
    if (meta == null) return setValor(null)
    if (quieto) return setValor(meta)
    let raf = 0
    const inicio = performance.now() + 900
    const desde = meta * 0.82
    const paso = (t: number) => {
      const f = Math.min(1, Math.max(0, (t - inicio) / 1100))
      const suave = 1 - (1 - f) ** 3
      setValor(Math.round((desde + (meta - desde) * suave) * 10) / 10)
      if (f < 1) raf = requestAnimationFrame(paso)
    }
    setValor(Math.round(desde * 10) / 10)
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [meta, clave, quieto])
  return valor
}

/**
 * El maniquí del molde enseñando a medir: la cámara se acerca a la zona, la cinta da la vuelta
 * (la mitad trasera punteada, por detrás; la delantera con sus marcas, por delante) y se ajusta.
 * Solo anima transform, opacity y stroke-dashoffset; con "reducir movimiento" queda quieto en el cuadro final.
 */
export function Maniqui({ sexo, campo, previo, hechas = [], descripcion }: Props) {
  const quieto = useSinMovimiento()
  const z = campo ? ZONAS[sexo][campo] : null
  const k = campo ? ACERCAR[campo] : 1
  const cx = z?.x ?? 100
  const cy = z?.y ?? 228
  const camara = `translate(${CENTRO_X}px, ${CENTRO_Y}px) scale(${k}) translate(${-cx}px, ${-cy}px)`
  const numero = useContador(previo, campo ?? '', quieto)
  const silueta = contorno(SILUETA[sexo])

  // La cinta: una elipse en perspectiva alrededor de la zona.
  const rx = z ? z.w + 2.5 : 0
  const ry = z ? Math.max(3.2, z.w * 0.34) : 0
  const trasera = z ? `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}` : ''
  const delantera = z ? `M${cx + rx} ${cy} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}` : ''

  return (
    <svg className={`maniqui${quieto ? ' quieto' : ''}`} viewBox="0 0 200 456" role="img" aria-label={descripcion}>
      <defs>
        <radialGradient id="maniqui-luz" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--costura)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--costura)" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`maniqui-pieza-${sexo}`}>
          <path d={silueta} />
        </clipPath>
      </defs>
      {/* Retícula de la mesa de corte, quieta detrás de la cámara. */}
      <g className="maniqui-reticula" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="456" />
        ))}
        {Array.from({ length: 23 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} />
        ))}
      </g>
      <g className="maniqui-camara" style={{ transform: camara }}>
        <g className="sil">
          <circle className="pieza" cx="100" cy="42" r="25" />
          <rect className="pieza" x="89" y="60" width="22" height="24" />
          <path className="pieza" d={silueta} />
          <g clipPath={`url(#maniqui-pieza-${sexo})`}>
            <path className="costura-ancha" d={silueta} />
            <path className="costura-tapa" d={silueta} />
          </g>
          <path className="corte" d={`${silueta} M89 66 L89 80 M111 66 L111 80`} />
          <circle className="corte" cx="100" cy="42" r="25" />
        </g>
        {/* Las zonas ya medidas quedan cosidas. */}
        {hechas
          .filter((h) => h !== campo)
          .map((h) => {
            const zh = ZONAS[sexo][h]
            return <path key={h} className="maniqui-hecha" d={`M${zh.x - zh.w} ${zh.y} Q${zh.x} ${zh.y + 6} ${zh.x + zh.w} ${zh.y}`} />
          })}
        {z && (
          <g key={`${campo}-${sexo}`} className="maniqui-cinta">
            <ellipse className="maniqui-brillo" cx={cx} cy={cy} rx={rx * 1.9} ry={ry * 4.5} fill="url(#maniqui-luz)" />
            <path className="cinta-trasera" d={trasera} pathLength={100} />
            <g className="cinta-ajuste" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <path className="cinta-delantera" d={delantera} pathLength={100} />
              <path className="cinta-marcas" d={delantera} pathLength={100} />
            </g>
            {/* La lectura de la cinta, sobre la zona, siempre del mismo tamaño en pantalla. */}
            <g className="cinta-lectura" transform={`translate(${cx} ${cy - ry - 9}) scale(${1.6 / k})`}>
              <rect x={numero != null ? -15 : -8} y="-6" width={numero != null ? 30 : 16} height="12" rx="2.5" />
              <path className="cinta-lectura-pico" d="M-3 6 L0 10 L3 6 Z" />
              <text x="0" y="3" textAnchor="middle">
                {numero != null ? formatear(numero) : '?'}
              </text>
            </g>
          </g>
        )}
      </g>
    </svg>
  )
}
