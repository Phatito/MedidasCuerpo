import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  aplicarRemotas, borrarMedicion, borrarPersona, borrarTodo, db, guardarAjustes, guardarMedicion, guardarPersona, leerAjustes,
  listarMediciones, listarPersonas, marcarSubidas, marcarTodoPendiente, pendientesDeSubir, reiniciarCambios,
} from '../../src/storage/db'
import { restaurarRespaldo } from '../../src/storage/backup'
import { m, persona } from '../domain/helpers'

beforeEach(async () => {
  await borrarTodo()
})

const cambio = (id: string) => db.cambios.get(id)

describe('registro de cambios locales', () => {
  test('guardar una medición la deja pendiente; borrarla deja el borrado pendiente', async () => {
    await guardarMedicion(m('2026-11-05', { pesoKg: 72.5 }))
    expect(await cambio('medicion:p1_2026-11-05')).toMatchObject({ pendiente: 1, borrado: 0 })
    expect((await cambio('medicion:p1_2026-11-05'))!.editadoEn).toBeGreaterThan(0)
    await borrarMedicion('p1_2026-11-05')
    expect(await cambio('medicion:p1_2026-11-05')).toMatchObject({ pendiente: 1, borrado: 1 })
  })

  test('borrar una persona deja pendientes su borrado y el de sus mediciones', async () => {
    await guardarPersona(persona())
    await guardarMedicion(m('2026-11-05'))
    await guardarMedicion(m('2026-11-12'))
    await borrarPersona('p1')
    for (const id of ['persona:p1', 'medicion:p1_2026-11-05', 'medicion:p1_2026-11-12']) expect(await cambio(id)).toMatchObject({ pendiente: 1, borrado: 1 })
  })

  test('pendientesDeSubir trae el contenido actual, y los ajustes sin la fecha del último respaldo', async () => {
    await guardarPersona(persona({ nombre: 'Ana' }))
    await guardarAjustes({ diaRecordatorio: 2, horaRecordatorio: '08:00', ultimoRespaldo: '2026-11-01', personaPrincipalId: 'p1' })
    await guardarMedicion(m('2026-11-05'))
    await borrarMedicion('p1_2026-11-05')
    const piezas = await pendientesDeSubir()
    expect(piezas.find((x) => x.idLogico === 'persona:p1')).toMatchObject({ tipo: 'persona', datos: { nombre: 'Ana' } })
    const ajustes = piezas.find((x) => x.idLogico === 'ajustes')!
    expect(ajustes).toMatchObject({ tipo: 'ajustes', datos: { diaRecordatorio: 2, personaPrincipalId: 'p1' } })
    expect('datos' in ajustes && 'ultimoRespaldo' in ajustes.datos).toBe(false)
    expect(piezas.find((x) => x.idLogico === 'medicion:p1_2026-11-05')).toMatchObject({ tipo: 'medicion', borrado: true })
  })

  test('marcarSubidas quita el pendiente salvo que haya una edición más nueva', async () => {
    await guardarMedicion(m('2026-11-05'))
    const [p] = await pendientesDeSubir()
    await marcarSubidas([{ idLogico: p.idLogico, editadoEn: p.editadoEn }], [])
    expect(await cambio(p.idLogico)).toMatchObject({ pendiente: 0 })
    await guardarMedicion(m('2026-11-05', { pesoKg: 71 }))
    await marcarSubidas([{ idLogico: p.idLogico, editadoEn: p.editadoEn }], [])
    expect(await cambio(p.idLogico)).toMatchObject({ pendiente: 1 })
  })

  test('los datos de antes, sin registro, quedan pendientes con editadoEn 0', async () => {
    await db.personas.put(persona())
    await db.mediciones.put(m('2026-11-05'))
    await marcarTodoPendiente()
    expect(await cambio('persona:p1')).toEqual({ idLogico: 'persona:p1', editadoEn: 0, pendiente: 1, borrado: 0 })
    expect(await cambio('medicion:p1_2026-11-05')).toMatchObject({ editadoEn: 0, pendiente: 1 })
    await reiniciarCambios()
    expect(await db.cambios.count()).toBe(0)
  })

  test('restaurar un respaldo deja todo pendiente y marca borrado lo que ya no está', async () => {
    await guardarPersona(persona({ id: 'vieja', nombre: 'Vieja' }))
    await restaurarRespaldo({ app: 'MedidasCuerpo', version: 1, exportadoEn: '', personas: [persona()], mediciones: [m('2026-11-05')], ajustes: { diaRecordatorio: 0, horaRecordatorio: '09:00' } })
    expect(await cambio('persona:p1')).toMatchObject({ pendiente: 1, borrado: 0 })
    expect(await cambio('medicion:p1_2026-11-05')).toMatchObject({ pendiente: 1, borrado: 0 })
    expect(await cambio('persona:vieja')).toMatchObject({ pendiente: 1, borrado: 1 })
  })
})

