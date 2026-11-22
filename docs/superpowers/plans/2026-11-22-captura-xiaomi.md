# Leer la captura de Xiaomi Home — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revisión del 2026-11-22** (tras la navegación sin pestañas): el botón va en la pestaña "Captura de Xiaomi Home" de `src/ui/Registrar.tsx`, que al leer pasa a la pestaña Escribir con `Medir` rellenado; y la captura rellena también los seis campos nuevos. Los cambios están marcados con **[rev]**.

**Goal:** En Medir, elegir o pegar la captura del informe de Xiaomi Home y que la app rellene fecha, peso, % grasa, % agua, músculo esquelético y grasa visceral para revisar y guardar.

**Architecture:** El OCR corre en el navegador con `tesseract.js`, que se carga con `import()` dinámico y usa archivos servidos desde `ocr/` del propio sitio. `src/ui/ocr.ts` prepara la imagen (gris, invertir si es oscura, 620 px de ancho) y devuelve palabras con su caja. La función pura `leerCapturaXiaomi` (dominio) las convierte en campos con marcas "revisar". `Medir.tsx` mezcla el resultado con lo guardado ese día y no guarda nada solo.

**Tech Stack:** React 18, TypeScript, Vite 8, vite-plugin-pwa (workbox), Dexie, Vitest, Playwright, `tesseract.js@7.0.0`, `@tesseract.js-data/spa@1.0.0` (modelo `4.0.0`, el "fast").

**Spec:** `docs/superpowers/specs/2026-11-22-captura-xiaomi-design.md`

## Global Constraints

- La imagen nunca sale del computador; la app no hace peticiones a otros dominios (todos los archivos del lector se sirven bajo `${import.meta.env.BASE_URL}ocr/`).
- Nada se guarda hasta que el usuario pulse "Guardar medición"; `origen` sigue siendo `'manual'`. No se cambia el modelo de datos ni el formato del respaldo.
- `musculoKg` = "Masa muscular esquelética", nunca "Masa muscular".
- Ancho objetivo del preprocesado: constante `ANCHO_OCR = 620`. Invertir solo si el brillo medio es < 128. Sin umbralizado.
- Tolerancias: peso ≤ 0,15 kg; porcentajes ≤ 0,3 puntos.
- Textos exactos: botón "Leer captura de Xiaomi Home"; "o pega la imagen (Ctrl+V)"; "Leyendo la captura…"; "Revisa los valores y pulsa Guardar."; marca "de la captura"; marca "revisa con la imagen"; error "No pude leer esta imagen. Usa la captura completa del informe de Xiaomi Home, sin recortar ni comprimir."; confirmación "Tienes cambios sin guardar en Medir. ¿Reemplazarlos con la captura?"; nota "Xiaomi Home HH:MM".
- Sin colores literales fuera de `:root` en `styles.css`. Interfaz en español.
- La captura real del usuario y sus números no van al repositorio: las pruebas usan números inventados.
- Commits terminan con las líneas `Co-Authored-By` y `Claude-Session` de la sesión.

## Review Focus

1. Una captura comprimida (pocos píxeles) o una foto cualquiera → mensaje de error y el formulario no cambia (Task 3, prueba e2e con la réplica reducida a 216 px).
2. Captura de un día que ya tiene cintura guardada → la cintura sigue en el formulario y tras guardar (Task 3).
3. Cambios sin guardar y el usuario rechaza la confirmación → lo escrito queda intacto y no se lee nada (Task 3).
4. Captura en modo claro → no se invierte y se lee igual (Task 2, prueba unitaria de `debeInvertir`; Task 3, e2e con la réplica clara).
5. Cambiar de persona mientras se lee → el resultado se descarta y no rellena a la otra persona (Task 3).

---

### Task 1: Interpretar las palabras reconocidas (`leerCapturaXiaomi`)

**Files:**
- Create: `src/domain/capturaXiaomi.ts`
- Test: `tests/domain/capturaXiaomi.test.ts`

