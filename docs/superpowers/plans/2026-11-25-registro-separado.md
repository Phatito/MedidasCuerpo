# Registro separado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar separa báscula (captura o solo peso) de las medidas con cinta, que se toman en un paso a paso animado con el maniquí; las medidas se guardan sin peso.

**Architecture:** `pesoKg` pasa a opcional; el dominio usa `conPeso(ms)` donde necesita peso. Guardar une por día (`fusionarMedicion`). `Medir` gana `modo: 'bascula' | 'completo'`; la ruta con `?fecha=` (editar) usa el completo. Nueva ruta `#/p/<id>/cinta` con `MedirCinta` y la animación en `Maniqui.tsx` (silueta compartida con `Cuerpo.tsx`).

**Tech Stack:** React + TS, Dexie, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-25-registro-separado-design.md`

## Global Constraints

- No se borra ninguna función ni dato; IDs internos y URL `/MedidasCuerpo/` intactos.
- Una medición válida tiene peso o al menos un perímetro.
- Guardar en una fecha existente completa campos, no reemplaza.
- Orden del paso a paso: cuelloCm, pechoCm, brazoDerCm, brazoIzqCm, cinturaCm, caderaCm, musloDerCm, musloIzqCm.
- Animación solo con transform/opacity/stroke-dashoffset; `prefers-reduced-motion` → cuadro quieto.
- Español; 44 px; AA; sin scroll horizontal a 400 px; foco al título en cada paso; Atrás del navegador funciona.

## Review Focus

1. Medición solo-cinta como última: ficha (peso de tendencia de la última pesada), "Tu semana", Familia (peso del último), Historial ("—").
2. Persona con solo mediciones de cinta (ninguna pesada): nada lanza excepción.
3. CSV: exportar con peso vacío y volver a importar la misma fila.
4. Respaldo/sync con una medición sin peso: se restaura y sincroniza.
5. Capturar báscula después de guardar cinta el mismo día: los perímetros sobreviven.

---

### Task 1: Peso opcional y unir por día (dominio + almacenamiento)

**Files:** Modify `src/domain/types.ts`, `validation.ts`, `metrics.ts`, `trend`-consumers (`energia.ts`, `ficha.ts`, `semana.ts`, `insights.ts`, `cinta.ts`, `cifras.ts`, `series.ts`, `csv.ts`), `src/storage/backup.ts`, `src/storage/db.ts`; UI read sites `Ficha.tsx`, `Historial.tsx`, `Familia.tsx`, `Medir.tsx`. Tests: `tests/domain/sinpeso.test.ts`, csv/backup tests.

**Produces:** `pesoKg?: number`; `tienePeso(m): m is Medicion & {pesoKg:number}`; `conPeso(ms)`; `fusionarMedicion(previa: Medicion | undefined, nueva: Medicion): Medicion` (campos definidos de `nueva` pisan; `origen` de la nueva); `guardarMedicion` usa la fusión cuando se le pide `{ unir: true }`.

- [ ] Tests (fallan): `una medición solo de cinta no rompe ficha, semana ni comentarios` (resumenFicha/informeSemanal/interpretar con [pesada, solo-cinta] → peso de tendencia de la pesada, cinta leída); `persona sin pesadas` (solo cinta → sin excepción, tarjeta de peso ausente); `fusionar une campos`; `validar acepta perímetro sin peso y rechaza vacía`; csv `exporta e importa fila sin peso`; backup `acepta medición sin peso`.
- [ ] Implementar guiado por `tsc`; correr `npx vitest run` → todo PASS.
- [ ] Commit.

### Task 2: Registrar separado (Báscula / Medidas con cinta)

**Files:** Modify `src/ui/Registrar.tsx`, `src/ui/Medir.tsx`, `src/ui/App.tsx`, `src/domain/rutas.ts`; Tests `tests/domain/rutas.test.ts`, `e2e/app.spec.ts`.

- Registrar sin `fecha`: dos tarjetas grandes "Báscula" / "Medidas con cinta". Báscula → pestañas Captura (defecto) · Solo peso · Archivo; Solo peso = `Medir modo="bascula"` (fecha, peso, "Más de la báscula" plegado; sin perímetros), guarda con `unir`. Con `fecha` (editar): título "Editar medición", `Medir modo="completo"` como hoy.
- Ruta nueva `{ pantalla: 'cinta'; personaId; fecha? }` ↔ `#/p/<id>/cinta[?fecha=]`.
- Ficha (pedido del dueño): en el bloque de peso, el **último peso tomado** (con su fecha) al lado del peso de tendencia.
- [ ] Tests: rutas ida y vuelta de `cinta`; e2e `la ficha muestra el último peso junto al de tendencia`; e2e `registrar báscula pide solo el peso` (no hay campo Cintura), `editar una medición abre el formulario completo`; actualizar helpers e2e (`medir` usa la ruta de edición por fecha) y pruebas de captura (pestaña "Solo peso").
- [ ] Implementar; `npx playwright test` de los tocados → PASS. Commit.

### Task 3: Paso a paso de la cinta con el maniquí animado

**Files:** Create `src/ui/Maniqui.tsx` (silueta + `contorno` movidos desde `Cuerpo.tsx`, animación por zona), `src/ui/MedirCinta.tsx`, estilos en `styles.css`; Modify `Cuerpo.tsx`, `App.tsx`; Test `e2e/app.spec.ts`.

- `MedirCinta({persona, fecha?, onListo})`: inicio (fecha + Empezar; carga medidas existentes de ese día), 8 pasos (progreso, `<Maniqui sexo zona/>`, consejo, input decimal con "La vez pasada" y cambio en vivo con `sentidoCambio`, Atrás/Saltar/Siguiente, Enter avanza, validación de rango), resumen (toca para volver), Guardar → `guardarMedicion(fusion)` → `onListo('Medidas guardadas.')`. Borrador en `localStorage` (try/catch) por persona.
- `Maniqui({sexo, zona, lado?})`: SVG con grupo de cámara que hace zoom a la zona (CSS transform transition), cinta = elipse dividida (trasera punteada detrás de la pieza, delantera con marcas encima) animada con `stroke-dashoffset` + rebote; lado medido resaltado; `aria-label` "Cómo medir …".
- [ ] e2e (falla): `medidas con cinta paso a paso sin pesarse` — sin pesada ese día: Empezar, escribir cuello, Saltar pecho, … cintura 88,4, Guardar; ficha muestra la cintura; historial muestra "—" en peso; Atrás vuelve un paso; 400 px sin scroll horizontal.
- [ ] Implementar; capturas a 400 px para revisar lo visual; suite completa PASS; commit; merge a main; verificar Pages.
