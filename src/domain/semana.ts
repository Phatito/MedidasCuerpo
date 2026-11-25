import { conPeso } from './medicion'
import { leerCinta, type LecturaCinta } from './cinta'
import { consumoVigente } from './consumo'
import { estimarGasto, ritmoSemanalPct, RITMO_OBJETIVO_PCT, serieDePeso, type EstimacionGasto } from './energia'
import { derivar } from './metrics'
import { diasEntre } from './numbers'
import { RETENCION_DIARIA } from './trend'
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
  /** Null con datos viejos. */
  gasto: EstimacionGasto | null
  acciones: Accion[]
  revision: Revision[]
  vieja: boolean
  /** Lo que dicen los perímetros frente a la medición anterior con cinta; null sin perímetros. */
  cinta: LecturaCinta | null
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
  /** Hay grasa o músculo en las dos mediciones para comparar. */
  comparable: boolean
  atipica: boolean
  consumo: number | null
  gasto: EstimacionGasto | null
  pesoTendencia: number
  ms: Medicion[]
  /** La lectura de la cinta, solo si es de la última medición (si no, es vieja para decidir esta semana). */
  cinta: LecturaCinta | null
}

function decidirAcciones(c: Contexto): Accion[] {
  const { p, ritmo, composicion, gasto, consumo } = c
  const ok = gasto?.estado === 'ok' ? gasto : null
  const sinEstimacion = consumo != null && !ok
  const semanasFaltan = () => {
    const f = gasto?.estado === 'faltan' ? Math.max(gasto.faltanDias, gasto.faltanDiasConsumo, gasto.faltanPesadas * 7) : 21
    const n = Math.max(1, Math.ceil(f / 7))
    return n === 1 ? '1 semana' : `unas ${n} semanas`
  }
  const sigueAnotando: Accion = { codigo: 'sigue-anotando', texto: `Sigue anotando tu consumo: en ${semanasFaltan()} podré estimar tu gasto real.` }
  const r: Accion[] = []

  if (ritmo != null && ritmo < -1) {
    r.push({ codigo: 'muy-rapido', texto: ok ? `Vas muy rápido: sube a ~${kcal(ok.recomendadaKcal)} al día.` : 'Vas muy rápido: come un poco más para no perder músculo.' })
  }
  // Una pesada atípica suele ser agua: no se lee como pérdida de músculo.
  // La cinta manda: brazos o muslos que bajan con el peso avisan aunque la báscula no lo vea.
  if (!c.atipica && ((composicion && composicion.magraKg <= -CAIDA_MAGRA_KG) || c.caidaMusculo || c.cinta?.veredicto === 'pierde-musculo')) {
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
  if (c.cinta?.veredicto === 'gana-grasa' && p.objetivo !== 'ganar_musculo') {
    r.push(ok ? { codigo: 'reduce', texto: `Reduce un poco: ~${kcal(ok.recomendadaKcal)} al día; tu cintura subió.` } : { codigo: 'reduce', texto: 'Reduce un poco lo que comes: tu cintura subió.' })
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
      const ext = c.cinta?.cambios.filter((x) => x.zona === 'brazo' || x.zona === 'muslo') ?? []
      if (ext.length) {
        const bajan = ext.filter((x) => x.cambio < 0)
        return bajan.length
          ? { codigo: previa.codigo, cumplida: false, texto: `Tus ${bajan.map((x) => (x.zona === 'brazo' ? 'brazos' : 'muslos')).join(' y ')} volvieron a bajar.` }
          : { codigo: previa.codigo, cumplida: true, texto: 'Tus brazos y muslos ya no bajan.' }
      }
      if (!c.comparable) return null
      const cae = (composicion != null && composicion.magraKg <= -CAIDA_MAGRA_KG) || c.caidaMusculo
      return cae ? { codigo: previa.codigo, cumplida: false, texto: 'Tu masa magra volvió a bajar.' } : { codigo: previa.codigo, cumplida: true, texto: 'Tu masa magra se mantuvo.' }
    }
    case 'estancado':
      if (ritmo == null) return null
      return ritmo <= -0.25 ? { codigo: previa.codigo, cumplida: true, texto: 'Saliste del estancamiento.' } : { codigo: previa.codigo, cumplida: false, texto: 'Sigues estancado.' }
    case 'reduce': {
      const cintura = c.cinta?.cambios.find((x) => x.zona === 'cintura')
      if (cintura) return cintura.cambio > 0 ? { codigo: previa.codigo, cumplida: false, texto: 'Tu cintura sigue subiendo.' } : { codigo: previa.codigo, cumplida: true, texto: 'Tu cintura ya no sube.' }
      if (composicion == null) return null
      const sube = composicion != null && composicion.grasaKg > 0 && composicion.grasaKg > composicion.magraKg
      return sube ? { codigo: previa.codigo, cumplida: false, texto: 'La grasa sigue subiendo más que el músculo.' } : { codigo: previa.codigo, cumplida: true, texto: 'La grasa ya no sube más que el músculo.' }
    }
    case 'vas-bien': {
      if (ritmo == null) return null
      const dentro = Math.abs(ritmo - RITMO_OBJETIVO_PCT[c.p.objetivo]) <= 0.25
      return dentro ? { codigo: previa.codigo, cumplida: true, texto: 'Seguiste en el ritmo de tu objetivo.' } : { codigo: previa.codigo, cumplida: false, texto: 'Te alejaste del ritmo de tu objetivo.' }
    }
    case 'sigue-anotando':
      return c.gasto?.estado === 'ok' ? { codigo: previa.codigo, cumplida: true, texto: 'Ya se puede estimar tu gasto real.' } : null
    case 'anota-consumo':
      return c.consumo != null ? { codigo: previa.codigo, cumplida: true, texto: 'Tienes tu consumo anotado.' } : { codigo: previa.codigo, cumplida: false, texto: 'Aún no anotas tu consumo.' }
  }
}