**Interfaces:**
- Consumes: `validarValor(campo, v)` de `src/domain/validation.ts`; `CampoNumerico` de `types.ts`.
- Produces:
  ```ts
  export interface PalabraOcr { texto: string; x0: number; y0: number; x1: number; y1: number }
  export type LineaOcr = PalabraOcr[]
  export type CampoCaptura = 'pesoKg' | 'grasaPct' | 'aguaPct' | 'musculoKg' | 'grasaVisceral'
    | 'musculoTotalKg' | 'masaOseaKg' | 'proteinaPct' | 'metabolismoBasalKcal' | 'edadCorporal' | 'frecuenciaCardiacaLpm'  // [rev]
  export interface LecturaCaptura {
    fecha: string | null        // AAAA-MM-DD
    hora: string | null         // HH:MM
    valores: Partial<Record<CampoCaptura, number>>
    revisar: CampoCaptura[]     // campos leídos sin comprobación posible o que no cuadran
  }
  export function leerCapturaXiaomi(lineas: LineaOcr[], anchoImagen: number): LecturaCaptura
  ```

Reglas (del spec):
- Rótulos, normalizados sin tildes ni mayúsculas, buscados como palabras contiguas exactas, **del más largo al más corto**, consumiendo las palabras usadas: `porcentaje de grasa corporal`, `masa de agua corporal`, `masa muscular esqueletica`, `calificacion de grasa visceral`, `peso corporal sin grasa`, `agua corporal`, `grasa corporal`. **[rev]** Además: `porcentaje mineral oseo`, `contenido mineral oseo`, `porcentaje de proteinas`, `porcentaje de musculo`, `indice metabolico basal`, `masa proteica`, `edad corporal`, `frecuencia cardiaca`, `masa muscular` (este último después de `masa muscular esqueletica`).
- Valor de un rótulo: en la línea más cercana por encima (y1 de la línea < y0 del rótulo, a no más de 3 alturas del rótulo), la palabra que empieza por `\d{1,4}(?:[.,]\s?\d)?` cuyo `x0` está más cerca del `x0` del rótulo, y a menos de `0,15 × anchoImagen`. Se toma un solo decimal (`33,619` → 33,6; `45,0rg` → 45,0; `13, 9xg` → 13,9).
- Peso grande: entre las líneas por encima del primer rótulo, la palabra numérica de mayor altura con 2–3 dígitos enteros; si tiene `,d` se usa; si es entera y a su derecha, a menos de su altura, hay una palabra `,d` o `d`, se unen. Si no, no hay peso grande.
- Peso final, porcentajes, comprobaciones y `revisar`: exactamente como la sección "Campos que se rellenan" del spec. `musculoKg` y `grasaVisceral` leídos siempre van a `revisar`. **[rev]** `musculoTotalKg` se comprueba con porcentaje de músculo × peso, `masaOseaKg` con porcentaje mineral óseo × peso y `proteinaPct` con masa proteica ÷ peso (tolerancia 0,15 kg o 0,3 puntos); `metabolismoBasalKcal`, `edadCorporal` (entero, de `25 años de edad`) y `frecuenciaCardiacaLpm` siempre van a `revisar`. Prueba extra: con las líneas de la réplica completa, los once campos salen con sus valores.
- Cada valor pasa por `validarValor`; uno fuera de rango se descarta (y no entra a `revisar`).
- Fecha y hora: primer `dd/mm/aaaa` (con `HH:MM` opcional) en el texto de cualquier línea.

- [ ] **Step 1: Escribir las pruebas que fallan**

Helper en el test: `const p = (texto: string, x0: number, y0: number, alto = 20) => ({ texto, x0, y0, x1: x0 + texto.length * 10, y1: y0 + alto })`. Ancho de imagen 620. Pruebas (números inventados):

