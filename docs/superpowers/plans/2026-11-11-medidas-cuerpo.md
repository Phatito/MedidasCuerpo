# MedidasCuerpo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web instalable para registrar cada semana peso, composición corporal y perímetros de varios familiares, e interpretar los cambios en lenguaje claro.

**Architecture:** Sitio estático Vite + React + TypeScript en tres capas con dependencias en una dirección: interfaz → almacenamiento → dominio. El dominio son funciones puras; el almacenamiento envuelve IndexedDB; nada sale del navegador. GitHub Actions publica en GitHub Pages.

**Tech Stack:** Vite, React 18, TypeScript, Dexie + dexie-react-hooks, vite-plugin-pwa, Vitest, fake-indexeddb, Playwright (el Chromium preinstalado; no ejecutar `playwright install`).

**Spec:** `docs/superpowers/specs/2026-11-11-medidas-cuerpo-design.md`

## Global Constraints

- Toda la interfaz en español; unidades kg y cm.
- Los datos nunca salen del navegador: sin llamadas de red propias, sin analítica.
- Base de rutas de Vite: `/MedidasCuerpo/`.
- `src/domain/` no importa React, Dexie ni APIs del navegador.
- Un valor derivado que no puede calcularse es `null`; nunca `NaN` ni un valor inventado.
- El % de grasa estimado por fórmula se rotula "estimado" dondequiera que se muestre.
- Como máximo una medición por persona y fecha: `id = personaId + "_" + fecha`.
- La sección de interpretación lleva siempre la nota: "Orientación general, no diagnóstico médico. Las cifras de bioimpedancia son estimaciones: lo que importa es la tendencia."
- Nombres de campos exactamente como en el modelo de datos de la spec.

## Review Focus

1. Números con coma decimal o espacios (`"72,5"`, `" 80 "`) → se aceptan igual que con punto. *(Tarea 2)*
2. Mediciones cargadas fuera de orden, o con 2 o 30 días entre ellas en vez de 7 → la interpretación ordena por fecha y normaliza el ritmo por días; 0 días no divide por cero. *(Tarea 3)*
3. Una de las dos mediciones comparadas no tiene un campo opcional → la regla que lo necesita se omite; ningún texto muestra `NaN` ni `undefined`. *(Tarea 3)*
4. CSV exportado desde Excel en español: separador `;`, BOM, fechas `DD/MM/AAAA`, campos entre comillas → se importa bien. *(Tarea 4)*
5. Restaurar un archivo que no es un respaldo válido → se rechaza con mensaje y los datos existentes quedan intactos. *(Tarea 5)*

---

## File Structure

```
.github/workflows/deploy.yml     compila, prueba y publica en Pages
index.html, vite.config.ts, tsconfig.json, package.json
public/icon-192.png, icon-512.png
src/main.tsx                     arranque y registro del service worker
src/domain/types.ts              Persona, Medicion, Ajustes
src/domain/numbers.ts            parseNumero, parseFecha, formato
src/domain/validation.ts         rangos permitidos
src/domain/metrics.ts            valores derivados
src/domain/insights.ts           interpretación
src/domain/reminders.ts          pendiente / .ics
src/domain/csv.ts                lectura, asignación, escritura
src/storage/db.ts                Dexie: personas, mediciones, ajustes
src/storage/backup.ts            respaldo JSON
src/ui/App.tsx                   navegación y persona seleccionada
src/ui/Familia.tsx, PersonaForm.tsx, Medir.tsx, Historial.tsx,
       Evolucion.tsx, Grafico.tsx, Datos.tsx, descargar.ts, styles.css
tests/domain/*.test.ts, tests/storage/*.test.ts, e2e/app.spec.ts
```

---

