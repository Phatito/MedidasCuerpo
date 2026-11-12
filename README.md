# MedidasCuerpo

Control semanal de peso, composición corporal y perímetros para ti y tu familia.
Registra las mediciones de cada persona y la app explica en lenguaje claro qué
significan los cambios (por ejemplo: mismo peso y menos cintura suele indicar
pérdida de grasa con músculo mantenido o ganado).

**App:** https://phatito.github.io/MedidasCuerpo/

## Instalarla en el computador

1. Abre la dirección de arriba en Chrome o Edge.
2. Haz clic en el ícono de instalar que aparece en la barra de direcciones
   (o menú ⋮ → "Instalar MedidasCuerpo").
3. Queda con ícono y ventana propia, y funciona sin conexión.

## Dónde están tus datos

Solo en el navegador del computador donde la usas. No hay cuentas ni servidor:
nada de lo que registras sale de tu equipo. Por lo mismo, si borras los datos
de navegación o cambias de computador, los datos se pierden salvo que tengas un
respaldo.

**Haz respaldos:** pestaña Datos → Descargar respaldo. Para recuperarlos, en la
misma pestaña elige el archivo en "Archivo de respaldo".

## Qué hace

- **Familia:** una tarjeta por persona, con aviso de a quién le toca medirse
  (7 días o más desde su última medición).
- **Ficha:** la figura del cuerpo de la persona con cada perímetro sobre su
  zona y su cambio reciente, más sus números principales, la tendencia del
  peso y la interpretación más importante.
- **Medir:** peso (obligatorio) y, opcionalmente, % de grasa, masa muscular,
  grasa visceral, % de agua y perímetros.
- **Evolución:** gráfico por métrica con promedio de las últimas 4 mediciones e
  interpretación de los cambios.
- **Historial:** tabla de mediciones, con edición y eliminación.
- **Datos:** importar y exportar CSV, respaldo, y recordatorio semanal como
  evento de calendario.

Las interpretaciones son orientación general, no diagnóstico médico. El % de
grasa y la grasa visceral de las básculas domésticas son estimaciones: lo que
importa es la tendencia.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # pruebas unitarias
npm run e2e      # pruebas de extremo a extremo (compila y usa vite preview)
npm run build    # compilación de producción en dist/
```

Cada push a `main` se publica en GitHub Pages mediante GitHub Actions. En el
repositorio, Settings → Pages → Source debe estar en **GitHub Actions**.

El diseño y el plan están en `docs/superpowers/`.
