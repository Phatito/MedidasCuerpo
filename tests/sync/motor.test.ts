import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { AlmacenMemoria } from '../../servidor/almacen.ts'
import { manejar } from '../../servidor/logica.ts'
import { configurarApi } from '../../src/sync/api'
import { sincronizarAhora, suscribirEstado, type EstadoSync } from '../../src/sync/motor'
import { borrarCuenta, cerrarSesion, crearCuenta, iniciarSesion, sesionActual } from '../../src/sync/sesion'
import { borrarTodo, guardarMedicion, guardarPersona, listarMediciones, listarPersonas, usarBaseDeDatos } from '../../src/storage/db'
import { m, persona } from '../domain/helpers'

const URL_PRUEBA = 'http://localhost:8787'
const FRASE = 'una frase secreta de prueba'
let almacen: AlmacenMemoria
let cuerpos: string[]
let fallarSiguiente: number | null
let sinRed: boolean

async function fetchFalso(entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (sinRed) throw new TypeError('Failed to fetch')
  const req = new Request(entrada, { ...init, headers: { ...(init?.headers as Record<string, string>), Origin: 'http://localhost:4173' } })
  if (init?.body) cuerpos.push(String(init.body))
  if (fallarSiguiente != null) {
    const estado = fallarSiguiente
    fallarSiguiente = null
    return new Response('{}', { status: estado })
  }
  return manejar(req, almacen, Date.now())
}

/** Cada "dispositivo" es una base local distinta. */
const dispositivo = async (nombre: string) => usarBaseDeDatos(nombre)
let ultimoEstado: EstadoSync = { tipo: 'sin-sesion' }
suscribirEstado((e) => (ultimoEstado = e))

let n = 0
beforeEach(async () => {
  almacen = new AlmacenMemoria()
  cuerpos = []
  fallarSiguiente = null
  sinRed = false
  configurarApi(URL_PRUEBA, fetchFalso)
  n++
})

