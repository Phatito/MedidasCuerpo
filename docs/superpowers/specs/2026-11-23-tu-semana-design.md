# "Tu semana": informe semanal, gasto real y plan — Diseño

Fecha: 2026-11-23 · Aprobado por el usuario en la conversación.

## Propósito

Diferenciar Mesura: no solo mostrar números, sino ayudar a **progresar** y decir
**qué hacer**. Ninguna app revisada cierra el círculo medir → entender → actuar →
comprobar. El usuario eligió tres ideas: informe semanal con plan, desglose grasa
/ masa magra, y medidas confiables. Además quiere anotar **un solo número de
consumo** ("estoy comiendo ~2.500 kcal al día"), editable en el tiempo, para que
la app estime su gasto real y le diga cuánto comer. No quiere registrar kcal
diarias.

## Fuera de alcance

- Registrar comidas, kcal diarias o macros; importar desde Duck Balance u otra app.
- Recomendaciones para menores de 18 (`esMenor`): no se muestran kcal ni acciones
  de dieta; el resto del informe sí.
- Planes de entrenamiento detallados.

## Anti-objetivos

- Cifras inventadas: sin datos suficientes, se dice qué falta.
- Consejos extremos: nunca recomendar menos de 1.200 kcal (mujer) / 1.500 kcal
  (hombre), ni pérdidas de más de 1 % del peso por semana.
- Presentarlo como indicación médica: todo lleva "estimación / orientación".

## Consumo de kcal

- Nuevo campo opcional en `Persona`: `consumos?: { desde: string /* AAAA-MM-DD */; kcal: number }[]`, ordenado por `desde`. Rango válido 800–6.000.
- En la tarjeta de peso de la ficha: ficha **"Consumo: 2.500 kcal/día ✎"** (o
  "Anotar consumo ✎" si no hay). Al editar: un campo numérico y **"Desde"**
  (hoy por defecto). Guardar agrega o reemplaza la entrada de esa fecha. Se
  puede ver y borrar el historial ("2.500 desde 01/11 · 2.200 desde 01/12").
- El consumo vigente en una fecha es la última entrada con `desde ≤ fecha`;
  antes de la primera entrada, no hay consumo.
- Viaja con la persona (sincronización cifrada y respaldo). El respaldo valida el
  rango y el formato de fecha; respaldos sin el campo siguen valiendo.

## Gasto real y kcal recomendadas

Funciones puras en `src/domain/energia.ts`.

- **Ventana:** los últimos 28 días hasta la última pesada.
- **Requisitos:** al menos 3 pesadas en la ventana, una diferencia de al menos
  21 días entre la primera y la última, y consumo vigente en al menos 21 de esos
  días. Si no se cumplen: "Faltan semanas para estimar tu gasto" con lo que falta
  (pesadas o días con consumo).
- **Gasto diario** = consumo promedio diario de la ventana (promedio de los días
  con consumo) − (cambio de tendencia en kg × 7.700) / días. Redondeado a 10.
- **Ritmo objetivo semanal** (kg): `bajar_grasa` −0,5 % del peso de tendencia;
  `ganar_musculo` +0,25 %; `mantener` 0.
- **Kcal recomendadas** = gasto + ritmo objetivo × 7.700 / 7, redondeado a 50,
  con piso 1.200 (mujer) / 1.500 (hombre); si se aplica el piso, se dice.
- **Confianza:** alta con ≥ 6 pesadas y ≥ 42 días de datos (con ventana de 42
  días); media con los requisitos mínimos. Se muestra como "confianza media".
- 7.700 kcal/kg es una aproximación de la energía de la grasa corporal; se
  menciona en "Cómo se calcula".

## "Tu semana"

Función pura `informeSemanal(p, mediciones, hoy)` en `src/domain/semana.ts`.
La "semana" es la última medición frente a la anterior (no se exige que pasen 7
días exactos).

1. **Qué cambió:** cambio de tendencia del peso. Si ambas mediciones tienen % de
   grasa (medido o estimado del mismo origen): cambio de **grasa (kg)** y de
   **masa magra (kg)** = peso × (1 − grasa %). Lo mismo **acumulado desde la
   primera medición con grasa**, y un gráfico de barras apiladas por medición
   (grasa y masa magra) en la pantalla del informe.
2. **Qué tan confiable es:** si la última pesada se aleja de su tendencia más de
   máx(1 kg, 1,2 % del peso): "Esta pesada está X kg sobre tu tendencia: suele
   ser agua o sal, no grasa" (o "bajo", "deshidratación o comida reciente").
   Recordatorio fijo corto: "Pésate siempre igual: en ayunas, tras ir al baño."
