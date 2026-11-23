# Cuenta y sincronización cifrada — Diseño

Fecha: 2026-11-23

## Propósito

El usuario quiere ver y cargar los mismos datos desde el PC y desde el
celular (por ejemplo, leer en el teléfono la captura de Xiaomi Home y revisar
después las cifras en el computador). Hoy los datos viven solo en el
navegador de cada dispositivo.

Lo resolvemos con una **cuenta opcional** y **sincronización cifrada de punta a
punta**: los datos se cifran en el dispositivo con una frase secreta que solo
conoce el usuario, y el servidor guarda únicamente texto cifrado.

## Decisiones tomadas (con el usuario)

| Tema | Decisión |
|---|---|
| Privacidad | Opción B: cifrado en el dispositivo; nadie más que el usuario puede leer los datos, tampoco el servidor |
| Granularidad | Cada persona, medición y los ajustes viajan como piezas separadas; lo hecho en dos dispositivos se junta; misma pieza editada en ambos → gana la última edición |
| Imágenes | Las capturas de Xiaomi **no** se suben; solo los números que la app lee |
| Servidor | Cloudflare (Worker + base D1), gratis y aparte de los proyectos de Supabase del usuario |
| Inicio de sesión | **Nombre de usuario + frase secreta**, sin correo |

## Fuera de alcance

- Recuperar la cuenta si se olvida la frase (por diseño no es posible).
- Compartir datos entre cuentas distintas; varias cuentas en un dispositivo a
  la vez.
- Subir imágenes.
- La "diferenciación" de la app: es un trabajo aparte, después de este.

## Anti-objetivos (sería un fracaso aunque "funcione")

- Que algún dato de salud (nombres, fechas, pesos, medidas, notas) llegue al
  servidor sin cifrar, o que el servidor pueda deducir cuántas mediciones hay
  por persona o en qué fechas a partir de los identificadores.
- Perder una medición al sincronizar, o que sin internet la app deje de
  funcionar.
- Obligar a crear cuenta: quien no inicia sesión usa la app exactamente como
  hoy.

## Cómo funciona la cuenta

**Llaves.** De la frase secreta y una sal aleatoria de 16 bytes (propia de cada
usuario, guardada en el servidor) se derivan, con PBKDF2-SHA-256 y 600 000
iteraciones (Web Crypto), 64 bytes:
- los primeros 32: **llave de cifrado** (AES-256-GCM). Nunca sale del
  dispositivo.
- los últimos 32: **llave de acceso**. Viaja al servidor solo al iniciar
  sesión; el servidor guarda su SHA-256, nunca la llave.

**Crear cuenta:** el usuario elige nombre de usuario (3–30 caracteres, letras,
números, punto, guion o guion bajo; sin distinguir mayúsculas) y frase secreta
(al menos 12 caracteres; la app sugiere usar 4 palabras). El dispositivo genera
la sal, deriva las llaves y envía usuario + sal + llave de acceso. Si el
usuario ya existe: "Ese nombre de usuario ya está en uso".

**Iniciar sesión:** el dispositivo pide la sal del usuario, deriva las llaves y
envía la llave de acceso. El servidor devuelve un **token de sesión** (32 bytes
aleatorios; guarda su SHA-256, válido 1 año). Usuario inexistente o frase
incorrecta dan el mismo mensaje: "Usuario o frase secreta incorrectos". Tras 5
intentos fallidos seguidos, ese usuario queda bloqueado 15 minutos.

**En el dispositivo** se guardan (en IndexedDB) el nombre de usuario, el token
y la llave de cifrado como `CryptoKey` **no extraíble**: el usuario escribe la
frase una sola vez por dispositivo.

**Cerrar sesión** borra token y llave del dispositivo; los datos locales se
quedan (con una opción aparte, con confirmación, para borrarlos de este
dispositivo). **Borrar cuenta** elimina del servidor el usuario y todas sus
piezas, con confirmación escribiendo el nombre de usuario.

## Cómo se sincroniza

**Piezas.** Cada persona (`persona:<id>`), medición (`medicion:<id>`) y los
ajustes (`ajustes`) son una pieza. En el servidor cada pieza tiene:
- `id`: HMAC-SHA-256 del identificador lógico con una llave derivada de la de
  cifrado (opaco: no revela persona ni fecha);