### Task 1: Andamiaje y publicación

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/ui/App.tsx`, `src/ui/styles.css`, `public/icon-192.png`, `public/icon-512.png`, `.github/workflows/deploy.yml`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: scripts `npm run dev`, `npm run build`, `npm test` (Vitest, entorno `node`), `npm run e2e` (Playwright contra `vite preview`).

- [ ] **Step 1:** Crear el proyecto Vite React-TS e instalar `dexie dexie-react-hooks` y, de desarrollo, `vitest fake-indexeddb vite-plugin-pwa @playwright/test`.
- [ ] **Step 2:** `vite.config.ts`: `base: '/MedidasCuerpo/'`; `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'MedidasCuerpo', short_name: 'Medidas', lang: 'es', display: 'standalone', start_url: '/MedidasCuerpo/', scope: '/MedidasCuerpo/', theme_color: '#0e7c7b', background_color: '#eef2f1', icons: [192, 512] } })`.
- [ ] **Step 3:** `tests/smoke.test.ts` con `expect(1 + 1).toBe(2)`. Run: `npm test` → PASS. Run: `npm run build` → genera `dist/manifest.webmanifest` y `dist/sw.js`.
- [ ] **Step 4:** `deploy.yml`: en push a `main`, `npm ci`, `npm test`, `npm run build`, luego `actions/configure-pages`, `actions/upload-pages-artifact` (ruta `dist`) y `actions/deploy-pages`; permisos `pages: write`, `id-token: write`.
- [ ] **Step 5:** Commit `chore: scaffold app and Pages deploy`. Push.

Paso manual del dueño del repositorio: Settings → Pages → Source: **GitHub Actions**.

---

### Task 2: Tipos, números, validación y valores derivados

**Files:**
- Create: `src/domain/types.ts`, `src/domain/numbers.ts`, `src/domain/validation.ts`, `src/domain/metrics.ts`
- Test: `tests/domain/numbers.test.ts`, `tests/domain/validation.test.ts`, `tests/domain/metrics.test.ts`

**Interfaces:**
- Produces:
```ts
type Sexo = 'hombre' | 'mujer'
type Objetivo = 'bajar_grasa' | 'ganar_musculo' | 'mantener'
interface Persona { id: string; nombre: string; sexo: Sexo; fechaNacimiento: string; estaturaCm: number; objetivo: Objetivo; creadaEn: string }
interface Medicion { id: string; personaId: string; fecha: string; pesoKg: number;
  grasaPct?: number; musculoKg?: number; grasaVisceral?: number; aguaPct?: number;
  cuelloCm?: number; pechoCm?: number; cinturaCm?: number; caderaCm?: number;
  brazoCm?: number; musloCm?: number; nota?: string; origen: 'manual' | 'csv' }
interface Ajustes { diaRecordatorio: number; horaRecordatorio: string; ultimoRespaldo?: string }
type CampoNumerico = 'pesoKg' | 'grasaPct' | 'musculoKg' | 'grasaVisceral' | 'aguaPct' | 'cuelloCm' | 'pechoCm' | 'cinturaCm' | 'caderaCm' | 'brazoCm' | 'musloCm'
const ETIQUETAS: Record<CampoNumerico, { nombre: string; unidad: string }>

parseNumero(s: string): number | null          // "72,5" → 72.5; "" → null; "abc" → null
parseFecha(s: string): string | null           // AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA → AAAA-MM-DD
diasEntre(a: string, b: string): number        // fechas AAAA-MM-DD
idMedicion(personaId: string, fecha: string): string

const RANGOS: Record<CampoNumerico | 'estaturaCm', [number, number]>
validarValor(campo: CampoNumerico | 'estaturaCm', v: number): string | null   // mensaje o null

interface Derivados { imc: number | null; categoriaImc: 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad' | null;
  cinturaEstatura: number | null; cinturaCadera: number | null;
  grasaPct: number | null; grasaEstimada: boolean; masaGrasaKg: number | null; masaMagraKg: number | null }
