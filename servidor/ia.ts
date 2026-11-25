/**
 * Lectura de capturas de Xiaomi Home con Gemini. La clave vive solo en el servidor (secreto GEMINI_API_KEY);
 * la imagen se manda a Gemini para leerla y no se guarda en ningún lado.
 */
export interface ImagenCaptura {
  tipo: string
  datos: string // base64
}
export type LectorCaptura = (imagenes: ImagenCaptura[]) => Promise<unknown>

const NUMERO = { type: 'NUMBER', nullable: true }
const CAMPOS: Record<string, string> = {
  pesoKg: 'Peso en kg: el número grande de arriba del informe.',
  grasaPct: 'Porcentaje de grasa corporal (%).',
  aguaPct: 'Agua corporal en % (no la masa de agua en kg).',
  musculoKg: 'Masa muscular esquelética en kg.',
  musculoTotalKg: 'Masa muscular en kg (no la esquelética).',
  grasaVisceral: 'Calificación o nivel de grasa visceral.',
  masaOseaKg: 'Contenido mineral óseo o masa ósea en kg.',
  proteinaPct: 'Porcentaje de proteínas (%).',
  metabolismoBasalKcal: 'Índice metabólico basal o metabolismo basal en kcal.',
  edadCorporal: 'Edad corporal en años.',
  frecuenciaCardiacaLpm: 'Frecuencia cardíaca en lpm, si aparece.',
}

const INSTRUCCIONES = `Eres un lector de informes de básculas inteligentes (Xiaomi Home, Mi Fitness, Zepp u otras), en español o en inglés.
Lee las imágenes (son partes del mismo informe) y devuelve solo los valores que aparecen escritos; si un dato no está, usa null.
No inventes ni calcules nada. Ignora las variaciones respecto a mediciones anteriores (números con flechas o "Disminución de").
Usa punto decimal. fecha en formato AAAA-MM-DD (el informe la muestra como DD/MM/AAAA) y hora en HH:MM.
Campos:
${Object.entries(CAMPOS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`

const ESQUEMA = {
  type: 'OBJECT',
  properties: { fecha: { type: 'STRING', nullable: true }, hora: { type: 'STRING', nullable: true }, ...Object.fromEntries(Object.keys(CAMPOS).map((k) => [k, NUMERO])) },
}

// Si un modelo está saturado, se reintenta una vez y luego se prueba el siguiente.
export const MODELOS_GEMINI = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest']
const SATURADO = new Set([429, 500, 503])

export function lectorGemini(clave: string, modelos: string | string[], pedir: typeof fetch = fetch, esperaMs = 1200): LectorCaptura {
  const lista = Array.isArray(modelos) ? modelos : [modelos]
  return async (imagenes) => {
    const cuerpo = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: INSTRUCCIONES }, ...imagenes.map((i) => ({ inline_data: { mime_type: i.tipo, data: i.datos } }))] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: ESQUEMA },
    })
    let ultimo = ''
    for (const modelo of lista) {
      for (let intento = 0; intento < 2; intento++) {
        const res = await pedir(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
          body: cuerpo,
        })
        if (res.ok) {
          const datos = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
          const texto = datos.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
          return JSON.parse(texto)
        }
        const detalle = ((await res.text().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 300)
        ultimo = `Gemini (${modelo}) respondió ${res.status}: ${detalle}`
        // Un error que no es de saturación (clave inválida, modelo inexistente) no se reintenta con el mismo modelo.
        if (!SATURADO.has(res.status)) break
        if (esperaMs) await new Promise((r) => setTimeout(r, esperaMs))
      }
    }
    throw new Error(ultimo)
  }
}
