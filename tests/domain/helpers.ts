import type { Medicion, Persona } from '../../src/domain/types'

export const persona = (extra: Partial<Persona> = {}): Persona => ({
  id: 'p1',
  nombre: 'Prueba',
  sexo: 'hombre',
  fechaNacimiento: '1990-01-01',
  estaturaCm: 170,
  objetivo: 'bajar_grasa',
  creadaEn: '2026-01-01T00:00:00.000Z',
  ...extra,
})

export const m = (fecha: string, campos: Partial<Medicion> = {}): Medicion => ({
  id: `p1_${fecha}`,
  personaId: 'p1',
  fecha,
  pesoKg: 70,
  origen: 'manual',
  ...campos,
})
