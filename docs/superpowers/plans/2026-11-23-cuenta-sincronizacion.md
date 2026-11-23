# Cuenta y sincronización cifrada — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuenta opcional con nombre de usuario y frase secreta que sincroniza personas, mediciones y ajustes entre dispositivos, cifrados en el dispositivo, a través de un Worker de Cloudflare con D1.

**Architecture:** `src/sync/` concentra el cliente: cifrado con Web Crypto (`cripto.ts`), reglas de fusión puras (`fusion.ts`), cliente HTTP (`api.ts`) y motor de sincronización (`motor.ts`). `src/storage/db.ts` registra cada cambio local en una tabla `cambios` (Dexie versión 2). `servidor/` contiene la lógica del Worker como funciones sobre una interfaz `Almacen`, con una implementación D1 (producción) y otra en memoria (pruebas unitarias y servidor local para las e2e).

**Tech Stack:** React 18, TypeScript, Dexie 4, Web Crypto (PBKDF2, AES-GCM, HMAC), Cloudflare Workers + D1, `wrangler@4` (solo con `npx` al publicar), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-cuenta-sincronizacion-design.md`

## Global Constraints

- Ningún dato de salud sale del dispositivo sin cifrar; los ids que ve el servidor son HMAC opacos.
- PBKDF2-SHA-256, **600 000** iteraciones, sal de **16 bytes**, 64 bytes derivados: 0–31 llave de cifrado AES-256-GCM, 32–63 llave de acceso. IV de **12 bytes** aleatorio por pieza.
- Usuario: `^[a-z0-9._-]{3,30}$` tras pasar a minúsculas. Frase: al menos **12** caracteres.
- Token: 32 bytes aleatorios, el servidor guarda su SHA-256, vence a **1 año**. Bloqueo: **5** fallos seguidos → **15 min**.
- Límites: pieza ≤ **16 KB**, cuerpo ≤ **1 MB**, ≤ **500** piezas por llamada.
- Aceptación en servidor: pieza nueva o `editadoEn` **mayor** que el guardado. Al bajar: reemplaza si lo local no está pendiente y lo remoto es **mayor o igual**.
- Datos anteriores a esta función: `editadoEn = 0`. `ultimoRespaldo` no se sincroniza.
- Sincroniza: al iniciar sesión, al abrir, al volver la conexión, **3 s** después de cada cambio local y cada **5 min**.
- CORS: `https://phatito.github.io` y `http://localhost:<puerto>`.
- Sin cuenta, la app funciona exactamente como hoy; sin URL de sincronización, la sección de cuenta no se muestra.
- Textos fijos: "Ese nombre de usuario ya está en uso", "Usuario o frase secreta incorrectos", "Tu sesión terminó en este dispositivo. Inicia sesión de nuevo para seguir sincronizando.", "Entiendo que si olvido la frase no se puede recuperar", "Tus datos son tuyos: se guardan en tu dispositivo y, si creas una cuenta, viajan cifrados; solo tú puedes leerlos."
- La clave de API de Cloudflare solo entra por el formulario seguro de credenciales; nunca en el chat ni en el repositorio.
- Pruebas con datos inventados. Commits con las líneas `Co-Authored-By` y `Claude-Session` de la sesión.

## Review Focus

1. Editar la misma medición en dos dispositivos sin conexión y luego sincronizar ambos → los dos quedan con la edición más reciente (Task 2 unitaria de fusión; Task 5 e2e).
2. Borrar una persona en un dispositivo mientras el otro le agregaba una medición sin conexión → la persona queda borrada y su medición huérfana no se muestra ni rompe la ficha (Task 2).
3. Iniciar sesión con otra cuenta en un dispositivo con datos → se pregunta antes de mezclar y no se suben datos ajenos sin confirmar (Task 5 e2e).
4. Frase con tildes o espacios (por ejemplo "café con leche 2026") → la misma frase da las mismas llaves en todos los dispositivos (normalizar a NFC) (Task 1).
5. El servidor cae o responde 500 a mitad de una subida → nada se marca subido, se reintenta en el siguiente ciclo y la app sigue funcionando (Task 4).

