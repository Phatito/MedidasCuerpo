# Rediseño del front Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer el aspecto de toda la app con el estilo elegido y agregar la Ficha de persona con figura del cuerpo, sin quitar funciones.

**Architecture:** Solo cambia la capa de interfaz. Un módulo de dominio nuevo y puro (`ficha.ts`) prepara los datos de la Ficha; un componente SVG (`Cuerpo`) los dibuja. `src/storage/` y el dominio existente no se tocan.

**Tech Stack:** el existente (Vite, React 18, TypeScript, Dexie, Vitest, Playwright) más `@fontsource-variable/plus-jakarta-sans`.

**Spec:** `docs/superpowers/specs/2026-11-12-rediseno-front-design.md`

## Global Constraints

- Colores exactamente los de la tabla "Estilo" de la spec, como variables CSS en `:root`; ningún color literal fuera de `:root` en `styles.css` salvo `transparent`.
- Un solo tema oscuro: `color-scheme: dark`; `theme_color` y `background_color` del manifiesto y `<meta name="theme-color">` en `#0e1220`.
- Fuente empaquetada con la app; ninguna petición a servidores externos.
- No se elimina ninguna función, texto de acción ni campo existente.
- `src/domain/` sigue sin importar React, Dexie ni APIs del navegador; `src/storage/` no cambia.
- El estado nunca se comunica solo con color.
- Nunca se muestra "NaN", "undefined" ni un cambio de "0,0".
- Las 17 pruebas e2e y las 118 unitarias existentes terminan en verde.

## Review Focus

1. Persona con una sola medición o sin perímetros → la Ficha no muestra cambios ni huecos rotos. *(Tareas 2 y 3)*
2. Perímetro presente hoy pero ausente en la medición anterior (y presente en una más antigua) → el cambio se calcula contra la última que lo tenga. *(Tarea 2)*
3. Nombre muy largo o 12 personas en la fila → sin desborde horizontal a 400 px. *(Tarea 1)*
4. Menor de edad → ningún cambio coloreado como favorable o de atención. *(Tarea 2)*
5. Cambiar de persona estando en Medir con texto sin guardar → no se arrastra lo escrito a la otra persona. *(Tarea 1)*

---

### Task 1: Tema, fuente, barra y fila de personas

**Files:**
- Create: `src/ui/PersonasBar.tsx`
- Modify: `src/ui/styles.css` (reescritura), `src/ui/App.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts`, `package.json`, `e2e/app.spec.ts`

**Interfaces:**
- Produces: `PersonasBar({ personas, activaId, pendientes, onElegir })` con `pendientes: Set<string>`; cada persona es un `<button>` con `aria-pressed` y nombre accesible igual al nombre de la persona (más "le toca" si corresponde), dentro de un contenedor `aria-label="Personas"`.
- `Pantalla` pasa a `'familia' | 'ficha' | 'medir' | 'evolucion' | 'historial' | 'datos'`. Hasta la Tarea 3, `ficha` muestra un marcador "Ficha en construcción".
- Se elimina el `<select id="persona-activa">`.
- Elegir persona: desde `familia` o `datos` → pantalla `ficha`; desde las demás → misma pantalla.

- [ ] **Step 1: Pruebas e2e que fallan**
```ts
// 'la fila de personas marca a quien le toca y abre la ficha'
// agregar Ana (sin mediciones) → en getByLabel('Personas') hay un botón que contiene 'Ana' y 'le toca'
// clic en ese botón → getByRole('navigation') muestra 'Ficha' con aria-current="page"
// 'cambiar de persona en Medir no arrastra lo escrito'
// agregar Ana y Beto; Medir de Ana; escribir peso 72,5; elegir a Beto en la fila → Peso (kg) vacío y el título contiene 'Beto'
// 'doce personas con nombres largos no desbordan a 400 px'
// viewport 400; crear 12 personas llamadas 'Maximiliano Alejandro N' → document.documentElement.scrollWidth <= innerWidth
```
- [ ] **Step 2:** Run: `npm run e2e` → las 3 nuevas FAIL, las 17 anteriores PASS.
- [ ] **Step 3:** Instalar la fuente e importarla en `main.tsx`; reescribir `styles.css` con las variables de la spec; actualizar manifiesto y `theme-color`; implementar `PersonasBar` y los cambios de `App`.
- [ ] **Step 4:** Run: `npm run e2e` → 20 PASS. Run: `npm test` → 118 PASS.
- [ ] **Step 5:** Commit `feat: dark theme, bundled font and people bar`.

