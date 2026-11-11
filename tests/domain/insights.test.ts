import { describe, expect, test } from 'vitest'
import { interpretar, NOTA_ORIENTACION } from '../../src/domain/insights'
import type { Medicion } from '../../src/domain/types'
import { m, persona } from './helpers'

const p = persona()
const codigos = (ms: Medicion[]) => interpretar(p, ms).map((x) => x.codigo)
const A = '2026-11-01'
const B = '2026-11-08'

describe('interpretar: última medición frente a la anterior', () => {
  test('una sola medición invita a registrar la segunda', () => {
    expect(codigos([m(A, { pesoKg: 80, cinturaCm: 95, grasaVisceral: 12 })])).toEqual(['primera_medicion'])
  })

  test('sin mediciones no hay mensajes', () => {
    expect(interpretar(p, [])).toEqual([])
  })

  test('mismo peso y menos cintura es recomposición', () => {
    const r = interpretar(p, [m(A, { pesoKg: 80, cinturaCm: 90 }), m(B, { pesoKg: 80.2, cinturaCm: 88.5 })])
    const rec = r.find((x) => x.codigo === 'recomposicion')
    expect(rec?.tono).toBe('bien')
    expect(rec?.texto).toContain('1,5 cm')
  })

  test('0,9 cm de cintura no alcanza para recomposición; 1 cm sí', () => {
    expect(codigos([m(A, { pesoKg: 80, cinturaCm: 90 }), m(B, { pesoKg: 80.2, cinturaCm: 89.1 })])).not.toContain('recomposicion')
    expect(codigos([m(A, { pesoKg: 80, cinturaCm: 90 }), m(B, { pesoKg: 80.2, cinturaCm: 89 })])).toContain('recomposicion')
  })

  test('baja peso y grasa', () => {
    expect(codigos([m(A, { pesoKg: 80, grasaPct: 25 }), m(B, { pesoKg: 79, grasaPct: 24 })])).toContain('baja_peso_grasa')
  })

  test('baja peso y músculo avisa', () => {
    const r = interpretar(p, [m(A, { pesoKg: 80, musculoKg: 35 }), m(B, { pesoKg: 79, musculoKg: 34.4 })])
    expect(r.find((x) => x.codigo === 'pierde_musculo')?.tono).toBe('atencion')
  })

  test('baja de 1,9 % en 7 días es ritmo rápido', () => {
    expect(codigos([m(A, { pesoKg: 80 }), m(B, { pesoKg: 78.5 })])).toContain('ritmo_rapido')
  })

  test('la misma baja en 30 días no es ritmo rápido', () => {
    expect(codigos([m(A, { pesoKg: 80 }), m('2026-12-01', { pesoKg: 78.5 })])).not.toContain('ritmo_rapido')
  })

  test('baja de peso sin más datos es neutra', () => {
    const r = interpretar(p, [m(A, { pesoKg: 80 }), m('2026-12-01', { pesoKg: 79 })])
    expect(r[0]).toMatchObject({ codigo: 'baja_sin_datos', tono: 'neutro' })
  })

  test('sube peso con más músculo y misma cintura es ganancia muscular', () => {
    const r = [m(A, { pesoKg: 80, musculoKg: 35, cinturaCm: 90 }), m(B, { pesoKg: 80.8, musculoKg: 35.4, cinturaCm: 90 })]
    expect(codigos(r)).toContain('gana_musculo')
    expect(codigos(r)).not.toContain('gana_grasa')
  })

  test('sube peso y cintura es ganancia de grasa', () => {
    const r = interpretar(p, [m(A, { pesoKg: 80, cinturaCm: 90 }), m(B, { pesoKg: 81, cinturaCm: 91.5 })])
    expect(r.find((x) => x.codigo === 'gana_grasa')?.tono).toBe('atencion')
  })

  test('sube peso sin más datos es neutro', () => {
    expect(codigos([m(A, { pesoKg: 80 }), m(B, { pesoKg: 81 })])).toContain('sube_sin_datos')
  })

  test('peso y cintura estables: sin cambios', () => {
    expect(codigos([m(A, { pesoKg: 80, cinturaCm: 90 }), m(B, { pesoKg: 80.1, cinturaCm: 90.3 })])).toContain('sin_cambios')
  })
})

