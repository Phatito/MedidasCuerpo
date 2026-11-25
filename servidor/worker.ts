import { AlmacenD1, type D1Database } from './almacen-d1.ts'
import { lectorGemini, MODELOS_GEMINI } from './ia.ts'
import { manejar } from './logica.ts'

interface Entorno {
  DB: D1Database
  /** Secreto opcional: la clave de Gemini para leer capturas. Sin ella, /leer-captura responde 503. */
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
}

export default {
  fetch(req: Request, env: Entorno): Promise<Response> {
    const leerCaptura = env.GEMINI_API_KEY ? lectorGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...MODELOS_GEMINI] : MODELOS_GEMINI) : undefined
    return manejar(req, new AlmacenD1(env.DB), Date.now(), { leerCaptura })
  },
}