---

### Task 1: Cifrado en el dispositivo (`src/sync/cripto.ts`)

**Files:** Create `src/sync/cripto.ts`, `tests/sync/cripto.test.ts`

**Interfaces — Produces:**
```ts
export interface Llaves { cifrado: CryptoKey; ids: CryptoKey; acceso: string /* base64 */ }
export function nuevaSal(): string                                   // base64 de 16 bytes
export async function derivarLlaves(frase: string, sal: string): Promise<Llaves>
export async function cifrar(llave: CryptoKey, datos: unknown): Promise<string>   // base64(iv ‖ ciphertext)
export async function descifrar<T>(llave: CryptoKey, texto: string): Promise<T>
export async function idOpaco(llaveIds: CryptoKey, idLogico: string): Promise<string> // hex de HMAC-SHA-256
export async function sha256Base64(texto: string): Promise<string>
```
- `cifrado`: AES-GCM no extraíble. `ids`: HMAC-SHA-256 derivada de los bytes 0–31 con HKDF (`info: "mesura-ids"`), no extraíble. La frase se normaliza con `normalize('NFC')`.

- [ ] **Step 1: Pruebas que fallan** (usar sal fija en las pruebas):
  - misma frase y sal → mismo `acceso` y mismo `idOpaco('medicion:p1_2026-11-01')`; otra frase u otra sal → distintos;
  - `"café con leche 2026"` escrita en NFC y en NFD → mismo `acceso`;
  - `descifrar(cifrar(x)) == x` para `{ nombre: 'Ana', pesoKg: 70.5 }`; dos cifrados del mismo dato son distintos;
  - descifrar con otra llave lanza; `nuevaSal()` decodifica a 16 bytes.
- [ ] **Step 2:** `npx vitest run tests/sync/cripto.test.ts` → FAIL (no existe).
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** → PASS; `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: on-device encryption keys and pieces for sync`

---

### Task 2: Registro de cambios local y reglas de fusión

**Files:** Modify `src/storage/db.ts`, `src/storage/backup.ts`; Create `src/sync/fusion.ts`; Tests `tests/storage/cambios.test.ts`, `tests/sync/fusion.test.ts`

**Interfaces — Produces:**
```ts
// db.ts (Dexie version(2): tabla nueva `cambios: 'idLogico, pendiente'` y `sesion: 'clave'`; las demás sin cambios)
export interface Cambio { idLogico: string; editadoEn: number; pendiente: 0 | 1; borrado: 0 | 1 }
export type ContenidoPieza =
  | { tipo: 'persona'; idLogico: string; editadoEn: number; datos: Persona }
  | { tipo: 'medicion'; idLogico: string; editadoEn: number; datos: Medicion }
  | { tipo: 'ajustes'; idLogico: 'ajustes'; editadoEn: number; datos: Omit<Ajustes, 'ultimoRespaldo'> }
  | { tipo: 'persona' | 'medicion' | 'ajustes'; idLogico: string; editadoEn: number; borrado: true }
export async function pendientesDeSubir(): Promise<ContenidoPieza[]>
export async function marcarSubidas(ids: string[], rechazadas: string[]): Promise<void>
export async function aplicarRemotas(piezas: ContenidoPieza[]): Promise<number>   // cuántas cambiaron algo
export async function marcarTodoPendiente(): Promise<void>                         // datos sin registro → editadoEn 0
export async function reiniciarCambios(): Promise<void>
// fusion.ts (pura)
export function debeAplicarse(local: Cambio | undefined, remotaEditadoEn: number): boolean
```
- Ids lógicos: `persona:<id>`, `medicion:<id>`, `ajustes`.
- Cada `guardar*`/`borrar*`/`guardarAjustes` registra su cambio con `editadoEn = Date.now()`, `pendiente = 1`, en la misma transacción. `borrarPersona` registra también el borrado de cada medición suya. `restaurarRespaldo` registra todo lo restaurado y borra lo que estaba en `cambios` y no viene en el respaldo.
- `aplicarRemotas` escribe directo en las tablas (sin marcar pendiente) y actualiza `cambios` con el `editadoEn` remoto. Ignora `ultimoRespaldo` (se conserva el local). Una medición cuya persona no existe (borrada) no se aplica.
- `debeAplicarse`: `local` ausente → true; `local.pendiente` → false; si no, `remota >= local.editadoEn`.

