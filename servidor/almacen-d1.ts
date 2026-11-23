import type { Almacen, Pieza, Usuario } from './almacen.ts'

// Lo mínimo de la API de D1 que se usa (sin depender de los tipos de Cloudflare).
interface D1Resultado<T> {
  results: T[]
}
interface D1Sentencia {
  bind(...valores: unknown[]): D1Sentencia
  first<T>(): Promise<T | null>
  all<T>(): Promise<D1Resultado<T>>
  run(): Promise<unknown>
}
export interface D1Database {
  prepare(sql: string): D1Sentencia
  batch<T>(sentencias: D1Sentencia[]): Promise<D1Resultado<T>[]>
}

interface FilaUsuario {
  usuario: string
  sal: string
  hash_acceso: string
  fallos: number
  bloqueado_hasta: number
  creado: number
}

export class AlmacenD1 implements Almacen {
  private db: D1Database
  constructor(db: D1Database) {
    this.db = db
  }

  async usuario(usuario: string): Promise<Usuario | null> {
    const f = await this.db.prepare('SELECT * FROM usuarios WHERE usuario = ?').bind(usuario).first<FilaUsuario>()
    return f ? { usuario: f.usuario, sal: f.sal, hashAcceso: f.hash_acceso, fallos: f.fallos, bloqueadoHasta: f.bloqueado_hasta, creado: f.creado } : null
  }

  async crearUsuario(u: Usuario): Promise<boolean> {
    const r = await this.db
      .prepare('INSERT INTO usuarios (usuario, sal, hash_acceso, fallos, bloqueado_hasta, creado) VALUES (?, ?, ?, 0, 0, ?) ON CONFLICT (usuario) DO NOTHING RETURNING usuario')
      .bind(u.usuario, u.sal, u.hashAcceso, u.creado)
      .first<{ usuario: string }>()
    return r != null
  }

  async actualizarIntentos(usuario: string, fallos: number, bloqueadoHasta: number): Promise<void> {
    await this.db.prepare('UPDATE usuarios SET fallos = ?, bloqueado_hasta = ? WHERE usuario = ?').bind(fallos, bloqueadoHasta, usuario).run()
  }

  async crearSesion(hashToken: string, usuario: string, vence: number): Promise<void> {
    await this.db.prepare('INSERT INTO sesiones (hash_token, usuario, vence) VALUES (?, ?, ?)').bind(hashToken, usuario, vence).run()
  }

  async sesion(hashToken: string) {
    return this.db.prepare('SELECT usuario, vence FROM sesiones WHERE hash_token = ?').bind(hashToken).first<{ usuario: string; vence: number }>()
  }

  async borrarSesion(hashToken: string): Promise<void> {
    await this.db.prepare('DELETE FROM sesiones WHERE hash_token = ?').bind(hashToken).run()
  }

  async subirPiezas(usuario: string, piezas: Pieza[]): Promise<string[]> {
    if (piezas.length === 0) return []
    // Una sentencia por pieza, en un lote (transacción): solo se guarda si es nueva o más reciente,
    // y recibe una versión mayor que todas las de ese usuario.
    const sql = `INSERT INTO piezas (usuario, id, cifrado, editado_en, version)
      VALUES (?1, ?2, ?3, ?4, (SELECT COALESCE(MAX(version), 0) + 1 FROM piezas WHERE usuario = ?1))
      ON CONFLICT (usuario, id) DO UPDATE SET cifrado = excluded.cifrado, editado_en = excluded.editado_en, version = excluded.version
      WHERE excluded.editado_en > piezas.editado_en
      RETURNING id`
    const resultados = await this.db.batch<{ id: string }>(piezas.map((p) => this.db.prepare(sql).bind(usuario, p.id, p.cifrado, p.editadoEn)))
    return resultados.flatMap((r) => r.results.map((f) => f.id))
  }

  async piezasDesde(usuario: string, desde: number, limite: number) {
    const r = await this.db
      .prepare('SELECT id, cifrado, editado_en AS editadoEn, version FROM piezas WHERE usuario = ? AND version > ? ORDER BY version LIMIT ?')
      .bind(usuario, desde, limite)
      .all<Pieza & { version: number }>()
    return r.results
  }

  async borrarUsuario(usuario: string): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM piezas WHERE usuario = ?').bind(usuario),
      this.db.prepare('DELETE FROM sesiones WHERE usuario = ?').bind(usuario),
      this.db.prepare('DELETE FROM usuarios WHERE usuario = ?').bind(usuario),
    ])
  }
}