```ts
test('lee los cinco campos y comprueba peso y porcentajes', ...)
// líneas: ['Ana'], ['15/11/2026','07:45'], ['82',x=250,alto 60] + [',4',x=330,alto 30],
//  ['25,1',20] ['22,7%',320] / ['IMC',20] ['Porcentaje','de','grasa','corporal' desde 320],
//  ['45,0kg',300] / ['Masa','de','agua','corporal',300], ['18,7rg',300] / ['Grasa','corporal',300],
//  ['54,6%',20] ['16,9%',320] / ['Agua','corporal',20] ['Porcentaje','de','proteínas',320],
//  ['3,9%',20] ['33,619',320] / ['Porcentaje','mineral','óseo',20] ['Masa','muscular','esquelética',320],
//  ['9,0',20] ['1712Kcal',320] / ['Calificación','de','grasa','visceral',20] ['Índice','metabólico','basal',320],
//  ['63,7kg',20] / ['Peso','corporal','sin','grasa',20]
expect(r).toEqual({ fecha: '2026-11-15', hora: '07:45',
  valores: { pesoKg: 82.4, grasaPct: 22.7, aguaPct: 54.6, musculoKg: 33.6, grasaVisceral: 9 },
  revisar: ['musculoKg', 'grasaVisceral'] })

test('"Masa muscular" no se confunde con la esquelética', ...)  // ['60,5kg',20]/['Masa','muscular',20] y ['33,6kg',320]/['Masa','muscular','esquelética',320] → musculoKg 33.6
test('sin peso grande, el peso es sin grasa + grasa y queda comprobado', ...) // 63,7 + 18,7 → 82.4, 'pesoKg' no está en revisar
test('peso grande que no cuadra: se usa la suma y se marca', ...) // grande 88,4 → pesoKg 82.4, revisar contiene 'pesoKg'
test('porcentaje que no se leyó se calcula', ...) // sin línea de 22,7% → grasaPct 22.7 (18,7/82,4×100 redondeado a 1 decimal), no en revisar
test('porcentaje que no cuadra se usa leído y se marca', ...) // '28,7%' → grasaPct 28.7, revisar contiene 'grasaPct'
test('sin peso, todo lo leído queda para revisar', ...) // solo % grasa y visceral → revisar contiene ambos, sin pesoKg
test('valor fuera de rango se descarta', ...) // visceral '99,0' → sin grasaVisceral
test('una imagen sin rótulos no devuelve valores', ...) // [['Hola','mundo']] → { fecha: null, hora: null, valores: {}, revisar: [] }
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run tests/domain/capturaXiaomi.test.ts`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Implementar `leerCapturaXiaomi` en `src/domain/capturaXiaomi.ts`** con las reglas de arriba; el dominio no importa nada del navegador ni de tesseract.

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run tests/domain/capturaXiaomi.test.ts` → PASS; `npm test` → todo PASS.

- [ ] **Step 5: Commit** — `feat: interpret Xiaomi Home report words into measurement fields`

---

### Task 2: Lector OCR local (archivos, caché sin conexión y preprocesado)

**Files:**
- Modify: `package.json` (dependencias `tesseract.js@7.0.0`, `@tesseract.js-data/spa@1.0.0`; scripts `predev` y `prebuild` = `node scripts/copiar-ocr.mjs`)
- Create: `scripts/copiar-ocr.mjs`
- Modify: `.gitignore` (agrega `public/ocr`)
- Modify: `vite.config.ts` (workbox)
- Create: `src/ui/ocr.ts`
- Create: `src/domain/imagen.ts`, Test: `tests/domain/imagen.test.ts`
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `LineaOcr` de Task 1.
- Produces:
  ```ts
  // src/domain/imagen.ts (puro)
  export const ANCHO_OCR = 620
  export function debeInvertir(brilloMedio: number): boolean          // < 128
  export function tamanoOcr(ancho: number, alto: number): { ancho: number; alto: number } // ancho 620, proporción
  // src/ui/ocr.ts
  export async function reconocerImagen(imagen: Blob, alProgreso?: (fraccion: number) => void): Promise<{ lineas: LineaOcr[]; ancho: number }>
  ```

- [ ] **Step 1: Pruebas que fallan**
  - Unitarias: `debeInvertir(40) === true`, `debeInvertir(200) === false`, `debeInvertir(128) === false`; `tamanoOcr(1242, 3378)` → `{ ancho: 620, alto: 1686 }`.
  - E2E `el lector se sirve desde el propio sitio y queda fuera del precache`: `request.get('ocr/worker.min.js')`, `ocr/tesseract-core-simd-lstm.wasm.js`, `ocr/spa.traineddata.gz` responden 200; el texto de `sw.js` no contiene `ocr/`.
- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run tests/domain/imagen.test.ts` y `npx playwright test --trace off -g "lector se sirve"` → FAIL.
- [ ] **Step 3: Implementar**
  - `npm i tesseract.js@7.0.0 @tesseract.js-data/spa@1.0.0`.
  - `scripts/copiar-ocr.mjs` copia a `public/ocr/`: `node_modules/tesseract.js/dist/worker.min.js`; `node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js`, `-simd-lstm.wasm.js`, `-relaxedsimd-lstm.wasm.js`; `node_modules/@tesseract.js-data/spa/4.0.0/spa.traineddata.gz`. Crea la carpeta si falta.
  - `vite.config.ts`: `workbox.globIgnores: ['ocr/**']` y `runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.includes('/ocr/'), handler: 'CacheFirst', options: { cacheName: 'lector-ocr' } }]`.
  - `src/ui/ocr.ts`: `const { createWorker } = await import('tesseract.js')`; `createWorker('spa', 1, { workerPath: base + 'ocr/worker.min.js', corePath: base + 'ocr', langPath: base + 'ocr', gzip: true, workerBlobURL: false, cacheMethod: 'none', logger })`, con `base = import.meta.env.BASE_URL`. Preprocesado en `<canvas>` con `createImageBitmap`: tamaño de `tamanoOcr`, gris, brillo medio, invertir según `debeInvertir`. `worker.recognize(canvas, {}, { blocks: true })`; aplana `blocks → paragraphs → lines → words` a `LineaOcr[]` con `bbox`. Termina el worker al acabar (también si falla).
