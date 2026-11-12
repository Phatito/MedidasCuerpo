export type Sexo = 'hombre' | 'mujer'
export type Objetivo = 'bajar_grasa' | 'ganar_musculo' | 'mantener'

export interface Persona {
  id: string
  nombre: string
  sexo: Sexo
  fechaNacimiento: string
  estaturaCm: number
  objetivo: Objetivo
  creadaEn: string
  /** Peso objetivo opcional, en kg. */
  metaPesoKg?: number
}

export interface Medicion {
  id: string
  personaId: string
  fecha: string
  pesoKg: number
  grasaPct?: number
  musculoKg?: number
  grasaVisceral?: number
  aguaPct?: number
  cuelloCm?: number
  pechoCm?: number
  cinturaCm?: number
  caderaCm?: number
  brazoCm?: number
  musloCm?: number
  brazoIzqCm?: number
  brazoDerCm?: number
  musloIzqCm?: number
  musloDerCm?: number
  nota?: string
  origen: 'manual' | 'csv'
}

export interface Ajustes {
  diaRecordatorio: number
  horaRecordatorio: string
  ultimoRespaldo?: string
}

export type CampoNumerico =
  | 'pesoKg'
  | 'grasaPct'
  | 'musculoKg'
  | 'grasaVisceral'
  | 'aguaPct'
  | 'cuelloCm'
  | 'pechoCm'
  | 'cinturaCm'
  | 'caderaCm'
  | 'brazoCm'
  | 'musloCm'
  | 'brazoIzqCm'
  | 'brazoDerCm'
  | 'musloIzqCm'
  | 'musloDerCm'

export const CAMPOS_BASCULA: CampoNumerico[] = ['pesoKg', 'grasaPct', 'musculoKg', 'grasaVisceral', 'aguaPct']
export const CAMPOS_PERIMETROS: CampoNumerico[] = [
  'cuelloCm', 'pechoCm', 'brazoIzqCm', 'brazoDerCm', 'brazoCm', 'cinturaCm', 'caderaCm', 'musloIzqCm', 'musloDerCm', 'musloCm',
]
/** Medidas de antes de separar por lado: se conservan y se muestran, pero ya no se piden. */
export const CAMPOS_SIN_LADO: CampoNumerico[] = ['brazoCm', 'musloCm']
export const CAMPOS_NUMERICOS: CampoNumerico[] = [...CAMPOS_BASCULA, ...CAMPOS_PERIMETROS]

export const ETIQUETAS: Record<CampoNumerico, { nombre: string; unidad: string }> = {
  pesoKg: { nombre: 'Peso', unidad: 'kg' },
  grasaPct: { nombre: 'Grasa corporal', unidad: '%' },
  musculoKg: { nombre: 'Masa muscular', unidad: 'kg' },
  grasaVisceral: { nombre: 'Grasa visceral', unidad: 'nivel' },
  aguaPct: { nombre: 'Agua corporal', unidad: '%' },
  cuelloCm: { nombre: 'Cuello', unidad: 'cm' },
  pechoCm: { nombre: 'Pecho', unidad: 'cm' },
  cinturaCm: { nombre: 'Cintura', unidad: 'cm' },
  caderaCm: { nombre: 'Cadera', unidad: 'cm' },
  brazoCm: { nombre: 'Brazo (sin lado)', unidad: 'cm' },
  musloCm: { nombre: 'Muslo (sin lado)', unidad: 'cm' },
  brazoIzqCm: { nombre: 'Brazo izquierdo', unidad: 'cm' },
  brazoDerCm: { nombre: 'Brazo derecho', unidad: 'cm' },
  musloIzqCm: { nombre: 'Muslo izquierdo', unidad: 'cm' },
  musloDerCm: { nombre: 'Muslo derecho', unidad: 'cm' },
}
