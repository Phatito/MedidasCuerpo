import { describe, expect, test } from 'vitest'
import { diasEntre, formatear, idMedicion, parseFecha, parseNumero } from '../../src/domain/numbers'

describe('parseNumero', () => {
  test('acepta coma decimal', () => expect(parseNumero('72,5')).toBe(72.5))
  test('acepta punto decimal', () => expect(parseNumero('72.5')).toBe(72.5))
  test('ignora espacios alrededor', () => expect(parseNumero(' 80 ')).toBe(80))
  test('vacío es null', () => expect(parseNumero('')).toBeNull())
  test('texto no numérico es null', () => expect(parseNumero('abc')).toBeNull())
  test('número con basura al final es null', () => expect(parseNumero('72kg')).toBeNull())
})

describe('parseFecha', () => {
  test('DD/MM/AAAA', () => expect(parseFecha('05/11/2026')).toBe('2026-11-05'))
  test('DD-MM-AAAA', () => expect(parseFecha('5-11-2026')).toBe('2026-11-05'))
  test('AAAA-MM-DD', () => expect(parseFecha('2026-11-05')).toBe('2026-11-05'))
  test('fecha imposible es null', () => expect(parseFecha('31/02/2026')).toBeNull())
  test('texto es null', () => expect(parseFecha('ayer')).toBeNull())
})

test('diasEntre cuenta días de calendario', () => {
  expect(diasEntre('2026-11-01', '2026-11-08')).toBe(7)
  expect(diasEntre('2026-02-27', '2026-03-01')).toBe(2)
})

test('idMedicion une persona y fecha', () => {
  expect(idMedicion('p1', '2026-11-05')).toBe('p1_2026-11-05')
})

test('formatear usa coma y un decimal', () => {
  expect(formatear(72.5)).toBe('72,5')
  expect(formatear(72)).toBe('72,0')
  expect(formatear(24.221, 2)).toBe('24,22')
})
