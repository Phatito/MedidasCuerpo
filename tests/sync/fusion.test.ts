import { expect, test } from 'vitest'
import { debeAplicarse } from '../../src/sync/fusion'

const c = (editadoEn: number, pendiente: 0 | 1 = 0) => ({ idLogico: 'x', editadoEn, pendiente, borrado: 0 as const })

test('sin registro local, lo remoto se aplica', () => expect(debeAplicarse(undefined, 5)).toBe(true))
test('lo local pendiente de subir no se pisa', () => expect(debeAplicarse(c(1, 1), 99)).toBe(false))
test('lo remoto más nuevo o igual se aplica', () => {
  expect(debeAplicarse(c(5), 6)).toBe(true)
  expect(debeAplicarse(c(5), 5)).toBe(true)
})
test('lo remoto más viejo no se aplica', () => expect(debeAplicarse(c(5), 4)).toBe(false))