derivar(p: Persona, m: Medicion): Derivados
```
- Rangos: peso 2–400; grasa 2–75; músculo 1–150; visceral 1–59; agua 20–80; todo perímetro 5–300; estatura 40–250.
- Categorías de IMC: <18,5 bajo peso; <25 normal; <30 sobrepeso; resto obesidad.
- Fórmula de la Marina (cm, log10):
  hombre `495 / (1.0324 − 0.19077·log(cintura − cuello) + 0.15456·log(estatura)) − 450`;
  mujer `495 / (1.29579 − 0.35004·log(cintura + cadera − cuello) + 0.22100·log(estatura)) − 450`.
  Devuelve `null` si falta un perímetro, si el argumento del logaritmo es ≤ 0 o si el resultado cae fuera de 2–75.

- [ ] **Step 1: Pruebas que fallan**
```ts
// numbers
expect(parseNumero('72,5')).toBe(72.5); expect(parseNumero(' 80 ')).toBe(80)
expect(parseNumero('')).toBeNull(); expect(parseNumero('abc')).toBeNull()
expect(parseFecha('05/11/2026')).toBe('2026-11-05'); expect(parseFecha('2026-11-05')).toBe('2026-11-05')
expect(parseFecha('31/02/2026')).toBeNull()
expect(diasEntre('2026-11-01', '2026-11-08')).toBe(7)
// validation
expect(validarValor('pesoKg', 1)).not.toBeNull(); expect(validarValor('pesoKg', 70)).toBeNull()
expect(validarValor('pesoKg', 401)).not.toBeNull()
// metrics: p = hombre, 170 cm; m = 70 kg
expect(derivar(p, m).imc).toBeCloseTo(24.22, 2); expect(derivar(p, m).categoriaImc).toBe('normal')
expect(derivar(p, m).grasaPct).toBeNull(); expect(derivar(p, m).masaGrasaKg).toBeNull()
// medido gana a estimado
expect(derivar(p, { ...m, grasaPct: 20 })).toMatchObject({ grasaPct: 20, grasaEstimada: false, masaGrasaKg: 14, masaMagraKg: 56 })
// estimado: hombre 180 cm, cuello 40, cintura 90
expect(derivar(p180, { ...m, cuelloCm: 40, cinturaCm: 90 }).grasaPct).toBeCloseTo(18.4, 0)
expect(derivar(p180, { ...m, cuelloCm: 40, cinturaCm: 90 }).grasaEstimada).toBe(true)
// mujer sin cadera → null; cintura ≤ cuello → null
expect(derivar(p, { ...m, cinturaCm: 85 }).cinturaEstatura).toBeCloseTo(0.5, 2)
```
- [ ] **Step 2:** Run: `npm test` → FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar los cuatro archivos según Interfaces.
- [ ] **Step 4:** Run: `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: domain types, parsing, validation and derived metrics`.

---

### Task 3: Interpretación

**Files:**
- Create: `src/domain/insights.ts`
- Test: `tests/domain/insights.test.ts`

**Interfaces:**
- Consumes: `Persona`, `Medicion`, `derivar`, `diasEntre`.
- Produces:
```ts
type Tono = 'bien' | 'atencion' | 'neutro'
type Codigo = 'primera_medicion' | 'recomposicion' | 'baja_peso_grasa' | 'pierde_musculo' | 'ritmo_rapido'
  | 'gana_musculo' | 'gana_grasa' | 'sube_sin_datos' | 'sin_cambios' | 'tendencia' | 'desde_inicio'
  | 'alerta_cintura' | 'alerta_visceral' | 'imc'
