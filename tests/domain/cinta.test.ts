import { describe, expect, test } from 'vitest'
import { leerCinta } from '../../src/domain/cinta'
import { m, persona } from './helpers'

const zona = (l: ReturnType<typeof leerCinta>, z: string) => l!.cambios.find((c) => c.zona === z)

describe('lectura de la cinta', () => {
  test('pierde grasa y conserva músculo', () => {
    const l = leerCinta(persona(), [
      m('2026-11-09', { pesoKg: 80, cinturaCm: 90, brazoCm: 34 }),
      m('2026-11-16', { pesoKg: 79, cinturaCm: 88.5, brazoCm: 34 }),
    ])!
    expect(l.veredicto).toBe('pierde-grasa')
    expect(l.tono).toBe('bien')
    expect(l.desde).toBe('2026-11-09')
    expect(zona(l, 'cintura')).toMatchObject({ cambio: -1.5, leve: false, sentido: 'bien' })
    expect(zona(l, 'brazo')).toMatchObject({ cambio: 0, sentido: 'neutro' })
  })

  test('hasta el cambio mínimo cuenta', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { cinturaCm: 90 }), m('2026-11-16', { cinturaCm: 89.9 })])!
    expect(zona(l, 'cintura')).toMatchObject({ cambio: -0.1, leve: true, sentido: 'bien' })
    expect(l.veredicto).toBe('pierde-grasa')
    expect(l.texto).toMatch(/levemente/)
  })

  test('sin ruido de coma flotante', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { cinturaCm: 88.1 }), m('2026-11-16', { cinturaCm: 88.0 })])!
    expect(zona(l, 'cintura')!.cambio).toBe(-0.1)
  })

  test('brazos que bajan con el peso: posible pérdida de músculo', () => {
    const l = leerCinta(persona(), [
      m('2026-11-09', { pesoKg: 80, cinturaCm: 90, brazoCm: 35 }),
      m('2026-11-16', { pesoKg: 78.5, cinturaCm: 89, brazoCm: 34.6 }),
    ])!
    expect(l.veredicto).toBe('pierde-musculo')
    expect(l.tono).toBe('atencion')
    expect(zona(l, 'brazo')!.sentido).toBe('atencion')
  })

  test('mismo peso, menos cintura y más brazo: recomposición', () => {
    const l = leerCinta(persona(), [
      m('2026-11-09', { pesoKg: 80, cinturaCm: 90, brazoCm: 34 }),
      m('2026-11-16', { pesoKg: 80.2, cinturaCm: 89, brazoCm: 34.3 }),
    ])!
    expect(l.veredicto).toBe('recomposicion')
  })

  test('la cintura sube: gana grasa', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { cinturaCm: 90 }), m('2026-11-16', { cinturaCm: 90.4 })])!
    expect(l.veredicto).toBe('gana-grasa')
    expect(l.tono).toBe('atencion')
  })

  test('brazos suben sin que suba la cintura: gana músculo', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { cinturaCm: 90, musloCm: 55 }), m('2026-11-16', { cinturaCm: 90, musloCm: 55.6 })])!
    expect(l.veredicto).toBe('gana-musculo')
  })

  test('nada cambió: estable', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { cinturaCm: 90, caderaCm: 100 }), m('2026-11-16', { cinturaCm: 90, caderaCm: 100 })])!
    expect(l.veredicto).toBe('estable')
  })

  test('con una sola medición de cinta faltan datos', () => {
    const l = leerCinta(persona(), [m('2026-11-09'), m('2026-11-16', { cinturaCm: 90 })])!
    expect(l.veredicto).toBe('faltan')
    expect(leerCinta(persona(), [m('2026-11-16')])).toBeNull()
  })

  test('salta las pesadas sin cinta para comparar', () => {
    const l = leerCinta(persona(), [m('2026-11-02', { cinturaCm: 91 }), m('2026-11-09'), m('2026-11-16', { cinturaCm: 90 })])!
    expect(l.desde).toBe('2026-11-02')
    expect(zona(l, 'cintura')!.cambio).toBe(-1)
  })

  test('brazo sin lado contra brazos por lado: se compara el promedio', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { brazoCm: 34 }), m('2026-11-16', { brazoIzqCm: 34.4, brazoDerCm: 34.2 })])!
    expect(zona(l, 'brazo')!.cambio).toBe(0.3)
  })

  test('compara con hace 4 semanas o con el inicio', () => {
    const ms = [
      m('2026-10-05', { cinturaCm: 95 }),
      m('2026-10-19', { cinturaCm: 93 }),
      m('2026-11-09', { cinturaCm: 91 }),
      m('2026-11-16', { cinturaCm: 90 }),
    ]
    expect(leerCinta(persona(), ms, '4semanas')!).toMatchObject({ desde: '2026-10-19' })
    expect(zona(leerCinta(persona(), ms, '4semanas'), 'cintura')!.cambio).toBe(-3)
    expect(zona(leerCinta(persona(), ms, 'inicio'), 'cintura')!.cambio).toBe(-5)
    expect(zona(leerCinta(persona(), ms, 'inicio'), 'cintura')!.historia).toHaveLength(4)
    // Sin una medición tan antigua, se usa la primera.
    expect(leerCinta(persona(), ms.slice(2), '4semanas')!.desde).toBe('2026-11-09')
  })

  test('si la báscula no coincide, manda la cinta y se explica', () => {
    const l = leerCinta(persona(), [
      m('2026-11-09', { pesoKg: 80, cinturaCm: 90, grasaPct: 24 }),
      m('2026-11-16', { pesoKg: 80, cinturaCm: 89, grasaPct: 25 }),
    ])!
    expect(l.contraste!.coincide).toBe(false)
    expect(l.contraste!.texto).toMatch(/agua/)
    const ok = leerCinta(persona(), [
      m('2026-11-09', { pesoKg: 80, cinturaCm: 90, grasaPct: 25 }),
      m('2026-11-16', { pesoKg: 79, cinturaCm: 89, grasaPct: 24 }),
    ])!
    expect(ok.contraste!.coincide).toBe(true)
  })

  test('dice qué medidas faltan para leer mejor', () => {
    const l = leerCinta(persona(), [m('2026-11-09', { cinturaCm: 90 }), m('2026-11-16', { cinturaCm: 89 })])!
    expect(l.faltanMedidas).toEqual(expect.arrayContaining(['brazo', 'muslo']))
  })
})

