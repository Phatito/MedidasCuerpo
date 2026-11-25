# Lectura de la cinta — diseño

## Por qué

Las medidas con cinta (perímetros) dicen mejor que la báscula cómo va la composición corporal. Hoy los comentarios casi no las usan: "Tu semana" mira solo la báscula y la ficha solo la cintura. En la figura, el cambio se ve como un número chico contra la medición anterior, y cuesta ver hacia dónde va el cuerpo.

## Objetivos

- Los comentarios (ficha y "Tu semana") parten de la cinta y comparan con la báscula.
- Si la cinta y la báscula no coinciden, **manda la cinta** (lo eligió el dueño) y se dice por qué.
- Los cambios de la cinta se ven de un vistazo: cuánto, hacia dónde y si es bueno.

## No objetivos

- No cambia ningún número que ya se muestra (el % de grasa de la báscula sigue igual).
- No se borra ninguna función ni dato.

## Enfoques considerados

1. Comentarios sueltos por medida: rápido, pero mira cada medida aislada y la ficha y "Tu semana" pueden contradecirse.
2. **Una lectura central de la cinta (elegido, el dueño dejó la decisión a Claude):** una función lee todas las medidas juntas y da un veredicto que usan la ficha y "Tu semana".
3. Además, el % de grasa de la cinta (fórmula de la Marina) por delante del de la báscula: queda para más adelante; cambia números conocidos y tiene ±3 % de error absoluto.

## Diseño

### Dominio: `src/domain/cinta.ts`

`leerCinta(persona, mediciones, desde?)` compara la última medición con perímetros contra una base (la anterior, hace ~4 semanas o la primera) y devuelve:

- `cambios`: por medida, valor, diferencia en cm y si es relevante (|Δ| ≥ 0,5 cm; menos se trata como "sin cambio", puede ser cómo se tomó la medida). Brazos y muslos usan el promedio de los lados cuando hay los dos.
- `veredicto`, en este orden de prioridad:
  - `pierde-musculo`: brazos o muslos bajan (≥ 0,5 cm) mientras el peso baja → atención.
  - `recomposicion`: el peso se mantiene (±0,5 kg), la cintura baja y brazos o muslos no bajan.
  - `pierde-grasa`: cintura o cadera bajan y brazos y muslos se mantienen o suben.
  - `gana-grasa`: la cintura sube.
  - `gana-musculo`: brazos o muslos suben y la cintura no sube.
  - `estable`: nada relevante cambió.
  - `faltan`: no hay dos mediciones con cintura.
- `contraste`: lo que dice la báscula en el mismo tramo (kg de grasa y de masa magra) y si **coincide** o **no coincide** con la cinta. Si no coincide, el texto explica que el % de la báscula varía con el agua del día y que la cinta manda.
- `faltanMedidas`: qué medidas conviene tomar la próxima vez para leer mejor (por ejemplo, brazos y muslos para saber si se conserva músculo).

Cada veredicto trae un título, un texto y una acción (o ninguna). Ejemplo: `pierde-musculo` → "Sube la proteína y entrena fuerza 2–3 veces por semana".

### "Tu semana"

- Nueva sección **"Lo que dice la cinta"**, arriba de la composición de la báscula: veredicto, los 2–3 cambios que más pesan y el contraste con la báscula.
- Las acciones toman en cuenta la cinta: `pierde-musculo` activa la acción de proteger músculo aunque la báscula no lo vea; `gana-grasa` activa "reduce un poco". Siguen siendo como máximo 2.
- La revisión de la semana pasada también mira la cinta (por ejemplo, "tus brazos ya no bajan").

### Ficha

- Los mensajes de cintura de hoy pasan a usar el veredicto de la cinta (se mantienen la alerta de cintura/estatura y el IMC).

### Ver mejor los cambios (figura y panel de la cinta)

- Bajo la figura, un selector **"Comparar con: anterior · hace 4 semanas · inicio"**.
- En la figura, el cambio de cada medida se ve más grande y con color según lo que significa: favorable (cintura, cadera, pecho o cuello bajan; brazos o muslos suben sin que suba la cintura), atención (lo contrario, o brazos y muslos que bajan con el peso) o neutro (menos de 0,5 cm).
- Nuevo panel **"Cinta"**: una fila por medida con el valor actual, el cambio en cm, el color de su significado y una mini línea con su historia. La fila abre la pantalla de esa medida, que ya existe.

```
Lo que dice la cinta · vs hace 4 semanas
Pierdes grasa y conservas músculo
  Cintura   88,0 cm  ▼ 2,5   ╲__
  Cadera   101,5 cm  ▼ 1,0   ─╲_
  Brazos    34,0 cm  = 0,0   ───
La báscula coincide: −1,8 kg de grasa, masa magra estable.
```

## Restricciones

- Español, foco tras cambio de pantalla, objetivos táctiles de 44 px, contraste AA, sin scroll horizontal a 400 px, descripciones de texto para lectores de pantalla en la figura y en las mini líneas.
- Estimaciones orientativas, no diagnóstico.
- Paleta oscura actual del molde (tiza sobre paño); el color "favorable/atención" sale de los tokens existentes.
- Pruebas con números inventados.

## Queda a criterio de quien lo construya

Textos exactos de cada veredicto, la forma visual exacta del panel y del selector, y el umbral de "peso estable" si los datos lo piden.
