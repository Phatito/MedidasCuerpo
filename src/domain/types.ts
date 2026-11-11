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

export const CAMPOS_BASCULA: CampoNumerico[] = ['pesoKg', 'grasaPct', 'musculoKg', 'grasaVisceral', 'aguaPct']
export const CAMPOS_PERIMETROS: CampoNumerico[] = ['cuelloCm', 'pechoCm', 'cinturaCm', 'caderaCm', 'brazoCm', 'musloCm']
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
  brazoCm: { nombre: 'Brazo', unidad: 'cm' },
  musloCm: { nombre: 'Muslo', unidad: 'cm' },
}