interface Mensaje { tono: Tono; codigo: Codigo; titulo: string; texto: string }
interpretar(p: Persona, mediciones: Medicion[]): Mensaje[]
const NOTA_ORIENTACION: string   // texto exacto de Global Constraints
```
- `interpretar` ordena una copia por `fecha`; no muta la entrada.
- Umbrales (de la spec): peso estable si |Δpeso| < max(0,4; 0,5 % del peso anterior); cintura relevante ≥ 1 cm; músculo sube ≥ 0,3 kg, baja ≥ 0,5 kg; ritmo rápido si la pérdida semanal `(−Δpeso / pesoAnterior) · 7 / días` > 1 %, con `días` mínimo 1.
- Δgrasa usa `derivar(...).grasaPct` de ambas mediciones y solo si ambas existen y comparten origen (ambas medidas o ambas estimadas).
- Orden de salida: mensajes de última-vs-anterior, `tendencia`, `desde_inicio` (solo con 3 o más mediciones), alertas, `imc`.
- `tendencia`: k = min(4, ⌊n/2⌋), requiere n ≥ 4; compara promedios de peso y, si hay datos en ambas ventanas, de cintura y grasa.
- `alerta_cintura`: cinturaEstatura > 0,5. `alerta_visceral`: grasaVisceral ≥ 10.

- [ ] **Step 1: Pruebas que fallan** — helper `codigos(ms) = interpretar(p, ms).map(x => x.codigo)`; persona hombre 170 cm; `m(fecha, campos)`.
```ts
expect(codigos([m('2026-11-01', { pesoKg: 80 })])).toEqual(['primera_medicion'])
// recomposición: 80 → 80,2 kg, cintura 90 → 88,5
expect(codigos([a, b])).toContain('recomposicion')
// baja peso y grasa: 80 → 79, grasa 25 → 24
expect(codigos([a, b])).toContain('baja_peso_grasa')
// pierde músculo: 80 → 79, músculo 35 → 34,4
expect(codigos([a, b])).toContain('pierde_musculo')
// ritmo rápido: 80 → 78,5 en 7 días (1,9 %)
expect(codigos([a, b])).toContain('ritmo_rapido')
// mismo cambio en 30 días → no es rápido
expect(codigos([a, b30])).not.toContain('ritmo_rapido')
// gana músculo: 80 → 80,8, músculo 35 → 35,4, cintura 90 → 90
expect(codigos([a, b])).toContain('gana_musculo')
// gana grasa: 80 → 81, cintura 90 → 91,5
expect(codigos([a, b])).toContain('gana_grasa')
// sube sin datos: 80 → 81, sin más campos
expect(codigos([a, b])).toContain('sube_sin_datos')
// sin cambios: 80 → 80,1, cintura 90 → 90,3
expect(codigos([a, b])).toContain('sin_cambios')
// umbral exacto: cintura 90 → 89,1 (0,9 cm) NO es recomposición; 90 → 89 sí
// alertas: cintura 90 con estatura 170 → 'alerta_cintura'; grasaVisceral 10 → 'alerta_visceral'; 9 → no
// tendencia: 3 mediciones → no; 4 → sí
// Review Focus 2: entrada desordenada da lo mismo que ordenada; dos fechas iguales no lanza ni da Infinity
expect(interpretar(p, [b, a])).toEqual(interpretar(p, [a, b]))
// Review Focus 3: cintura solo en una de las dos → ninguna regla de cintura; ningún texto con NaN/undefined
for (const x of interpretar(p, casos)) expect(x.titulo + x.texto).not.toMatch(/NaN|undefined|Infinity/)
```
- [ ] **Step 2:** Run: `npm test -- insights` → FAIL.
- [ ] **Step 3:** Implementar `interpretar`. Los textos citan las cifras con un decimal y coma (`"bajó 1,5 cm"`).
- [ ] **Step 4:** Run: `npm test -- insights` → PASS.
- [ ] **Step 5:** Commit `feat: weekly change interpretation`.

---

### Task 4: Recordatorios y CSV

**Files:**
- Create: `src/domain/reminders.ts`, `src/domain/csv.ts`
- Test: `tests/domain/reminders.test.ts`, `tests/domain/csv.test.ts`

**Interfaces:**
- Consumes: `Medicion`, `CampoNumerico`, `parseNumero`, `parseFecha`, `validarValor`, `idMedicion`.
- Produces:
```ts
estadoMedicion(ultimaFecha: string | null, hoy: string): { pendiente: boolean; diasDesde: number | null }
generarIcs(dia: number, hora: string, desde: string): string   // dia 0 = domingo; desde AAAA-MM-DD

