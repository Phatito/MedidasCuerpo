import { expect, test } from 'vitest'
import { lecturaDesdeIA } from '../../src/domain/capturaIA'

test('toma los valores válidos, con fecha y hora, y descarta lo que no cuadra', () => {
  const l = lecturaDesdeIA({ fecha: '2026-11-23', hora: '07:33', pesoKg: 90.1, grasaPct: 25.4, aguaPct: null, grasaVisceral: 14, metabolismoBasalKcal: 99999, musculoKg: '35', edadCorporal: 41.6 })
  expect(l).toEqual({ fecha: '2026-11-23', hora: '07:33', valores: { pesoKg: 90.1, grasaPct: 25.4, grasaVisceral: 14, edadCorporal: 42 }, revisar: [], fuente: 'ia' })
})

test('una fecha imposible se ignora; sin ningún valor no hay lectura', () => {
  expect(lecturaDesdeIA({ fecha: '2026-02-31', pesoKg: 80 })?.fecha).toBeNull()
  expect(lecturaDesdeIA({ pesoKg: null })).toBeNull()
  expect(lecturaDesdeIA('basura')).toBeNull()
})
