# Gráficos interactivos — diseño (aprobado por el dueño)

## Por qué

La pantalla de cada medida usa un desplegable ("Más…") y un gráfico de línea igual para todo: poco intuitiva y fea, dice el dueño. Pide: para las medidas, la persona en pantalla y tocar una parte del cuerpo para ver sus valores antiguos; para el peso, un gráfico aparte, más segmentado y mucho más bonito. Control total de Claude, interactivo y atractivo.

## Objetivos

- Ninguna lista desplegable para navegar entre medidas.
- **Medidas con cinta → explorador del cuerpo:** figura grande; cada zona se toca; un panel muestra su historia.
- **Peso y báscula → panel de peso:** gráfico grande que se recorre con el dedo, tarjetas segmentadas que se agrandan al tocarlas, composición en barras.
- No se pierde nada de hoy: tarjeta con estado, IMC, meta, consumo, "Qué indica", guía de estados, aviso de valores estimados, periodos, rutas `#/p/<id>/m/<medida>`.

## Enfoques

1. **SVG propio, sin librerías (elegido):** liviano, sin conexión, del estilo del molde, control fino de la animación y del toque.
2. Librería de gráficos (Recharts, Chart.js): más rápido de montar, pero pesa, se ve genérica y cuesta adaptarla al molde.

## Diseño

### Gráfico vivo (`GraficoVivo`)

- Área con degradado bajo la línea, puntos por medición, línea de tendencia para el peso, línea de meta punteada si hay meta.
- La línea se dibuja al aparecer y al cambiar de periodo o medida (stroke-dashoffset); quieto con "reducir movimiento".
- **Recorrer:** tocar o arrastrar sobre el gráfico elige el punto más cercano: guía vertical, punto resaltado y globo con fecha y valor (y cambio frente al anterior). Con teclado: el gráfico es enfocable y las flechas mueven el punto. El punto elegido se anuncia (aria-live).
- Periodos en pastillas: 1M · 3M · 1A · Todo (se agrega `1m` = 31 días).

### Panel de peso (medidas de báscula y derivadas)

- Encabezado: nombre y valor grande (la tarjeta de hoy, con su estado).
- Gráfico vivo de la medida elegida.
- **Segmentos:** fila de tarjetas tocables con mini curva: Peso, Grasa, Músculo, Agua, Visceral y las demás con datos (IMC, masa grasa, masa magra, y lo extra de la báscula). La elegida queda resaltada; tocar otra cambia el gráfico ahí mismo (reemplaza la ruta como hoy).
- **Composición:** barras apiladas grasa / masa magra por pesada (las de "Tu semana"), en Peso, Grasa y masas.
- Debajo, lo de hoy: IMC, meta, consumo (en Peso), "Qué indica", guía, notas.

### Explorador del cuerpo (perímetros)

- Figura grande (la de la ficha, con sus cambios en color); cada zona tiene un área de toque ≥ 44 px y es un botón accesible; la zona elegida brilla.
- Panel de la zona: nombre, valor actual grande, cambio frente a la anterior y frente al inicio (con su sentido), el gráfico vivo de su historia y la lista de valores anteriores (fecha, valor, cambio).
- Flechas ‹ › para pasar a la zona vecina; también "Qué indica" (la lectura de la cinta).

## Restricciones

Español, 44 px, AA, sin scroll horizontal a 400 px, foco y lector de pantalla, paleta del molde, solo transform/opacity/dashoffset en animaciones.

## A criterio de quien construya

Tamaños, curvas, orden exacto de las tarjetas, textos de globos.
