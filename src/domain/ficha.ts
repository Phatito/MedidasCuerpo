import { clasificar, type Clasificacion, type MedidaConEstado } from './estados'
import { interpretar, type Mensaje, type Tono } from './insights'
import { derivar } from './metrics'
import { formatear } from './numbers'
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

export type ClaveTarjeta =
  | 'pesoKg'
  | 'grasaPct'
  | 'grasaVisceral'
  | 'musculoKg'
  | 'aguaPct'
  | 'imc'
  | 'grasaKg'
  | 'pesoSinGrasaKg'
  | 'musculoTotalKg'
  | 'proteinaPct'
  | 'masaOseaKg'
  | 'metabolismoBasalKcal'
  | 'edadCorporal'
  | 'frecuenciaCardiacaLpm'

export interface TarjetaFicha {
  clave: ClaveTarjeta
  /** Para el peso, la tendencia; para el resto, el valor de la última medición. */
  valor: number
  estimada: boolean
  /** Peso: frente a la primera medición. Resto: frente a la medición anterior que tenga ese dato. Null si no cambió. */
  cambio: number | null
  desde: string | null
  tono: Tono
  nota: string | null
  /** Solo en la tarjeta del peso: la pesada de la última medición. */
  ultimaPesada?: number
  /** Estado frente a rangos de referencia, para las medidas que los tienen. */
  clasificacion: Clasificacion | null
  /** Una línea de contexto, por ejemplo "65,1 % del peso". */
  referencia: string | null
  /** Fecha de la medición de donde sale el valor. */
  fecha: string
}

export interface ResumenFicha {
  ultima: Medicion | null
  /** Fecha de la medición cuyos perímetros se dibujan: la última que tenga alguno. */
  fechaPerimetros: string | null
  medidas: MedidaFigura[]
  asimetrias: Asimetria[]
  tarjetas: TarjetaFicha[]
  /** Las últimas pesadas con su tendencia, para el gráfico. */
  serie: PuntoTendencia[]
  meta: ProyeccionMeta | null
  mensaje: Mensaje | null
}

// Orden de las tarjetas en la ficha.
const CLAVES: Exclude<ClaveTarjeta, 'pesoKg'>[] = [
  'grasaPct', 'grasaVisceral', 'musculoKg', 'aguaPct', 'imc', 'grasaKg', 'pesoSinGrasaKg',
  'musculoTotalKg', 'proteinaPct', 'masaOseaKg', 'metabolismoBasalKcal', 'edadCorporal', 'frecuenciaCardiacaLpm',
]
const CON_ESTADO: Partial<Record<ClaveTarjeta, MedidaConEstado>> = {
  grasaPct: 'grasaPct', grasaVisceral: 'grasaVisceral', aguaPct: 'aguaPct', imc: 'imc', proteinaPct: 'proteinaPct',
  musculoKg: 'musculoPct',
}
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
  if (clave === 'grasaPct' || clave === 'grasaKg' || clave === 'pesoSinGrasaKg' || clave === 'imc') {
    const d = derivar(p, m)
    const v = clave === 'grasaPct' ? d.grasaPct : clave === 'grasaKg' ? d.masaGrasaKg : clave === 'pesoSinGrasaKg' ? d.masaMagraKg : d.imc
    return v == null ? null : { valor: redondear1(v), estimada: clave !== 'imc' && d.grasaEstimada }
  }
  const v = m[clave]
  return v == null ? null : { valor: v, estimada: false }
}

function referencia(clave: ClaveTarjeta, valor: number, m: Medicion): string | null {
  if (clave === 'musculoTotalKg' || clave === 'masaOseaKg' || clave === 'musculoKg') return `${formatear((valor / m.pesoKg) * 100)} % del peso`
  if (clave === 'proteinaPct') return `${formatear((m.pesoKg * valor) / 100)} kg`
  if (clave === 'grasaKg') return 'masa grasa'
  if (clave === 'pesoSinGrasaKg') return 'masa magra'
  return null
}

