import { consumoVigente } from './consumo'
import { estimarGasto, ritmoSemanalPct, RITMO_OBJETIVO_PCT, serieDePeso, type EstimacionGasto } from './energia'
import { esMenor } from './insights'
import { derivar } from './metrics'
import { diasEntre } from './numbers'
import type { Medicion, Persona } from './types'

export type CodigoAccion = 'muy-rapido' | 'proteger-musculo' | 'estancado' | 'reduce' | 'anota-consumo' | 'sigue-anotando' | 'vas-bien'
export interface Accion {
  codigo: CodigoAccion
  texto: string
}
export interface Revision {
  codigo: CodigoAccion
  cumplida: boolean
  texto: string
}
export interface InformeSemanal {
  fecha: string
  anterior: string | null
  cambioTendenciaKg: number | null
  composicion: { grasaKg: number; magraKg: number } | null
  composicionTotal: { desde: string; grasaKg: number; magraKg: number } | null
  barras: { fecha: string; grasaKg: number; magraKg: number }[]
  atipica: { diferenciaKg: number; sentido: 'sobre' | 'bajo' } | null
  /** Null para menores o datos viejos. */
  gasto: EstimacionGasto | null
  acciones: Accion[]
  revision: Revision[]
  vieja: boolean
}

const MAX_ACCIONES = 2
const DIAS_VIEJA = 28
const CAIDA_MAGRA_KG = 0.5
const kcal = (n: number) => `${n.toLocaleString('es-CL')} kcal`
const redondear5 = (x: number) => Math.round(x / 5) * 5

function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha + 'T00:00:00Z') + dias * 86_400_000).toISOString().slice(0, 10)
}

