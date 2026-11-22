# Navegación sin pestañas y ficha completa — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar las seis pestañas. La app abre en la ficha de la persona principal (opción A de las maquetas), con selector de perfil, todas las medidas de Xiaomi con estado y barra de rango, y pantallas aparte con "← Volver" para Registrar medición, Todas las mediciones, Familia y Ajustes y datos.

**Architecture:** Hay una ruta por pantalla en el hash (`#/p/<id>`, `#/p/<id>/registrar`, `#/p/<id>/mediciones`, `#/familia`, `#/ajustes`), interpretada por funciones puras de `src/domain/rutas.ts`. `App.tsx` escucha `hashchange` y dibuja el encabezado y la pantalla. Los estados de salud son funciones puras en `src/domain/estados.ts`, que `resumenFicha` usa para armar las tarjetas. Las pantallas existentes se reutilizan: Medir dentro de Registrar, Historial como Todas las mediciones, Datos como Ajustes y datos, y su importación se extrae a un componente reutilizable.

**Tech Stack:** React 18, TypeScript, Vite 8, Dexie 4, Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-11-22-navegacion-ficha-design.md` (maquetas: https://claude.ai/artifact/PEKz4NPt3cK2eksKpFTUYV, opción A).

## Global Constraints

- No se quita ninguna función ni dato. Todo lo que hacían Familia, Ficha, Medir, Evolución, Historial y Datos sigue disponible.
- Los datos siguen solo en el dispositivo, sin peticiones a otros dominios.
- La figura del cuerpo es el componente `Cuerpo` actual, sin cambios de dibujo.
- Campos nuevos (opcionales) y rangos válidos: `musculoTotalKg` 5–200, `masaOseaKg` 0,5–10, `proteinaPct` 5–40, `metabolismoBasalKcal` 500–5000, `edadCorporal` 5–120, `frecuenciaCardiacaLpm` 30–220.
- `musculoKg` = músculo **esquelético** (etiqueta "Músculo esquelético"); `musculoTotalKg` = "Masa muscular total". Lo ya guardado no se mueve.
- Cortes de estado: exactamente la tabla "Estados y rangos" del spec. Sin estado ni barra para menores (`esMenor`).
- Colores de estado (tokens nuevos en `:root`): `--st-bajo` (cian), `--st-ok` (verde), `--st-alto` (naranja), `--st-muy` (rojo). Sin colores literales fuera de `:root`.
- Botones y fichas de 44 px de alto como mínimo. Sin desplazamiento horizontal a 400 px.
- Textos fijos: "+ Registrar medición", "← Volver", "← Volver a la ficha", "Registrar medición · <nombre>", "Escribir", "Captura de Xiaomi Home", "Archivo", "Más de la báscula", "Ver todas las mediciones →", "Administrar familia…", "+ Agregar persona", "Persona principal", "Qué indican tus cambios", "Medición guardada".
- Commits terminan con las líneas `Co-Authored-By` y `Claude-Session` de la sesión.

## Review Focus

1. Una dirección vieja o inválida, como una persona borrada o `#/cualquier-cosa`, lleva al inicio sin pantalla en blanco (Task 3, prueba unitaria de `leerRuta` y e2e).
2. La persona principal se borra: el inicio pasa a la primera persona y el ajuste no queda apuntando a nada (Task 3, unitaria de `personaInicio`; Task 6, e2e).
3. Un respaldo antiguo, sin campos nuevos ni `personaPrincipalId`, se restaura igual, y uno nuevo conserva `personaPrincipalId` (Task 1).
4. Cambiar de perfil con un registro a medio escribir no pierde el borrador (Task 5, e2e).
5. A 400 px de ancho la ficha, el selector de perfil y la tabla de mediciones no generan desplazamiento horizontal (Task 4 y Task 6, e2e).

---