describe('mensajes cortos y amigables', () => {
  test('cintura que sube: titular, el cambio clave con su fecha y qué hacer; el resto, nombrado sin números', () => {
    const l = leerCinta(persona(), [
      m('2026-10-30', { cinturaCm: 90, caderaCm: 100, pechoCm: 98, brazoCm: 32, musloCm: 55 }),
      m('2026-11-13', { cinturaCm: 91, caderaCm: 102, pechoCm: 100, brazoCm: 32, musloCm: 57.5 }),
    ])!
    expect(l.titulo).toBe('Ojo con la cintura')
    expect(l.texto).toBe('Subió 1,0 cm desde el 30/10, junto con cadera, pecho y muslos. Si no buscas subir, ajusta un poco lo que comes esta semana.')
  })

  test('pierde grasa con brazos estables', () => {
    const l = leerCinta(persona(), [
      m('2026-11-09', { pesoKg: 80, cinturaCm: 90, brazoCm: 34 }),
      m('2026-11-16', { pesoKg: 79, cinturaCm: 89.3, brazoCm: 34 }),
    ])!
    expect(l.titulo).toBe('¡Vas perdiendo grasa!')
    expect(l.texto).toBe('Tu cintura bajó 0,7 cm desde el 09/11 y tus brazos se mantienen. Sigue así.')
  })
})