- [ ] **Step 1: Pruebas que fallan** (`fake-indexeddb`):
  - guardar una medición crea `cambios` `medicion:<id>` pendiente; borrarla lo deja `borrado: 1` pendiente;
  - borrar una persona deja pendientes el borrado de la persona y de sus 2 mediciones;
  - `pendientesDeSubir` devuelve el contenido actual de cada pieza pendiente (o `borrado: true`), y `ajustes` sin `ultimoRespaldo`;
  - `marcarSubidas` quita `pendiente` a subidas y rechazadas;
  - `aplicarRemotas`: remota más nueva reemplaza; igual reemplaza si no hay pendiente; local pendiente no se toca; remota borrada borra; medición de persona inexistente no se aplica; `ultimoRespaldo` local se conserva;
  - `marcarTodoPendiente` sobre datos existentes sin registro → pendientes con `editadoEn 0`;
  - la base existente de versión 1 se abre con versión 2 sin perder personas ni mediciones;
  - `debeAplicarse` en sus cuatro casos.
- [ ] **Step 2:** → FAIL. **Step 3:** implementar. **Step 4:** `npm test` → PASS (incluidas las pruebas de respaldo existentes).
- [ ] **Step 5: Commit** — `feat: local change log and merge rules for sync`

---

### Task 3: Servidor (`servidor/`)

**Files:** Create `servidor/logica.ts` (rutas como `manejar(req: Request, almacen: Almacen, ahora: number): Promise<Response>`), `servidor/almacen.ts` (interfaz + `AlmacenMemoria`), `servidor/almacen-d1.ts`, `servidor/worker.ts` (entrada `fetch` con `env.DB`), `servidor/esquema.sql`, `servidor/wrangler.toml` (nombre `mesura-sync`, binding `DB` → base `mesura`), `servidor/dev.ts` (servidor HTTP de Node en `:8787` con `AlmacenMemoria`, ejecutable con `node --experimental-strip-types servidor/dev.ts`); Test `tests/servidor/logica.test.ts`. Ajustar `tsconfig.json`/vitest para incluir `servidor/`.

**Interfaces — Produces:** rutas exactamente como la tabla "Servidor" del spec. Respuestas JSON: `POST /cuenta` 201 o 409 `{ error: 'Ese nombre de usuario ya está en uso' }`; `GET /sal` 200 `{ sal }` o 404; `POST /sesion` 200 `{ token }` o 401 `{ error: 'Usuario o frase secreta incorrectos' }` o 429 si bloqueado; `POST /piezas` 200 `{ aceptadas: string[], rechazadas: string[] }`; `GET /piezas?desde=N` 200 `{ piezas: { id, cifrado, editadoEn }[], cursor, hayMas }`; sin token válido 401. Preflight `OPTIONS` con CORS.

- [ ] **Step 1: Pruebas que fallan** (con `AlmacenMemoria`): crear cuenta; usuario repetido 409; usuario inválido 400; sesión correcta da token; frase incorrecta y usuario inexistente dan el mismo 401 y mismo texto; 5 fallos → 429 aunque la sexta sea correcta, y a los 15 min vuelve a funcionar; token vencido → 401; subir pieza nueva → aceptada; subir con `editadoEn` igual o menor → rechazada; bajar con cursor devuelve solo lo nuevo y pagina de a 500; pieza de 16 KB + 1 → 413; otra cuenta no ve mis piezas; `DELETE /cuenta` borra piezas y sesiones; origen no permitido no recibe `Access-Control-Allow-Origin`.
- [ ] **Step 2:** → FAIL. **Step 3:** implementar (comparación de hashes en tiempo constante).
- [ ] **Step 4:** `npm test` → PASS; `node --experimental-strip-types servidor/dev.ts` responde `GET /sal?usuario=nadie` → 404.
- [ ] **Step 5: Commit** — `feat: sync server logic with memory and D1 stores`