### Task 1: Campos nuevos, alias de músculo y persona principal en los datos

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/validation.ts`, `src/domain/csv.ts`, `src/storage/db.ts`, `src/storage/backup.ts`
- Test: `tests/domain/validation.test.ts`, `tests/domain/csv.test.ts`, `tests/storage/backup.test.ts`

**Interfaces:**
- Produces:
  - `CampoNumerico` suma `'musculoTotalKg' | 'masaOseaKg' | 'proteinaPct' | 'metabolismoBasalKcal' | 'edadCorporal' | 'frecuenciaCardiacaLpm'`.
  - `export const CAMPOS_BASCULA_EXTRA: CampoNumerico[]` con esos seis, en ese orden. `CAMPOS_NUMERICOS = [...CAMPOS_BASCULA, ...CAMPOS_BASCULA_EXTRA, ...CAMPOS_PERIMETROS]`.
  - `ETIQUETAS`: `musculoKg` → `{ nombre: 'Músculo esquelético', unidad: 'kg' }`; los nuevos: `Masa muscular total` kg, `Masa ósea` kg, `Proteína` %, `Metabolismo basal` kcal, `Edad corporal` años, `Frecuencia cardíaca` lpm.
  - `Ajustes.personaPrincipalId?: string`.

- [ ] **Step 1: Pruebas que fallan**
  - `validarValor('masaOseaKg', 0.4)` da error y `validarValor('masaOseaKg', 4.1) === null`; lo mismo en los bordes de los otros cinco campos.
  - `sugerirAsignacion(['Fecha','Peso','Masa muscular','Masa muscular esquelética'])` → `{ musculoTotalKg: 2, musculoKg: 3 }`.
  - `sugerirAsignacion(['Fecha','Peso','Músculo (kg)'])` → `{ musculoKg: 2, musculoTotalKg: null }`.
  - `['Muscle mass','Skeletal muscle','SMM']` → `musculoTotalKg` para la primera y `musculoKg` para la segunda o la tercera (la que llegue primero).
  - `['Masa ósea','Proteína (%)','Metabolismo basal','Edad corporal','Frecuencia cardíaca']` → cada una a su campo. También en inglés: `Bone mass`, `Protein`, `BMR`, `Body age`, `Heart rate`.
  - Exportar y volver a importar conserva los seis campos nuevos.
  - Respaldo: uno sin campos nuevos ni `personaPrincipalId` se lee y se restaura; uno con `personaPrincipalId` lo conserva; un `personaPrincipalId` que no está en `personas` se descarta (queda `undefined`); un campo nuevo fuera de rango hace inválido el respaldo, como los demás.
- [ ] **Step 2: Correrlas y ver que fallan** — `npx vitest run tests/domain/validation.test.ts tests/domain/csv.test.ts tests/storage/backup.test.ts`.
- [ ] **Step 3: Implementar.**
  - Alias del CSV, en este orden y antes de `musculoKg`:
    - `musculoKg`: `musculo esqueletico`, `masa muscular esqueletica`, `skeletal muscle`, `skeletal`, `smm`;
    - `musculoTotalKg`: `masa muscular`, `musculo total`, `muscle mass`;
    - después, el `musculoKg` genérico de hoy: `musculo`, `muscle`, `muscular`;
    - `masaOseaKg`: `masa osea`, `bone`; `proteinaPct`: `proteina`, `protein`; `metabolismoBasalKcal`: `metabolismo`, `bmr`; `edadCorporal`: `edad corporal`, `body age`, `metabolic age`; `frecuenciaCardiacaLpm`: `frecuencia cardiaca`, `heart rate`, `pulso`.
  - Respaldo: `leerRespaldo` copia `personaPrincipalId` solo si es un string que está entre los ids de `personas`.
- [ ] **Step 4: Correr `npm test`** → todo PASS.
- [ ] **Step 5: Commit** — `feat: six more scale fields, muscle aliases and main person setting`

---

### Task 2: Estados y rangos

**Files:**
- Create: `src/domain/estados.ts`
- Test: `tests/domain/estados.test.ts`

**Interfaces:**
- Consumes: `esMenor(p, fecha)` (`insights.ts`), `Persona`.
- Produces:
  ```ts
  export type Estado = 'bajo' | 'ok' | 'alto' | 'muy'
  export type MedidaConEstado = 'imc' | 'grasaPct' | 'grasaVisceral' | 'aguaPct' | 'proteinaPct'
  export interface Tramo { hasta: number | null; estado: Estado; nombre: string }  // hasta = límite superior exclusivo; null = sin tope
  export interface Clasificacion { estado: Estado; nombre: string; tramos: Tramo[]; tramo: number; posicion: number } // posicion 0–1 en toda la barra
  export function clasificar(medida: MedidaConEstado, valor: number, p: Persona, fecha: string): Clasificacion | null
  ```
- Los nombres: IMC Bajo / Normal / Sobrepeso / Obesidad; el resto Bajo / Estándar / Alto / Muy alto. Visceral tiene tres tramos (Estándar <10, Alto <15, Muy alto); agua y proteína tienen tres (Bajo, Estándar, Alto).
- Posición: cada tramo ocupa el mismo ancho de la barra. Dentro del tramo, el valor se interpola entre su límite inferior y su `hasta`. Para un tramo abierto en un extremo, se usa un ancho supuesto igual al del tramo vecino, y el punto se limita a [0, 1].

- [ ] **Step 1: Pruebas que fallan** (persona hombre nacido en 1990, fecha `2026-11-17`, salvo que se diga otra cosa):
  - `clasificar('imc', 18.4, …)` da Bajo; 18.5 Normal; 24.9 Normal; 25 Sobrepeso; 30 Obesidad.
  - `grasaPct`:
    - hombre de 36 años: 7.9 Bajo, 8 Estándar, 20 Alto, 25 Muy alto;
    - hombre de 50 años (nacido en 1976): 21.9 Estándar, 22 Alto;
    - hombre de 65 años: 29.9 Alto, 30 Muy alto;
    - mujer de 30 años: 20.9 Bajo, 33 Alto, 39 Muy alto;
    - mujer de 45: 34 Alto; mujer de 70: 42 Muy alto;
    - sin fecha de nacimiento (y estatura 175): se usa la franja 18–39.
  - `grasaVisceral`: 9 Estándar, 10 Alto, 15 Muy alto.
  - `aguaPct`: hombre 49.9 Bajo, 50 Estándar, 65 Estándar, 65.1 Alto; mujer 44.9 Bajo, 60.1 Alto.
  - `proteinaPct`: 15.9 Bajo, 16 Estándar, 20 Estándar, 20.1 Alto.
  - Un menor (nacido en 2015) → `null`.
  - `posicion` está siempre entre 0 y 1 y crece con el valor (29 % de grasa a los 36 años queda en el último cuarto).
- [ ] **Step 2: Correrlas y ver que fallan** — `npx vitest run tests/domain/estados.test.ts`.
- [ ] **Step 3: Implementar** con las tablas del spec. Un comentario con las fuentes: OMS para el IMC, Gallagher et al. 2000 para el % de grasa, y la escala de básculas domésticas para visceral, agua y proteína.
- [ ] **Step 4: Correrlas** → PASS.
- [ ] **Step 5: Commit** — `feat: health status ranges for BMI, body fat, visceral fat, water and protein`

---

### Task 3: Rutas, inicio y encabezado sin pestañas

**Files:**
- Create: `src/domain/rutas.ts`, `tests/domain/rutas.test.ts`
- Create: `src/ui/Encabezado.tsx`, `src/ui/SelectorPerfil.tsx`
- Modify: `src/ui/App.tsx` (sin `PESTANAS` ni `PersonasBar`), `src/ui/styles.css`
- Delete: `src/ui/PersonasBar.tsx`
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Ruta =
    | { pantalla: 'ficha'; personaId: string }
    | { pantalla: 'registrar'; personaId: string; fecha?: string }
    | { pantalla: 'mediciones'; personaId: string }
    | { pantalla: 'familia' }
    | { pantalla: 'ajustes' }
    | { pantalla: 'inicio' }
  export function leerRuta(hash: string): Ruta           // cualquier cosa no reconocida → { pantalla: 'inicio' }
  export function escribirRuta(r: Ruta): string          // '#/p/<id>', '#/p/<id>/registrar?fecha=…', '#/familia', '#/ajustes', '#/'
  export function personaInicio(personas: Persona[], principalId: string | undefined): Persona | null
  ```
  - `navegar(r: Ruta)` en `App.tsx`: hace `history.pushState` con `{ app: true }` y actualiza el estado.
  - `volver(destino: Ruta)` en `App.tsx`: si `history.state?.app`, hace `history.back()`; si no, `navegar(destino)`.