describe('aplicar lo que llega de la nube', () => {
  test('lo remoto más nuevo reemplaza y no queda pendiente', async () => {
    await guardarPersona(persona({ nombre: 'Ana' }))
    const [p] = await pendientesDeSubir()
    await marcarSubidas([{ idLogico: p.idLogico, editadoEn: p.editadoEn }], [])
    const n = await aplicarRemotas([{ tipo: 'persona', idLogico: 'persona:p1', editadoEn: p.editadoEn + 10, datos: persona({ nombre: 'Ana María' }) }])
    expect(n).toBe(1)
    expect((await listarPersonas())[0].nombre).toBe('Ana María')
    expect(await cambio('persona:p1')).toMatchObject({ pendiente: 0, editadoEn: p.editadoEn + 10 })
  })

  test('lo local pendiente no se toca', async () => {
    await guardarPersona(persona({ nombre: 'Ana' }))
    await aplicarRemotas([{ tipo: 'persona', idLogico: 'persona:p1', editadoEn: Date.now() + 1e6, datos: persona({ nombre: 'Otra' }) }])
    expect((await listarPersonas())[0].nombre).toBe('Ana')
  })

  test('un borrado remoto borra; una persona borrada se lleva sus mediciones', async () => {
    await db.personas.put(persona())
    await db.mediciones.bulkPut([m('2026-11-05'), m('2026-11-12')])
    await aplicarRemotas([{ tipo: 'persona', idLogico: 'persona:p1', editadoEn: 50, borrado: true }])
    expect(await listarPersonas()).toEqual([])
    expect(await listarMediciones('p1')).toEqual([])
  })

  test('una medición de una persona que no existe no se aplica', async () => {
    await aplicarRemotas([{ tipo: 'medicion', idLogico: 'medicion:p9_2026-11-05', editadoEn: 50, datos: { ...m('2026-11-05'), id: 'p9_2026-11-05', personaId: 'p9' } }])
    expect(await db.mediciones.count()).toBe(0)
  })

  test('persona y su medición en el mismo lote se aplican juntas', async () => {
    await aplicarRemotas([
      { tipo: 'medicion', idLogico: 'medicion:p1_2026-11-05', editadoEn: 50, datos: m('2026-11-05') },
      { tipo: 'persona', idLogico: 'persona:p1', editadoEn: 50, datos: persona() },
    ])
    expect(await listarMediciones('p1')).toHaveLength(1)
  })

  test('los ajustes remotos conservan la fecha del último respaldo de este dispositivo', async () => {
    await db.ajustes.put({ clave: 'principal', diaRecordatorio: 0, horaRecordatorio: '09:00', ultimoRespaldo: '2026-11-20' })
    await aplicarRemotas([{ tipo: 'ajustes', idLogico: 'ajustes', editadoEn: 50, datos: { diaRecordatorio: 3, horaRecordatorio: '07:30', personaPrincipalId: 'p1' } }])
    expect(await leerAjustes()).toEqual({ diaRecordatorio: 3, horaRecordatorio: '07:30', personaPrincipalId: 'p1', ultimoRespaldo: '2026-11-20' })
  })
})

describe('revisión final', () => {
  test('una medición que llega antes que su persona se guarda aparte y se aplica cuando llega la persona', async () => {
    await aplicarRemotas([{ tipo: 'medicion', idLogico: 'medicion:p1_2026-11-05', editadoEn: 50, datos: m('2026-11-05', { pesoKg: 71 }) }])
    expect(await db.mediciones.count()).toBe(0)
    await aplicarRemotas([{ tipo: 'persona', idLogico: 'persona:p1', editadoEn: 60, datos: persona() }])
    expect((await listarMediciones('p1'))[0].pesoKg).toBe(71)
  })

  test('si la persona llega borrada, sus mediciones guardadas aparte se descartan', async () => {
    await aplicarRemotas([{ tipo: 'medicion', idLogico: 'medicion:p1_2026-11-05', editadoEn: 50, datos: m('2026-11-05') }])
    await aplicarRemotas([{ tipo: 'persona', idLogico: 'persona:p1', editadoEn: 60, borrado: true }])
    await db.personas.put(persona())
    await aplicarRemotas([])
    expect(await db.mediciones.count()).toBe(0)
  })

  test('una edición local siempre queda más nueva que lo último recibido, aunque el reloj vaya atrasado', async () => {
    const futuro = Date.now() + 10 * 60_000
    await aplicarRemotas([{ tipo: 'persona', idLogico: 'persona:p1', editadoEn: futuro, datos: persona() }])
    await guardarPersona(persona({ nombre: 'Editada' }))
    expect((await db.cambios.get('persona:p1'))!.editadoEn).toBeGreaterThan(futuro)
  })

  test('dos guardados en el mismo milisegundo tienen horas distintas', async () => {
    await guardarMedicion(m('2026-11-05'))
    const a = (await db.cambios.get('medicion:p1_2026-11-05'))!.editadoEn
    await guardarMedicion(m('2026-11-05', { pesoKg: 71 }))
    expect((await db.cambios.get('medicion:p1_2026-11-05'))!.editadoEn).toBeGreaterThan(a)
  })

  test('lo pendiente sube primero ajustes y personas, después mediciones', async () => {
    await guardarMedicion(m('2026-11-05'))
    await guardarPersona(persona())
    await guardarAjustes({ diaRecordatorio: 1, horaRecordatorio: '09:00' })
    expect((await pendientesDeSubir()).map((p) => p.tipo)).toEqual(['ajustes', 'persona', 'medicion'])
  })
})