---

### Task 4: Motor de sincronización del cliente

**Files:** Create `src/sync/config.ts` (`export const URL_SINCRONIZACION: string | null`, de `import.meta.env.VITE_SYNC_URL` o la URL publicada; null si vacía), `src/sync/api.ts`, `src/sync/sesion.ts`, `src/sync/motor.ts`; Test `tests/sync/motor.test.ts`

**Interfaces — Produces:**
```ts
// sesion.ts — guarda en la tabla `sesion` de Dexie: usuario, token, llaves (CryptoKey no extraíbles), cursor, ultimoUsuario
export async function crearCuenta(usuario: string, frase: string): Promise<void>
export async function iniciarSesion(usuario: string, frase: string, siHayDatosAjenos: () => Promise<'subir' | 'reemplazar' | 'cancelar'>): Promise<boolean>
export async function cerrarSesion(opciones?: { borrarDatosLocales?: boolean }): Promise<void>
export async function borrarCuenta(): Promise<void>
export async function sesionActual(): Promise<{ usuario: string } | null>
// motor.ts
export type EstadoSync = { tipo: 'sin-sesion' } | { tipo: 'al-dia'; desde: number } | { tipo: 'sincronizando' } | { tipo: 'sin-conexion' } | { tipo: 'error'; motivo: string } | { tipo: 'sesion-terminada' }
export function sincronizarAhora(): Promise<void>      // un ciclo: subir pendientes (cifrados) → bajar desde cursor (descifrar) → aplicarRemotas
export function programarSincronizacion(): () => void  // engancha abrir, online, cambios locales (3 s) y cada 5 min; devuelve des-suscripción
export function suscribirEstado(fn: (e: EstadoSync) => void): () => void
```
- "Datos ajenos": hay personas o mediciones locales y `ultimoUsuario` existe y es distinto del que entra. Si `ultimoUsuario` no existe y hay datos, se suben (primera cuenta del dispositivo) con `marcarTodoPendiente`. `reemplazar` → `borrarTodo` y `reiniciarCambios` antes de bajar.
- 401 en cualquier llamada con token → `cerrarSesion()` conservando datos y estado `sesion-terminada`.
- Error de red o 5xx → nada se marca subido; estado `sin-conexion` o `error`.

- [ ] **Step 1: Pruebas que fallan** (cliente contra `manejar` + `AlmacenMemoria` mediante un `fetch` falso; dos bases Dexie distintas simulan dos dispositivos): crear cuenta y sincronizar sube todo; el segundo dispositivo inicia sesión y recibe las mismas personas y mediciones; el cuerpo de cada petición no contiene "Ana" ni "72,5"/"72.5" ni la fecha; editar la misma medición en ambos y sincronizar ambos → los dos con la más reciente; un 500 a mitad de la subida no marca nada subido y el siguiente ciclo sube; 401 → `sesion-terminada` y datos locales intactos; otra cuenta con datos ajenos llama a `siHayDatosAjenos`, y `cancelar` no sube nada.
- [ ] **Step 2:** → FAIL. **Step 3:** implementar. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: client sync engine with sessions`

---

### Task 5: Pantallas

**Files:** Create `src/ui/Cuenta.tsx`, `src/ui/IconoNube.tsx`; Modify `src/ui/Datos.tsx` (sección arriba, solo si `URL_SINCRONIZACION`), `src/ui/App.tsx` (ícono en el encabezado, `programarSincronizacion` al montar si hay sesión, aviso de sesión terminada en `#aviso-app`), `src/ui/styles.css`, `playwright.config.ts` (segundo `webServer`: `node --experimental-strip-types servidor/dev.ts`; la compilación de pruebas con `VITE_SYNC_URL=http://localhost:8787`); Test `e2e/app.spec.ts`

