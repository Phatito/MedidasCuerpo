# Ficha compacta — Diseño

Fecha: 2026-11-23 · El usuario eligió el contenido de la pantalla principal y delegó el resto ("Hace lo que estimes").

## Por qué
En el teléfono la ficha mide ~5,6 pantallas (4.500 px a 400 px de ancho) y repite datos: el cambio de peso 3 veces, IMC 3, grasa 3, la meta en una etiqueta y dos frases, 12 tarjetas y 6 mensajes largos seguidos. El usuario quiere abrir la app y ver de un vistazo lo importante, bonito, y abrir el detalle solo cuando lo pida.

## Qué pidió el usuario
- En la principal: peso de tendencia y cuánto cambió; cuadritos de grasa, cintura y grasa visceral; la figura de la persona con sus medidas.
- Tocar un cuadrito lleva al gráfico de esa medida con su tendencia (grasa → gráfico de grasa; músculo esquelético → su gráfico).

## Enfoques
- **A. Pantalla aparte por medida (elegido por el constructor, delegado).** `#/p/<id>/m/<medida>` con "← Volver". Todo el ancho para el gráfico, el Atrás del teléfono funciona, cada gráfico tiene enlace.
- B. Hoja inferior sobre la ficha: gráfico más chico y Atrás más frágil.
- C. Pestañas en la ficha: no cumple "tocar el cuadrito lleva a su gráfico".

## Diseño
**Ficha (principal)**, en este orden:
1. Encabezado compacto: nombre (h2) y "objetivo · última medición dd/mm" en una línea.
2. Peso de tendencia grande + cambio desde la medición anterior; todo el bloque se toca → pantalla de Peso.
3. Línea "Tu semana": la primera acción del informe (o "Con tu segunda medición…") → pantalla Tu semana.
4. Hasta 4 cuadritos tocables: grasa %, músculo esquelético, cintura, grasa visceral; si falta alguno, se completa con IMC, agua, grasa (kg), peso sin grasa, en ese orden. Cada uno: nombre, valor, estado en color (si tiene) y cambio corto.
5. Figura con perímetros y asimetrías (como hoy).
6. Enlaces "Todas las cifras ›" y "Todas las mediciones ›", y **+ Registrar medición**.
Sin mediciones: invitación a registrar la primera, como hoy.

**Pantalla de una medida** (`#/p/<id>/m/<medida>`): valor actual con barra de estado y referencia; cambio desde la anterior; gráfico con tendencia (en peso) y 3 meses / 1 año / Todo; los mensajes de "Qué indican tus cambios" que corresponden a esa medida; notas (estimada por perímetros, cómo leer el estado). En Peso, además: IMC, meta con fecha estimada y el consumo de kcal editable.

**Todas las cifras** (`#/p/<id>/cifras`): todas las tarjetas actuales (cada una tocable → su pantalla), "Cómo leer estas cifras" y todos los mensajes de "Qué indican tus cambios".

**Tu semana**: sin cambios en su pantalla; la tarjeta grande deja la ficha.

## Restricciones
- No se pierde ninguna función ni dato: todo sigue accesible a uno o dos toques.
- Atrás del navegador y "← Volver" funcionan en las pantallas nuevas; direcciones existentes siguen válidas.
- Accesible: cuadritos como botones con nombre completo, objetivos de 44 px, foco al título al cambiar de pantalla.
- A 400 px, la ficha cabe en ~2 pantallas y nada desborda.

## Queda al constructor
Textos exactos, estilos, qué mensaje va a qué medida (peso recibe los de ritmo/tendencia/desde el inicio; grasa los de grasa; músculo los de músculo; cintura y visceral sus alertas; IMC el suyo).