type CampoCsv = 'fecha' | CampoNumerico | 'nota'
parseCsv(texto: string): { columnas: string[]; filas: string[][] }
sugerirAsignacion(columnas: string[]): Record<CampoCsv, number | null>
filasAMediciones(filas: string[][], asignacion: Record<CampoCsv, number | null>, personaId: string):
  { mediciones: Medicion[]; errores: { fila: number; motivo: string }[] }   // fila: número 1-based contando el encabezado
medicionesACsv(mediciones: Medicion[]): string   // encabezados = nombres de campo; separador ","; decimales con punto
```
- `pendiente` es `true` si no hay mediciones o si pasaron 7 días o más.
- `.ics`: `VEVENT` con `SUMMARY:Pesarse y medirse`, `RRULE:FREQ=WEEKLY;BYDAY=<SU|MO|TU|WE|TH|FR|SA>`, `DTSTART` local flotante en la primera ocurrencia en o después de `desde`, duración 15 min, líneas terminadas en CRLF.
- `parseCsv`: quita BOM; detecta `;` o `,` por el encabezado; respeta comillas dobles y `""`; ignora líneas vacías.
- `sugerirAsignacion` compara sin tildes ni mayúsculas; alias mínimos: fecha/date; peso/weight; grasa/body fat/fat; musculo/muscle; visceral; agua/water; cuello/neck; pecho/chest; cintura/waist; cadera/hip; brazo/arm; muslo/thigh; nota/note.
- Fila inválida (sin fecha válida, sin peso, o valor fuera de rango) → va a `errores`, no a `mediciones`. `origen: 'csv'`.

- [ ] **Step 1: Pruebas que fallan**
```ts
expect(estadoMedicion(null, '2026-11-11')).toEqual({ pendiente: true, diasDesde: null })
expect(estadoMedicion('2026-11-05', '2026-11-11')).toEqual({ pendiente: false, diasDesde: 6 })
expect(estadoMedicion('2026-11-04', '2026-11-11').pendiente).toBe(true)
const ics = generarIcs(0, '09:00', '2026-11-11')            // 11-nov-2026 es miércoles
expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU'); expect(ics).toContain('DTSTART:20261115T090000')
expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
// Review Focus 4
const t = '﻿Fecha;Peso;"Cintura";Nota\r\n05/11/2026;72,5;88;"dijo ""bien"""\r\n'
const { columnas, filas } = parseCsv(t)
expect(columnas).toEqual(['Fecha', 'Peso', 'Cintura', 'Nota']); expect(filas[0][3]).toBe('dijo "bien"')
const r = filasAMediciones(filas, sugerirAsignacion(columnas), 'p1')
expect(r.mediciones[0]).toMatchObject({ id: 'p1_2026-11-05', fecha: '2026-11-05', pesoKg: 72.5, cinturaCm: 88, origen: 'csv' })
// fila sin peso y fila con peso 900 → errores con fila 2 y 3, mediciones vacío
// ida y vuelta: filasAMediciones(parseCsv(medicionesACsv(ms))) reproduce ms
```
- [ ] **Step 2:** Run: `npm test` → FAIL.
- [ ] **Step 3:** Implementar ambos archivos.
- [ ] **Step 4:** Run: `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: reminders and CSV import/export`.

---

### Task 5: Almacenamiento y respaldo

**Files:**
- Create: `src/storage/db.ts`, `src/storage/backup.ts`
- Test: `tests/storage/db.test.ts`, `tests/storage/backup.test.ts` (importan `fake-indexeddb/auto`)

**Interfaces:**
- Consumes: tipos de la Tarea 2.
- Produces:
```ts
const db: Dexie   // tablas: personas (id), mediciones (id, personaId, [personaId+fecha]), ajustes (clave 'principal')
listarPersonas(): Promise<Persona[]>                       // por creadaEn
guardarPersona(p: Persona): Promise<void>
borrarPersona(id: string): Promise<void>                   // borra también sus mediciones, en una transacción
listarMediciones(personaId: string): Promise<Medicion[]>   // por fecha ascendente
guardarMedicion(m: Medicion): Promise<void>                // put: reemplaza la del mismo id
guardarMediciones(ms: Medicion[]): Promise<void>
contarExistentes(ids: string[]): Promise<number>
borrarMedicion(id: string): Promise<void>
leerAjustes(): Promise<Ajustes>                            // por defecto { diaRecordatorio: 0, horaRecordatorio: '09:00' }
guardarAjustes(a: Ajustes): Promise<void>

