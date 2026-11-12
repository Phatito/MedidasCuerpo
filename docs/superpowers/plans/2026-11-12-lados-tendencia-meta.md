# Medidas por lado, tendencia y meta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar brazos y muslos por lado, importar la hoja del entrenador, mostrar el peso por su tendencia y estimar la fecha de una meta.

**Architecture:** Campos opcionales nuevos en `Medicion` y `Persona` (sin cambio de esquema de IndexedDB), un módulo de dominio puro `trend.ts`, y ajustes en `ficha.ts`, `csv.ts` y las pantallas. Nada sale del dispositivo.

**Tech Stack:** el existente.

**Spec:** `docs/superpowers/specs/2026-11-12-lados-tendencia-meta-design.md`

## Global Constraints

- No se elimina ninguna función ni dato guardado; `brazoCm` y `musloCm` siguen existiendo y mostrándose como "(sin lado)".
- Nombres de campo exactos: `brazoIzqCm`, `brazoDerCm`, `musloIzqCm`, `musloDerCm`, `metaPesoKg`.
- Fórmula de tendencia exactamente la de la spec (factor `1 − 0,9^días`, `días` mínimo 1).
- Umbral de diferencia entre lados: 1 cm o más. Ventana de ritmo: 28 días. Tope de proyección: 730 días.
- Nunca se muestra "NaN", "undefined", "Infinity" ni un cambio de "0,0".
- `src/domain/` sin React, Dexie ni APIs del navegador. Colores solo como variables de `:root`.
- No se suben datos personales al repositorio: las pruebas usan cifras inventadas.

## Review Focus

1. Medición antigua con `brazoCm` sin lado → sigue en Historial, Evolución y figura; editarla no borra el dato. *(Tarea 1)*
2. CSV con "Brazo" y "Brazo izquierdo" juntos, o "Pierna" sola → cada columna va al campo correcto. *(Tarea 1)*
3. Meta ya superada, meta en dirección contraria al ritmo, ritmo cero, una sola medición → sin fecha absurda ni NaN. *(Tarea 2)*
4. Mediciones separadas por meses, o dos el mismo día → la tendencia no se rompe. *(Tarea 2)*
5. Solo un lado medido, o lados con 0,9 cm de diferencia → sin línea de diferencia. *(Tarea 3)*

---

### Task 1: Campos por lado en datos, formularios e importación

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/validation.ts`, `src/domain/csv.ts`, `src/storage/backup.ts`, `src/ui/Medir.tsx`, `src/ui/Historial.tsx`, `src/ui/Evolucion.tsx`, `src/ui/PersonaForm.tsx`
- Test: `tests/domain/csv.test.ts`, `tests/storage/backup.test.ts`, `e2e/app.spec.ts`, `e2e/fixtures/hoja-entrenador.csv`

**Interfaces:**
- Produces: `Medicion` con `brazoIzqCm?`, `brazoDerCm?`, `musloIzqCm?`, `musloDerCm?`; `Persona` con `metaPesoKg?: number`.
- `CampoNumerico` incluye los cuatro; `CAMPOS_PERIMETROS` = `['cuelloCm','pechoCm','brazoIzqCm','brazoDerCm','brazoCm','cinturaCm','caderaCm','musloIzqCm','musloDerCm','musloCm']`; `CAMPOS_SIN_LADO = ['brazoCm','musloCm']`.
- `ETIQUETAS` con los nombres de la spec. `RANGOS` 5–300 para los cuatro.
- Alias CSV (palabras completas, las de lado antes que las sin lado): brazo izq: `brazo izquierdo`, `brazo izq`, `left arm`; brazo der: `brazo derecho`, `brazo der`, `right arm`; muslo izq: `muslo izquierdo`, `pierna izquierda`, `muslo izq`, `pierna izq`, `left thigh`, `left leg`; muslo der: análogo; pecho suma `torso`; muslo sin lado suma `pierna`, `leg`.
- `PersonaForm`: campo "Peso objetivo (kg, opcional)", validado con el rango del peso; vacío = sin meta.
- `Medir`: los campos de `CAMPOS_SIN_LADO` solo se muestran si la medición cargada los tiene; al guardar se conservan.

- [ ] **Step 1: Pruebas que fallan**
```ts
// csv
sugerirAsignacion(['Fecha','Peso','Torso','Brazo izquierdo','Brazo derecho','Cintura','Cadera','Pierna izquierda','Pierna derecha'])
  → { fecha:0, pesoKg:1, pechoCm:2, brazoIzqCm:3, brazoDerCm:4, cinturaCm:5, caderaCm:6, musloIzqCm:7, musloDerCm:8, brazoCm:null, musloCm:null }
