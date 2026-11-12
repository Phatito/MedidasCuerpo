import { esMenor, interpretar, type Mensaje, type Tono } from './insights'
import { derivar } from './metrics'
import type { Medicion, Persona } from './types'

export type CampoPerimetro = 'cuelloCm' | 'pechoCm' | 'brazoCm' | 'cinturaCm' | 'caderaCm' | 'musloCm'
export const PERIMETROS: CampoPerimetro[] = ['cuelloCm', 'pechoCm', 'brazoCm', 'cinturaCm', 'caderaCm', 'musloCm']

export interface MedidaFigura {
  campo: CampoPerimetro
  valor: number
  /** Frente a la medición anterior más reciente que tenga ese perímetro; null si no hay o no cambió. */
  cambio: number | null
}

export type ClaveTarjeta = 'pesoKg' | 'grasaPct' | 'musculoKg' | 'grasaVisceral'

export interface TarjetaFicha {
  clave: ClaveTarjeta
  valor: number
  estimada: boolean
  /** Frente a la primera medición que tenga ese dato; null si es la misma o no cambió. */
  cambio: number | null
  desde: string | null
  tono: Tono
  nota: string | null
}

export interface ResumenFicha {
  ultima: Medicion | null
  medidas: MedidaFigura[]
  tarjetas: TarjetaFicha[]
  pesos: { fecha: string; valor: number }[]
  mensaje: Mensaje | null
}

const CLAVES: ClaveTarjeta[] = ['pesoKg', 'grasaPct', 'musculoKg', 'grasaVisceral']
const VISCERAL_ALTA = 10
const MEDICIONES_EN_TENDENCIA = 10

/** Diferencia a un decimal; null si redondea a cero. */
function diferencia(actual: number, previo: number): number | null {
  const d = Math.round((actual - previo) * 10) / 10
  return d === 0 ? null : d
}

function dato(p: Persona, m: Medicion, clave: ClaveTarjeta): { valor: number; estimada: boolean } | null {
  if (clave === 'grasaPct') {
    const d = derivar(p, m)
    return d.grasaPct == null ? null : { valor: d.grasaPct, estimada: d.grasaEstimada }
  }
  const v = m[clave]
  return v == null ? null : { valor: v, estimada: false }
}

function tonoDe(clave: ClaveTarjeta, cambio: number | null, valor: number, p: Persona): Tono {
  if (clave === 'grasaVisceral') return valor >= VISCERAL_ALTA ? 'atencion' : 'neutro'
  if (cambio == null) return 'neutro'
  if (clave === 'grasaPct') return cambio < 0 ? 'bien' : 'atencion'
  if (clave === 'musculoKg') return cambio > 0 ? 'bien' : 'atencion'
  if (p.objetivo === 'bajar_grasa') return cambio < 0 ? 'bien' : 'atencion'
  return 'neutro'
}

export function resumenFicha(p: Persona, mediciones: Medicion[]): ResumenFicha {
  const ms = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ultima = ms[ms.length - 1] ?? null
  if (!ultima) return { ultima: null, medidas: [], tarjetas: [], pesos: [], mensaje: null }
  const anteriores = ms.slice(0, -1)
  const menor = esMenor(p, ultima.fecha)

  const medidas: MedidaFigura[] = PERIMETROS.flatMap((campo) => {
    const valor = ultima[campo]
    if (valor == null) return []
    const previa = [...anteriores].reverse().find((m) => m[campo] != null)
    return [{ campo, valor, cambio: previa ? diferencia(valor, previa[campo]!) : null }]
  })

  const tarjetas: TarjetaFicha[] = CLAVES.flatMap((clave) => {
    const actual = dato(p, ultima, clave)
    if (!actual) return []
    // La comparación solo vale contra un dato del mismo origen (medido o estimado).
    const primera = anteriores.find((m) => dato(p, m, clave)?.estimada === actual.estimada)
    const cambio = primera ? diferencia(actual.valor, dato(p, primera, clave)!.valor) : null
    const tono = menor ? 'neutro' : tonoDe(clave, cambio, actual.valor, p)
    return [
      {
        clave,
        valor: actual.valor,
        estimada: actual.estimada,
        cambio,
        desde: cambio == null ? null : primera!.fecha,
        tono,
        nota: clave === 'grasaVisceral' && tono === 'atencion' ? 'Elevada' : null,
      },
    ]
  })

  return {
    ultima,
    medidas,
    tarjetas,
    pesos: ms.slice(-MEDICIONES_EN_TENDENCIA).map((m) => ({ fecha: m.fecha, valor: m.pesoKg })),
    mensaje: interpretar(p, ms)[0] ?? null,
  }
}
