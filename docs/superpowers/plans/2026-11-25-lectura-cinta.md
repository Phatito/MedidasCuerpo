# Lectura de la cinta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los comentarios de Mesura parten de los perímetros con cinta (veredicto único, la cinta manda sobre la báscula) y los cambios de la cinta se ven claramente en la ficha.

**Architecture:** Una función de dominio pura `leerCinta` en `src/domain/cinta.ts` produce cambios por medida y un veredicto con contraste de báscula. `semana.ts` e `insights.ts` la consumen; la UI la muestra en un panel nuevo (`src/ui/Cinta.tsx`), en la figura (`Cuerpo.tsx`) y en "Tu semana".

**Tech Stack:** React + TS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-25-lectura-cinta-design.md`

## Global Constraints

- Todo cambio ≥ 0,1 cm cuenta (entra en el veredicto y se muestra); < 0,5 cm se marca "leve"; solo 0,0 es "sin cambio".
- Si cinta y báscula no coinciden, manda la cinta y se dice por qué (el % de la báscula varía con el agua del día).
- No cambia ningún número ya mostrado; no se borra ninguna función ni dato.
- UI en español; 44 px táctiles; contraste AA; sin scroll horizontal a 400 px; textos para lector de pantalla.
- Pruebas con números inventados.

## Review Focus

1. Mediciones con solo peso entre medidas de cinta: la base debe buscar la última medición *con ese perímetro*, no la medición anterior a secas.
2. Brazo/muslo por lados en una medición y sin lado en otra: comparar promedio de lados contra el valor sin lado.
3. Base "hace 4 semanas" sin medición tan antigua: usar la primera disponible y decir la fecha real.
4. Una sola medición con cinta: veredicto `faltan`, sin romper ficha ni "Tu semana".
5. Ruido de coma flotante (88.1 − 88.0 = 0.0999…): redondear a 0,1 antes de comparar con 0,1.

---

### Task 1: Dominio `leerCinta`

**Files:** Create `src/domain/cinta.ts`; Test `tests/domain/cinta.test.ts`

**Interfaces — Produces:**
```ts
export type BaseCinta = 'anterior' | '4semanas' | 'inicio'
export type Zona = 'cuello' | 'pecho' | 'cintura' | 'cadera' | 'brazo' | 'muslo'
export type Sentido = 'bien' | 'atencion' | 'neutro'
export interface CambioCinta { zona: Zona; campo: CampoNumerico; valor: number; desde: string; cambio: number; leve: boolean; sentido: Sentido; historia: { fecha: string; valor: number }[] }
export type Veredicto = 'pierde-musculo' | 'recomposicion' | 'pierde-grasa' | 'gana-grasa' | 'gana-musculo' | 'estable' | 'faltan'
export interface LecturaCinta { fecha: string; desde: string | null; base: BaseCinta; cambios: CambioCinta[]; veredicto: Veredicto; tono: Sentido; titulo: string; texto: string; contraste: { coincide: boolean; texto: string } | null; faltanMedidas: Zona[] }
export function leerCinta(p: Persona, ms: Medicion[], base?: BaseCinta): LecturaCinta | null  // null sin ninguna medición con perímetros
```
- Zonas brazo/muslo: promedio de Izq/Der si hay alguno, si no el campo sin lado; `campo` = el campo que abre la pantalla de la medida (el sin lado o `brazoDerCm`/`musloDerCm`… se usa el primero presente).
- Sentido: cuello/pecho/cintura/cadera bajan → bien, suben → atencion; brazo/muslo suben → bien salvo que la cintura suba (neutro), bajan → atencion si el peso bajó, si no neutro; 0 → neutro.
- Peso del tramo: `ultima.pesoKg − pesoKg de la medición base` (misma fecha que la base de cintura).
- Veredicto por prioridad del spec; "peso estable" = |Δpeso| ≤ 0,5 kg.
- Contraste: diferencia de kg de grasa entre las mismas dos fechas vía `derivar` (no estimada); coincide si signo de grasa concuerda con lo que dice la cinta (pierde-grasa/recomposicion → grasa ≤ 0; gana-grasa → grasa ≥ 0), null si no hay datos.

- [ ] Step 1: tests (fallan): `pierde grasa conserva musculo` (cintura 90→88,5, brazos 34→34, peso −1) → 'pierde-grasa', tono bien; `cambio minimo cuenta` (cintura 90→89,9) → cambio −0,1, leve true, veredicto 'pierde-grasa'; `pierde musculo` (brazo 35→34,6, peso −1,5) → 'pierde-musculo', tono atencion; `recomposicion` (peso igual, cintura −1, brazo +0,3); `gana grasa` (cintura +0,4); `estable` (todo igual); `faltan` (una sola medición con cinta); `salta mediciones sin cinta` (medio solo peso); `lados vs sin lado` (brazoCm 34 → izq 34,4/der 34,2 = +0,3); `base 4semanas e inicio`; `contraste no coincide` (cintura baja, grasaPct sube) → coincide false y texto menciona agua; `flotante` (88,1→88,0 = −0,1 leve).
- [ ] Step 2: `npx vitest run tests/domain/cinta.test.ts` → FAIL (módulo no existe).
- [ ] Step 3: implementar.
- [ ] Step 4: mismo comando → PASS.
- [ ] Step 5: commit `feat: lectura de la cinta`.

### Task 2: "Tu semana" y comentarios usan la cinta

**Files:** Modify `src/domain/semana.ts`, `src/domain/insights.ts`; Tests `tests/domain/semana.test.ts`, `tests/domain/insights.test.ts`

**Interfaces — Consumes:** `leerCinta(p, ms, 'anterior')`. **Produces:** `InformeSemanal.cinta: LecturaCinta | null`; `Codigo` gana `'cinta'`.

- `decidirAcciones`: veredicto `pierde-musculo` (y no atípica) → `proteger-musculo`; `gana-grasa` → acción `reduce` (texto con kcal si hay estimación, si no "Reduce un poco lo que comes: tu cintura subió.").
- `revisar('proteger-musculo')`: si la cinta tiene brazos/muslos, cumplida = ninguno bajó.
- `interpretar`: con ≥2 mediciones y veredicto ≠ `faltan`, el primer mensaje es `{codigo:'cinta', tono, titulo, texto + contraste}`; se mantienen los demás.
- [ ] Step 1: tests (fallan): semana `brazos bajan activa proteger musculo aunque la bascula no lo vea`; `cintura sube activa reduce`; `informe trae la lectura de la cinta`; insights `el primer mensaje es la lectura de la cinta`.
- [ ] Step 2: `npx vitest run tests/domain` → FAIL en esos.
- [ ] Step 3: implementar.
- [ ] Step 4: `npx vitest run` → PASS todo (ajustar tests previos solo si esperaban el orden viejo de mensajes; ledger cada ajuste).
- [ ] Step 5: commit.

### Task 3: Ver mejor los cambios (UI)

**Files:** Create `src/ui/Cinta.tsx`; Modify `src/ui/Ficha.tsx`, `src/ui/Cuerpo.tsx`, `src/ui/TuSemana.tsx`, `src/ui/styles.css`; Test `e2e/app.spec.ts`

- `PanelCinta({ persona, mediciones, onVerMedida })`: selector (radiogroup de 3 botones "Anterior · 4 semanas · Inicio", recordado en `localStorage` con try/catch), veredicto (título + texto + contraste), una fila-botón por zona: nombre, valor, muesca + cambio con color del sentido (leve = trazo más suave), mini línea SVG de `historia` con `aria-label`. Abre `onVerMedida(campo)`.
- `Cuerpo`: prop opcional `sentidos?: Partial<Record<CampoPerimetro, {cambio:number; sentido:Sentido; leve:boolean}>>`; el cambio en la figura usa ese valor y la clase `chg bien|atencion|neutro`, más grande. Ficha pasa los cambios de la base elegida.
- `TuSemana`: sección "Lo que dice la cinta" arriba de "Qué cambió" con veredicto, hasta 3 cambios mayores y contraste.
- [ ] Step 1: e2e (falla): `la ficha muestra lo que dice la cinta y compara con el inicio` — Ana con 3 mediciones con cintura bajando y brazos estables; ve "Pierdes grasa", fila Cintura con cambio, al elegir "Inicio" cambia el número; Tu semana muestra "Lo que dice la cinta"; sin scroll horizontal a 400 px.
- [ ] Step 2: correr ese test → FAIL.
- [ ] Step 3: implementar.
- [ ] Step 4: `npx tsc --noEmit -p . && npx vitest run && npx playwright test --trace off` → todo PASS.
- [ ] Step 5: commit, revisión visual con captura a 400 px, merge a main y verificación de Pages.