describe('interpretar: alertas y contexto', () => {
  test('cintura sobre la mitad de la estatura', () => {
    expect(codigos([m(A, { cinturaCm: 90 }), m(B, { cinturaCm: 90 })])).toContain('alerta_cintura')
    expect(codigos([m(A, { cinturaCm: 80 }), m(B, { cinturaCm: 80 })])).not.toContain('alerta_cintura')
  })

  test('grasa visceral: 10 alerta, 9 no', () => {
    expect(codigos([m(A), m(B, { grasaVisceral: 10 })])).toContain('alerta_visceral')
    expect(codigos([m(A), m(B, { grasaVisceral: 9 })])).not.toContain('alerta_visceral')
  })

  test('siempre termina con el IMC como dato', () => {
    const r = interpretar(p, [m(A), m(B)])
    expect(r[r.length - 1]).toMatchObject({ codigo: 'imc', tono: 'neutro' })
  })

  test('la tendencia necesita 4 mediciones', () => {
    const cuatro = [m('2026-10-11', { pesoKg: 82 }), m('2026-10-18', { pesoKg: 81.5 }), m('2026-10-25', { pesoKg: 81 }), m(A, { pesoKg: 80 })]
    expect(codigos(cuatro.slice(1))).not.toContain('tendencia')
    const t = interpretar(p, cuatro).find((x) => x.codigo === 'tendencia')
    expect(t?.texto).toContain('1,3 kg')
  })

  test('"desde que empezaste" aparece desde la tercera medición', () => {
    expect(codigos([m(A), m(B)])).not.toContain('desde_inicio')
    expect(codigos([m('2026-10-25', { pesoKg: 82 }), m(A, { pesoKg: 81 }), m(B, { pesoKg: 80 })])).toContain('desde_inicio')
  })
})

describe('interpretar: entradas difíciles', () => {
  const a = m(A, { pesoKg: 80, cinturaCm: 90 })
  const b = m(B, { pesoKg: 79, cinturaCm: 88 })

  test('el orden de entrada no cambia el resultado', () => {
    expect(interpretar(p, [b, a])).toEqual(interpretar(p, [a, b]))
  })

  test('no muta la entrada', () => {
    const ms = [b, a]
    interpretar(p, ms)
    expect(ms[0]).toBe(b)
  })

  test('dos mediciones con la misma fecha no rompen el ritmo', () => {
    const r = interpretar(p, [m(A, { pesoKg: 80 }), { ...m(A, { pesoKg: 79 }), id: 'otra' }])
    for (const x of r) expect(x.titulo + x.texto).not.toMatch(/NaN|undefined|Infinity/)
  })

  test('un campo presente solo en una medición no dispara su regla', () => {
    const r = interpretar(p, [m(A, { pesoKg: 80 }), m(B, { pesoKg: 80.1, cinturaCm: 70, musculoKg: 30 })])
    expect(r.map((x) => x.codigo)).not.toContain('recomposicion')
    expect(r.map((x) => x.codigo)).not.toContain('pierde_musculo')
    for (const x of r) expect(x.titulo + x.texto).not.toMatch(/NaN|undefined|Infinity/)
  })

  test('grasa medida y grasa estimada no se comparan entre sí', () => {
    const r = codigos([m(A, { pesoKg: 80, grasaPct: 30 }), m(B, { pesoKg: 79, cuelloCm: 40, cinturaCm: 80 })])
    expect(r).not.toContain('baja_peso_grasa')
  })
})

test('la nota de orientación es la acordada', () => {
  expect(NOTA_ORIENTACION).toBe(
    'Orientación general, no diagnóstico médico. Las cifras de bioimpedancia son estimaciones: lo que importa es la tendencia.',
  )
})