/** Una medición por fecha (la última guardada de ese día), en orden. */
function porFecha(ms: Medicion[]): Medicion[] {
  const mapa = new Map<string, Medicion>()
  for (const m of ms) mapa.set(m.fecha, m)
  return [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

function grasaYMagra(p: Persona, m: Medicion) {
  const d = derivar(p, m)
  return d.masaGrasaKg == null || d.masaMagraKg == null ? null : { grasaKg: d.masaGrasaKg, magraKg: d.masaMagraKg, estimada: d.grasaEstimada }
}

function diferencia(p: Persona, a: Medicion, b: Medicion) {
  const da = grasaYMagra(p, a)
  const db = grasaYMagra(p, b)
  if (!da || !db || da.estimada !== db.estimada) return null
  return { grasaKg: db.grasaKg - da.grasaKg, magraKg: db.magraKg - da.magraKg }
}

/** % de peso por semana de la tendencia en las últimas 3 semanas; null si no hay 3 semanas de datos. */
function ritmoTresSemanas(ms: Medicion[]): number | null {
  const serie = serieDePeso(ms)
  const ultima = serie[serie.length - 1]
  const base = [...serie].reverse().find((s) => s.fecha <= sumarDias(ultima.fecha, -21))
  if (!base) return null
  return (((ultima.tendencia - base.tendencia) / diasEntre(base.fecha, ultima.fecha)) * 7 * 100) / ultima.tendencia
}

function rangoProteina(p: Persona, pesoTendencia: number): [number, number] {
  const m2 = (p.estaturaCm / 100) ** 2
  const peso = p.estaturaCm > 0 && pesoTendencia / m2 >= 30 ? 25 * m2 : pesoTendencia
  return [redondear5(1.6 * peso), redondear5(2.2 * peso)]
}

interface Contexto {
  p: Persona
  ritmo: number | null
  composicion: InformeSemanal['composicion']
  caidaMusculo: boolean
  consumo: number | null
  gasto: EstimacionGasto | null
  pesoTendencia: number
  ms: Medicion[]
}

function decidirAcciones(c: Contexto): Accion[] {
  const { p, ritmo, composicion, gasto, consumo } = c
  const ok = gasto?.estado === 'ok' ? gasto : null
  const sinEstimacion = consumo != null && !ok
  const semanasFaltan = () => {
    const f = gasto?.estado === 'faltan' ? Math.max(gasto.faltanDias, gasto.faltanDiasConsumo, gasto.faltanPesadas * 7) : 21
    const n = Math.max(1, Math.ceil(f / 7))
    return `${n} ${n === 1 ? 'semana' : 'semanas'}`
  }
  const sigueAnotando: Accion = { codigo: 'sigue-anotando', texto: `Sigue anotando tu consumo: en unas ${semanasFaltan()} podré estimar tu gasto real.` }
  const r: Accion[] = []

  if (ritmo != null && ritmo < -1) {
    r.push({ codigo: 'muy-rapido', texto: ok ? `Vas muy rápido: sube a ~${kcal(ok.recomendadaKcal)} al día.` : 'Vas muy rápido: come un poco más para no perder músculo.' })
  }
  if ((composicion && composicion.magraKg <= -CAIDA_MAGRA_KG) || c.caidaMusculo) {
    const [a, b] = rangoProteina(p, c.pesoTendencia)
    r.push({ codigo: 'proteger-musculo', texto: `Protege tu músculo: 1,6–2,2 g de proteína por kg (${a}–${b} g al día) y 2–3 sesiones de fuerza por semana.` })
  }
  const tres = p.objetivo === 'bajar_grasa' ? ritmoTresSemanas(c.ms) : null
  if (tres != null && tres > -0.25) {
    r.push(ok ? { codigo: 'estancado', texto: `Te estancaste: baja a ~${kcal(ok.recomendadaKcal)} al día.` } : sinEstimacion ? sigueAnotando : { codigo: 'estancado', texto: 'Te estancaste: anota tu consumo para recomendarte kcal.' })
  }
  if (p.objetivo === 'ganar_musculo' && composicion && composicion.grasaKg > 0 && composicion.grasaKg > composicion.magraKg) {
    r.push(ok ? { codigo: 'reduce', texto: `Reduce un poco: ~${kcal(ok.recomendadaKcal)} al día.` } : sinEstimacion ? sigueAnotando : { codigo: 'reduce', texto: 'Reduce un poco lo que comes: la grasa sube más que el músculo.' })
  }
  if (consumo == null) r.push({ codigo: 'anota-consumo', texto: 'Anota cuánto comes al día para estimar tu gasto real.' })
  if (!r.length) {
    if (sinEstimacion) r.push(sigueAnotando)
    else if (ok && consumo != null && Math.abs(consumo - ok.recomendadaKcal) <= 150) r.push({ codigo: 'vas-bien', texto: `Vas bien: sigue con tu consumo actual (~${kcal(consumo)}).` })
    else if (ok) r.push({ codigo: 'vas-bien', texto: `Vas bien: apunta a ~${kcal(ok.recomendadaKcal)} al día.` })
    else r.push({ codigo: 'vas-bien', texto: 'Vas bien: sigue así.' })
  }
  const vistos = new Set<CodigoAccion>()
  return r.filter((a) => !vistos.has(a.codigo) && vistos.add(a.codigo)).slice(0, MAX_ACCIONES)
}

function revisar(previa: Accion, c: Contexto): Revision | null {
  const { ritmo, composicion } = c
  switch (previa.codigo) {
    case 'muy-rapido':
      if (ritmo == null) return null
      return ritmo >= -1 ? { codigo: previa.codigo, cumplida: true, texto: 'Ya no bajas tan rápido.' } : { codigo: previa.codigo, cumplida: false, texto: 'Sigues bajando más de 1 % por semana.' }
    case 'proteger-musculo': {
      const cae = (composicion != null && composicion.magraKg <= -CAIDA_MAGRA_KG) || c.caidaMusculo
      return cae ? { codigo: previa.codigo, cumplida: false, texto: 'Tu masa magra volvió a bajar.' } : { codigo: previa.codigo, cumplida: true, texto: 'Tu masa magra se mantuvo.' }
    }
    case 'estancado':
      if (ritmo == null) return null
      return ritmo <= -0.25 ? { codigo: previa.codigo, cumplida: true, texto: 'Saliste del estancamiento.' } : { codigo: previa.codigo, cumplida: false, texto: 'Sigues estancado.' }
    case 'reduce': {
      const sube = composicion != null && composicion.grasaKg > 0 && composicion.grasaKg > composicion.magraKg
      return sube ? { codigo: previa.codigo, cumplida: false, texto: 'La grasa sigue subiendo más que el músculo.' } : { codigo: previa.codigo, cumplida: true, texto: 'La grasa ya no sube más que el músculo.' }
    }
    case 'vas-bien': {
      if (ritmo == null) return null
      const dentro = Math.abs(ritmo - RITMO_OBJETIVO_PCT[c.p.objetivo]) <= 0.25
      return dentro ? { codigo: previa.codigo, cumplida: true, texto: 'Seguiste en el ritmo de tu objetivo.' } : { codigo: previa.codigo, cumplida: false, texto: 'Te alejaste del ritmo de tu objetivo.' }
    }
    case 'anota-consumo':
    case 'sigue-anotando':
      return c.consumo != null ? { codigo: previa.codigo, cumplida: true, texto: 'Tienes tu consumo anotado.' } : { codigo: previa.codigo, cumplida: false, texto: 'Aún no anotas tu consumo.' }
  }
}

function informe(p: Persona, todas: Medicion[], hoy: string, conRevision: boolean): InformeSemanal | null {
  const ms = porFecha(todas)
  const ultima = ms[ms.length - 1]
  if (!ultima) return null
  const previa = ms.length > 1 ? ms[ms.length - 2] : null
  const serie = serieDePeso(ms)
  const tendencia = serie[serie.length - 1].tendencia

  const composicion = previa ? diferencia(p, previa, ultima) : null
  const ultimaGyM = grasaYMagra(p, ultima)
  const conGrasa = ultimaGyM ? ms.filter((m) => grasaYMagra(p, m)?.estimada === ultimaGyM.estimada) : []
  const primera = conGrasa[0]
  const total = primera && primera !== ultima ? diferencia(p, primera, ultima) : null

  const antes = serie.length > 1 ? serie[serie.length - 2].tendencia : null
  let atipica: InformeSemanal['atipica'] = null
  if (antes != null) {
    const dif = ultima.pesoKg - antes
    if (Math.abs(dif) > Math.max(1, 0.012 * ultima.pesoKg)) atipica = { diferenciaKg: dif, sentido: dif > 0 ? 'sobre' : 'bajo' }
  }

  const vieja = diasEntre(ultima.fecha, hoy) > DIAS_VIEJA
  const menor = esMenor(p, hoy)
  const gasto = menor || vieja ? null : estimarGasto(p, ms)
  const ctx: Contexto = {
    p,
    ritmo: ritmoSemanalPct(p, ms),
    composicion,
    caidaMusculo: previa?.musculoKg != null && ultima.musculoKg != null && previa.musculoKg - ultima.musculoKg >= CAIDA_MAGRA_KG,
    consumo: consumoVigente(p, hoy),
    gasto,
    pesoTendencia: tendencia,
    ms,
  }
  const acciones = menor || vieja ? [] : decidirAcciones(ctx)

  let revision: Revision[] = []
  if (conRevision && previa && !menor && !vieja) {
    const anterior = informe(p, ms.slice(0, -1), previa.fecha, false)
    revision = (anterior?.acciones ?? []).map((a) => revisar(a, ctx)).filter((r): r is Revision => r != null)
  }

  return {
    fecha: ultima.fecha,
    anterior: previa?.fecha ?? null,
    cambioTendenciaKg: previa ? tendencia - serie[serie.length - 2].tendencia : null,
    composicion,
    composicionTotal: total && primera ? { desde: primera.fecha, ...total } : null,
    barras: conGrasa.map((m) => {
      const g = grasaYMagra(p, m)!
      return { fecha: m.fecha, grasaKg: g.grasaKg, magraKg: g.magraKg }
    }),
    atipica,
    gasto,
    acciones,
    revision,
    vieja,
  }
}

/** "Tu semana": la última medición frente a la anterior, con qué cambió, qué tan confiable es, qué hacer y cómo te fue. */
export function informeSemanal(p: Persona, ms: Medicion[], hoy: string): InformeSemanal | null {
  return informe(p, ms, hoy, true)
}