interface Respaldo { app: 'MedidasCuerpo'; version: 1; exportadoEn: string; personas: Persona[]; mediciones: Medicion[]; ajustes: Ajustes }
exportarRespaldo(): Promise<Respaldo>
leerRespaldo(json: string): Respaldo        // lanza Error('El archivo no es un respaldo de MedidasCuerpo') si no valida
restaurarRespaldo(r: Respaldo): Promise<void>   // reemplaza todo en una sola transacción
```
- `leerRespaldo` exige `app === 'MedidasCuerpo'`, `version === 1`, arreglos en `personas` y `mediciones`, y que cada medición tenga `id`, `personaId`, `fecha` y `pesoKg` numérico.

- [ ] **Step 1: Pruebas que fallan**
```ts
// guardar dos mediciones con mismo personaId y fecha → listarMediciones devuelve 1, con el último peso
// listarMediciones devuelve orden por fecha aunque se guarden al revés
// borrarPersona('p1') deja 0 mediciones de p1 y no toca las de p2
// leerAjustes() sin datos → { diaRecordatorio: 0, horaRecordatorio: '09:00' }
// ida y vuelta: exportarRespaldo → borrar todo → restaurarRespaldo → mismas personas y mediciones
// Review Focus 5
expect(() => leerRespaldo('{"hola":1}')).toThrow('El archivo no es un respaldo de MedidasCuerpo')
expect(() => leerRespaldo('no es json')).toThrow('El archivo no es un respaldo de MedidasCuerpo')
// tras un leerRespaldo fallido, listarPersonas() sigue devolviendo lo que había
```
- [ ] **Step 2:** Run: `npm test -- storage` → FAIL.
- [ ] **Step 3:** Implementar ambos archivos.
- [ ] **Step 4:** Run: `npm test -- storage` → PASS.
- [ ] **Step 5:** Commit `feat: local storage and backup`.

---

### Task 6: Estructura de la interfaz y pantalla Familia

**Files:**
- Create: `src/ui/Familia.tsx`, `src/ui/PersonaForm.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/styles.css`, `src/main.tsx`
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Consumes: funciones de `db.ts`, `estadoMedicion`, `validarValor`, `parseNumero`.
- Produces: `App` mantiene `pantalla: 'familia' | 'medir' | 'evolucion' | 'historial' | 'datos'` y `personaId: string | null`; cada pantalla recibe `{ persona: Persona }` salvo Familia y Datos. Lecturas con `useLiveQuery`.

- Navegación: cinco pestañas; Medir, Evolución e Historial quedan deshabilitadas sin persona seleccionada. Un selector de persona visible en esas tres pantallas.
- Familia: tarjeta por persona con nombre, última fecha, último peso y una píldora "Al día" o "Le toca medirse"; clic selecciona a la persona y abre Medir. Botones editar y eliminar (eliminar pide confirmación dentro de la tarjeta, indicando cuántas mediciones se borrarán).
- Estado vacío: "Agrega a la primera persona para empezar a registrar mediciones." con el botón Agregar persona.
- `PersonaForm`: nombre, sexo, fecha de nacimiento, estatura (cm), objetivo; errores junto a cada campo.
- Si abrir la base de datos falla: pantalla con "Este navegador no permite guardar datos locales. La app no puede funcionar así." y ningún formulario.
- Al arrancar: `navigator.storage?.persist?.()`.
- Estilo: tokens de color en `:root` con variante oscura por `prefers-color-scheme`; `font-variant-numeric: tabular-nums` en cifras; una columna bajo 600 px.

- [ ] **Step 1:** Prueba e2e que falla: abrir la app → se ve el estado vacío → Agregar persona "Ana", mujer, 165 cm → aparece tarjeta "Ana" con "Le toca medirse".
- [ ] **Step 2:** Run: `npm run e2e -- --trace off` → FAIL.
- [ ] **Step 3:** Implementar App, Familia y PersonaForm.
- [ ] **Step 4:** Run: `npm run e2e -- --trace off` → PASS.
- [ ] **Step 5:** Commit `feat: app shell and family screen`.

---

### Task 7: Medir e Historial

**Files:**
- Create: `src/ui/Medir.tsx`, `src/ui/Historial.tsx`
- Modify: `src/ui/App.tsx`, `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `guardarMedicion`, `listarMediciones`, `borrarMedicion`, `ETIQUETAS`, `parseNumero`, `validarValor`, `idMedicion`, `derivar`.

