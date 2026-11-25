import { derivar } from './metrics'
import { fechaLegible, formatear } from './numbers'
import type { CampoNumerico, Medicion, Persona } from './types'

/**
 * Lectura de la cinta: los perímetros dicen mejor que la báscula cómo cambia el cuerpo.
 * Todo cambio cuenta, aunque sea mínimo (0,1 cm); los menores de 0,5 cm se nombran como leves.
 * Si la báscula no coincide, manda la cinta.
 */

export type BaseCinta = 'anterior' | '4semanas' | 'inicio'
export type Zona = 'cintura' | 'cadera' | 'pecho' | 'cuello' | 'brazo' | 'muslo'
export type Sentido = 'bien' | 'atencion' | 'neutro'
export type Veredicto = 'pierde-musculo' | 'recomposicion' | 'pierde-grasa' | 'gana-grasa' | 'gana-musculo' | 'estable' | 'faltan'

export interface CambioCinta {
  zona: Zona
  /** El campo que abre la pantalla de esa medida. */
  campo: CampoNumerico
  valor: number
  desde: string
  cambio: number
  leve: boolean
  sentido: Sentido
  /** Toda la historia de esa zona, para la mini línea. */
  historia: { fecha: string; valor: number }[]
}

export interface LecturaCinta {
  fecha: string
  desde: string | null
  base: BaseCinta
  cambios: CambioCinta[]
  veredicto: Veredicto
  tono: Sentido
  titulo: string
  texto: string
  contraste: { coincide: boolean; texto: string } | null
  faltanMedidas: Zona[]
}

export const ZONAS: Zona[] = ['cintura', 'cadera', 'pecho', 'cuello', 'brazo', 'muslo']
export const NOMBRE_ZONA: Record<Zona, string> = { cintura: 'Cintura', cadera: 'Cadera', pecho: 'Pecho', cuello: 'Cuello', brazo: 'Brazos', muslo: 'Muslos' }
const TORSO: Zona[] = ['cintura', 'cadera', 'pecho', 'cuello']
const LADOS: Partial<Record<Zona, { sinLado: CampoNumerico; izq: CampoNumerico; der: CampoNumerico }>> = {
  brazo: { sinLado: 'brazoCm', izq: 'brazoIzqCm', der: 'brazoDerCm' },
  muslo: { sinLado: 'musloCm', izq: 'musloIzqCm', der: 'musloDerCm' },
}
const CAMPO: Record<Exclude<Zona, 'brazo' | 'muslo'>, CampoNumerico> = { cintura: 'cinturaCm', cadera: 'caderaCm', pecho: 'pechoCm', cuello: 'cuelloCm' }
const LEVE_CM = 0.5
const PESO_ESTABLE_KG = 0.5

const r1 = (x: number) => Math.round(x * 10) / 10

function valorZona(m: Medicion, z: Zona): number | null {
  const l = LADOS[z]
  if (!l) return m[CAMPO[z as keyof typeof CAMPO]] ?? null
  const lados = [m[l.izq], m[l.der]].filter((v): v is number => v != null)
  if (lados.length) return lados.reduce((s, v) => s + v, 0) / lados.length
  return m[l.sinLado] ?? null
}

function campoZona(m: Medicion, z: Zona): CampoNumerico {
  const l = LADOS[z]
  if (!l) return CAMPO[z as keyof typeof CAMPO]
  return m[l.sinLado] != null ? l.sinLado : m[l.der] != null ? l.der : l.izq
}

function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha + 'T00:00:00Z') + dias * 86_400_000).toISOString().slice(0, 10)
}

function medicionBase(previas: Medicion[], z: Zona, base: BaseCinta, fecha: string): Medicion | null {
  const con = previas.filter((m) => valorZona(m, z) != null)
  if (!con.length) return null
  if (base === 'inicio') return con[0]
  if (base === 'anterior') return con[con.length - 1]
  const limite = sumarDias(fecha, -28)
  return [...con].reverse().find((m) => m.fecha <= limite) ?? con[0]
}

