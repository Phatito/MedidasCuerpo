import { expect, test } from 'vitest'
import { ANCHO_OCR, debeInvertir, muyChica, tamanoOcr } from '../../src/domain/imagen'

test('una captura oscura se invierte; una clara no', () => {
  expect(debeInvertir(40)).toBe(true)
  expect(debeInvertir(127.9)).toBe(true)
  expect(debeInvertir(128)).toBe(false)
  expect(debeInvertir(200)).toBe(false)
})

test('se lleva a 620 px de ancho manteniendo la proporción', () => {
  expect(ANCHO_OCR).toBe(620)
  expect(tamanoOcr(1242, 3378)).toEqual({ ancho: 620, alto: 1686 })
  expect(tamanoOcr(310, 1000)).toEqual({ ancho: 620, alto: 2000 })
})

test('una imagen angosta (como la que deja WhatsApp) es muy chica para leer los rótulos', () => {
  expect(muyChica(217, 1280)).toBe(true)
  expect(muyChica(480, 1000)).toBe(true)
  expect(muyChica(720, 1600)).toBe(false)
  expect(muyChica(1242, 3378)).toBe(false)
})