- Medir: fecha (hoy por defecto) y los once campos de `CampoNumerico` en dos grupos, "Báscula" y "Perímetros", más nota. Entradas de texto con `inputMode="decimal"`. Junto a cada campo, el valor de la medición anterior ("antes: 72,5"). Fecha y peso obligatorios. Si ya existe una medición ese día, el formulario la carga y el botón dice "Actualizar medición".
- Al guardar: mensaje "Medición guardada" y enlace a Evolución.
- Historial: tabla, más reciente primero, con fecha, peso, % grasa (con "est." si es estimado), músculo, visceral, cintura, cadera, IMC; editar abre Medir con esa fecha; eliminar confirma en la fila. Envuelta en un contenedor con desplazamiento horizontal.
- Estado vacío de Historial: "Todavía no hay mediciones de {nombre}." con botón a Medir.

- [ ] **Step 1:** Ampliar la prueba e2e: registrar para Ana peso `"72,5"` y cintura `88` → Historial muestra una fila con `72,5`; guardar otra vez el mismo día con peso `72` → sigue habiendo una fila y muestra `72,0`; peso `900` → mensaje de error junto al campo y no se guarda.
- [ ] **Step 2:** Run e2e → FAIL.
- [ ] **Step 3:** Implementar Medir e Historial.
- [ ] **Step 4:** Run e2e → PASS.
- [ ] **Step 5:** Commit `feat: measurement form and history`.

---

### Task 8: Evolución

