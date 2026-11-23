# Ficha compacta — Plan

**Spec:** `docs/superpowers/specs/2026-11-23-ficha-compacta-design.md`

### Task 1: dominio
- `src/domain/rutas.ts`: `{ pantalla: 'medida'; personaId; medida: Metrica | 'pesoKg' }` ↔ `#/p/<id>/m/<medida>` (medida inválida → ficha) y `{ pantalla: 'cifras'; personaId }` ↔ `#/p/<id>/cifras`; pruebas de ida y vuelta.
- `src/domain/cifras.ts`: `cuadritos(p, ms, hoy): Cuadrito[]` (máx. 4, prioridad del spec, con valor, unidad, cambio y estado) y `mensajesDe(medida, mensajes)`; pruebas: orden y relleno, cintura con cambio, mapeo de mensajes.

### Task 2: pantallas
- Ficha compacta; `PantallaMedida`; `TodasLasCifras`; rutas en App; estilos; README.
- e2e: tocar Grasa abre su gráfico y Volver regresa; Todas las cifras lista tarjetas y abre una; la ficha a 400 px mide ≤ 2,2 pantallas y sin desplazamiento horizontal; actualizar las pruebas existentes que buscaban el gráfico, tarjetas, mensajes, meta o consumo en la ficha.