- [ ] **Step 4: Correr y ver que pasan** — las dos órdenes del Step 2 → PASS; `npm run build` → `dist/ocr/` tiene los 5 archivos y el paquete principal (`dist/assets/index-*.js`) no contiene `createWorker`.
- [ ] **Step 5: Commit** — `feat: local OCR reader served from the site and cached on first use`

---

### Task 3: Pestaña Captura en Registrar (y relleno de Medir) **[rev]**

**Files:**
- Modify: `src/ui/Medir.tsx` (prop `lectura?: { valores; revisar; hora; imagenUrl; id }`: al cambiar `id`, aplica la lectura como dice el spec)
- Modify: `src/ui/Registrar.tsx` (la pestaña Captura monta `LeerCaptura`; al leer, guarda la lectura y pasa a Escribir; el pegado se escucha mientras Registrar está montado)
- Create: `src/ui/LeerCaptura.tsx`
- Modify: `src/ui/styles.css`
- Create: `e2e/fixtures/captura-xiaomi.html` (réplica con números inventados; `?claro` cambia a fondo claro), `e2e/fixtures/captura-xiaomi.png` (oscura, 1242 px de ancho), `e2e/fixtures/captura-xiaomi-clara.png`, `e2e/fixtures/captura-xiaomi-chica.png` (oscura reducida a 216 px)
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Consumes: `reconocerImagen` (Task 2), `leerCapturaXiaomi`, `LecturaCaptura`, `CampoCaptura` (Task 1).
- Produces: `LeerCaptura({ onLectura, onLeyendo }: { onLectura: (l: LecturaCaptura, imagen: Blob) => void; onLeyendo?: (activo: boolean) => void })`: botón con `<input type="file" accept="image/*">`, estado "Leyendo la captura…" con progreso (y, mientras no se haya usado nunca en este navegador, la línea "La primera vez descarga el lector, unos 6 MB."), y el mensaje de error. El pegado (`paste` con un archivo de imagen) se escucha en el `document` mientras Medir está montado.

