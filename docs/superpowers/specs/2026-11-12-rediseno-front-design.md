# Rediseño del front de MedidasCuerpo — Diseño

Fecha: 2026-11-12

## Propósito

La interfaz actual no gustó. Se rehace por completo el aspecto de la app para
que se vea cuidada como las aplicaciones conocidas de seguimiento corporal, y se
agrega una ficha por persona con una figura del cuerpo que muestra cada medida
sobre su zona. Éxito: quien abre la ficha de un familiar ve de un vistazo su
cuerpo, sus números principales, hacia dónde van y qué significan.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Estilo | Composición de la maqueta A (tarjetas, líneas guía, aire) con los colores de la maqueta B |
| Tema | Un solo aspecto oscuro en toda la app |
| Funciones | Se conservan todas; se puede agregar, no quitar |
| Lógica y datos | `src/domain/` existente y `src/storage/` no cambian; los datos guardados siguen sirviendo |
| Referencia visual | https://claude.ai/artifact/WbmqGwrdVPYLVXGWWUP9u1 (sección "Elegida") |

## Fuera de alcance

- Tema claro o selector de tema.
- Figura en 3D, fotos de progreso o avatar que cambie de forma con las medidas.
- Cambios en cálculos, reglas de interpretación, importación o respaldo.

## Estilo

Colores (variables CSS en `:root`):

| Variable | Valor | Uso |
|---|---|---|
| `--bg` | `#0e1220` | fondo de la app |
| `--card` | `#171c30` | tarjetas |
| `--edge` | `#262d48` | bordes |
| `--soft` | `#232a45` | rellenos suaves, pistas |
| `--fg` | `#f2f4fb` | texto |
| `--dim` | `#8f97b3` | texto secundario |
| `--accent` | `#7c5cff` | acciones, pestaña activa, línea del gráfico |
| `--on-accent` | `#ffffff` | texto sobre `--accent` |
| `--cyan` | `#35e3ff` | bandas y puntos de medida sobre la figura |
| `--good` / `--good-bg` | `#3fe0a5` / `#14352e` | cambio favorable |
| `--warn` / `--warn-bg` | `#ffb454` / `#3a2c12` | atención |
| `--bad` | `#ff7b7b` | errores y acciones destructivas |

- Tipografía: Plus Jakarta Sans, empaquetada con la app (`@fontsource-variable/plus-jakarta-sans`)
  para que funcione sin conexión; respaldo `system-ui, sans-serif`.
- Tarjetas con radio de 16 px y borde `--edge`; botones y pestañas en píldora.
- Cifras con `tabular-nums`; números principales de 1,5 rem o más y peso 800.
- El estado nunca depende solo del color: lleva texto o símbolo (▲ ▼, "Elevada", "le toca").
- `color-scheme: dark`, `theme-color` y `background_color` del manifiesto en `#0e1220`.

## Navegación

- Barra superior: marca y pestañas **Familia, Ficha, Medir, Evolución, Historial, Datos**.
  Ficha, Medir, Evolución e Historial requieren una persona.
- Bajo la barra, una **fila de personas** visible en todas las pantallas: un botón
  por persona con su inicial y nombre; la persona activa va resaltada y quien tenga
  medición pendiente lleva el texto "le toca". Reemplaza al selector desplegable.
- Elegir a una persona desde Familia o Datos abre su Ficha; desde las demás
  pantallas cambia de persona sin cambiar de pantalla.

## Pantalla nueva: Ficha

Dos columnas en computador, una en teléfono.

**Columna de la figura**
- Nombre, estatura, objetivo y fecha de la última medición.
- Figura del cuerpo de frente: silueta de hombre o de mujer según el sexo de la persona.
- Sobre la figura, por cada perímetro presente en la última medición (cuello, pecho,
  brazo, cintura, cadera, muslo): una banda cian en su zona, una línea guía y, al
  costado, el nombre, el valor en cm y el cambio frente a la medición anterior que
  tenga ese perímetro (▲ / ▼ con un decimal; nada si no hay anterior o no cambió).
- Un perímetro ausente no se dibuja. Sin ningún perímetro, la figura se muestra sola
  con el texto "Registra perímetros para verlos sobre la figura."

**Columna de datos**
- Tarjetas: Peso, Grasa corporal (con "estimada" si viene de la fórmula), Masa
  muscular y Grasa visceral; solo las que tengan dato. Cada una con su valor y el
  cambio desde la primera medición que tenga ese dato ("▼ 2,5 kg desde el 09/09/2026").
- Tono del cambio: grasa que baja y músculo que sube son favorables; lo contrario,
  atención. El peso solo se colorea si el objetivo es bajar grasa (bajar es
  favorable). Grasa visceral de 10 o más muestra "Elevada" en atención. En menores
  de edad ningún cambio se colorea.
- Tendencia del peso: gráfico pequeño de las últimas 10 mediciones.
- Interpretación principal: el primer mensaje de `interpretar`, con enlace "Ver todo en Evolución".
- Botón "Registrar medición de esta semana", que abre Medir.

Sin mediciones, la Ficha muestra la figura sola y una invitación a registrar la primera.

## Resto de las pantallas

Conservan todas sus funciones y textos de acción; cambian de aspecto:

- **Familia**: tarjetas con inicial en círculo, último peso grande, estado y acciones
  "Ver ficha", "Registrar medición", "Editar", "Eliminar".
- **Medir**: mismos campos, agrupados en tarjetas con el nuevo estilo.
- **Evolución**: gráfico con relleno suave bajo la línea y último punto destacado;
  interpretaciones en tarjetas con el rótulo de tono.
- **Historial** y **Datos**: mismo contenido con el nuevo estilo.

## Arquitectura

- `src/domain/ficha.ts` (nuevo, puro): arma los datos de la Ficha a partir de la
  persona y sus mediciones.
- `src/ui/Cuerpo.tsx` (nuevo): dibuja la figura SVG y las medidas; no calcula nada.
- `src/ui/Ficha.tsx` (nuevo): la pantalla.
- `src/ui/PersonasBar.tsx` (nuevo): la fila de personas.
- `src/ui/styles.css`: se reescribe con los colores y componentes de esta spec.
- `src/ui/App.tsx`, `Familia.tsx`, `Grafico.tsx` y demás pantallas: ajustes de marcado y clases.

## Errores y casos límite

- Persona sin mediciones, con una sola, o sin perímetros: la Ficha no muestra
  cambios ni textos vacíos; nunca "NaN" ni "undefined".
- Nombres largos en la fila de personas se recortan con puntos suspensivos; la
  fila salta de línea en pantallas angostas.
- Con muchas personas (10 o más) la fila sigue siendo usable.
- A 400 px de ancho la página no se desplaza de lado; la figura se achica entera.

## Pruebas

- Unitarias de `ficha.ts`, escritas antes del código.
- De extremo a extremo: figura según el sexo, perímetros dibujados y omitidos,
  cambio frente a la medición anterior, fila de personas con "le toca", navegación
  a la Ficha. Las 17 pruebas existentes siguen pasando, ajustando solo los
  selectores que el nuevo marcado obligue a cambiar.
- Capturas de todas las pantallas a 1200 y 400 px antes de publicar.
