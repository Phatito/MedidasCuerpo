import type { Cambio } from '../storage/db'

/**
 * ¿Una pieza que llega de la nube reemplaza lo local?
 * - sin registro local: sí;
 * - lo local está pendiente de subir: no (se subirá y el servidor decide);
 * - si no: sí cuando lo remoto es igual o más nuevo.
 */
export function debeAplicarse(local: Cambio | undefined, remotaEditadoEn: number): boolean {
  if (!local) return true
  if (local.pendiente) return false
  return remotaEditadoEn >= local.editadoEn
}
