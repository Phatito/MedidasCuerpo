import { useState } from 'react'
import { NOMBRE_ZONA, sentidoCambio, valorZona, zonaDeCampo, type BaseCinta, type CambioCinta, type LecturaCinta } from '../domain/cinta'
import type { MedidaFigura } from '../domain/ficha'
import { fechaLegible, formatear } from '../domain/numbers'
import type { Metrica } from '../domain/series'
import type { Medicion } from '../domain/types'
import { Icono, Muesca } from './Icono'

const CLAVE_BASE = 'mesura.cinta.base'
const BASES: { valor: BaseCinta; nombre: string }[] = [
  { valor: 'anterior', nombre: 'Anterior' },
  { valor: '4semanas', nombre: '4 semanas' },
  { valor: 'inicio', nombre: 'Inicio' },
]

/** La comparación elegida se recuerda en este navegador (si se puede). */
export function useBaseCinta(): [BaseCinta, (b: BaseCinta) => void] {
  const [base, setBase] = useState<BaseCinta>(() => {
    try {
      const v = localStorage.getItem(CLAVE_BASE)
      return BASES.some((b) => b.valor === v) ? (v as BaseCinta) : 'anterior'
    } catch {
      return 'anterior'
    }
  })
  return [
    base,
    (b) => {
      setBase(b)
      try {
        localStorage.setItem(CLAVE_BASE, b)
      } catch {
        /* sin almacenamiento: solo dura esta visita */
      }
    },
  ]
}

const r1 = (x: number) => Math.round(x * 10) / 10
const ddmm = (f: string) => fechaLegible(f).slice(0, 5)

/** "bajó levemente 0,1 cm", "subió 1 cm" o "sin cambio". */
export function textoCambio(c: { cambio: number; leve: boolean }): string {
  if (c.cambio === 0) return 'sin cambio'
  return `${c.cambio < 0 ? 'bajó' : 'subió'}${c.leve ? ' levemente' : ''} ${formatear(Math.abs(c.cambio))} cm`
}

/** Los perímetros de la figura, comparados con la misma base que la lectura y con el sentido de cada cambio. */
export function medidasConBase(medidas: MedidaFigura[], lectura: LecturaCinta | null, mediciones: Medicion[]): MedidaFigura[] {
  if (!lectura) return medidas
  return medidas.map((m) => {
    const zona = zonaDeCampo(m.campo)
    const c = zona && lectura.cambios.find((x) => x.zona === zona)
    if (!zona || !c) return { ...m, cambio: null }
    const base = mediciones.find((x) => x.fecha === c.desde)
    const antes = base?.[m.campo] ?? (base ? valorZona(base, zona) : null)
    if (antes == null) return { ...m, cambio: null }
    const cambio = r1(m.valor - antes)
    if (cambio === 0) return { ...m, cambio: null }
    return { ...m, cambio, leve: Math.abs(cambio) < 0.5, sentido: sentidoCambio(zona, cambio, lectura.dPesoKg, lectura.dCinturaCm) }
  })
}

/** Mini línea con la historia de una zona; el número que importa va en el texto de la fila. */
function Linea({ historia, sentido }: { historia: CambioCinta['historia']; sentido: CambioCinta['sentido'] }) {
  if (historia.length < 2) return <svg className="cinta-linea" viewBox="0 0 64 22" aria-hidden="true" />
  const vs = historia.map((h) => h.valor)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const pts = historia.map((h, i) => {
    const x = 2 + (i * 60) / (historia.length - 1)
    const y = max === min ? 11 : 19 - ((h.valor - min) * 16) / (max - min)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const [ux, uy] = pts[pts.length - 1].split(',')
  return (
    <svg className={`cinta-linea ${sentido}`} viewBox="0 0 64 22" aria-hidden="true" focusable="false">
      <polyline points={pts.join(' ')} />
      <circle cx={ux} cy={uy} r="2.6" />
    </svg>
  )
}

interface CabezaProps {
  lectura: LecturaCinta
  base: BaseCinta
  onBase: (b: BaseCinta) => void
}

/** Título, selector de comparación y veredicto. */
export function CabezaCinta({ lectura, base, onBase }: CabezaProps) {
  return (
    <>
      <div className="cinta-cabeza">
        <h2 id="cinta-titulo">Lo que dice la cinta</h2>
        <div className="cinta-base" role="radiogroup" aria-label="Comparar con">
          {BASES.map((b) => (
            <button key={b.valor} type="button" role="radio" aria-checked={base === b.valor} onClick={() => onBase(b.valor)}>
              {b.nombre}
            </button>
          ))}
        </div>
      </div>
      <div className={`cinta-veredicto ${lectura.tono}`}>
        <p className="cinta-veredicto-t">{lectura.titulo}</p>
        <p className="small">{lectura.texto}</p>
        {lectura.contraste && <p className={`small cinta-contraste ${lectura.contraste.coincide ? 'si' : 'no'}`}>{lectura.contraste.texto}</p>}
        {lectura.veredicto !== 'faltan' && lectura.faltanMedidas.length > 0 && (
          <p className="muted small">
            Para leer mejor tu cuerpo, mide también: {lectura.faltanMedidas.map((z) => NOMBRE_ZONA[z].toLowerCase()).join(', ')}.
          </p>
        )}
      </div>
    </>
  )
}

/** Una fila por zona: valor, cambio con su color y la historia. Abre la pantalla de esa medida. */
export function FilasCinta({ lectura, onVerMedida }: { lectura: LecturaCinta; onVerMedida: (m: Metrica) => void }) {
  if (!lectura.cambios.length) return null
  return (
    <ul className="cinta-filas">
      {lectura.cambios.map((c) => (
        <li key={c.zona}>
          <button
            type="button"
            className="cinta-fila"
            onClick={() => onVerMedida(c.campo)}
            aria-label={`${NOMBRE_ZONA[c.zona]} ${formatear(c.valor)} cm, ${textoCambio(c)} desde el ${ddmm(c.desde)}. Ver gráfico`}
          >
            <span className="cinta-zona">{NOMBRE_ZONA[c.zona]}</span>
            <span className="cinta-valor num">
              {formatear(c.valor)} <small>cm</small>
            </span>
            <span className={`cinta-cambio num ${c.sentido}${c.leve ? ' leve' : ''}`}>
              {c.cambio === 0 ? '=' : <Muesca cambio={c.cambio} />} {formatear(Math.abs(c.cambio))}
            </span>
            <Linea historia={c.historia} sentido={c.sentido} />
            <Icono nombre="abrir" />
          </button>
        </li>
      ))}
    </ul>
  )
}