- `App.tsx`:
  - La ruta vive en el estado y se actualiza con `hashchange` y `popstate`.
  - `inicio` y una persona inexistente se reemplazan (con `replaceState`) por la ficha de `personaInicio`. Sin personas, se reemplazan por `familia`.
  - Al crear la primera persona, si no hay `personaPrincipalId`, se guarda el de esa persona.
  - Si se borra la persona principal, se quita el ajuste.
  - La clave de `localStorage` `medidascuerpo.persona` deja de usarse.
- `SelectorPerfil`:
  - Muestra el avatar con la inicial y el nombre, con `aria-haspopup="menu"` y `aria-expanded`.
  - Abre una lista (`role="menu"`) con una fila por persona: avatar, nombre, "Al día · dd/mm" o "Le toca medirse" (con `estadoMedicion`), y "★ principal" en la principal.
  - Al final, "+ Agregar persona" (lleva a Familia con el formulario abierto) y "Administrar familia…".
  - Se cierra con Escape, al hacer clic fuera o al elegir. Las flechas ↑ y ↓ mueven el foco entre las filas.
- `Encabezado`: logo; `SelectorPerfil` (oculto si no hay personas); botón ⚙ con `aria-label="Ajustes y datos"` que lleva a `#/ajustes`.

- [ ] **Step 1: Pruebas unitarias que fallan**
  - `leerRuta('#/p/abc')` → ficha `abc`.
  - `leerRuta('#/p/abc/registrar?fecha=2026-11-17')` → registrar con esa fecha.
  - `leerRuta('#/p/abc/registrar?fecha=xx')` → registrar sin fecha.
  - `leerRuta('')`, `leerRuta('#/')` y `leerRuta('#/nada/raro')` → inicio.
  - `escribirRuta(leerRuta(h)) === h` para cada forma válida.
  - `personaInicio`:
    - devuelve la principal si existe;
    - si la principal no existe, la de `creadaEn` más antigua;
    - con `[]`, `null`.
