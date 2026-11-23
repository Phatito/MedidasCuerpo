import type { Almacen, Pieza } from './almacen.ts'

/**
 * Rutas del servidor de sincronización. Solo guarda texto cifrado: nunca ve nombres, fechas ni medidas.
 * Funciones puras sobre un Almacen, para usarlas igual en el Worker (D1) y en pruebas (memoria).
 */
const MIN = 60_000
const VIGENCIA_TOKEN = 365 * 24 * 60 * MIN
const MAX_FALLOS = 5
const BLOQUEO = 15 * MIN
const MAX_PIEZA = 16 * 1024
const MAX_CUERPO = 1024 * 1024
// Subida: 40 piezas por llamada (una consulta cada una) para no pasar el límite de 50 consultas por petición del plan gratuito de D1.
export const MAX_SUBIDA = 40
// Bajada: una sola consulta, de a 500.
const MAX_BAJADA = 500
const USUARIO = /^[a-z0-9._-]{3,30}$/
const ERROR_SESION = 'Usuario o frase secreta incorrectos'

function origenPermitido(origen: string | null): string | null {
  if (!origen) return null
  if (origen === 'https://phatito.github.io') return origen
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen)) return origen
  return null
}

function cabeceras(origen: string | null): Record<string, string> {
  const permitido = origenPermitido(origen)
  return permitido
    ? {
        'Access-Control-Allow-Origin': permitido,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : { Vary: 'Origin' }
}

const json = (estado: number, cuerpo: unknown, origen: string | null) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json', ...cabeceras(origen) } })
const vacia = (estado: number, origen: string | null) => new Response(null, { status: estado, headers: cabeceras(origen) })

const texto = new TextEncoder()
function base64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
function bytesDe(b64: unknown): number {
  if (typeof b64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return -1
  try {
    return atob(b64).length
  } catch {
    return -1
  }
}
async function sha256(valor: string): Promise<string> {
  return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', texto.encode(valor))))
}
/** Comparación en tiempo constante, para no filtrar por cuánto tarda. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function leerJson(req: Request): Promise<{ ok: true; dato: unknown } | { ok: false; estado: number }> {
  const crudo = await req.text()
  if (crudo.length > MAX_CUERPO) return { ok: false, estado: 413 }
  try {
    return { ok: true, dato: JSON.parse(crudo) }
  } catch {
    return { ok: false, estado: 400 }
  }
}

async function usuarioDeToken(req: Request, almacen: Almacen, ahora: number): Promise<{ usuario: string; hash: string } | null> {
  const r = /^Bearer (.+)$/.exec(req.headers.get('Authorization') ?? '')
  if (!r) return null
  const hash = await sha256(r[1])
  const s = await almacen.sesion(hash)
  if (!s || s.vence <= ahora) return null
  return { usuario: s.usuario, hash }
}

export async function manejar(req: Request, almacen: Almacen, ahora: number): Promise<Response> {
  const origen = req.headers.get('Origin')
  const url = new URL(req.url)
  const ruta = url.pathname.replace(/\/+$/, '') || '/'
  if (req.method === 'OPTIONS') return vacia(204, origen)

  try {
    if (ruta === '/cuenta' && req.method === 'POST') {
      const c = await leerJson(req)
      if (!c.ok) return vacia(c.estado, origen)
      const { usuario, sal, llaveAcceso } = (c.dato ?? {}) as Record<string, unknown>
      const nombre = typeof usuario === 'string' ? usuario.toLowerCase() : ''
      if (!USUARIO.test(nombre) || bytesDe(sal) !== 16 || bytesDe(llaveAcceso) !== 32) return json(400, { error: 'Datos de cuenta inválidos' }, origen)
      const creada = await almacen.crearUsuario({ usuario: nombre, sal: sal as string, hashAcceso: await sha256(llaveAcceso as string), fallos: 0, bloqueadoHasta: 0, creado: ahora })
      return creada ? vacia(201, origen) : json(409, { error: 'Ese nombre de usuario ya está en uso' }, origen)
    }

    if (ruta === '/sal' && req.method === 'GET') {
      const u = await almacen.usuario((url.searchParams.get('usuario') ?? '').toLowerCase())
      return u ? json(200, { sal: u.sal }, origen) : json(404, { error: 'No existe' }, origen)
    }

    if (ruta === '/sesion' && req.method === 'POST') {
      const c = await leerJson(req)
      if (!c.ok) return vacia(c.estado, origen)
      const { usuario, llaveAcceso } = (c.dato ?? {}) as Record<string, unknown>
      const u = typeof usuario === 'string' ? await almacen.usuario(usuario.toLowerCase()) : null
      if (!u || typeof llaveAcceso !== 'string') return json(401, { error: ERROR_SESION }, origen)
      if (u.bloqueadoHasta > ahora) return json(429, { error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' }, origen)
      if (!iguales(await sha256(llaveAcceso), u.hashAcceso)) {
        const fallos = u.fallos + 1
        await almacen.actualizarIntentos(u.usuario, fallos >= MAX_FALLOS ? 0 : fallos, fallos >= MAX_FALLOS ? ahora + BLOQUEO : 0)
        return json(401, { error: ERROR_SESION }, origen)
      }
      await almacen.actualizarIntentos(u.usuario, 0, 0)
      const token = base64(crypto.getRandomValues(new Uint8Array(32)))
      await almacen.crearSesion(await sha256(token), u.usuario, ahora + VIGENCIA_TOKEN)
      return json(200, { token }, origen)
    }

    // De aquí en adelante, todo exige una sesión.
    const quien = await usuarioDeToken(req, almacen, ahora)
    if (!quien) return json(401, { error: 'Sesión no válida' }, origen)

    if (ruta === '/sesion' && req.method === 'DELETE') {
      await almacen.borrarSesion(quien.hash)
      return vacia(204, origen)
    }

    if (ruta === '/piezas' && req.method === 'POST') {
      const c = await leerJson(req)
      if (!c.ok) return vacia(c.estado, origen)
      if (!Array.isArray(c.dato)) return json(400, { error: 'Se esperaba una lista' }, origen)
      if (c.dato.length > MAX_SUBIDA) return json(413, { error: 'Demasiadas piezas' }, origen)
      const piezas: Pieza[] = []
      for (const p of c.dato as Record<string, unknown>[]) {
        if (typeof p?.id !== 'string' || p.id.length > 128 || typeof p.cifrado !== 'string' || typeof p.editadoEn !== 'number' || !Number.isFinite(p.editadoEn)) {
          return json(400, { error: 'Pieza inválida' }, origen)
        }
        if (p.cifrado.length > MAX_PIEZA) return json(413, { error: 'Pieza demasiado grande' }, origen)
        piezas.push({ id: p.id, cifrado: p.cifrado, editadoEn: p.editadoEn })
      }
      const aceptadas = await almacen.subirPiezas(quien.usuario, piezas)
      const ok = new Set(aceptadas)
      return json(200, { aceptadas, rechazadas: piezas.map((p) => p.id).filter((id) => !ok.has(id)) }, origen)
    }

    if (ruta === '/piezas' && req.method === 'GET') {
      const desde = Math.max(0, Number(url.searchParams.get('desde') ?? 0) || 0)
      const filas = await almacen.piezasDesde(quien.usuario, desde, MAX_BAJADA + 1)
      const pagina = filas.slice(0, MAX_BAJADA)
      return json(
        200,
        {
          piezas: pagina.map(({ id, cifrado, editadoEn }) => ({ id, cifrado, editadoEn })),
          cursor: pagina.length ? pagina[pagina.length - 1].version : desde,
          hayMas: filas.length > MAX_BAJADA,
        },
        origen,
      )
    }

    if (ruta === '/cuenta' && req.method === 'DELETE') {
      await almacen.borrarUsuario(quien.usuario)
      return vacia(204, origen)
    }

    return json(404, { error: 'No existe' }, origen)
  } catch {
    return json(500, { error: 'Error del servidor' }, origen)
  }
}