describe('sincronización entre dos dispositivos', { timeout: 60_000 }, () => {
  test('lo creado en el PC aparece en el celular, y sin datos en claro en la red', async () => {
    await dispositivo(`pc${n}`)
    await guardarPersona(persona({ nombre: 'Ana' }))
    await guardarMedicion(m('2026-11-05', { pesoKg: 72.5, nota: 'después de entrenar' }))
    await crearCuenta('ana.prueba', FRASE)
    expect(await sesionActual()).toEqual({ usuario: 'ana.prueba' })

    await dispositivo(`cel${n}`)
    expect(await iniciarSesion('ana.prueba', FRASE, async () => 'cancelar')).toBe(true)
    expect((await listarPersonas()).map((p) => p.nombre)).toEqual(['Ana'])
    expect((await listarMediciones('p1'))[0]).toMatchObject({ pesoKg: 72.5, nota: 'después de entrenar' })

    const todo = cuerpos.join('\n')
    for (const claro of ['Ana', '72.5', '72,5', '2026-11-05', 'entrenar', 'p1_']) expect(todo).not.toContain(claro)
    expect(ultimoEstado.tipo).toBe('al-dia')
  })

  test('la misma medición editada en ambos: gana la más reciente en los dos', async () => {
    await dispositivo(`pc${n}`)
    await guardarPersona(persona())
    await guardarMedicion(m('2026-11-05', { pesoKg: 72 }))
    await crearCuenta('beto.prueba', FRASE)
    await dispositivo(`cel${n}`)
    await iniciarSesion('beto.prueba', FRASE, async () => 'cancelar')

    await dispositivo(`pc${n}`)
    await guardarMedicion(m('2026-11-05', { pesoKg: 71 }))
    await new Promise((r) => setTimeout(r, 5))
    await dispositivo(`cel${n}`)
    await guardarMedicion(m('2026-11-05', { pesoKg: 70 }))

    await sincronizarAhora() // celular sube 70
    await dispositivo(`pc${n}`)
    await sincronizarAhora() // pc: su 71 es más viejo → rechazado → baja 70
    expect((await listarMediciones('p1'))[0].pesoKg).toBe(70)
    await dispositivo(`cel${n}`)
    await sincronizarAhora()
    expect((await listarMediciones('p1'))[0].pesoKg).toBe(70)
  })

  test('un error del servidor a mitad de la subida no marca nada y el siguiente ciclo sube', async () => {
    await dispositivo(`pc${n}`)
    await crearCuenta('caro.prueba', FRASE)
    await guardarPersona(persona({ nombre: 'Caro' }))
    fallarSiguiente = 500
    await sincronizarAhora()
    expect(ultimoEstado.tipo).toBe('error')
    await sincronizarAhora()
    await dispositivo(`cel${n}`)
    await iniciarSesion('caro.prueba', FRASE, async () => 'cancelar')
    expect((await listarPersonas()).map((p) => p.nombre)).toEqual(['Caro'])
  })

  test('sin red queda "sin conexión" y los datos siguen', async () => {
    await dispositivo(`pc${n}`)
    await crearCuenta('dani.prueba', FRASE)
    await guardarPersona(persona())
    sinRed = true
    await sincronizarAhora()
    expect(ultimoEstado.tipo).toBe('sin-conexion')
    expect(await listarPersonas()).toHaveLength(1)
  })

  test('una sesión rechazada (401) cierra la sesión y conserva los datos', async () => {
    await dispositivo(`pc${n}`)
    await crearCuenta('eli.prueba', FRASE)
    await guardarPersona(persona())
    fallarSiguiente = 401
    await sincronizarAhora()
    expect(ultimoEstado.tipo).toBe('sesion-terminada')
    expect(await sesionActual()).toBeNull()
    expect(await listarPersonas()).toHaveLength(1)
  })

  test('otra cuenta con datos ajenos pregunta; cancelar no sube nada', async () => {
    await dispositivo(`pc${n}`)
    await guardarPersona(persona({ nombre: 'De Fede' }))
    await crearCuenta('fede.prueba', FRASE)
    await cerrarSesion()
    await crearCuenta('gabi.prueba', 'otra frase secreta larga', async () => 'cancelar').catch(() => undefined)
    cuerpos = []
    let preguntado = false
    const ok = await iniciarSesion('gabi.prueba', 'otra frase secreta larga', async () => {
      preguntado = true
      return 'cancelar'
    })
    expect(preguntado).toBe(true)
    expect(ok).toBe(false)
    expect(await sesionActual()).toBeNull()
    expect(cuerpos.some((c) => c.includes('cifrado'))).toBe(false)
    expect(await listarPersonas()).toHaveLength(1)
  })

  test('reemplazar por la nube borra lo local antes de bajar', async () => {
    // Inés ya tiene su cuenta con sus datos, creada en otro dispositivo.
    await dispositivo(`otro${n}`)
    await guardarPersona(persona({ id: 'i1', nombre: 'Inés' }))
    await crearCuenta('ines.prueba', 'frase de ines bastante larga')
    // En el PC estaba la cuenta de Hugo.
    await dispositivo(`pc${n}`)
    await guardarPersona(persona({ id: 'h1', nombre: 'Hugo' }))
    await crearCuenta('hugo.prueba', FRASE)
    await cerrarSesion()
    await iniciarSesion('ines.prueba', 'frase de ines bastante larga', async () => 'reemplazar')
    expect((await listarPersonas()).map((p) => p.nombre)).toEqual(['Inés'])
  })

  test('frase o usuario incorrectos dan el mismo mensaje', async () => {
    await dispositivo(`pc${n}`)
    await crearCuenta('juan.prueba', FRASE)
    await cerrarSesion()
    await expect(iniciarSesion('juan.prueba', 'frase equivocada larga', async () => 'cancelar')).rejects.toThrow('Usuario o frase secreta incorrectos')
    await expect(iniciarSesion('nadie.prueba', FRASE, async () => 'cancelar')).rejects.toThrow('Usuario o frase secreta incorrectos')
    await expect(crearCuenta('juan.prueba', FRASE)).rejects.toThrow('Ese nombre de usuario ya está en uso')
    await expect(crearCuenta('x', FRASE)).rejects.toThrow()
    await expect(crearCuenta('kati.prueba', 'corta')).rejects.toThrow()
  })

  test('borrar la cuenta conserva los datos locales', async () => {
    await dispositivo(`pc${n}`)
    await guardarPersona(persona())
    await crearCuenta('lali.prueba', FRASE)
    await borrarCuenta()
    expect(await sesionActual()).toBeNull()
    expect(await listarPersonas()).toHaveLength(1)
    await borrarTodo()
  })
})
