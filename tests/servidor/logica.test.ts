import { beforeEach, describe, expect, test } from 'vitest'
import { AlmacenMemoria } from '../../servidor/almacen.ts'
import { manejar } from '../../servidor/logica.ts'

const B = 'https://sync.test'
const ORIGEN = 'https://phatito.github.io'
const SAL = 'AAECAwQFBgcICQoLDA0ODw=='
const LLAVE = Buffer.alloc(32, 7).toString('base64')
const OTRA = Buffer.alloc(32, 8).toString('base64')
const MIN = 60_000

let almacen: AlmacenMemoria
let ahora: number
beforeEach(() => {
  almacen = new AlmacenMemoria()
  ahora = 1_800_000_000_000
})

const pedir = (metodo: string, ruta: string, cuerpo?: unknown, token?: string, origen = ORIGEN) =>
  manejar(
    new Request(B + ruta, {
      method: metodo,
      headers: { Origin: origen, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    }),
    almacen,
    ahora,
  )

async function cuentaConSesion(usuario = 'ana') {
  expect((await pedir('POST', '/cuenta', { usuario, sal: SAL, llaveAcceso: LLAVE })).status).toBe(201)
  const r = await pedir('POST', '/sesion', { usuario, llaveAcceso: LLAVE })
  return ((await r.json()) as { token: string }).token
}

describe('cuentas y sesiones', () => {
  test('crear cuenta y pedir su sal', async () => {
    await cuentaConSesion()
    const r = await pedir('GET', '/sal?usuario=ANA')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ sal: SAL })
    expect((await pedir('GET', '/sal?usuario=nadie')).status).toBe(404)
  })

  test('un usuario repetido o inválido se rechaza', async () => {
    await cuentaConSesion()
    const r = await pedir('POST', '/cuenta', { usuario: 'Ana', sal: SAL, llaveAcceso: LLAVE })
    expect(r.status).toBe(409)
    expect(await r.json()).toEqual({ error: 'Ese nombre de usuario ya está en uso' })
    expect((await pedir('POST', '/cuenta', { usuario: 'a b', sal: SAL, llaveAcceso: LLAVE })).status).toBe(400)
    expect((await pedir('POST', '/cuenta', { usuario: 'ab', sal: SAL, llaveAcceso: LLAVE })).status).toBe(400)
    expect((await pedir('POST', '/cuenta', { usuario: 'beto', sal: 'corta', llaveAcceso: LLAVE })).status).toBe(400)
  })

  test('frase incorrecta y usuario inexistente dan el mismo error', async () => {
    await cuentaConSesion()
    const a = await pedir('POST', '/sesion', { usuario: 'ana', llaveAcceso: OTRA })
    const b = await pedir('POST', '/sesion', { usuario: 'nadie', llaveAcceso: OTRA })
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(await a.json()).toEqual({ error: 'Usuario o frase secreta incorrectos' })
    expect(await b.json()).toEqual({ error: 'Usuario o frase secreta incorrectos' })
  })

  test('5 fallos bloquean 15 minutos, aunque luego se acierte', async () => {
    await cuentaConSesion()
    for (let i = 0; i < 5; i++) await pedir('POST', '/sesion', { usuario: 'ana', llaveAcceso: OTRA })
    expect((await pedir('POST', '/sesion', { usuario: 'ana', llaveAcceso: LLAVE })).status).toBe(429)
    ahora += 15 * MIN + 1
    expect((await pedir('POST', '/sesion', { usuario: 'ana', llaveAcceso: LLAVE })).status).toBe(200)
  })

  test('un token vencido o cerrado ya no sirve', async () => {
    const token = await cuentaConSesion()
    expect((await pedir('GET', '/piezas?desde=0', undefined, token)).status).toBe(200)
    expect((await pedir('GET', '/piezas?desde=0', undefined, 'inventado')).status).toBe(401)
    expect((await pedir('GET', '/piezas?desde=0')).status).toBe(401)
    ahora += 366 * 24 * 60 * MIN
    expect((await pedir('GET', '/piezas?desde=0', undefined, token)).status).toBe(401)
    ahora -= 366 * 24 * 60 * MIN
    const otro = await (await pedir('POST', '/sesion', { usuario: 'ana', llaveAcceso: LLAVE })).json() as { token: string }
    expect((await pedir('DELETE', '/sesion', undefined, otro.token)).status).toBe(204)
    expect((await pedir('GET', '/piezas?desde=0', undefined, otro.token)).status).toBe(401)
  })
})

