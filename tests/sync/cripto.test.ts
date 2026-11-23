import { describe, expect, test } from 'vitest'
import { cifrar, derivarLlaves, descifrar, idOpaco, nuevaSal, sha256Base64 } from '../../src/sync/cripto'

const SAL = 'AAECAwQFBgcICQoLDA0ODw==' // 16 bytes fijos para las pruebas
const SAL2 = 'DxAREhMUFRYXGBkaGxwdHg=='

describe('derivarLlaves', { timeout: 30_000 }, () => {
  test('la misma frase y sal dan las mismas llaves; otra frase u otra sal, distintas', async () => {
    const a = await derivarLlaves('frase de prueba larga', SAL)
    const b = await derivarLlaves('frase de prueba larga', SAL)
    const c = await derivarLlaves('otra frase de prueba', SAL)
    const d = await derivarLlaves('frase de prueba larga', SAL2)
    expect(a.acceso).toBe(b.acceso)
    expect(await idOpaco(a.ids, 'medicion:p1_2026-11-01')).toBe(await idOpaco(b.ids, 'medicion:p1_2026-11-01'))
    expect(c.acceso).not.toBe(a.acceso)
    expect(d.acceso).not.toBe(a.acceso)
    expect(await idOpaco(c.ids, 'medicion:p1_2026-11-01')).not.toBe(await idOpaco(a.ids, 'medicion:p1_2026-11-01'))
  })

  test('una frase con tildes da lo mismo escrita en NFC o NFD', async () => {
    const nfc = await derivarLlaves('café con leche 2026'.normalize('NFC'), SAL)
    const nfd = await derivarLlaves('café con leche 2026'.normalize('NFD'), SAL)
    expect(nfc.acceso).toBe(nfd.acceso)
  })

  test('la llave de acceso tiene 32 bytes y no es la de cifrado', async () => {
    const a = await derivarLlaves('frase de prueba larga', SAL)
    expect(Buffer.from(a.acceso, 'base64')).toHaveLength(32)
    expect(a.cifrado.extractable).toBe(false)
    expect(a.ids.extractable).toBe(false)
  })
})

describe('cifrar y descifrar', { timeout: 30_000 }, () => {
  test('ida y vuelta, con un resultado distinto cada vez', async () => {
    const { cifrado } = await derivarLlaves('frase de prueba larga', SAL)
    const dato = { nombre: 'Ana', pesoKg: 70.5 }
    const x = await cifrar(cifrado, dato)
    const y = await cifrar(cifrado, dato)
    expect(x).not.toBe(y)
    expect(x).not.toContain('Ana')
    expect(await descifrar(cifrado, x)).toEqual(dato)
  })

  test('descifrar con otra llave falla', async () => {
    const a = await derivarLlaves('frase de prueba larga', SAL)
    const b = await derivarLlaves('otra frase de prueba', SAL)
    await expect(descifrar(b.cifrado, await cifrar(a.cifrado, { x: 1 }))).rejects.toThrow()
  })
})

test('nuevaSal da 16 bytes y sha256Base64 es estable', async () => {
  expect(Buffer.from(nuevaSal(), 'base64')).toHaveLength(16)
  expect(nuevaSal()).not.toBe(nuevaSal())
  expect(await sha256Base64('abc')).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=')
})