function plural(z: Zona, m: Medicion) {
  const l = LADOS[z]
  return l != null && (m[l.izq] != null || m[l.der] != null)
}

function frase(c: CambioCinta, ultima: Medicion): string {
  const pl = plural(c.zona, ultima)
  const nombre = (pl ? 'tus ' : 'tu ') + (pl ? NOMBRE_ZONA[c.zona].toLowerCase() : NOMBRE_ZONA[c.zona].toLowerCase().replace(/s$/, ''))
  if (c.cambio === 0) return `${nombre} sin cambio`
  const verbo = c.cambio < 0 ? (pl ? 'bajaron' : 'bajó') : pl ? 'subieron' : 'subió'
  return `${nombre} ${verbo}${c.leve ? ' levemente' : ''} ${formatear(Math.abs(c.cambio))} cm`
}

const kg = (x: number) => `${x < 0 ? '−' : '+'}${formatear(Math.abs(x))} kg`

export function leerCinta(p: Persona, mediciones: Medicion[], base: BaseCinta = 'anterior'): LecturaCinta | null {
  const ms = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const iUlt = ms.findLastIndex((m) => ZONAS.some((z) => valorZona(m, z) != null))
  if (iUlt < 0) return null
  const ult = ms[iUlt]
  const previas = ms.slice(0, iUlt).filter((m) => m.fecha < ult.fecha)

  // Peso: se mira en el tramo de la cintura (o de la primera zona que tenga base).
  const bases = new Map<Zona, Medicion>()
  for (const z of ZONAS) {
    if (valorZona(ult, z) == null) continue
    const b = medicionBase(previas, z, base, ult.fecha)
    if (b) bases.set(z, b)
  }
  const ref = bases.get('cintura') ?? [...bases.values()][0] ?? null
  const dPeso = ref ? ult.pesoKg - ref.pesoKg : 0
  const dCintura = bases.has('cintura') ? r1(valorZona(ult, 'cintura')! - valorZona(bases.get('cintura')!, 'cintura')!) : 0

  const cambios: CambioCinta[] = []
  for (const z of ZONAS) {
    const v = valorZona(ult, z)
    const b = bases.get(z)
    if (v == null || !b) continue
    const cambio = r1(v - valorZona(b, z)!)
    let sentido: Sentido = 'neutro'
    if (cambio !== 0) {
      if (TORSO.includes(z)) sentido = cambio < 0 ? 'bien' : 'atencion'
      else if (cambio > 0) sentido = dCintura > 0 ? 'neutro' : 'bien'
      else sentido = dPeso < 0 ? 'atencion' : 'neutro'
    }
    const historia = ms.filter((m) => m.fecha <= ult.fecha && valorZona(m, z) != null).map((m) => ({ fecha: m.fecha, valor: r1(valorZona(m, z)!) }))
    cambios.push({ zona: z, campo: campoZona(ult, z), valor: r1(v), desde: b.fecha, cambio, leve: cambio !== 0 && Math.abs(cambio) < LEVE_CM, sentido, historia })
  }

  const faltanMedidas = (['cintura', 'cadera', 'brazo', 'muslo'] as Zona[]).filter((z) => valorZona(ult, z) == null)
  const de = (z: Zona) => cambios.find((c) => c.zona === z)
  const extremidades = cambios.filter((c) => c.zona === 'brazo' || c.zona === 'muslo')
  const bajanExt = extremidades.some((c) => c.cambio < 0)
  const subenExt = extremidades.some((c) => c.cambio > 0)
  const bajaCintura = (de('cintura')?.cambio ?? 0) < 0
  const bajaCadera = (de('cadera')?.cambio ?? 0) < 0
  const subeCintura = (de('cintura')?.cambio ?? 0) > 0

  let veredicto: Veredicto
  if (!cambios.length) veredicto = 'faltan'
  else if (bajanExt && dPeso < 0) veredicto = 'pierde-musculo'
  else if (Math.abs(dPeso) <= PESO_ESTABLE_KG && bajaCintura && extremidades.length > 0 && !bajanExt) veredicto = 'recomposicion'
  else if ((bajaCintura || bajaCadera) && !subeCintura) veredicto = 'pierde-grasa'
  else if (subeCintura) veredicto = 'gana-grasa'
  else if (subenExt) veredicto = 'gana-musculo'
  else veredicto = 'estable'

  const tono: Sentido =
    veredicto === 'pierde-grasa' || veredicto === 'recomposicion' || veredicto === 'gana-musculo' ? 'bien' : veredicto === 'pierde-musculo' || veredicto === 'gana-grasa' ? 'atencion' : 'neutro'
  const hayCambios = cambios.some((c) => c.cambio !== 0)
  const TITULO: Record<Veredicto, string> = {
    'pierde-grasa': extremidades.length && !bajanExt ? 'Pierdes grasa y conservas músculo' : 'Estás perdiendo grasa',
    recomposicion: 'Recomposición: menos grasa, más músculo',
    'pierde-musculo': 'Posible pérdida de músculo',
    'gana-grasa': 'Tu cintura está subiendo',
    'gana-musculo': 'Estás ganando músculo',
    estable: hayCambios ? 'Cambios sin un patrón claro' : 'Tu cuerpo se mantiene',
    faltan: 'Falta una segunda medición con cinta',
  }
  const CIERRE: Record<Veredicto, string> = {
    'pierde-grasa': 'La cintura es la mejor señal de grasa: vas bien.',
    recomposicion: 'El peso casi no se movió, pero tu cuerpo sí: cambias grasa por músculo.',
    'pierde-musculo': 'Brazos o muslos bajan junto con el peso: puede ser músculo. Sube la proteína y entrena fuerza.',
    'gana-grasa': 'La cintura es la mejor señal de grasa: si no buscas subir, revisa cuánto comes.',
    'gana-musculo': 'Brazos o muslos suben sin que suba la cintura: buena señal de músculo.',
    estable: hayCambios ? 'Sigue midiendo igual cada semana para ver hacia dónde va.' : 'Tus medidas no cambiaron.',
    faltan: 'Mide tu cintura, cadera, brazos y muslos la próxima semana para comparar.',
  }
  const desde = ref?.fecha ?? null
  const lista = cambios.map((c) => frase(c, ult)).join(', ')
  const texto = veredicto === 'faltan' ? CIERRE.faltan : `Desde el ${fechaLegible(desde!).slice(0, 5)}: ${lista}. ${CIERRE[veredicto]}`

  // Contraste con la báscula: solo con % de grasa medido (no estimado con la cinta) en las dos fechas.
  let contraste: LecturaCinta['contraste'] = null
  if (ref && veredicto !== 'faltan' && veredicto !== 'estable') {
    const a = derivar(p, ref)
    const b = derivar(p, ult)
    if (!a.grasaEstimada && !b.grasaEstimada && a.masaGrasaKg != null && b.masaGrasaKg != null && a.masaMagraKg != null && b.masaMagraKg != null) {
      const dg = b.masaGrasaKg - a.masaGrasaKg
      const dm = b.masaMagraKg - a.masaMagraKg
      const coincide =
        veredicto === 'pierde-grasa' || veredicto === 'recomposicion' ? dg <= 0 : veredicto === 'gana-grasa' ? dg >= 0 : veredicto === 'pierde-musculo' ? dm <= 0 : dm >= 0
      contraste = {
        coincide,
        texto: coincide
          ? `La báscula coincide: grasa ${kg(dg)}, masa magra ${kg(dm)}.`
          : `La báscula dice otra cosa (grasa ${kg(dg)}, masa magra ${kg(dm)}). Manda la cinta: el % de la báscula varía con el agua del día y la cinta mide tu cuerpo directamente.`,
      }
    }
  }

  return { fecha: ult.fecha, desde, base, cambios, veredicto, tono, titulo: TITULO[veredicto], texto, contraste, faltanMedidas }
}
