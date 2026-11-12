# Medidas por lado, peso de tendencia y meta — Diseño

Fecha: 2026-11-12

## Propósito

Quien usa la app lleva sus medidas en una hoja de entrenador con brazo y pierna
de cada lado, y pesa distinto cada semana sin saber cuál es su peso "real". Esta
ronda permite registrar cada lado por separado, traer a la app las semanas ya
escritas a mano, leer el peso por su tendencia y saber cuándo se alcanzaría una
meta. Éxito: las cinco semanas de la hoja quedan cargadas con sus dos brazos y
sus dos piernas, y la Ficha muestra un peso de tendencia estable y una fecha
estimada para la meta.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Hojas manuscritas | Se transcriben fuera de la app y se cargan por Datos → Importar CSV. La app sigue sin enviar nada fuera del dispositivo |
| Medidas sin lado ya guardadas | Se conservan y se muestran como "(sin lado)"; no se convierten |
| Promedio del peso | Peso de tendencia (promedio exponencial que considera los días entre mediciones) |
| Fotos de progreso | Fuera de esta ronda |
| Funciones existentes | No se quita ninguna |

## Medidas por lado

Campos nuevos de Medición, opcionales, en cm, rango 5–300: `brazoIzqCm`,
`brazoDerCm`, `musloIzqCm`, `musloDerCm`. Nombres visibles: "Brazo izquierdo",
"Brazo derecho", "Muslo izquierdo", "Muslo derecho". Los campos `brazoCm` y
`musloCm` pasan a llamarse "Brazo (sin lado)" y "Muslo (sin lado)".

- **Medir**: muestra los cuatro campos nuevos. Los campos sin lado solo aparecen
  cuando la medición que se está editando ya tiene ese dato.
- **Historial**: columnas para los cuatro campos nuevos.
- **Evolución**: los cuatro campos nuevos y los dos sin lado son métricas elegibles
  cuando tienen datos.
- **Ficha, figura**: cada brazo y cada muslo con su valor y su cambio. Izquierdo
  y derecho son los de la persona: su lado izquierdo se dibuja a la derecha de la
  imagen. Una medida sin lado solo se dibuja si esa extremidad no tiene ninguna
  medida por lado en la última medición.
- **Ficha, diferencia entre lados**: si en la última medición ambos lados de una
  extremidad existen y difieren en 1 cm o más, se muestra una línea, por ejemplo
  "Brazo derecho 2,0 cm mayor que el izquierdo".
- **CSV**: exportación e importación incluyen los cuatro campos. La importación
  reconoce "Brazo izquierdo/derecho", "Pierna izquierda/derecha", "Muslo
  izquierdo/derecho" y sus equivalentes en inglés; "Torso" se asigna a pecho;
  "Pierna" o "Brazo" sin lado se asignan a los campos sin lado.
- **Respaldo**: los respaldos anteriores siguen restaurándose; los nuevos incluyen
  los campos por lado y la meta.

## Peso de tendencia

`tendencia₀ = peso₀`; para cada medición siguiente,
`tendenciaᵢ = tendenciaᵢ₋₁ + (pesoᵢ − tendenciaᵢ₋₁) × (1 − 0,9^días)`, con `días`
= días desde la medición anterior (mínimo 1). Con mediciones semanales cada
pesada nueva aporta cerca de la mitad.

- **Ficha**: la tarjeta del peso se titula "Peso de tendencia", muestra la
  tendencia a un decimal, debajo "Última pesada: X kg" y el cambio de la
  tendencia desde la primera medición. El tono sigue la regla actual (solo se
  colorea con objetivo bajar grasa; nunca en menores).
- **Gráficos de peso** (Ficha y Evolución): los puntos son las pesadas y se dibuja
  encima la línea de tendencia, con leyenda "Tendencia". En el peso reemplaza al
  "promedio de las últimas 4"; las demás métricas lo conservan.
- Junto al gráfico de peso en Evolución, una línea explica: "La tendencia es un
  promedio que da más importancia a las pesadas recientes y suaviza las subidas y
  bajadas de un día."

## Meta con fecha estimada

La persona puede tener un peso objetivo opcional (`metaPesoKg`, rango del peso),
editable en su formulario. Con meta, la Ficha muestra una tarjeta "Meta":

- Siempre: la meta y cuánto falta desde la tendencia actual.
- **Alcanzada**: la tendencia está a menos de 0,05 kg de la meta, o la meta queda
  entre la primera tendencia y la actual.
- **Sin datos suficientes**: menos de dos mediciones en los últimos 28 días
  separadas por 7 días o más. Texto: "Faltan mediciones para estimar una fecha."
- **Ritmo**: cambio de la tendencia entre la primera y la última medición de los
  últimos 28 días, por día. Se muestra por semana.
- **En contra**: el ritmo es cero o aleja de la meta. Texto: "Al ritmo actual te
  alejas de la meta." No se muestra fecha.
- **Fecha estimada**: última fecha + días necesarios al ritmo actual (hacia
  arriba). Si son más de 730 días, no se muestra fecha: "A este ritmo faltan más
  de dos años."

## Guía para medir

En Medir, dentro de la tarjeta de perímetros, un desplegable "Cómo medir cada
zona" con una línea por zona:

- Cuello: bajo la nuez, con la cinta horizontal.
- Pecho: a la altura de los pezones, después de soltar el aire.
- Brazo: a mitad del brazo, relajado y colgando.
- Cintura: a la altura del ombligo, sin meter la barriga.
- Cadera: en la parte más ancha de los glúteos.
- Muslo: a mitad del muslo, de pie y con el peso repartido.
- Y la regla general: siempre en el mismo punto, en ayunas y a la misma hora.

## Arquitectura

- `src/domain/types.ts`, `validation.ts`, `csv.ts`: campos y alias nuevos.
- `src/domain/trend.ts` (nuevo, puro): tendencia y proyección de meta.
- `src/domain/ficha.ts`: medidas por lado, diferencias entre lados, peso de tendencia.
- `src/storage/backup.ts`: validación de `metaPesoKg`. El esquema de IndexedDB no
  cambia (los campos nuevos no se indexan).
- `src/ui/`: `Medir`, `Historial`, `Evolucion`, `Grafico`, `Cuerpo`, `Ficha`, `PersonaForm`.

## Errores y casos límite

- Una sola medición: tendencia igual al peso; sin cambio ni fecha estimada.
- Dos mediciones el mismo día (no debería ocurrir): `días` mínimo 1, sin división por cero.
- Mediciones muy espaciadas (meses): la tendencia converge a la pesada nueva.
- Solo un lado medido: se dibuja ese lado; sin línea de diferencia.
- Diferencia entre lados de 0,9 cm: no se menciona; de 1,0 cm, sí.
- Meta igual al peso actual, meta por encima estando en bajada, ritmo cero:
  nunca "NaN", "Infinity" ni una fecha absurda.
- CSV con columnas "Brazo" y "Brazo izquierdo" a la vez: cada una va a su campo.

## Pruebas

- Unitarias antes del código: `trend.ts` completo, alias CSV nuevos, `ficha.ts`
  con lados y tendencia, validación del respaldo.
- De extremo a extremo: registrar ambos brazos y verlos en Ficha e Historial;
  importar una hoja con el formato del entrenador; tarjeta de peso de tendencia;
  tarjeta de meta con fecha; guía para medir; una medición antigua sin lado sigue visible.
- Las pruebas existentes se mantienen; solo cambian las que afirman el
  comportamiento reemplazado (peso de la Ficha y promedio de 4 en el gráfico de peso).