- [ ] **Step 2: Reescribir los ayudantes e2e para la nueva navegación**
  - `ir(page, destino)` pasa a ser:
    - `irAFicha(page, nombre?)`: abre el selector y elige la persona, o si no se pasa nombre, hace clic en el logo;
    - `irARegistrar(page)`: "+ Registrar medición";
    - `irAMediciones(page)`: "Ver todas las mediciones →";
    - `irAFamilia(page)`: selector → "Administrar familia…";
    - `irAAjustes(page)`: ⚙.
  - Los 36 tests actuales se adaptan a esos ayudantes **sin cambiar lo que comprueba cada uno**. Los que usaban Evolución usan el gráfico de la ficha (Task 4).
  - Pruebas nuevas:
    - `al abrir la app se ve la ficha de la persona principal`: dos personas, la segunda marcada como principal en Familia; recargar → se ve la ficha de la segunda.
    - `el selector de perfil cambia de persona y se cierra con Escape`.
    - `el botón Atrás del navegador vuelve a la pantalla anterior`: ficha → Familia → `page.goBack()` → ficha.
    - `una dirección inválida lleva al inicio`: `page.goto('#/p/no-existe')` → ficha principal.
    - `sin personas se abre Familia`.
- [ ] **Step 3: Correrlas y ver que fallan** — `npx vitest run tests/domain/rutas.test.ts`; `npx playwright test --trace off -g "principal|selector|Atrás|inválida|sin personas"`.
- [ ] **Step 4: Implementar.** En esta tarea, las pantallas que todavía no existen se dibujan con los componentes de hoy, así la app funciona entre tareas: la ficha con `Ficha`, registrar con `Medir`, mediciones con `Historial`, familia con `Familia` y ajustes con `Datos`. Todas, salvo la ficha, con "← Volver".
- [ ] **Step 5: Correr** — `npm test` y `npx playwright test --trace off` → todo PASS.
- [ ] **Step 6: Commit** — `feat: hash routes, main person home and profile selector instead of tabs`

---

### Task 4: Ficha A (peso, gráfico, tarjetas con estado y cambios)

**Files:**
- Modify: `src/domain/ficha.ts`, `tests/domain/ficha.test.ts`
- Create: `src/domain/series.ts`, `tests/domain/series.test.ts`
- Modify: `src/ui/Ficha.tsx`, `src/ui/Grafico.tsx` (solo lo necesario para un ancho mayor), `src/ui/styles.css`
- Delete: `src/ui/Evolucion.tsx` (su contenido queda en la ficha)
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `clasificar` (Task 2), `CAMPOS_BASCULA_EXTRA` (Task 1), `derivar`.
- Produces:
  ```ts
  // ficha.ts
  export type ClaveTarjeta = 'pesoKg' | 'grasaPct' | 'grasaVisceral' | 'musculoKg' | 'aguaPct' | 'imc' | 'grasaKg' | 'pesoSinGrasaKg'
    | 'musculoTotalKg' | 'proteinaPct' | 'masaOseaKg' | 'metabolismoBasalKcal' | 'edadCorporal' | 'frecuenciaCardiacaLpm'
  // TarjetaFicha suma: clasificacion: Clasificacion | null; referencia: string | null
  // resumenFicha(...).tarjetas: la de peso primero y luego el resto en el orden del spec, cada una solo si hay valor
  //   en la última medición que lo tenga. 'cambio' es frente a la medición anterior que tenga esa medida.
  // 'referencia': musculoTotalKg → "X % del peso"; proteinaPct → "X kg" (proteína × peso);
  //   masaOseaKg → "X % del peso"; grasaKg → "masa grasa"; pesoSinGrasaKg → "masa magra".
  // series.ts
  export type Metrica = CampoNumerico | 'imc' | 'grasaKg' | 'pesoSinGrasaKg'
  export type Periodo = '3m' | '1a' | 'todo'
  export function serieMetrica(p: Persona, ms: Medicion[], metrica: Metrica, periodo: Periodo, hoy: string): { fecha: string; valor: number }[]
  ```