- `cifrado`: IV de 12 bytes + AES-GCM de `{ tipo, idLogico, editadoEn, datos }`
  (o `{ …, borrado: true }` para lo eliminado);
- `editadoEn`: el instante de la última edición en el dispositivo (ms),
  necesario para decidir quién gana;
- `version`: número creciente que asigna el servidor (cursor de descarga).

**Local.** Una tabla nueva de Dexie, `cambios`, lleva por cada identificador
lógico su `editadoEn` y si está pendiente de subir. Cada guardado o borrado de
`db.ts` la actualiza en la misma transacción. Borrar una persona marca como
borradas la persona y todas sus mediciones. Se sube de versión el esquema de
Dexie sin tocar las tablas existentes.

**Ciclo:** subir pendientes → bajar lo nuevo desde el último cursor → aplicar.
Al aplicar una pieza bajada: si su `editadoEn` es mayor que el local, reemplaza
(o borra) el registro local sin marcarlo pendiente; si es menor o igual, se
ignora (lo local ya está o se subirá). El servidor, al recibir una pieza, solo
la acepta si su `editadoEn` es mayor que el que ya tiene.

**Cuándo:** al iniciar sesión, al abrir la app, al volver la conexión, 3
segundos después de cada cambio local, y cada 5 minutos mientras la app está
abierta. Sin conexión se acumulan pendientes; nada falla.

**Primera vez en un dispositivo con datos:** todo lo local se marca pendiente
y se sube; lo de la nube se baja; se juntan con la regla de arriba.

**Restaurar un respaldo** con sesión iniciada: el respaldo reemplaza lo local
(como hoy) y todo lo restaurado se sube como edición nueva; lo que había en la
nube y no está en el respaldo se marca borrado. Se avisa antes de restaurar.

## Casos límite (decisiones del constructor)

- **Datos guardados antes de esta función** no tienen hora de edición: reciben
  `editadoEn = 0`. El servidor acepta una pieza solo si no existe o si su
  `editadoEn` es **mayor**; al subir, responde qué piezas rechazó y el
  dispositivo las deja de marcar pendientes. Al bajar, una pieza de la nube
  reemplaza a la local si la local no está pendiente y la de la nube tiene
  `editadoEn` **mayor o igual**. Resultado: con datos viejos repetidos en dos
  dispositivos (por ejemplo copiados con un respaldo), gana la copia que llegó
  primero a la nube y los dos dispositivos terminan iguales; cualquier edición
  hecha después de activar la cuenta gana sobre los datos viejos.
  *(Decisión del constructor.)*
- **Otra cuenta en el mismo dispositivo:** el dispositivo recuerda el último
  usuario que usó. Si se inicia sesión con un usuario distinto y hay datos
  locales, se pregunta: "Este dispositivo tiene datos que no son de <usuario>.
  ¿Subirlos a esta cuenta o reemplazarlos por los de la nube?". Reemplazar
  borra lo local (con confirmación) antes de bajar. Siempre se reinician la
  tabla `cambios` y el cursor al cambiar de cuenta. *(Decisión del constructor.)*
- **Ajustes:** se sincronizan la persona principal y el día y la hora del
  recordatorio. `ultimoRespaldo` es de cada dispositivo y no viaja (el aviso de
  respaldo sigue siendo por dispositivo). *(Decisión del constructor.)*
- **Sesión terminada desde otro lado** (respuesta 401: cuenta borrada o token
  vencido): el dispositivo cierra la sesión, conserva sus datos locales y
  muestra "Tu sesión terminó en este dispositivo. Inicia sesión de nuevo para
  seguir sincronizando." *(Decisión del constructor.)*
- **Origen permitido:** solo GitHub Pages y localhost; no hay otro sitio
  publicado (Vercel nunca se usó).

## Servidor (Cloudflare)

Worker `mesura-sync` + base D1 `mesura`, código en `servidor/` (TypeScript).

