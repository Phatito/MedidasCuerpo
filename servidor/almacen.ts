/** Dónde guarda el servidor cuentas, sesiones y piezas cifradas. D1 en producción; memoria en pruebas. */
export interface Usuario {
  usuario: string
  sal: string
  hashAcceso: string
  fallos: number
  bloqueadoHasta: number
  creado: number
}

export interface Pieza {
  id: string
  cifrado: string
  editadoEn: number
}

export interface Almacen {
  usuario(usuario: string): Promise<Usuario | null>
  /** false si el nombre ya existe */
  crearUsuario(u: Usuario): Promise<boolean>
  actualizarIntentos(usuario: string, fallos: number, bloqueadoHasta: number): Promise<void>
  crearSesion(hashToken: string, usuario: string, vence: number): Promise<void>
  sesion(hashToken: string): Promise<{ usuario: string; vence: number } | null>
  borrarSesion(hashToken: string): Promise<void>
  /** Guarda las piezas nuevas o más recientes; devuelve los ids aceptados. */
  subirPiezas(usuario: string, piezas: Pieza[]): Promise<string[]>
  piezasDesde(usuario: string, desde: number, limite: number): Promise<(Pieza & { version: number })[]>
  borrarUsuario(usuario: string): Promise<void>
  /** Suma un uso de la lectura con IA a `clave` en `dia` (AAAA-MM-DD) y devuelve el total del día. */
  sumarUso(clave: string, dia: string): Promise<number>
}

export class AlmacenMemoria implements Almacen {
  private usuarios = new Map<string, Usuario>()
  private sesiones = new Map<string, { usuario: string; vence: number }>()
  private piezas = new Map<string, Map<string, Pieza & { version: number }>>()
  private versiones = new Map<string, number>()
  private usos = new Map<string, number>()

  async sumarUso(clave: string, dia: string) {
    const k = `${dia}|${clave}`
    const n = (this.usos.get(k) ?? 0) + 1
    this.usos.set(k, n)
    return n
  }

  async usuario(usuario: string) {
    return this.usuarios.get(usuario) ?? null
  }
  async crearUsuario(u: Usuario) {
    if (this.usuarios.has(u.usuario)) return false
    this.usuarios.set(u.usuario, { ...u })
    return true
  }
  async actualizarIntentos(usuario: string, fallos: number, bloqueadoHasta: number) {
    const u = this.usuarios.get(usuario)
    if (u) this.usuarios.set(usuario, { ...u, fallos, bloqueadoHasta })
  }
  async crearSesion(hashToken: string, usuario: string, vence: number) {
    this.sesiones.set(hashToken, { usuario, vence })
  }
  async sesion(hashToken: string) {
    return this.sesiones.get(hashToken) ?? null
  }
  async borrarSesion(hashToken: string) {
    this.sesiones.delete(hashToken)
  }
  async subirPiezas(usuario: string, piezas: Pieza[]) {
    const mias = this.piezas.get(usuario) ?? new Map()
    this.piezas.set(usuario, mias)
    const aceptadas: string[] = []
    for (const p of piezas) {
      const actual = mias.get(p.id)
      if (actual && actual.editadoEn >= p.editadoEn) continue
      const version = (this.versiones.get(usuario) ?? 0) + 1
      this.versiones.set(usuario, version)
      mias.set(p.id, { ...p, version })
      aceptadas.push(p.id)
    }
    return aceptadas
  }
  async piezasDesde(usuario: string, desde: number, limite: number) {
    return [...(this.piezas.get(usuario)?.values() ?? [])]
      .filter((p) => p.version > desde)
      .sort((a, b) => a.version - b.version)
      .slice(0, limite)
  }
  async borrarUsuario(usuario: string) {
    this.usuarios.delete(usuario)
    this.piezas.delete(usuario)
    this.versiones.delete(usuario)
    for (const [h, s] of this.sesiones) if (s.usuario === usuario) this.sesiones.delete(h)
  }
}