- La tarjeta de peso no cambia (tendencia, última pesada, meta). El tono de las tarjetas viejas se reemplaza por `clasificacion`. Las medidas sin rangos muestran solo el cambio.

Diseño de la pantalla, como la maqueta A:
- **Columna izquierda (420 px):**
  - tarjeta de peso con un degradado sutil de `--accent`, fichas de IMC y Meta, el texto de la meta y "+ Registrar medición";
  - debajo, la figura `Cuerpo` con la fecha, las asimetrías y "Ver todas las mediciones →".
- **Columna derecha:**
  - el gráfico, con fichas Peso / Grasa / Músculo / Cintura, un `<select>` "Más" con las demás métricas y el período (3 meses, 1 año, Todo);
  - las tarjetas en 3 columnas;
  - "Qué indican tus cambios" (la lista de `interpretar` con `NOTA_ORIENTACION`).
- **En pantallas angostas** (`max-width: 860px`), una columna: peso, gráfico, tarjetas, figura.

- [ ] **Step 1: Pruebas unitarias que fallan**
  - Con una medición inventada de 96,0 kg, 29,0 % de grasa, visceral 16, músculo 35,0, agua 49,0, total 64,0, ósea 3,5, proteína 15,0, basal 1850, edad 30 y FC 80 (persona de 175 cm, hombre nacido en 1990), las tarjetas salen en el orden del spec:
    - `grasaPct` con estado `muy`;
    - `grasaVisceral` `muy`;
    - `aguaPct` `bajo`;
    - `imc` con valor 31,3 y estado `muy`;
    - `grasaKg` 27,8;
    - `pesoSinGrasaKg` 68,2;
    - `musculoTotalKg` con referencia "66,7 % del peso";
    - `proteinaPct` con referencia "14,4 kg";
    - `edadCorporal` sin clasificación.
  - Una medida que solo está en una medición anterior sigue mostrándose (con su valor).
  - Un menor → todas las `clasificacion` son `null`.
  - `serieMetrica`:
    - '3m' incluye solo los últimos 92 días desde `hoy`, '1a' los últimos 366 y 'todo' todo;
    - `imc` y `grasaKg` se calculan con `derivar`;
    - una medición sin el dato no aparece.
- [ ] **Step 2: Pruebas e2e que fallan**
  - `la ficha muestra todas las medidas con su estado`: importar un CSV de prueba (números inventados) con las columnas nuevas → se ven las tarjetas "Grasa visceral" con "Muy alto", "Metabolismo basal" y "Masa ósea".
  - `el gráfico cambia de medida y de período`: elegir "Grasa" → la etiqueta del gráfico dice "%"; elegir "Todo" → hay más puntos que con "3 meses".
  - `la ficha no tiene desplazamiento horizontal a 400 px`: `scrollWidth <= clientWidth` en `document.documentElement`.
  - Adaptar las pruebas de Evolución existentes para que usen el gráfico de la ficha y "Qué indican tus cambios".
- [ ] **Step 3: Correrlas y ver que fallan.**
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Correr** — `npm test` y `npx playwright test --trace off` → todo PASS.
- [ ] **Step 6: Commit** — `feat: dashboard profile page with all scale measures, status bars and chart`

---

### Task 5: Pantalla Registrar medición

