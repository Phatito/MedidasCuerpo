/**
 * Dirección del servidor de sincronización (Cloudflare Worker). No es secreta.
 * Se puede cambiar al compilar con VITE_SYNC_URL. Sin dirección, la cuenta no se ofrece y la app funciona como siempre.
 */
const PUBLICADA = ''
const desdeEntorno = (import.meta.env?.VITE_SYNC_URL as string | undefined) ?? undefined
export const URL_SINCRONIZACION: string | null = (desdeEntorno ?? PUBLICADA).replace(/\/+$/, '') || null