| Ruta | Qué hace |
|---|---|
| `POST /cuenta` | crear: `{ usuario, sal, llaveAcceso }` |
| `GET /sal?usuario=` | sal de un usuario |
| `POST /sesion` | `{ usuario, llaveAcceso }` → `{ token }` |
| `DELETE /sesion` | cierra el token actual |
| `POST /piezas` | sube `[{ id, cifrado, editadoEn }]` (máx. 500 por llamada) |
| `GET /piezas?desde=` | baja hasta 500 piezas con `version > desde` y el nuevo cursor |
| `DELETE /cuenta` | borra usuario, tokens y piezas |

- Todo salvo crear, sal y sesión exige `Authorization: Bearer <token>`.
- CORS solo para `https://phatito.github.io` y `http://localhost:*`.
- Límite de tamaño: pieza ≤ 16 KB, cuerpo ≤ 1 MB.
- Tablas: `usuarios(usuario PK, sal, hash_acceso, fallos, bloqueado_hasta, creado)`,
  `sesiones(hash_token PK, usuario, vence)`,
  `piezas(usuario, id, cifrado, editado_en, version, PK(usuario,id))`, y un
  contador de versión por usuario.
- La lógica de las rutas vive en funciones puras sobre una interfaz de
  almacén; D1 es una implementación y la otra, en memoria, sirve a las pruebas
  y al servidor de prueba de las e2e.

**Publicación (parte de este trabajo):** la base D1 y el Worker se publican a
mano desde la sesión con `wrangler`, usando una clave de API de Cloudflare que
el usuario entrega por el formulario seguro de credenciales (nunca en el chat).
La URL del Worker no es secreta: queda escrita en `src/sync/config.ts`
(sobrescribible con `VITE_SYNC_URL`). Si una compilación no tiene URL, la
sección de cuenta no se muestra y la app funciona como hoy.
*(Decisión del constructor.)*

## Pantallas

**Ajustes y datos → "Cuenta y sincronización"** (arriba del todo):
- Sin sesión: explicación en 2 líneas ("Tus datos viajan cifrados con tu frase
  secreta: solo tú puedes leerlos. Si la olvidas, no se puede recuperar.") y
  dos botones, **Crear cuenta** e **Iniciar sesión**, que abren el formulario
  (usuario, frase, y en crear: repetir frase + casilla "Entiendo que si olvido
  la frase no se puede recuperar").
- Con sesión: "Conectado como <usuario>", estado ("Sincronizado hace 2 min",
  "Sincronizando…", "Sin conexión: se sincronizará al volver",
  "Error: <motivo>"), **Sincronizar ahora**, **Cerrar sesión**, **Borrar cuenta**.

**Encabezado:** junto a ⚙, un ícono de nube pequeño solo con sesión iniciada,
con su estado en `aria-label` y `title` (al día / sincronizando / sin conexión
/ error). Clic lleva a Ajustes y datos.

## Mensajes de privacidad

Donde hoy se dice que los datos "se quedan en tu dispositivo" (README, textos
de la app, video, imagen para compartir), pasa a: "Tus datos son tuyos: se
guardan en tu dispositivo y, si creas una cuenta, viajan cifrados; solo tú
puedes leerlos." El video y la imagen se regeneran.

## Pruebas

- **Unitarias (cliente):** derivación de llaves (misma frase+sal → mismas
  llaves; otra frase → otras), cifrar/descifrar ida y vuelta, IV distinto cada
  vez, id opaco estable; reglas de fusión (más nuevo gana, empate no reemplaza,
  borrado gana si es más nuevo, persona borrada arrastra sus mediciones); cola
  de pendientes al guardar y borrar.
- **Unitarias (servidor, almacén en memoria):** crear cuenta, usuario
  repetido, sesión correcta e incorrecta (mismo mensaje), bloqueo tras 5
  fallos, token vencido, subir solo si `editadoEn` es mayor, cursor de
  descarga, límites de tamaño, borrar cuenta, CORS.
- **Extremo a extremo:** dos contextos de navegador (PC y celular simulados)
  contra el servidor de prueba en memoria: crear cuenta en uno, registrar;
  iniciar sesión en otro → ve los datos; editar en ambos sin conexión →
  se juntan; cerrar sesión conserva lo local; sin sesión la app funciona igual
  que hoy. Ninguna petición lleva datos en claro (se inspeccionan los cuerpos).

## Lo que queda al constructor

Nombres internos, estructura de archivos de `servidor/`, manejo de reintentos y
el texto exacto de los mensajes de error no listados.