**Files:**
- Create: `src/ui/Evolucion.tsx`, `src/ui/Grafico.tsx`
- Modify: `src/ui/App.tsx`, `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `interpretar`, `NOTA_ORIENTACION`, `derivar`, `listarMediciones`, `ETIQUETAS`.
- Produces: `Grafico({ puntos: { fecha: string; valor: number }[]; unidad: string })`.

- Métricas elegibles: peso, % grasa, músculo, grasa visceral, cintura, cadera, pecho, brazo, muslo, IMC. Solo se ofrecen las que tienen al menos un dato.
- `Grafico`: SVG propio; eje X proporcional a la fecha; eje Y con cuatro marcas y margen del 10 %; línea de valores con puntos; línea punteada del promedio móvil de 4 mediciones (desde la cuarta); etiqueta con el último valor; colores desde los tokens de CSS; con un solo punto muestra el punto y el texto "Registra otra medición para ver la línea."
- Bajo el gráfico: tarjetas de `interpretar`, con el tono indicado por color y por un rótulo de texto ("Bien", "Atención", "Dato"), y al final `NOTA_ORIENTACION`.

- [ ] **Step 1:** Ampliar e2e: con dos mediciones de Ana (hoy −7 días: 72,5 kg, cintura 88; hoy: 72,4 kg, cintura 86,5) → Evolución muestra el título de `recomposicion` y la nota de orientación; el SVG contiene 2 puntos.
- [ ] **Step 2:** Run e2e → FAIL.
- [ ] **Step 3:** Implementar Evolucion y Grafico.
- [ ] **Step 4:** Run e2e → PASS.
- [ ] **Step 5:** Commit `feat: progress chart and insights`.

---

### Task 9: Datos (importar, exportar, respaldo, recordatorio)

**Files:**
- Create: `src/ui/Datos.tsx`, `src/ui/descargar.ts`
- Modify: `src/ui/App.tsx`, `src/ui/Familia.tsx`, `e2e/app.spec.ts`, `e2e/fixtures/excel.csv`

**Interfaces:**
- Consumes: todo `csv.ts`, `backup.ts`, `generarIcs`, `leerAjustes`, `guardarAjustes`, `contarExistentes`, `guardarMediciones`.
- Produces: `descargar(nombre: string, contenido: string, tipo: string): void` (Blob + enlace temporal).

- Importar CSV: elegir persona y archivo → tabla de asignación (campo → columna, editable, con la sugerencia aplicada) → resumen "N nuevas, M reemplazan, K filas omitidas" con la lista de filas omitidas y su motivo → Confirmar importación.
- Exportar CSV: por persona, archivo `medidas-{nombre}.csv`.
- Respaldo: Descargar respaldo (`medidascuerpo-AAAA-MM-DD.json`, actualiza `ultimoRespaldo`); Restaurar muestra "El archivo contiene N personas y M mediciones. Reemplazará todos los datos actuales." y pide confirmar; un archivo inválido muestra el mensaje de `leerRespaldo`.
- Recordatorio: día de la semana y hora → guardar en ajustes → Descargar evento de calendario (`recordatorio-medidas.ics`), con el texto "Ábrelo para agregarlo a tu calendario; el aviso lo emite tu calendario."
- Familia: aviso "Hace más de 30 días que no respaldas tus datos" si hay mediciones y `ultimoRespaldo` falta o tiene más de 30 días, con enlace a Datos.

- [ ] **Step 1:** Ampliar e2e: importar `excel.csv` (separador `;`, fechas `DD/MM/AAAA`, coma decimal, 3 filas válidas y 1 sin peso) para Ana → el resumen dice 3 nuevas y 1 omitida → tras confirmar, Historial tiene 3 filas más. Restaurar un archivo `{"hola":1}` → se ve el mensaje de error y las personas siguen.
- [ ] **Step 2:** Run e2e → FAIL.
- [ ] **Step 3:** Implementar Datos y `descargar`.
- [ ] **Step 4:** Run e2e → PASS.
- [ ] **Step 5:** Commit `feat: import, export, backup and reminder`.

---

### Task 10: Verificación final y publicación

- [ ] **Step 1:** Run: `npm test` → todo PASS. Run: `npm run build` → sin errores de TypeScript.
- [ ] **Step 2:** Run: `npm run e2e -- --trace off` contra `vite preview` → PASS. En la misma corrida, comprobar que `/MedidasCuerpo/manifest.webmanifest` responde 200 y que hay un service worker registrado.
- [ ] **Step 3:** Captura de pantalla de Familia y Evolución en ancho de escritorio y de 400 px, en tema claro y oscuro; corregir desbordes o texto ilegible.
- [ ] **Step 4:** `README.md`: qué es, dirección de la app, cómo instalarla desde Chrome o Edge, dónde viven los datos, cómo respaldar, comandos de desarrollo.
- [ ] **Step 5:** Commit `docs: readme`. Push a `main`. Comprobar que el workflow termina bien y que `https://phatito.github.io/MedidasCuerpo/` carga la app.
