-- Base D1 "mesura": solo cuentas, sesiones y piezas cifradas. Nunca datos de salud en claro.
CREATE TABLE IF NOT EXISTS usuarios (
  usuario TEXT PRIMARY KEY,
  sal TEXT NOT NULL,
  hash_acceso TEXT NOT NULL,
  fallos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta INTEGER NOT NULL DEFAULT 0,
  creado INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sesiones (
  hash_token TEXT PRIMARY KEY,
  usuario TEXT NOT NULL,
  vence INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones (usuario);
CREATE TABLE IF NOT EXISTS piezas (
  usuario TEXT NOT NULL,
  id TEXT NOT NULL,
  cifrado TEXT NOT NULL,
  editado_en INTEGER NOT NULL,
  version INTEGER NOT NULL,
  PRIMARY KEY (usuario, id)
);
CREATE INDEX IF NOT EXISTS piezas_version ON piezas (usuario, version);
