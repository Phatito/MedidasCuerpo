import { URL_SINCRONIZACION } from './config'

/** Error de la API con su estado HTTP (0 = sin conexión). */
export class ErrorApi extends Error {
  estado: number
  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

let base: string | null = URL_SINCRONIZACION
let pedirFetch: typeof fetch = (...a) => fetch(...a)

/** Para pruebas: otra dirección y otro fetch. */
export function configurarApi(url: string | null, f: typeof fetch = (...a) => fetch(...a)): void {
  base = url
  pedirFetch = f
}

export const hayServidor = () => base != null

export async function llamar<T>(metodo: string, ruta: string, opciones: { cuerpo?: unknown; token?: string } = {}): Promise<T> {
  if (!base) throw new ErrorApi(0, 'No hay servidor de sincronización configurado')
  let res: Response
  try {
    res = await pedirFetch(base + ruta, {
      method: metodo,
      headers: { ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}) },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'Sin conexión')
  }
  if (res.status === 204) return undefined as T
  const datos = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ErrorApi(res.status, datos.error ?? `Error ${res.status}`)
  return datos as T
}