describe('piezas', () => {
  test('subir solo acepta lo nuevo o más reciente', async () => {
    const t = await cuentaConSesion()
    let r = await pedir('POST', '/piezas', [{ id: 'a1', cifrado: 'xxx', editadoEn: 10 }, { id: 'a2', cifrado: 'yyy', editadoEn: 0 }], t)
    expect(await r.json()).toEqual({ aceptadas: ['a1', 'a2'], rechazadas: [] })
    r = await pedir('POST', '/piezas', [{ id: 'a1', cifrado: 'zzz', editadoEn: 10 }, { id: 'a2', cifrado: 'www', editadoEn: 5 }], t)
    expect(await r.json()).toEqual({ aceptadas: ['a2'], rechazadas: ['a1'] })
    r = await pedir('POST', '/piezas', [{ id: 'a1', cifrado: 'vvv', editadoEn: 9 }], t)
    expect(await r.json()).toEqual({ aceptadas: [], rechazadas: ['a1'] })
  })

  test('bajar desde un cursor trae solo lo nuevo, de a 500', async () => {
    const t = await cuentaConSesion()
    await pedir('POST', '/piezas', [{ id: 'a1', cifrado: 'x', editadoEn: 1 }], t)
    const primero = (await (await pedir('GET', '/piezas?desde=0', undefined, t)).json()) as { piezas: unknown[]; cursor: number; hayMas: boolean }
    expect(primero.piezas).toEqual([{ id: 'a1', cifrado: 'x', editadoEn: 1 }])
    expect(primero.hayMas).toBe(false)
    await pedir('POST', '/piezas', [{ id: 'a2', cifrado: 'y', editadoEn: 2 }], t)
    const segundo = (await (await pedir('GET', `/piezas?desde=${primero.cursor}`, undefined, t)).json()) as { piezas: { id: string }[] }
    expect(segundo.piezas.map((p) => p.id)).toEqual(['a2'])
    for (let i = 0; i < 500; i += 40) {
      await pedir('POST', '/piezas', Array.from({ length: Math.min(40, 500 - i) }, (_, j) => ({ id: `m${i + j}`, cifrado: 'z', editadoEn: 3 })), t)
    }
    await pedir('POST', '/piezas', [{ id: 'ultima', cifrado: 'z', editadoEn: 3 }], t)
    const pagina = (await (await pedir('GET', '/piezas?desde=0', undefined, t)).json()) as { piezas: unknown[]; hayMas: boolean }
    expect(pagina.piezas).toHaveLength(500)
    expect(pagina.hayMas).toBe(true)
  })

  test('límites de tamaño', async () => {
    const t = await cuentaConSesion()
    expect((await pedir('POST', '/piezas', [{ id: 'g', cifrado: 'x'.repeat(16 * 1024 + 1), editadoEn: 1 }], t)).status).toBe(413)
    expect((await pedir('POST', '/piezas', Array.from({ length: 41 }, (_, i) => ({ id: `p${i}`, cifrado: 'x', editadoEn: 1 })), t)).status).toBe(413)
    expect((await pedir('POST', '/piezas', '"' + 'x'.repeat(1024 * 1024) + '"', t)).status).toBe(413)
  })

  test('otra cuenta no ve mis piezas', async () => {
    const t1 = await cuentaConSesion('ana')
    const t2 = await cuentaConSesion('beto')
    await pedir('POST', '/piezas', [{ id: 'a1', cifrado: 'x', editadoEn: 1 }], t1)
    const r = (await (await pedir('GET', '/piezas?desde=0', undefined, t2)).json()) as { piezas: unknown[] }
    expect(r.piezas).toEqual([])
  })

  test('borrar la cuenta borra sus piezas y sesiones', async () => {
    const t = await cuentaConSesion()
    await pedir('POST', '/piezas', [{ id: 'a1', cifrado: 'x', editadoEn: 1 }], t)
    expect((await pedir('DELETE', '/cuenta', undefined, t)).status).toBe(204)
    expect((await pedir('GET', '/piezas?desde=0', undefined, t)).status).toBe(401)
    expect((await pedir('GET', '/sal?usuario=ana')).status).toBe(404)
    // El nombre queda libre y la cuenta nueva empieza vacía.
    const nuevo = await cuentaConSesion()
    const r = (await (await pedir('GET', '/piezas?desde=0', undefined, nuevo)).json()) as { piezas: unknown[] }
    expect(r.piezas).toEqual([])
  })
})

describe('CORS', () => {
  test('solo GitHub Pages y localhost reciben permiso', async () => {
    const ok = await pedir('OPTIONS', '/piezas')
    expect(ok.status).toBe(204)
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGEN)
    expect(ok.headers.get('Access-Control-Allow-Headers')).toMatch(/Authorization/)
    const local = await pedir('GET', '/sal?usuario=x', undefined, undefined, 'http://localhost:4173')
    expect(local.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4173')
    const ajeno = await pedir('GET', '/sal?usuario=x', undefined, undefined, 'https://malo.example')
    expect(ajeno.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