---

### Task 2: Datos de la Ficha

**Files:**
- Create: `src/domain/ficha.ts`
- Test: `tests/domain/ficha.test.ts`

**Interfaces:**
- Consumes: `Persona`, `Medicion`, `derivar`, `interpretar`, `Mensaje`.
- Produces:
```ts
type CampoPerimetro = 'cuelloCm' | 'pechoCm' | 'brazoCm' | 'cinturaCm' | 'caderaCm' | 'musloCm'
const PERIMETROS: CampoPerimetro[]   // en ese orden
interface MedidaFigura { campo: CampoPerimetro; valor: number; cambio: number | null }
type ClaveTarjeta = 'pesoKg' | 'grasaPct' | 'musculoKg' | 'grasaVisceral'
interface TarjetaFicha { clave: ClaveTarjeta; valor: number; estimada: boolean; cambio: number | null; desde: string | null; tono: 'bien' | 'atencion' | 'neutro'; nota: string | null }
interface ResumenFicha { ultima: Medicion | null; medidas: MedidaFigura[]; tarjetas: TarjetaFicha[]; pesos: { fecha: string; valor: number }[]; mensaje: Mensaje | null }
resumenFicha(p: Persona, mediciones: Medicion[]): ResumenFicha
```
- `medidas`: perímetros presentes en la última medición; `cambio` = valor − el de la medición más reciente anterior que tenga ese campo, redondeado a 1 decimal; `null` si no existe o si redondea a 0.
- `tarjetas`: solo claves con dato en la última (grasa usa `derivar`); `cambio` y `desde` contra la primera medición que tenga ese dato (para grasa, con el mismo origen medido/estimado); `null` si esa primera es la última o si el cambio redondea a 0.
- `tono`: grasa baja → bien, sube → atención; músculo sube → bien, baja → atención; peso solo con objetivo `bajar_grasa` (baja → bien, sube → atención); visceral ≥ 10 → atención con `nota: 'Elevada'`; resto neutro. Menor de edad (misma regla que `insights.ts`; exportar `esMenor` desde ahí) → todo neutro salvo la nota de visceral, que tampoco se muestra.
- `pesos`: las últimas 10 mediciones. `mensaje`: `interpretar(p, mediciones)[0] ?? null`.

- [ ] **Step 1: Pruebas que fallan**
```ts
expect(resumenFicha(p, [])).toEqual({ ultima: null, medidas: [], tarjetas: [], pesos: [], mensaje: null })
// una medición con peso 80 y cintura 90 → medidas [{campo:'cinturaCm', valor:90, cambio:null}]; tarjeta peso con cambio null y desde null
// cintura 92 (01-nov), sin cintura (08-nov), cintura 90,5 (15-nov) → cambio -1.5
// cintura 90 → 90,04 → cambio null
// orden de medidas = PERIMETROS aunque la medición los traiga en otro orden
// peso 84,2 (09-sep) … 81,7 (11-nov), objetivo bajar_grasa → {clave:'pesoKg', cambio:-2.5, desde:'2026-09-09', tono:'bien'}
// mismo caso con objetivo ganar_musculo → tono 'neutro'
// grasa medida 29,5 → 26,8 → cambio -2.7, tono 'bien', estimada false
// primera con grasa medida y última solo estimada → tarjeta grasa estimada:true, cambio null
// musculo 35 → 34 → tono 'atencion'
// grasaVisceral 10 → tono 'atencion', nota 'Elevada'; 9 → 'neutro', nota null
// menor (fechaNacimiento 2020-06-01) con peso que sube y visceral 12 → todos los tonos 'neutro' y nota null
// 14 mediciones → pesos.length === 10 y termina en la última
// entrada desordenada da el mismo resultado que ordenada
```
- [ ] **Step 2:** Run: `npm test -- ficha` → FAIL.
- [ ] **Step 3:** Implementar `ficha.ts`; exportar `esMenor` de `insights.ts`.
- [ ] **Step 4:** Run: `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: person profile summary`.