sugerirAsignacion(['Fecha','Peso','Brazo','Brazo izquierdo','Pierna']) → brazoCm:2, brazoIzqCm:3, musloCm:4, musloIzqCm:null
sugerirAsignacion(['date','weight','Left Arm','Right Thigh']) → brazoIzqCm:2, musloDerCm:3
// ida y vuelta de exportación con los cuatro campos
// backup: persona con metaPesoKg '95' (texto) o 9000 → rechazado; con 95 → aceptado; respaldo sin los campos nuevos → aceptado
// e2e 'registrar ambos brazos y ambos muslos': Medir con Brazo izquierdo 38, Brazo derecho 39,5, Muslo izquierdo 60 → Historial muestra esas columnas y valores
// e2e 'importar la hoja del entrenador': fixture con encabezados de la hoja y 3 semanas inventadas → 'Columna para Brazo izquierdo' = 3, 'Columna para Muslo derecho' = 8, 3 nuevas; Historial con 3 filas
// e2e 'una medición antigua sin lado sigue visible y editable': restaurar respaldo con brazoCm 34 → Historial muestra 34,0 en "Brazo (sin lado)"; Editar → campo 'Brazo (sin lado) (cm)' con 34; guardar sin tocarlo → sigue 34,0
```
- [ ] **Step 2:** Run: `npm test` y `npm run e2e` → las nuevas FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run: `npm test` y `npm run e2e` → PASS.
- [ ] **Step 5:** Commit `feat: left and right arm and thigh measurements`.

---

### Task 2: Tendencia y proyección de meta

**Files:**
- Create: `src/domain/trend.ts`
- Test: `tests/domain/trend.test.ts`

**Interfaces:**
```ts
interface PuntoTendencia { fecha: string; valor: number; tendencia: number }
tendenciaPeso(pesadas: { fecha: string; valor: number }[]): PuntoTendencia[]   // ordena por fecha; no muta
type EstadoMeta = 'alcanzada' | 'sin_datos' | 'en_contra' | 'lejana' | 'estimada'
interface ProyeccionMeta { estado: EstadoMeta; faltaKg: number; ritmoSemanalKg: number | null; fecha: string | null }
proyeccionMeta(serie: PuntoTendencia[], metaKg: number): ProyeccionMeta | null   // null si la serie está vacía
```
- `faltaKg` = meta − tendencia actual, a un decimal. `fecha` solo con estado `estimada`.

- [ ] **Step 1: Pruebas que fallan**
```ts
// una pesada → tendencia = valor
// [100 (01-nov), 98 (08-nov)] → tendencia[1] = 100 + (98-100)*(1-0.9**7) ≈ 98.957
// misma fecha dos veces → no lanza, días = 1
// 100 y luego 90 a los 180 días → tendencia ≈ 90 (±0.01)
// entrada desordenada = ordenada; no muta
// meta: serie bajando ~0,5 kg/semana durante 5 semanas, meta 2 kg por debajo → estado 'estimada', fecha posterior a la última, ritmoSemanalKg negativo
// meta por encima estando en bajada → 'en_contra', fecha null
// ritmo cero (pesos iguales) → 'en_contra'
// una sola medición → 'sin_datos'; dos mediciones separadas 3 días → 'sin_datos'
// tendencia actual a 0,04 de la meta → 'alcanzada'; meta entre la primera tendencia y la actual → 'alcanzada'
// ritmo de 0,01 kg/semana hacia una meta a 10 kg → 'lejana', fecha null
// ningún campo es NaN ni Infinity en ninguno de los casos
```
- [ ] **Step 2:** Run: `npm test -- trend` → FAIL.
- [ ] **Step 3:** Implementar `trend.ts`.
- [ ] **Step 4:** Run: `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: weight trend and goal projection`.

---

### Task 3: Ficha, figura, gráficos y guía

**Files:**
- Modify: `src/domain/ficha.ts`, `src/ui/Cuerpo.tsx`, `src/ui/Ficha.tsx`, `src/ui/Grafico.tsx`, `src/ui/Evolucion.tsx`, `src/ui/Medir.tsx`, `src/ui/styles.css`
- Test: `tests/domain/ficha.test.ts`, `e2e/app.spec.ts`

**Interfaces:**
- `PERIMETROS` de `ficha.ts` = `CAMPOS_PERIMETROS`. `medidas` omite un campo sin lado cuando la última medición tiene algún lado de esa extremidad.
- `ResumenFicha` suma `asimetrias: { zona: 'brazo' | 'muslo'; mayor: 'izq' | 'der'; diferencia: number }[]`, `serie: PuntoTendencia[]` (últimas 10) en lugar de `pesos`, y `meta: ProyeccionMeta | null`.
- Tarjeta `pesoKg`: `valor` = tendencia actual (1 decimal), `cambio` = tendencia actual − primera tendencia, y campo nuevo `ultimaPesada: number`.
- `Grafico` recibe `tendencia?: { fecha: string; valor: number }[]`; si viene, dibuja `path.trend` y no el promedio de 4; leyenda "Tendencia".
- `Cuerpo`: zonas para los cuatro campos; rótulos con posición propia para que no se pisen; lado izquierdo de la persona a la derecha de la imagen.

- [ ] **Step 1: Pruebas que fallan**
```ts
// ficha: brazoIzq 38 y brazoDer 39,5 → asimetrias [{zona:'brazo', mayor:'der', diferencia:1.5}]; 38 y 38,9 → []; solo un lado → []
// ficha: última con brazoIzqCm y brazoCm → medidas incluye brazoIzqCm y no brazoCm; última solo con brazoCm → lo incluye
// ficha: pesos 84,2 → 81,7 en 9 semanas → tarjeta pesoKg con valor = tendencia (≠ 81,7), ultimaPesada 81,7
// ficha: persona con metaPesoKg → meta no nula; sin meta → null
// e2e 'la ficha muestra ambos brazos y la diferencia entre lados': [data-medida="brazoIzqCm"] y [data-medida="brazoDerCm"] visibles; texto 'Brazo derecho 1,5 cm mayor que el izquierdo'
// e2e 'el peso se lee por su tendencia': tarjeta 'Peso de tendencia' con 'Última pesada'; svg.chart path.trend en Ficha y en Evolución (métrica Peso); en Evolución con métrica Cintura no hay path.trend
// e2e 'la meta muestra fecha estimada': persona con peso objetivo, 5 mediciones semanales bajando → tarjeta 'Meta' con 'Fecha estimada'; con peso objetivo por encima → 'te alejas de la meta'
// e2e 'la guía para medir': en Medir, abrir 'Cómo medir cada zona' → 'a la altura del ombligo'
// la prueba existente del promedio de 4 pasa a usar la métrica Cintura
```
- [ ] **Step 2:** Run → las nuevas FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run: `npm test` y `npm run e2e` → PASS.
- [ ] **Step 5:** Commit `feat: sided figure, trend weight, goal card and measuring guide`.

---

### Task 4: Verificación y publicación

- [ ] **Step 1:** Run: `npm test`, `npm run build`, `npx playwright test --repeat-each 3` → todo PASS.
- [ ] **Step 2:** Capturas de Ficha, Medir, Evolución e Historial a 1200 y 400 px con datos por lado y meta; corregir desbordes y rótulos que se pisen.
- [ ] **Step 3:** README: medidas por lado, peso de tendencia, meta e importación de la hoja.
- [ ] **Step 4:** Commit, push a `main`, comprobar el workflow y que el sitio en línea sirva la versión nueva.
