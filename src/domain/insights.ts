import { derivar } from './metrics'
import { diasEntre, fechaLegible, formatear } from './numbers'
import type { Medicion, Persona } from './types'

export type Tono = 'bien' | 'atencion' | 'neutro'
export type Codigo =
  | 'primera_medicion'
  | 'recomposicion'
  | 'baja_peso_grasa'
  | 'baja_sin_datos'
  | 'pierde_musculo'
  | 'ritmo_rapido'
  | 'gana_musculo'
  | 'gana_grasa'
  | 'sube_sin_datos'
  | 'sin_cambios'
  | 'tendencia'
  | 'desde_inicio'
  | 'alerta_cintura'
  | 'alerta_visceral'
  | 'imc'

export interface Mensaje {
  tono: Tono
  codigo: Codigo
  titulo: string
  texto: string
}

export const NOTA_ORIENTACION =
  'Orientación general, no diagnóstico médico. Las cifras de bioimpedancia son estimaciones: lo que importa es la tendencia.'

const CINTURA_RELEVANTE = 1
const MUSCULO_SUBE = 0.3
const MUSCULO_BAJA = 0.5
const GRASA_SUBE = 0.5
const RITMO_RAPIDO_PCT = 1
const VISCERAL_ALTA = 10

const NOMBRE_IMC = {
  bajo_peso: 'bajo peso',
  normal: 'peso normal',
  sobrepeso: 'sobrepeso',
  obesidad: 'obesidad',
} as const

const abs = (n: number, decimales = 1) => formatear(Math.abs(n), decimales)
const delta = (a: number | undefined, b: number | undefined) => (a == null || b == null ? null : b - a)
const subioBajo = (d: number) => (d > 0 ? 'subió' : 'bajó')

function deltaGrasa(p: Persona, a: Medicion, b: Medicion): number | null {
  const da = derivar(p, a)
  const db = derivar(p, b)
  if (da.grasaPct == null || db.grasaPct == null || da.grasaEstimada !== db.grasaEstimada) return null
  return db.grasaPct - da.grasaPct
}