**Files:**
- Create: `src/ui/Registrar.tsx`, `src/ui/ImportarArchivo.tsx` (extraído de `Datos.tsx`)
- Modify: `src/ui/Medir.tsx` (grupo "Más de la báscula"; `onGuardada` opcional), `src/ui/Datos.tsx` (usa `ImportarArchivo`), `src/ui/App.tsx`, `src/ui/Ficha.tsx` (aviso "Medición guardada")
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `navegar`, `volver` (Task 3).
- Produces:
  - `ImportarArchivo({ personas, personaFija?, onImportado? }: { personas: Persona[]; personaFija?: Persona; onImportado?: (cuantas: number) => void })`. Con `personaFija`, no se muestra el selector de persona. Sin ella, se comporta exactamente como hoy en Datos.
  - `Medir` suma `onGuardada?: (fecha: string) => void`, que se llama después de un guardado correcto.
  - `Registrar({ persona, fecha?, borrador, onBorrador, onListo }: …)`. `onListo(mensaje: string)` vuelve a la ficha con un aviso.
- Pestañas internas (`role="tablist"`): **Escribir** (la elegida al entrar) con `Medir`; **Captura de Xiaomi Home**, que por ahora muestra "Muy pronto: elige o pega la captura del informe y la app rellenará los campos."; **Archivo** con `ImportarArchivo personaFija`.
- Al guardar o importar, se vuelve a la ficha y esta muestra "Medición guardada" o "N mediciones importadas" con `role="status"`.
- "Más de la báscula" es un `<details>` con los seis campos nuevos. Está abierto si alguno tiene valor en el formulario.

- [ ] **Step 1: Pruebas e2e que fallan**
  - `registrar se abre aparte y Volver regresa a la ficha`: "+ Registrar medición" → se ve "Registrar medición · Ana" → "← Volver a la ficha" → se ve la ficha.
  - `guardar vuelve a la ficha con el aviso`.
  - `importar un archivo desde Registrar sin pasar por Ajustes`: pestaña Archivo, `excel.csv`, confirmar → la ficha muestra "importadas" y Todas las mediciones tiene las filas.
  - `los campos nuevos se guardan`: abrir "Más de la báscula", Masa ósea 3,5 → guardar → la tarjeta "Masa ósea" muestra 3,5.
  - `cambiar de perfil no pierde lo escrito`: escribir peso 70 para Ana, cambiar a Luis con el selector, volver a Ana → Registrar → Peso sigue en 70.
- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** — `npm test` y `npx playwright test --trace off` → todo PASS.
- [ ] **Step 5: Commit** — `feat: separate register screen with write, Xiaomi (soon) and file tabs`

---

### Task 6: Todas las mediciones, Familia con ★ y Ajustes y datos

**Files:**
- Modify: `src/ui/Historial.tsx` (título "Todas las mediciones", columnas de los campos nuevos solo si alguna fila los tiene), `src/ui/Familia.tsx` (★), `src/ui/Datos.tsx` (título "Ajustes y datos" y "Persona principal" arriba), `src/ui/App.tsx`
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `Ajustes.personaPrincipalId` (Task 1), `navegar` (Task 3).
- Familia: botón ★ en cada tarjeta, `aria-pressed` cuando es la principal, `aria-label="Marcar como persona principal"`. "Ver ficha" y "Registrar medición" usan las rutas.
- Historial: "Editar" navega a `{ pantalla: 'registrar', personaId, fecha }`.
- Ajustes y datos: `<select>` "Persona principal" con las personas, que guarda el ajuste al cambiar.

- [ ] **Step 1: Pruebas e2e que fallan**
  - `la estrella cambia la persona principal`.
  - `elegir la persona principal en Ajustes y datos`.
  - `borrar la persona principal deja como inicio a la siguiente`.
  - `Editar en Todas las mediciones abre Registrar en esa fecha`.
  - `la tabla de mediciones no desborda la página a 400 px`.
- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** — `npm test` y `npx playwright test --trace off` → todo PASS.
- [ ] **Step 5: Commit** — `feat: measurements list, main person star and settings screen`

---

### Task 7: README y verificación final

**Files:**
- Modify: `README.md` (navegación nueva, persona principal, medidas nuevas, estados con sus fuentes)

- [ ] **Step 1: Actualizar el README.**
- [ ] **Step 2: Verificación** — `npm test`, `npm run build` y `npx playwright test --trace off --repeat-each 3` → todo PASS. Capturas a 1280 y 400 px de la ficha, Registrar y el selector abierto, para comparar con la maqueta A.
- [ ] **Step 3: Commit** — `docs: tabless navigation and complete profile page`