function informe(p: Persona, todas: Medicion[], hoy: string, conRevision: boolean): InformeSemanal | null {
  // "Tu semana" va de pesada a pesada; la cinta se lee de todas las mediciones (también las de solo cinta).
  const conCinta = porFecha(todas)
  const ms = conPeso(conCinta)
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

  // La pesada se compara con la tendencia anterior, proyectada al día de hoy con su ritmo reciente:
  // así quien se pesa cada dos semanas mientras baja parejo no ve un aviso falso.
  let atipica: InformeSemanal['atipica'] = null
  if (serie.length > 1) {
    const a = serie[serie.length - 2]
    const b = serie.length > 2 ? serie[serie.length - 3] : null
    const pendiente = b && diasEntre(b.fecha, a.fecha) > 0 ? (a.tendencia - b.tendencia) / diasEntre(b.fecha, a.fecha) : 0
    // A ritmo parejo la pesada va por delante de la tendencia (que se queda atrás): se compara con la pesada
    // que daría ese ritmo, es decir, el avance de la tendencia dividido por lo que la tendencia alcanza a moverse.
    const dias = Math.max(1, diasEntre(a.fecha, ultima.fecha))
    const esperada = a.tendencia + (pendiente * dias) / (1 - RETENCION_DIARIA ** dias)
    const dif = ultima.pesoKg - esperada
    if (Math.abs(dif) > Math.max(1, 0.012 * ultima.pesoKg)) atipica = { diferenciaKg: dif, sentido: dif > 0 ? 'sobre' : 'bajo' }
  }

  const vieja = diasEntre(ultima.fecha, hoy) > DIAS_VIEJA
  const cinta = leerCinta(p, conCinta, 'anterior')
  const gasto = vieja ? null : estimarGasto(p, ms)
  const ctx: Contexto = {
    p,
    ritmo: ritmoSemanalPct(p, ms),
    composicion,
    caidaMusculo: previa?.musculoKg != null && ultima.musculoKg != null && previa.musculoKg - ultima.musculoKg >= CAIDA_MAGRA_KG,
    comparable: composicion != null || (previa?.musculoKg != null && ultima.musculoKg != null),
    atipica: atipica != null,
    consumo: consumoVigente(p, hoy),
    gasto,
    pesoTendencia: tendencia,
    ms,
    // Cuenta para decidir si es más nueva que la pesada anterior (la cinta puede tomarse otro día).
    cinta: cinta && cinta.fecha > (previa?.fecha ?? '') ? cinta : null,
  }
  const acciones = vieja ? [] : decidirAcciones(ctx)

  let revision: Revision[] = []
  if (conRevision && previa && !vieja) {
    const anterior = informe(p, ms.slice(0, -1), previa.fecha, false)
    // Sin una medición antes de la anterior, la semana pasada no tuvo informe que revisar.
    revision = (anterior?.anterior != null ? anterior.acciones : []).map((a) => revisar(a, ctx)).filter((r): r is Revision => r != null)
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
    cinta,
  }
}

/** "Tu semana": la última medición frente a la anterior, con qué cambió, qué tan confiable es, qué hacer y cómo te fue. */
export function informeSemanal(p: Persona, ms: Medicion[], hoy: string): InformeSemanal | null {
  return informe(p, ms, hoy, true)
}
