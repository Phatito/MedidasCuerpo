import { expect, test } from 'vitest'
import { lectorGemini } from '../../servidor/ia.ts'

test('arma el pedido a Gemini con la clave, la imagen y un esquema, y devuelve el JSON que responde', async () => {
  let url = ''
  let init: RequestInit | undefined
  const falso = (async (u: string, i?: RequestInit) => {
    url = u
    init = i
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"pesoKg":90.1,"grasaPct":25.4}' }] } }] }), { status: 200 })
  }) as typeof fetch
  const leer = lectorGemini('clave-falsa', 'gemini-flash-latest', falso)
  const r = await leer([{ tipo: 'image/jpeg', datos: 'QUJD' }])
  expect(r).toEqual({ pesoKg: 90.1, grasaPct: 25.4 })
  expect(url).toContain('/models/gemini-flash-latest:generateContent')
  expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('clave-falsa')
  const cuerpo = JSON.parse(String(init!.body))
  expect(cuerpo.contents[0].parts.some((p: { inline_data?: { data: string } }) => p.inline_data?.data === 'QUJD')).toBe(true)
  expect(cuerpo.generationConfig.responseMimeType).toBe('application/json')
  expect(cuerpo.generationConfig.responseSchema.properties.pesoKg).toBeTruthy()
})

test('un error de Gemini se propaga', async () => {
  const falso = (async () => new Response('{"error":{"message":"clave inválida"}}', { status: 400 })) as typeof fetch
  await expect(lectorGemini('x', 'm', falso)([{ tipo: 'image/png', datos: 'QQ==' }])).rejects.toThrow()
})

test('si un modelo está saturado (503) prueba el siguiente', async () => {
  const usados: string[] = []
  const falso = (async (u: string) => {
    usados.push(u)
    if (u.includes('/models/a:')) return new Response('{"error":{"code":503}}', { status: 503 })
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"pesoKg":80}' }] } }] }), { status: 200 })
  }) as typeof fetch
  const r = await lectorGemini('k', ['a', 'b'], falso, 0)([{ tipo: 'image/png', datos: 'QQ==' }])
  expect(r).toEqual({ pesoKg: 80 })
  expect(usados.some((u) => u.includes('/models/b:'))).toBe(true)
})