function promedio(valores: (number | undefined | null)[]): number | null {
  const v = valores.filter((x): x is number => x != null)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

function compararUltimas(p: Persona, ant: Medicion, ult: Medicion): Mensaje[] {
  const out: Mensaje[] = []
  const dPeso = ult.pesoKg - ant.pesoKg
  const estable = Math.abs(dPeso) < Math.max(0.4, ant.pesoKg * 0.005)
  const dCintura = delta(ant.cinturaCm, ult.cinturaCm)
  const dMusculo = delta(ant.musculoKg, ult.musculoKg)
  const dGrasa = deltaGrasa(p, ant, ult)

  if (estable) {
    if (dCintura != null && dCintura <= -CINTURA_RELEVANTE) {
      out.push({
        tono: 'bien',
        codigo: 'recomposicion',
        titulo: 'Mismo peso, menos cintura',
        texto: `Tu peso casi no cambió (${formatear(ult.pesoKg)} kg) pero tu cintura bajó ${abs(dCintura)} cm. Lo más probable es que hayas perdido grasa y mantenido o ganado masa muscular.`,
      })
    } else {
      const cintura =
        dCintura == null
          ? ''
          : Math.abs(dCintura) < CINTURA_RELEVANTE
            ? ' y tu cintura tampoco cambió de forma relevante'
            : ` aunque tu cintura ${subioBajo(dCintura)} ${abs(dCintura)} cm; mira si se repite la próxima semana`
      out.push({
        tono: 'neutro',
        codigo: 'sin_cambios',
        titulo: 'Sin cambios esta semana',
        texto: `Tu peso se mantuvo en ${formatear(ult.pesoKg)} kg${cintura}.`,
      })
    }
    return out
  }

  if (dPeso < 0) {
    const bajaGrasa = dGrasa != null && dGrasa < 0
    const bajaCintura = dCintura != null && dCintura < 0
    if (bajaGrasa || bajaCintura) {
      const detalles = [
        bajaGrasa ? `tu grasa corporal bajó ${abs(dGrasa!)} puntos` : null,
        bajaCintura ? `tu cintura bajó ${abs(dCintura!)} cm` : null,
      ].filter(Boolean)
      out.push({
        tono: 'bien',
        codigo: 'baja_peso_grasa',
        titulo: 'Bajaste peso y grasa',
        texto: `Bajaste ${abs(dPeso)} kg y ${detalles.join(' y ')}. Lo que estás haciendo funciona.`,
      })
    } else {
      out.push({
        tono: 'neutro',
        codigo: 'baja_sin_datos',
        titulo: `Bajaste ${abs(dPeso)} kg`,
        texto: 'Registra también la cintura o el % de grasa para saber si lo que bajaste fue grasa.',
      })
    }
    if (dMusculo != null && dMusculo <= -MUSCULO_BAJA) {
      out.push({
        tono: 'atencion',
        codigo: 'pierde_musculo',
        titulo: 'Parte de lo que bajaste es músculo',
        texto: `Tu masa muscular bajó ${abs(dMusculo)} kg. Revisa que estés comiendo suficiente proteína y haciendo ejercicio de fuerza.`,
      })
    }
    const dias = Math.max(1, diasEntre(ant.fecha, ult.fecha))
    const ritmo = ((-dPeso / ant.pesoKg) * 100 * 7) / dias
    if (ritmo > RITMO_RAPIDO_PCT) {
      out.push({
        tono: 'atencion',
        codigo: 'ritmo_rapido',
        titulo: 'Estás bajando muy rápido',
        texto: `Vas a un ritmo de ${formatear(ritmo)} % de tu peso por semana. Sobre 1 % semanal es más fácil perder músculo y recuperar el peso después.`,
      })
    }
    return out
  }

  const subeMusculo = dMusculo != null && dMusculo >= MUSCULO_SUBE
  const subeCintura = dCintura != null && dCintura >= CINTURA_RELEVANTE
  const subeGrasa = dGrasa != null && dGrasa >= GRASA_SUBE
  if (subeMusculo && !subeCintura) {
    out.push({
      tono: 'bien',
      codigo: 'gana_musculo',
      titulo: 'Subiste de peso, probablemente músculo',
      texto: `Subiste ${abs(dPeso)} kg y tu masa muscular subió ${abs(dMusculo!)} kg sin que aumentara tu cintura.`,
    })
  } else if (subeCintura || subeGrasa) {
    const detalles = [
      subeCintura ? `tu cintura subió ${abs(dCintura!)} cm` : null,
      subeGrasa ? `tu grasa corporal subió ${abs(dGrasa!)} puntos` : null,
    ].filter(Boolean)
    out.push({
      tono: 'atencion',
      codigo: 'gana_grasa',
      titulo: 'Subiste peso y grasa',
      texto: `Subiste ${abs(dPeso)} kg y ${detalles.join(' y ')}. Lo más probable es que sea grasa; revisa porciones y actividad de esta semana.`,
    })
  } else {
    out.push({
      tono: 'neutro',
      codigo: 'sube_sin_datos',
      titulo: `Subiste ${abs(dPeso)} kg`,
      texto: 'Una semana sola no dice mucho: el agua, la sal o el ciclo menstrual mueven el peso. Mira la tendencia de varias semanas.',
    })
  }
  return out
}

function tendencia(p: Persona, ms: Medicion[]): Mensaje | null {
  if (ms.length < 4) return null
  const k = Math.min(4, Math.floor(ms.length / 2))
  const recientes = ms.slice(-k)
  const previas = ms.slice(-2 * k, -k)
  const partes: string[] = []
  const dPeso = promedio(recientes.map((x) => x.pesoKg))! - promedio(previas.map((x) => x.pesoKg))!
  partes.push(`peso ${subioBajo(dPeso)} ${abs(dPeso)} kg`)
  const cR = promedio(recientes.map((x) => x.cinturaCm))
  const cP = promedio(previas.map((x) => x.cinturaCm))
  if (cR != null && cP != null) partes.push(`cintura ${subioBajo(cR - cP)} ${abs(cR - cP)} cm`)
  const medida = (x: Medicion) => derivar(p, x)
  const soloMedida = [...recientes, ...previas].every((x) => !medida(x).grasaEstimada)
  const gR = promedio(recientes.map((x) => medida(x).grasaPct))
  const gP = promedio(previas.map((x) => medida(x).grasaPct))
  if (soloMedida && gR != null && gP != null) partes.push(`grasa ${subioBajo(gR - gP)} ${abs(gR - gP)} puntos`)
  return {
    tono: 'neutro',
    codigo: 'tendencia',
    titulo: `Promedio de tus últimas ${k} mediciones`,
    texto: `Frente a las ${k} anteriores: ${partes.join(', ')}.`,
  }
}

function desdeInicio(p: Persona, primera: Medicion, ult: Medicion): Mensaje {
  const partes = [`peso ${subioBajo(ult.pesoKg - primera.pesoKg)} ${abs(ult.pesoKg - primera.pesoKg)} kg`]
  const dC = delta(primera.cinturaCm, ult.cinturaCm)
  if (dC != null) partes.push(`cintura ${subioBajo(dC)} ${abs(dC)} cm`)
  const dG = deltaGrasa(p, primera, ult)
  if (dG != null) partes.push(`grasa ${subioBajo(dG)} ${abs(dG)} puntos`)
  return {
    tono: 'neutro',
    codigo: 'desde_inicio',
    titulo: 'Desde que empezaste',
    texto: `Desde el ${fechaLegible(primera.fecha)}: ${partes.join(', ')}.`,
  }
}

export function interpretar(p: Persona, mediciones: Medicion[]): Mensaje[] {
  const ms = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (ms.length === 0) return []
  if (ms.length === 1) {
    return [
      {
        tono: 'neutro',
        codigo: 'primera_medicion',
        titulo: 'Primera medición registrada',
        texto: 'Registra una segunda medición la próxima semana para ver tu evolución.',
      },
    ]
  }
  const ult = ms[ms.length - 1]
  const out = compararUltimas(p, ms[ms.length - 2], ult)
  const t = tendencia(p, ms)
  if (t) out.push(t)
  if (ms.length >= 3) out.push(desdeInicio(p, ms[0], ult))

  const d = derivar(p, ult)
  if (d.cinturaEstatura != null && d.cinturaEstatura > 0.5) {
    out.push({
      tono: 'atencion',
      codigo: 'alerta_cintura',
      titulo: 'Tu cintura supera la mitad de tu estatura',
      texto: `Mides ${formatear(ult.cinturaCm!)} cm de cintura y ${formatear(p.estaturaCm, 0)} cm de estatura. Mantener la cintura bajo ${formatear(p.estaturaCm / 2)} cm se asocia a menor riesgo cardiovascular.`,
    })
  }
  if (ult.grasaVisceral != null && ult.grasaVisceral >= VISCERAL_ALTA) {
    out.push({
      tono: 'atencion',
      codigo: 'alerta_visceral',
      titulo: 'Grasa visceral elevada',
      texto: `Tu báscula marca nivel ${formatear(ult.grasaVisceral, 0)}. En la escala habitual de las básculas domésticas, 10 o más se considera alto.`,
    })
  }
  if (d.imc != null && d.categoriaImc != null) {
    out.push({
      tono: 'neutro',
      codigo: 'imc',
      titulo: `IMC ${formatear(d.imc)}`,
      texto: `Corresponde a la categoría de ${NOMBRE_IMC[d.categoriaImc]}. El IMC no distingue músculo de grasa, así que míralo junto con la cintura.`,
    })
  }
  return out
}