3. **Qué hacer:** como máximo 2 acciones, por prioridad (solo adultos):
   1. Ritmo de bajada > 1 %/sem (tendencia de las últimas 2 semanas) → "Vas muy
      rápido: sube a ~X kcal" (o "come un poco más" sin estimación).
   2. Masa magra bajó ≥ 0,5 kg en la semana, o músculo esquelético ≥ 0,5 kg →
      "Protege tu músculo: 1,6–2,2 g de proteína por kg (Y–Z g/día) y 2–3
      sesiones de fuerza". Con IMC ≥ 30 el rango se calcula con el peso que daría
      IMC 25 a su estatura.
   3. Objetivo `bajar_grasa` y ritmo < 0,25 %/sem en las últimas 3 semanas → "Te
      estancaste: baja a ~X kcal" (o "Anota tu consumo para recomendarte kcal").
   4. Objetivo `ganar_musculo` y grasa (kg) sube más que la masa magra → "Reduce
      un poco: ~X kcal".
   5. Si no hay consumo anotado → "Anota cuánto comes para estimar tu gasto real".
   6. Si nada aplica → "Vas bien: mantén ~X kcal" o "Vas bien: sigue así".
4. **Revisión de la semana pasada:** se calcula el informe tal como era en la
   medición anterior (mismos datos, cortados en esa fecha) y se evalúa cada
   acción con los datos de ahora: ritmo dentro de la banda objetivo (±0,25 %),
   masa magra sin bajar ≥ 0,5 kg, estancamiento superado. ✓ / ✗ con una frase.
   Acciones sin forma de comprobarse ("anota tu consumo") se comprueban si ahora
   hay consumo.

## Decisiones del constructor (tras la revisión del diseño)

- **Ventana del gasto:** 42 días si hay ≥ 6 pesadas, ≥ 42 días de datos y
  consumo en ≥ 35 de esos días (confianza alta); si no, 28 días con los
  requisitos mínimos (confianza media).
- **Menores:** solo ven "Qué cambió" y "Qué tan confiable es"; sin acciones, sin
  kcal y sin el dato de consumo en la ficha.
- **La X de los mensajes** es la kcal recomendada. Si el consumo actual está a ±150
  kcal de la recomendada, la acción 6 dice "Vas bien: sigue con tu consumo actual
  (~2.500 kcal)". Con consumo anotado pero sin estimación todavía, las acciones 3,
  4 y 6 se reemplazan por "Sigue anotando tu consumo: en N semanas podré estimar
  tu gasto".
- **Ritmo:** siempre sobre la tendencia de los últimos 14 días (o desde la primera
  pesada si hay menos), nunca entre dos pesadas sueltas.
- **Revisión ✓ / ✗:** muy rápido → ritmo ≤ 1 %/sem; proteger músculo → masa magra
  (o músculo) no bajó ≥ 0,5 kg; estancado → ritmo ≥ 0,25 %/sem; reduce un poco →
  la grasa ya no sube más que la masa magra; vas bien → ritmo dentro de ±0,25 %
  del objetivo; anota consumo → ahora hay consumo.
- **Datos viejos:** si la última medición tiene más de 28 días respecto de hoy, el
  informe muestra "Qué cambió" y "Tu última medición es del dd/mm: mídete para
  recibir un plan nuevo", sin acciones ni kcal.
- **Pesada atípica:** se compara con la tendencia **anterior** a esa pesada.

## Pantallas

- **Ficha:** tarjeta "Tu semana" arriba del gráfico (columna derecha), con el
  resumen y las acciones; botón **"Ver informe completo →"**. Sin al menos 2
  mediciones: "Con tu segunda medición verás aquí tu semana".
- **Pantalla "Tu semana"** (`#/p/<id>/semana`, con "← Volver"): las cuatro
  partes, el gráfico de barras grasa / masa magra, y "Cómo se calcula".
- **Ficha, tarjeta de peso:** el dato de consumo editable.

## Pruebas

- **Unitarias:** consumo vigente por fecha; gasto con datos inventados (ej.:
  2.500 kcal, tendencia −0,5 kg/sem → gasto ≈ 3.050); requisitos no cumplidos;
  piso de kcal; confianza; cada regla de acción y su prioridad; tope de 2
  acciones; menores sin acciones de dieta; desglose grasa / masa magra;
  pesada atípica; revisión ✓ / ✗; respaldo con y sin `consumos`.
- **Extremo a extremo:** anotar y cambiar el consumo; ver la tarjeta y el
  informe con mediciones inventadas; la revisión de la semana pasada; a 400 px
  sin desplazamiento horizontal.

## Lo que queda al constructor

Textos exactos no listados, estilo del gráfico de barras, y nombres internos.

## Cambio posterior (pedido por el usuario)

- Se quitó la regla de menores: todas las personas reciben el mismo informe, con kcal y acciones.