describe('hallazgos de la revisión final', () => {
  const texto = (ms: Medicion[], codigo: string, quien = p) => {
    const x = interpretar(quien, ms).find((r) => r.codigo === codigo)
    return x ? x.titulo + ' ' + x.texto : null
  }

  test('ganancia muscular sin cintura medida no afirma nada sobre la cintura', () => {
    const t = texto([m(A, { pesoKg: 80, musculoKg: 35 }), m(B, { pesoKg: 80.8, musculoKg: 35.4 })], 'gana_musculo')
    expect(t).not.toBeNull()
    expect(t).not.toContain('cintura')
  })

  test('el umbral de 0,3 kg de músculo se cumple aunque la resta en coma flotante dé 0,2999…', () => {
    expect(codigos([m(A, { pesoKg: 80, musculoKg: 35, cinturaCm: 90 }), m(B, { pesoKg: 80.8, musculoKg: 35.3, cinturaCm: 90 })])).toContain('gana_musculo')
  })

  test('el umbral de 1 cm de cintura se cumple con decimales no exactos', () => {
    expect(codigos([m(A, { pesoKg: 80, cinturaCm: 90.3 }), m(B, { pesoKg: 80.1, cinturaCm: 89.3 })])).toContain('recomposicion')
  })

  test('bajar de peso con la grasa medida subiendo no se celebra', () => {
    const r = codigos([m(A, { pesoKg: 80, cinturaCm: 90, grasaPct: 25 }), m(B, { pesoKg: 79, cinturaCm: 89.9, grasaPct: 27 })])
    expect(r).not.toContain('baja_peso_grasa')
    expect(r).toContain('baja_sin_grasa')
  })

  test('bajar de peso con 0,1 cm menos de cintura no cuenta como bajar grasa', () => {
    expect(codigos([m(A, { pesoKg: 80, cinturaCm: 90 }), m('2026-12-01', { pesoKg: 79, cinturaCm: 89.9 })])).not.toContain('baja_peso_grasa')
  })

  test('bajar de peso con la cintura subiendo no dice que faltan datos', () => {
    const ms = [m(A, { pesoKg: 80, cinturaCm: 90 }), m('2026-12-01', { pesoKg: 79, cinturaCm: 92 })]
    expect(codigos(ms)).not.toContain('baja_sin_datos')
    expect(texto(ms, 'baja_sin_grasa')).toContain('cintura subió 2,0 cm')
  })

  test('la grasa estimada por perímetros se nombra como estimada', () => {
    const ms = [m(A, { pesoKg: 80, cuelloCm: 40, cinturaCm: 92 }), m(B, { pesoKg: 79, cuelloCm: 40, cinturaCm: 90 })]
    expect(texto(ms, 'baja_peso_grasa')).toContain('grasa corporal estimada')
  })

  describe('menores de edad', () => {
    const nina = persona({ sexo: 'mujer', estaturaCm: 115, fechaNacimiento: '2020-06-01' })
    const ms = [m(A, { pesoKg: 20, cinturaCm: 60 }), m(B, { pesoKg: 20.6, cinturaCm: 61 })]
    const cod = (quien: typeof nina) => interpretar(quien, ms).map((x) => x.codigo)

    test('no reciben categoría de IMC ni reglas de adultos', () => {
      expect(cod(nina)).toContain('menor')
      for (const c of ['imc', 'gana_grasa', 'alerta_cintura', 'sube_sin_datos', 'ritmo_rapido']) expect(cod(nina)).not.toContain(c)
    })
    test('sin fecha de nacimiento y con estatura bajo 140 cm se tratan como menores', () => {
      expect(cod(persona({ estaturaCm: 115, fechaNacimiento: '' }))).toContain('menor')
    })
    test('un adulto con fecha de nacimiento sigue recibiendo el IMC', () => {
      expect(interpretar(persona({ fechaNacimiento: '1990-01-01' }), [m(A), m(B)]).map((x) => x.codigo)).toContain('imc')
    })
    test('cumple 18 justo antes de la última medición: adulto', () => {
      expect(interpretar(persona({ fechaNacimiento: '2008-11-08' }), [m(A), m(B)]).map((x) => x.codigo)).toContain('imc')
      expect(interpretar(persona({ fechaNacimiento: '2008-11-09' }), [m(A), m(B)]).map((x) => x.codigo)).toContain('menor')
    })
  })
})
