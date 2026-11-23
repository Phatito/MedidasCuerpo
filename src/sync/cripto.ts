/**
 * Cifrado en el dispositivo. De la frase secreta y la sal del usuario salen:
 * - una llave de cifrado AES-256-GCM, que nunca sale del dispositivo;
 * - una llave HMAC para los identificadores opacos de las piezas (el servidor no ve qué es cada pieza);
 * - una llave de acceso, lo único que viaja al servidor al iniciar sesión.
 */
export interface Llaves {
  cifrado: CryptoKey
  ids: CryptoKey
  /** base64 de 32 bytes */
  acceso: string
}

const ITERACIONES = 600_000
const BYTES_SAL = 16
const BYTES_IV = 12
const cripto = globalThis.crypto.subtle
const texto = new TextEncoder()

export function aBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function deBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

export function nuevaSal(): string {
  return aBase64(globalThis.crypto.getRandomValues(new Uint8Array(BYTES_SAL)))
}

export async function derivarLlaves(frase: string, sal: string): Promise<Llaves> {
  // NFC: la misma frase escrita en otro teclado (tildes compuestas o no) da las mismas llaves.
  const base = await cripto.importKey('raw', texto.encode(frase.normalize('NFC')), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(
    await cripto.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deBase64(sal), iterations: ITERACIONES }, base, 512),
  )
  const llaveCifrado = bits.slice(0, 32)
  const cifrado = await cripto.importKey('raw', llaveCifrado, 'AES-GCM', false, ['encrypt', 'decrypt'])
  const hkdf = await cripto.importKey('raw', llaveCifrado, 'HKDF', false, ['deriveKey'])
  const ids = await cripto.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: texto.encode('mesura-ids') },
    hkdf,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign'],
  )
  return { cifrado, ids, acceso: aBase64(bits.slice(32, 64)) }
}

/** base64(iv ‖ texto cifrado) */
export async function cifrar(llave: CryptoKey, datos: unknown): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(BYTES_IV))
  const cifrado = new Uint8Array(await cripto.encrypt({ name: 'AES-GCM', iv }, llave, texto.encode(JSON.stringify(datos))))
  const todo = new Uint8Array(BYTES_IV + cifrado.length)
  todo.set(iv)
  todo.set(cifrado, BYTES_IV)
  return aBase64(todo)
}

export async function descifrar<T>(llave: CryptoKey, cifradoB64: string): Promise<T> {
  const todo = deBase64(cifradoB64)
  const claro = await cripto.decrypt({ name: 'AES-GCM', iv: todo.slice(0, BYTES_IV) }, llave, todo.slice(BYTES_IV))
  return JSON.parse(new TextDecoder().decode(claro)) as T
}

export async function idOpaco(llaveIds: CryptoKey, idLogico: string): Promise<string> {
  const firma = new Uint8Array(await cripto.sign('HMAC', llaveIds, texto.encode(idLogico)))
  return [...firma].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Base64(valor: string): Promise<string> {
  return aBase64(new Uint8Array(await cripto.digest('SHA-256', texto.encode(valor))))
}
