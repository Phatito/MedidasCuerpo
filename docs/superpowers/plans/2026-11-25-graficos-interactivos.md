# Gráficos interactivos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la pantalla de medida por un panel de peso segmentado con gráfico que se recorre, y un explorador del cuerpo para los perímetros.

**Architecture:** `PantallaMedida` decide: perímetro → `ExplorarCuerpo`; si no → `PanelPeso`. Ambos usan `GraficoVivo` (SVG propio). `Cuerpo` gana zonas tocables (`seleccionada`, `onElegir`). `Periodo` gana `'1m'`.

**Tech Stack:** React + TS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-25-graficos-interactivos-design.md`

## Global Constraints

- Sin `<select>` para navegar medidas; rutas `#/p/<id>/m/<medida>` intactas; nada de lo de hoy se pierde.
- 44 px, AA, 400 px sin scroll horizontal, `prefers-reduced-motion`.

## Review Focus

1. Una sola medición: el gráfico muestra un punto, sin dividir por cero.
2. Recorrer con teclado y con el dedo en pantallas angostas.
3. Zona sin historia (solo una medida) en el explorador.
4. Periodo sin datos cae a "Todo".
5. Medida derivada sin datos (IMC sin estatura) no aparece como tarjeta.

---

### Task 1: `GraficoVivo` y periodo de 1 mes
**Files:** Create `src/ui/GraficoVivo.tsx`; Modify `src/domain/series.ts`; Tests `tests/domain/series.test.ts`.
- [ ] Test `1m` filtra 31 días → FAIL → implementar → PASS.
- [ ] `GraficoVivo({ puntos, unidad, tendencia?, meta?, etiqueta })`: escalas, área con degradado, línea, puntos, tendencia, meta; `onPointerDown/Move` elige el punto más cercano; teclado ← →; globo; aria-live.

### Task 2: Panel de peso
**Files:** Create `src/ui/PanelPeso.tsx`; Modify `src/ui/Medida.tsx`, `styles.css`.
- Tarjetas-segmento con mini curva; composición (barras de `informeSemanal(...).barras`); conserva tarjeta, IMC, meta, consumo, mensajes, guía, notas.

### Task 3: Explorador del cuerpo
**Files:** Create `src/ui/ExplorarCuerpo.tsx`; Modify `src/ui/Cuerpo.tsx`, `Medida.tsx`, `styles.css`.
- Zonas tocables en `Cuerpo`; panel de zona con valor, cambios, `GraficoVivo`, lista de valores; flechas ‹ ›.

### Task 4: Pruebas y publicación
- [ ] e2e: `tocar una zona del cuerpo muestra su historia`; `el panel de peso cambia de medida tocando una tarjeta y se recorre con el teclado`; actualizar `elegirMetrica` y pruebas que usaban el desplegable.
- [ ] Capturas a 400 px; suites completas; commit; merge a main; Pages.
