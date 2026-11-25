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
  /** Cambio de peso y de cintura en el mismo tramo: con ellos se lee el sentido de cada cambio. */
  dPesoKg: number
  dCinturaCm: number
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

/** La zona del cuerpo a la que pertenece un perímetro. */
export function zonaDeCampo(campo: string): Zona | null {
  for (const z of ZONAS) {
    const l = LADOS[z]
    if (l ? [l.sinLado, l.izq, l.der].includes(campo as CampoNumerico) : CAMPO[z as keyof typeof CAMPO] === campo) return z
  }
  return null
}

/**
 * Qué significa un cambio: en el torso, bajar es bueno (menos grasa); en brazos y muslos, subir es bueno
 * (músculo) salvo que la cintura también suba, y bajar es atención si el peso también baja.
 */
export function sentidoCambio(z: Zona, cambio: number, dPesoKg: number, dCinturaCm: number): Sentido {
  if (cambio === 0) return 'neutro'
  if (TORSO.includes(z)) return cambio < 0 ? 'bien' : 'atencion'
  if (cambio > 0) return dCinturaCm > 0 ? 'neutro' : 'bien'
  return dPesoKg < 0 ? 'atencion' : 'neutro'
}

/** El valor de una zona en una medición: brazos y muslos, promedio de los lados si los hay. */
export function valorZona(m: Medicion, z: Zona): number | null {
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
  const dPeso = ref && ref.pesoKg != null && ult.pesoKg != null ? ult.pesoKg - ref.pesoKg : 0
  const dCintura = bases.has('cintura') ? r1(valorZona(ult, 'cintura')! - valorZona(bases.get('cintura')!, 'cintura')!) : 0

  const cambios: CambioCinta[] = []
  for (const z of ZONAS) {
    const v = valorZona(ult, z)
    const b = bases.get(z)
    if (v == null || !b) continue
    const cambio = r1(v - valorZona(b, z)!)
    const sentido = sentidoCambio(z, cambio, dPeso, dCintura)
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
  // Mensaje corto: un titular cercano, el cambio que más importa (con su número y fecha) y qué hacer.
  // El detalle de cada zona vive en las filas y tarjetas, no en el párrafo.
  const desde = ref?.fecha ?? null
  const dd = desde ? fechaLegible(desde).slice(0, 5) : ''
  const cuanto = (c: CambioCinta) => `${c.leve ? 'levemente ' : ''}${formatear(Math.abs(c.cambio))} cm`
  const nombreDe = (c: CambioCinta) => (plural(c.zona, ult) ? `tus ${NOMBRE_ZONA[c.zona].toLowerCase()}` : `tu ${NOMBRE_ZONA[c.zona].toLowerCase().replace(/s$/, '')}`)
  const verbo = (c: CambioCinta) => (c.cambio < 0 ? (plural(c.zona, ult) ? 'bajaron' : 'bajó') : plural(c.zona, ult) ? 'subieron' : 'subió')
  const mayor = (lista: CambioCinta[]) => [...lista].sort((x, y) => Math.abs(y.cambio) - Math.abs(x.cambio))[0]
  const lista = (cs: CambioCinta[]) => {
    const n = cs.map((c) => NOMBRE_ZONA[c.zona].toLowerCase())
    return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
  }
  const cintura = de('cintura')
  const mismas = (signo: number, salvo: CambioCinta | undefined) => cambios.filter((c) => c !== salvo && Math.sign(c.cambio) === signo)
  const MAYUS = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

  let titulo: string
  let texto: string
  switch (veredicto) {
    case 'gana-grasa': {
      const otras = mismas(1, cintura)
      titulo = 'Ojo con la cintura'
      texto = `Subió ${cuanto(cintura!)} desde el ${dd}${otras.length ? `, junto con ${lista(otras)}` : ''}. Si no buscas subir, ajusta un poco lo que comes esta semana.`
      break
    }
    case 'pierde-grasa': {
      const clave = cintura && cintura.cambio < 0 ? cintura : de('cadera')!
      const ext = extremidades.length ? (subenExt ? ` y tus ${lista(extremidades.filter((c) => c.cambio > 0))} subieron` : ` y tus ${lista(extremidades)} se mantienen`) : ''
      titulo = '¡Vas perdiendo grasa!'
      texto = `${MAYUS(nombreDe(clave))} ${verbo(clave)} ${cuanto(clave)} desde el ${dd}${ext}. Sigue así.`
      break
    }
    case 'recomposicion': {
      const suben = extremidades.filter((c) => c.cambio > 0)
      titulo = 'Cambias grasa por músculo'
      texto = `El peso casi no se movió, pero la cintura bajó ${cuanto(cintura!)}${suben.length ? ` y tus ${lista(suben)} subieron` : ''}. Muy buena señal.`
      break
    }
    case 'pierde-musculo': {
      const c = mayor(extremidades.filter((x) => x.cambio < 0))
      titulo = 'Cuida tu músculo'
      texto = `${MAYUS(nombreDe(c))} ${verbo(c)} ${cuanto(c)} junto con el peso. Suma proteína y entrena fuerza esta semana.`
      break
    }
    case 'gana-musculo': {
      const c = mayor(extremidades.filter((x) => x.cambio > 0))
      titulo = 'Estás ganando músculo'
      texto = `${MAYUS(nombreDe(c))} ${verbo(c)} ${cuanto(c)} y la cintura no. Vas bien.`
      break
    }
    case 'estable':
      titulo = hayCambios ? 'Cambios mínimos' : 'Todo se mantiene'
      texto = hayCambios ? `Pequeños movimientos desde el ${dd}, sin un patrón claro. Sigue midiendo cada semana.` : `Sin cambios desde el ${dd}. Sigue midiendo cada semana.`
      break
    default:
      titulo = 'Falta una segunda medición con cinta'
      texto = 'Mide cintura, cadera, brazos y muslos la próxima semana para comparar.'
  }

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
          ? `La báscula coincide (grasa ${kg(dg)}).`
          : `La báscula dice otra cosa (grasa ${kg(dg)}): confía en la cinta, la báscula varía con el agua del día.`,
      }
    }
  }

  return { fecha: ult.fecha, desde, base, cambios, veredicto, tono, titulo, texto, contraste, faltanMedidas, dPesoKg: r1(dPeso), dCinturaCm: dCintura }
}