Comportamiento en Medir (spec, sección "Pantalla"):
- Antes de leer, si `sucio.current`, `window.confirm("Tienes cambios sin guardar en Medir. ¿Reemplazarlos con la captura?")`; si es `false`, no se lee.
- Si al terminar la persona ya no es la misma que al empezar (ref con `persona.id`), se descarta el resultado.
- Sin valores → error y el formulario no cambia.
- Con valores: `sucio.current = true`; fecha = `lectura.fecha ?? fecha`; textos = lo guardado ese día (si existe) con los campos leídos encima; un campo no leído conserva lo guardado; nota = `Xiaomi Home ${hora}` solo si estaba vacía y hay hora; muestra "Revisa los valores y pulsa Guardar.", la miniatura (`URL.createObjectURL`, revocada al desmontar o al leer otra) que se amplía al hacer clic, y en cada campo leído "de la captura" o, si está en `revisar`, "revisa con la imagen" (clase de atención).
- Las marcas y la miniatura viven en estado local; se borran al guardar o al cambiar de persona.

- [ ] **Step 1: Generar las imágenes de prueba** con Playwright desde `captura-xiaomi.html` (viewport 414 px, `deviceScaleFactor: 3`, página completa), fecha `15/11/2026 07:45`, valores de la réplica de Task 1 (peso 82,4; % grasa 22,7; agua 54,6 %; esquelética 33,6; visceral 9,0; sin grasa 63,7; grasa 18,7 kg; agua 45,0 kg). La chica se reduce a 216 px de ancho.
- [ ] **Step 2: Escribir las pruebas e2e que fallan** (cada una con `test.setTimeout(90_000)`):
  - `lee la captura de Xiaomi Home y rellena Medir sin guardar`: Ana; en Medir `setInputFiles` con la oscura → Fecha `2026-11-15`, Peso `82,4`, % grasa `22,7`, Agua `54,6`, Músculo `33,6`, Grasa visceral `9`; se ve "Revisa los valores y pulsa Guardar."; el campo Músculo muestra "revisa con la imagen"; el Peso muestra "de la captura"; la nota es "Xiaomi Home 07:45"; en Historial no hay medición del 15/11 hasta pulsar Guardar; tras guardar, sí. Durante toda la prueba ninguna petición sale del host de la app (`page.on('request')`).
  - `conserva la cintura guardada ese día`: guardar el 15/11 con peso 80 y cintura 88; leer la captura → Cintura sigue `88`, Peso `82,4`; guardar → Historial muestra 82,4 y 88.
  - `con cambios sin guardar pide confirmar; si no, no toca nada`: escribir peso `70`; `page.once('dialog', d => d.dismiss())`; elegir la captura → Peso sigue `70` y no aparece "Leyendo la captura…".
  - `lee también la captura en modo claro`: con la clara → Peso `82,4`.
  - `una captura comprimida muestra el error y no cambia el formulario`: con la chica → se ve el mensaje de error y Peso queda vacío.
  - `pegar la imagen con Ctrl+V la lee`: despachar un `ClipboardEvent('paste')` con un `DataTransfer` que contiene la oscura → Peso `82,4`.
- [ ] **Step 3: Correr y ver que fallan** — `npx playwright test --trace off -g "captura"` → FAIL.
- [ ] **Step 4: Implementar** `LeerCaptura.tsx`, los cambios en `Medir.tsx` y los estilos (`.desde-captura`, `.revisar`, `.captura-mini`; colores solo con variables de `:root`).
- [ ] **Step 5: Correr y ver que pasan** — `npx playwright test --trace off -g "captura" --repeat-each 3` → PASS. Luego `npm test` y `npx playwright test --trace off` → todo PASS.
- [ ] **Step 6: Commit** — `feat: read a Xiaomi Home screenshot into the Medir form`

---

### Task 4: Documentación y verificación final

**Files:**
- Modify: `README.md` (sección "Leer la captura de Xiaomi Home": cómo hacer la captura completa en el iPhone, pasarla al computador sin comprimir — AirDrop, iCloud Drive o correo como archivo —, revisar y guardar; la imagen no sale del computador)

- [ ] **Step 1: Escribir la sección del README.**
- [ ] **Step 2: Verificación completa** — `npm test`, `npm run build`, `npx playwright test --trace off --repeat-each 3` → todo PASS. En local, con la captura del usuario en el scratchpad (216 px), la app muestra el mensaje de error (no se sube la imagen).
- [ ] **Step 3: Commit** — `docs: reading Xiaomi Home screenshots`
