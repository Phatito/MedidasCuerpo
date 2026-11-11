import { describe, expect, test } from 'vitest'
import { estadoMedicion, generarIcs } from '../../src/domain/reminders'

describe('estadoMedicion', () => {
  test('sin mediciones está pendiente', () => {
    expect(estadoMedicion(null, '2026-11-11')).toEqual({ pendiente: true, diasDesde: null })
  })
  test('a los 6 días sigue al día', () => {
    expect(estadoMedicion('2026-11-05', '2026-11-11')).toEqual({ pendiente: false, diasDesde: 6 })
  })
  test('a los 7 días le toca medirse', () => {
    expect(estadoMedicion('2026-11-04', '2026-11-11')).toEqual({ pendiente: true, diasDesde: 7 })
  })
})

describe('generarIcs', () => {
  const ics = generarIcs(0, '09:00', '2026-11-11') // miércoles
  test('repite cada semana en el día elegido', () => {
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU')
  })
  test('empieza en la primera ocurrencia en o después de la fecha dada', () => {
    expect(ics).toContain('DTSTART:20261115T090000')
    expect(generarIcs(3, '20:30', '2026-11-11')).toContain('DTSTART:20261111T203000')
  })
  test('es un calendario bien formado con líneas CRLF', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('SUMMARY:Pesarse y medirse')
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })
})