- Contenido exacto según "Pantallas" del spec. El ícono de nube es un `<button>` de 44 px con `aria-label` "Sincronización: al día" / "…sincronizando" / "…sin conexión" / "…error", y lleva a Ajustes y datos.
- Con datos ajenos se muestra un diálogo propio (no `window.confirm`) con tres botones: "Subirlos a esta cuenta", "Reemplazarlos por los de la nube", "Cancelar".

- [ ] **Step 1: Pruebas e2e que fallan** (dos `browser.newContext()` = PC y celular):
  - crear cuenta en el PC con una persona y una medición → iniciar sesión en el celular → ve la persona y la medición;
  - editar en el celular → "Sincronizar ahora" en el PC → ve el cambio;
  - el PC sin conexión (`context.setOffline(true)`) registra una medición → el ícono dice "sin conexión" → al volver la conexión, el celular la recibe tras sincronizar;
  - cerrar sesión conserva los datos locales y oculta el ícono;
  - otra cuenta en un dispositivo con datos → aparece el diálogo; "Cancelar" deja todo igual y sin sesión;
  - crear cuenta exige la casilla "Entiendo…" y frase ≥ 12; usuario repetido muestra "Ese nombre de usuario ya está en uso";
  - ninguna petición al servidor contiene el nombre de la persona (se inspeccionan los cuerpos);
  - sin cuenta, todas las pruebas anteriores de la suite siguen pasando.
- [ ] **Step 2:** → FAIL. **Step 3:** implementar. **Step 4:** `npm test` y `npx playwright test --trace off` → PASS.
- [ ] **Step 5: Commit** — `feat: account and sync screens with cloud status icon`

---

### Task 6: Mensajes de privacidad y material de difusión

**Files:** Modify `README.md`, `marketing/promo.html` (la escena "Tus datos se quedan en tu dispositivo" → "Tus datos son tuyos" con "Cifrados de punta a punta · Solo tú puedes leerlos · Funciona sin conexión"), `index.html` (descripción), `marketing/README.md`; regenerar `public/og-image.png`, `marketing/promo-poster.png` y los dos videos con `node marketing/render-promo.cjs all`.

- [ ] **Step 1:** `git grep -n "se quedan en tu dispositivo\|Sin cuentas\|Sin servidores"` lista cada texto a cambiar; cambiarlos por el texto fijo de Global Constraints o su versión corta.
- [ ] **Step 2:** regenerar y revisar el póster, la imagen social y un fotograma de la escena de privacidad.
- [ ] **Step 3: Commit** — `docs: privacy message for optional encrypted account`

---

### Task 7: Publicar el servidor en Cloudflare

- [ ] **Step 1:** pedir la clave de API con `request_credential` (host `api.cloudflare.com`, permisos Workers Scripts:Edit y D1:Edit), explicándolo antes al usuario.
- [ ] **Step 2:** `npx wrangler@4 d1 create mesura` (o la herramienta de D1 del conector), poner el id en `servidor/wrangler.toml`, `npx wrangler@4 d1 execute mesura --remote --file servidor/esquema.sql`, `npx wrangler@4 deploy --config servidor/wrangler.toml` → anota la URL `https://mesura-sync.<subdominio>.workers.dev`.
- [ ] **Step 3:** verificar en vivo con `curl`: `GET /sal?usuario=nadie` → 404; preflight desde `https://phatito.github.io` → cabecera CORS correcta.
- [ ] **Step 4:** poner la URL en `src/sync/config.ts`, `npm test`, `npx playwright test --trace off`, commit `feat: point the app to the published sync server`, push, esperar el despliegue de Pages y comprobar en el sitio publicado que "Cuenta y sincronización" aparece.