function tonoDe(clave: ClaveTarjeta, cambio: number | null, valor: number, p: Persona): Tono {
  if (clave === 'grasaVisceral') return valor >= VISCERAL_ALTA ? 'atencion' : 'neutro'
  if (cambio == null) return 'neutro'
  if (clave === 'grasaPct') return cambio < 0 ? 'bien' : 'atencion'
  if (clave === 'musculoKg') return cambio > 0 ? 'bien' : 'atencion'
  if (p.objetivo === 'bajar_grasa') return cambio < 0 ? 'bien' : 'atencion'
  return 'neutro'
}

export function resumenFicha(p: Persona, mediciones: Medicion[], opciones: { hoy?: string } = {}): ResumenFicha {
  const ms = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ultima = ms[ms.length - 1] ?? null
  if (!ultima) return { ultima: null, fechaPerimetros: null, medidas: [], asimetrias: [], tarjetas: [], serie: [], meta: null, mensaje: null }

  // Una pesada sin cinta no borra la figura: se dibujan los perímetros de la última medición que tenga alguno.
  const iFigura = ms.findLastIndex((m) => PERIMETROS.some((c) => m[c] != null))
  const figura = iFigura < 0 ? null : ms[iFigura]
  const previasFigura = ms.slice(0, Math.max(0, iFigura))

  // Una medida sin lado solo se dibuja si esa extremidad no tiene ninguna medida por lado.
  const ocultas = new Set<CampoPerimetro>(LADOS.filter((l) => figura?.[l.izq] != null || figura?.[l.der] != null).map((l) => l.sinLado))
  const medidas: MedidaFigura[] = PERIMETROS.flatMap((campo) => {
    const valor = figura?.[campo]
    if (valor == null || ocultas.has(campo)) return []
    const previa = [...previasFigura].reverse().find((m) => m[campo] != null)
    return [{ campo, valor, cambio: previa ? diferencia(valor, previa[campo]!) : null }]
  })

  const asimetrias: Asimetria[] = LADOS.flatMap((l) => {
    const izq = figura?.[l.izq]
    const der = figura?.[l.der]
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
    tono: tonoDe('pesoKg', cambioPeso, tendencia, p),
    nota: null,
    ultimaPesada: ultima.pesoKg,
    clasificacion: null,
    referencia: null,
    fecha: ultima.fecha,
  }

  const otras: TarjetaFicha[] = CLAVES.flatMap((clave) => {
    // Cada medida sale de la última medición que la tenga: una pesada sola no borra la grasa visceral del informe anterior.
    const i = ms.findLastIndex((m) => dato(p, m, clave) != null)
    if (i < 0) return []
    const fuente = ms[i]
    const actual = dato(p, fuente, clave)!
    // La comparación es con la medición anterior que tenga el dato, y solo del mismo origen (medido o estimado).
    const previa = ms.slice(0, i).reverse().find((m) => dato(p, m, clave)?.estimada === actual.estimada)
    const cambio = previa ? diferencia(actual.valor, dato(p, previa, clave)!.valor) : null
    const tono = tonoDe(clave, cambio, actual.valor, p)
    const medidaConEstado = CON_ESTADO[clave]
    return [
      {
        clave,
        valor: actual.valor,
        estimada: actual.estimada,
        cambio,
        desde: cambio == null ? null : previa!.fecha,
        tono,
        nota: clave === 'grasaVisceral' && tono === 'atencion' ? 'Elevada' : null,
        clasificacion: medidaConEstado
          ? clasificar(medidaConEstado, medidaConEstado === 'musculoPct' ? (actual.valor / fuente.pesoKg) * 100 : actual.valor, p, fuente.fecha)
          : null,
        referencia: referencia(clave, actual.valor, fuente),
        fecha: fuente.fecha,
      },
    ]
  })

  return {
    ultima,
    fechaPerimetros: figura?.fecha ?? null,
    medidas,
    asimetrias,
    tarjetas: [tarjetaPeso, ...otras],
    serie: serieCompleta.slice(-MEDICIONES_EN_TENDENCIA),
    meta: p.metaPesoKg == null ? null : proyeccionMeta(serieCompleta, p.metaPesoKg, opciones.hoy),
    mensaje: interpretar(p, ms)[0] ?? null,
  }
}
