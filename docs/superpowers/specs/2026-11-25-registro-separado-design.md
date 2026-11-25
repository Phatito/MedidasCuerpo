# Registro separado: báscula y medidas con cinta — diseño

## Por qué

Hoy "Registrar → Escribir" pide báscula y perímetros en un mismo formulario largo. El dueño casi siempre carga la báscula con la captura de Xiaomi Home; si no hay captura, solo tiene el peso de una báscula básica. Las medidas con cinta son otro momento: de pie, con la cinta en la mano, una zona tras otra. Quiere que la app lo acompañe paso a paso, mostrando con el maniquí cómo medir cada zona, y que sea muy bonito y llamativo.

## Objetivos

- Dos entradas separadas en Registrar: **Báscula** y **Medidas con cinta**.
- Báscula: la captura es lo principal; a mano, solo el peso (lo demás de la báscula queda plegado, sin perderse).
- Medidas con cinta: un paso por medida, con una animación del maniquí que muestra cómo poner la cinta en esa zona.
- Las medidas se guardan **aunque ese día no haya peso** (elegido por el dueño: opción A). Si ese día hay o habrá pesada, todo queda en una sola medición.

## No objetivos y anti-objetivos

- No se borra ninguna función ni dato: el formulario completo sigue existiendo para **editar** una medición desde "Todas las mediciones".
- Nada de videos externos ni dependencias nuevas de animación (elegido: animación hecha en la app, opción 1).
- Fracaso aunque "funcione": que una medición sin peso rompa la ficha, "Tu semana", los gráficos, el CSV, el respaldo o la sincronización; o que la animación se vea pobre o tironeada en el teléfono.

## Enfoques considerados (animación)

1. **Animación SVG/CSS en la app (elegido por el dueño).** El maniquí del molde se acerca a la zona, la cinta da la vuelta y se ajusta. Liviana, sin conexión, nítida, fácil de afinar.
2. Videos pregrabados por zona: más cinematográficos, pero pesados, peores en pantallas grandes, difíciles de cambiar y sin conexión no cargan.
3. Lottie u otra librería: dependencia nueva y una herramienta de diseño aparte; descartado.

## Diseño

### 1. Peso opcional en el modelo

- `Medicion.pesoKg` pasa a opcional. Una medición válida tiene peso **o** al menos un perímetro.
- Todo lo que usa peso trabaja solo con las mediciones que lo tienen: tendencia de peso, ritmo, gasto, "Tu semana" (pesadas, composición de báscula, atípica), metas, IMC, masa grasa/magra (null sin peso), gráficos de peso y cifras.
- La ficha: el peso de tendencia sale de la última pesada; la figura y la lectura de la cinta, de la última medición con perímetros (ya es así).
- Historial: la celda de peso vacía muestra "—".
- CSV: exportar deja el peso vacío; importar acepta filas sin peso si traen algún perímetro. Respaldo y sincronización aceptan mediciones sin peso.
- **Unir por día:** guardar báscula o cinta en una fecha que ya tiene medición **completa los campos** de esa medición en vez de reemplazarla (lo nuevo pisa solo los campos que trae). Así el peso de la mañana y la cinta de la tarde son una sola medición.

### 2. Registrar

```
Registrar · Ana
┌───────────────────────┐ ┌───────────────────────┐
│  Báscula              │ │  Medidas con cinta    │
│  captura o solo peso  │ │  paso a paso          │
└───────────────────────┘ └───────────────────────┘
```

- **Báscula:** pestañas Captura (primera y por defecto) · Solo peso · Archivo. "Solo peso" = fecha + peso; debajo, plegado, "Más de la báscula" con grasa, músculo, agua, visceral y el resto (para no perder la función). Una captura leída sigue llevando a revisar y guardar, como hoy, pero solo con campos de báscula.
- **Medidas con cinta:** abre el paso a paso.
- **Editar** una medición existente (desde Historial) abre el formulario completo de hoy, sin cambios.

### 3. Paso a paso de la cinta

- Inicio: fecha (hoy por defecto) y un botón grande "Empezar". Si ya hay medidas ese día, se cargan para corregirlas.
- Orden (de arriba a abajo, para no ir y volver): cuello, pecho, brazo derecho, brazo izquierdo, cintura, cadera, muslo derecho, muslo izquierdo. Siempre por lado (las medidas sin lado ya no se piden).
- Cada paso:
  - Progreso "3 de 8" con puntos; los hechos quedan marcados, los saltados huecos.
  - La animación del maniquí para esa zona (ver abajo).
  - Nombre de la zona y el consejo de cómo medir (los textos de la guía actual).
  - Campo numérico grande con teclado decimal y foco automático, "La vez pasada: 88,5 cm" y, al escribir, el cambio en vivo con el color de su sentido (hasta 0,1 cm cuenta).
  - Botones: Atrás · Saltar · Siguiente (Enter también avanza). Valores fuera de rango se avisan en el paso (mismos rangos de validación de hoy).
- Final: resumen con las 8 zonas (valor y cambio, o "saltada"), cada una toca para volver a ese paso; "Guardar medidas". Al guardar, se une a la medición del día y se vuelve a la ficha con "Medidas guardadas".
- Si se sale a la mitad, lo escrito se guarda como borrador en el navegador y se ofrece continuar (decisión de Claude).
- Mujer u hombre: la silueta es la de la persona.

### 4. La animación

Hecha con el SVG del maniquí que ya existe (la pieza de molde de `Cuerpo.tsx`, en un módulo compartido):

1. **Acercamiento:** el maniquí completo se acerca suavemente a la zona (transición del `viewBox`/escala, ~600 ms, con aceleración natural).
2. **La cinta:** una cinta métrica con marcas aparece a un costado, da la vuelta a la zona —la mitad trasera punteada y por detrás del cuerpo, la delantera sólida— y se ajusta con un pequeño rebote (~1,2 s).
3. **El número:** en la cinta, la lectura corre hasta la medida de la vez pasada (o queda en blanco si es la primera).
4. **Pulso:** la zona brilla suave en el color de costura mientras se escribe; al pasar de paso, la marca queda fija como "hecho" y el maniquí se aleja y vuelve a acercarse a la siguiente zona.
- Brazos y muslos: el lado que se mide se resalta y el otro queda atenuado.
- Con "reducir movimiento" en el teléfono: el cuadro final quieto, sin acercamiento ni vuelta.
- Paleta del molde (tiza sobre paño, costura celeste); nada fuera de los tokens actuales.
- Fluida en un teléfono medio: solo `transform`, `opacity` y `stroke-dashoffset`.

## Restricciones

- Español; foco al título en cada paso; 44 px táctiles; contraste AA; sin scroll horizontal a 400 px; el SVG animado tiene descripción de texto ("Cómo medir la cintura: …").
- Rutas con hash y el botón Atrás del navegador siguen funcionando (cada paso puede ser parte de la ruta o el Atrás cierra el paso a paso; decisión de quien construya, sin romper el Atrás).
- Pruebas con números inventados.

## Queda a criterio de quien construya

Duraciones exactas y curvas de la animación, forma de la cinta y de las marcas, textos exactos de botones y avisos, y cómo se guarda el borrador.
