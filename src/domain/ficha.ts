import { esMenor, interpretar, type Mensaje, type Tono } from './insights'
import { derivar } from './metrics'
import { proyeccionMeta, tendenciaPeso, type ProyeccionMeta, type PuntoTendencia } from './trend'
import type { Medicion, Persona } from './types'

export type CampoPerimetro =
  | 'cuelloCm'
  | 'pechoCm'
  | 'brazoIzqCm'
  | 'brazoDerCm'
  | 'brazoCm'
  | 'cinturaCm'
  | 'caderaCm'
  | 'musloIzqCm'
  | 'musloDerCm'
  | 'musloCm'
export const PERIMETROS: CampoPerimetro[] = [
  'cuelloCm', 'pechoCm', 'brazoIzqCm', 'brazoDerCm', 'brazoCm', 'cinturaCm', 'caderaCm', 'musloIzqCm', 'musloDerCm', 'musloCm',
]

export interface MedidaFigura {
  campo: CampoPerimetro
  valor: number
  /** Frente a la medición anterior más reciente que tenga ese perímetro; null si no hay o no cambió. */
  cambio: number | null
}

export interface Asimetria {
  zona: 'brazo' | 'muslo'
  mayor: 'izq' | 'der'
  diferencia: number
}

export type ClaveTarjeta = 'pesoKg' | 'grasaPct' | 'musculoKg' | 'grasaVisceral'

export interface TarjetaFicha {
  clave: ClaveTarjeta
  /** Para el peso, la tendencia; para el resto, el valor de la última medición. */
  valor: number
  estimada: boolean
  /** Frente a la primera medición que tenga ese dato; null si es la misma o no cambió. */
  cambio: number | null
  desde: string | null
  tono: Tono
  nota: string | null
  /** Solo en la tarjeta del peso: la pesada de la última medición. */
  ultimaPesada?: number
}

export interface ResumenFicha {
  ultima: Medicion | null
  medidas: MedidaFigura[]
  asimetrias: Asimetria[]
  tarjetas: TarjetaFicha[]
  /** Las últimas pesadas con su tendencia, para el gráfico. */
  serie: PuntoTendencia[]
  meta: ProyeccionMeta | null
  mensaje: Mensaje | null
}

const CLAVES: Exclude<ClaveTarjeta, 'pesoKg'>[] = ['grasaPct', 'musculoKg', 'grasaVisceral']
const LADOS = [
  { zona: 'brazo', izq: 'brazoIzqCm', der: 'brazoDerCm', sinLado: 'brazoCm' },
  { zona: 'muslo', izq: 'musloIzqCm', der: 'musloDerCm', sinLado: 'musloCm' },
] as const
const VISCERAL_ALTA = 10
const MEDICIONES_EN_TENDENCIA = 10
const ASIMETRIA_MINIMA_CM = 1

const redondear1 = (n: number) => Math.round(n * 10) / 10

/** Diferencia a un decimal; null si redondea a cero. */
function diferencia(actual: number, previo: number): number | null {
  const d = redondear1(actual - previo)
  return d === 0 ? null : d
}

function dato(p: Persona, m: Medicion, clave: Exclude<ClaveTarjeta, 'pesoKg'>): { valor: number; estimada: boolean } | null {
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
  if (!ultima) return { ultima: null, medidas: [], asimetrias: [], tarjetas: [], serie: [], meta: null, mensaje: null }
  const anteriores = ms.slice(0, -1)
  const menor = esMenor(p, ultima.fecha)

  // Una medida sin lado solo se dibuja si esa extremidad no tiene ninguna medida por lado.
  const ocultas = new Set<CampoPerimetro>(LADOS.filter((l) => ultima[l.izq] != null || ultima[l.der] != null).map((l) => l.sinLado))
  const medidas: MedidaFigura[] = PERIMETROS.flatMap((campo) => {
    const valor = ultima[campo]
    if (valor == null || ocultas.has(campo)) return []
    const previa = [...anteriores].reverse().find((m) => m[campo] != null)
    return [{ campo, valor, cambio: previa ? diferencia(valor, previa[campo]!) : null }]
  })

  const asimetrias: Asimetria[] = LADOS.flatMap((l) => {
    const izq = ultima[l.izq]
    const der = ultima[l.der]
    if (izq == null || der == null) return []
    const d = redondear1(Math.abs(izq - der))
    return d >= ASIMETRIA_MINIMA_CM ? [{ zona: l.zona, mayor: izq > der ? ('izq' as const) : ('der' as const), diferencia: d }] : []
  })

  const serieCompleta = tendenciaPeso(ms.map((m) => ({ fecha: m.fecha, valor: m.pesoKg })))
  const tendencia = serieCompleta[serieCompleta.length - 1].tendencia
  const cambioPeso = ms.length > 1 ? diferencia(tendencia, serieCompleta[0].tendencia) : null
  const tarjetaPeso: TarjetaFicha = {
    clave: 'pesoKg',
    valor: redondear1(tendencia),
    estimada: false,
    cambio: cambioPeso,
    desde: cambioPeso == null ? null : ms[0].fecha,
    tono: menor ? 'neutro' : tonoDe('pesoKg', cambioPeso, tendencia, p),
    nota: null,
    ultimaPesada: ultima.pesoKg,
  }

  const otras: TarjetaFicha[] = CLAVES.flatMap((clave) => {
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
    asimetrias,
    tarjetas: [tarjetaPeso, ...otras],
    serie: serieCompleta.slice(-MEDICIONES_EN_TENDENCIA),
    meta: p.metaPesoKg == null ? null : proyeccionMeta(serieCompleta, p.metaPesoKg),
    mensaje: interpretar(p, ms)[0] ?? null,
  }
}