---

### Task 3: Figura del cuerpo y pantalla Ficha

**Files:**
- Create: `src/ui/Cuerpo.tsx`, `src/ui/Ficha.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/Familia.tsx`, `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `resumenFicha`, `MedidaFigura`, `Grafico`.
- Produces: `Cuerpo({ sexo, medidas })` → `<svg data-sexo="hombre|mujer">`; cada medida en un `<g data-medida="cinturaCm">` con banda, línea guía, nombre, valor y cambio. `Ficha({ persona, onMedir, onVerEvolucion })`.
- Siluetas: una ruta por sexo, simétrica (media silueta espejada), en un `viewBox` con margen lateral para los rótulos; la de mujer con hombros más angostos, cintura más marcada y cadera más ancha. Posición vertical de cada banda fija por campo; cuello, brazo y cadera rotulan a la derecha; pecho, cintura y muslo a la izquierda.
- Familia: se agrega la acción "Ver ficha"; "Registrar medición" se mantiene.

- [ ] **Step 1: Pruebas e2e que fallan**
```ts
// 'la ficha dibuja la figura según el sexo y solo las medidas registradas'
// Ana (mujer), medición con peso 72,5 y cintura 88 → Ficha: svg[data-sexo="mujer"]; [data-medida] tiene 1 elemento, cinturaCm, con '88,0 cm'
// 'la ficha muestra el cambio frente a la medición anterior'
// Ana con cintura 88 (hace 7 días) y 86,5 (hoy) → [data-medida="cinturaCm"] contiene '▼ 1,5'; tarjeta Peso visible; 'Mismo peso, menos cintura' visible
// 'sin mediciones la ficha invita a registrar la primera'
// 'un hombre recibe la figura de hombre' → svg[data-sexo="hombre"]
// clic en 'Registrar medición de esta semana' → pantalla Medir
```
- [ ] **Step 2:** Run: `npm run e2e` → las nuevas FAIL.
- [ ] **Step 3:** Implementar `Cuerpo`, `Ficha` y conectar en `App` y `Familia`.
- [ ] **Step 4:** Run: `npm run e2e` y `npm test` → todo PASS.
- [ ] **Step 5:** Commit `feat: profile screen with body figure`.

---

### Task 4: Pulido de pantallas, capturas y publicación

**Files:**
- Modify: `src/ui/Grafico.tsx`, `src/ui/Familia.tsx`, `src/ui/Medir.tsx`, `src/ui/Historial.tsx`, `src/ui/Evolucion.tsx`, `src/ui/Datos.tsx`, `src/ui/styles.css`, `public/icon-192.png`, `public/icon-512.png`, `README.md`

- [ ] **Step 1:** `Grafico`: relleno suave bajo la línea y último punto destacado; prop opcional `compacto` (sin leyenda ni promedio, para la Ficha). Prueba e2e: en Evolución existe `svg.chart .area`.
- [ ] **Step 2:** Familia con inicial en círculo y peso grande; revisar Medir, Historial, Evolución y Datos con el nuevo estilo. Íconos de la app regenerados con los colores nuevos.
- [ ] **Step 3:** Capturas de las 6 pantallas a 1200 y 400 px con datos de ejemplo; corregir desbordes, texto ilegible o contraste bajo.
- [ ] **Step 4:** Run: `npm test`, `npm run build`, `npx playwright test --repeat-each 3` → todo PASS.
- [ ] **Step 5:** Actualizar README (pantalla Ficha). Commit `feat: restyle remaining screens`. Push a `main`; comprobar que el workflow termina bien y que `https://phatito.github.io/MedidasCuerpo/` carga la versión nueva.
