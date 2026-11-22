# Leer la captura de Xiaomi Home — Diseño

Fecha: 2026-11-22

## Propósito

El usuario se pesa en una báscula Xiaomi Body Composition Scale S400. La
báscula envía cada pesada a la app Xiaomi Home del iPhone. Xiaomi Home no
exporta archivos, pero muestra un informe por pesada y permite hacer una
captura de pantalla. Hoy el usuario tiene que copiar esos números a mano o
mandarme la captura para que yo la transcriba.

Queremos que **MedidasCuerpo lea esa captura por sí misma**: el usuario
elige o pega la imagen en Medir, la app reconoce los números y rellena el
formulario, y el usuario revisa y guarda.

Solo el usuario se pesa en la báscula, con la cuenta principal de Xiaomi.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Fuente | Captura de pantalla del informe de una pesada en Xiaomi Home, en español |
| Dónde se lee | En el propio navegador (OCR local). La imagen no sale del computador |
| Motor | `tesseract.js` 7 con el modelo de español "fast" (`@tesseract.js-data/spa` 4.0.0, unos 2 MB). Todos sus archivos se sirven desde nuestro propio sitio, nunca desde un CDN |
| Resultado | Rellena el formulario de Medir para la persona elegida; **nunca guarda solo** |
| Pantalla | Medir, sobre el formulario |

## Fuera de alcance

- Leer otros informes (InBody, Renpho, Zepp Life) o Xiaomi Home en otro idioma.
- Conexión con la nube de Xiaomi o con Salud del iPhone.
- Leer varias capturas a la vez.
- IMC, grasa en kg y peso sin grasa: la app los calcula sola, no se leen.

## Lo que hay en la captura

El informe muestra, de arriba abajo (valores de ejemplo inventados):

- nombre y **fecha y hora** (`15/11/2026 07:45`);
- **peso** en números grandes, con el decimal más pequeño (`82` `,4` `kg`);
- tarjetas con un valor encima de su rótulo, en dos columnas: IMC,
  Porcentaje de grasa corporal, Masa de agua corporal (kg), Grasa corporal
  (kg), Contenido mineral óseo, Masa proteica, Masa muscular, Porcentaje de
  músculo, Agua corporal (%), Porcentaje de proteínas, Porcentaje mineral
  óseo, Masa muscular esquelética, Calificación de grasa visceral, Índice
  metabólico basal, Estimación de la relación cintura-cadera, Edad corporal,
  Peso corporal sin grasa, Frecuencia cardíaca.

La unidad va pegada al número en letra más chica (`33,6kg`, `54,6%`), y el
OCR suele leerla como dígitos o letras (`33,619`, `45,0rg`).

## Campos que se rellenan

| Campo de la app | Rótulo en la captura | Comprobación |
|---|---|---|
| `fecha` | fecha `dd/mm/aaaa` del encabezado | — |
| `pesoKg` | número grande | Peso corporal sin grasa + Grasa corporal (kg) |
| `grasaPct` | Porcentaje de grasa corporal | Grasa corporal (kg) ÷ peso × 100 |
| `aguaPct` | Agua corporal | Masa de agua corporal (kg) ÷ peso × 100 |
| `musculoKg` | **Masa muscular esquelética** | ninguna |
| `grasaVisceral` | Calificación de grasa visceral | ninguna |
| `musculoTotalKg` | Masa muscular | Porcentaje de músculo × peso ÷ 100 |
| `masaOseaKg` | Contenido mineral óseo | Porcentaje mineral óseo × peso ÷ 100 |
| `proteinaPct` | Porcentaje de proteínas | Masa proteica (kg) ÷ peso × 100 |
| `metabolismoBasalKcal` | Índice metabólico basal | ninguna |
| `edadCorporal` | Edad corporal (`25 años de edad` → 25) | ninguna |
| `frecuenciaCardiacaLpm` | Frecuencia cardíaca | ninguna |

*Enmienda del 2026-11-22, tras el diseño de navegación sin pestañas:* la app
ya guarda las seis medidas de abajo (`2026-11-22-navegacion-ficha-design.md`),
así que la captura también las rellena. Las tres con comprobación siguen la
regla de los porcentajes: un kg comprobado si difiere ≤ 0,15 kg del calculado;
si no se leyó, se usa el calculado. Las tres sin comprobación van siempre a
"revisar".

`musculoKg` usa la masa muscular **esquelética**, no la "Masa muscular"
total de Xiaomi: el historial del usuario ya trae valores de músculo
esquelético (unos 40 kg) y la masa muscular total (unos 70 kg) haría un
salto falso en el gráfico.

**Peso.** Si el número grande se leyó y coincide con "sin grasa + grasa"
(diferencia ≤ 0,15 kg), se usa y queda comprobado. Si no se leyó, se usa
"sin grasa + grasa", redondeado a un decimal, y queda comprobado. Si ambos
existen y no coinciden, se usa "sin grasa + grasa" y se marca para revisar.

**Porcentajes.** Un porcentaje leído queda comprobado si difiere en 0,3
puntos o menos del calculado. Si no se leyó, se usa el calculado. Si no
coincide, se usa el leído y se marca para revisar.

Sin peso no hay comprobaciones, y todos los campos leídos se marcan para
revisar.

## Cómo se lee (lo que el constructor debe respetar)

1. **Preparar la imagen** en un `<canvas>`: escala de grises; si el brillo
   medio es menor que 128 (modo oscuro, como la captura del usuario),
   invertir para dejar texto oscuro sobre fondo claro; y escalar a **620 px
   de ancho**,
   manteniendo la proporción. En la prueba de factibilidad, Tesseract leía
   "33,6" como "33,0" en la captura a tamaño real (1242 px). A 620 px leyó
   bien todos los números sin necesidad de umbralizar (binarizar), así que
   no se umbraliza.
2. **Reconocer** con `tesseract.js` (modo de página automático) y pedir las
   palabras con su posición (`blocks: true`).
3. **Interpretar** en una función pura del dominio,
   `src/domain/capturaXiaomi.ts`, que recibe las líneas reconocidas (texto y
   caja de cada palabra) y devuelve los campos. No usa el navegador ni
   tesseract, así se prueba con datos inventados.
   - Un valor es el número `\d{1,4}(,\d)?` que está en la línea justo
     encima de su rótulo y cuyo centro horizontal queda en la misma columna
     que el inicio del rótulo. De `33,619` se toma `33,6`: un solo decimal,
     y lo que sigue se descarta como unidad mal leída.
   - Los rótulos se buscan sin tildes ni mayúsculas, con coincidencia
     exacta de sus palabras ("Masa muscular" no debe confundirse con "Masa
     muscular esquelética"; "Grasa corporal" no debe confundirse con
     "Porcentaje de grasa corporal" ni con "Calificación de grasa visceral").
   - La fecha es el primer `dd/mm/aaaa` de la imagen.
   - Cada valor se valida con `validarValor`. Uno fuera de rango se descarta.

## Pantalla

*Enmienda del 2026-11-22:* el botón vive en la pestaña **"Captura de Xiaomi
Home"** de la pantalla Registrar medición (no sobre el formulario de Medir).
Al terminar de leer, la pantalla pasa sola a la pestaña **Escribir** con el
formulario rellenado y las marcas, y la miniatura queda al lado. Pegar con
Ctrl+V funciona mientras Registrar está abierto, en cualquier pestaña. Lo
demás de esta sección sigue igual.


En Medir, sobre el formulario:

```
┌ Desde la báscula ─────────────────────────────────────────┐
│ [ Leer captura de Xiaomi Home ]   o pega la imagen (Ctrl+V) │
└───────────────────────────────────────────────────────────┘
```

- Al elegir o pegar una imagen: "Leyendo la captura…" con progreso. La
  primera vez descarga el lector (unos 5 MB) y lo indica.
- Al terminar:
  - La fecha del formulario pasa a la fecha de la captura, y el formulario
    carga lo ya guardado ese día (por ejemplo la cintura). Encima van los
    cinco campos leídos. Los demás campos no se tocan.
  - Cada campo leído muestra "de la captura" o, si quedó para revisar,
    "revisa con la imagen" con estilo de atención.
  - Al lado del formulario (debajo en pantallas angostas) se ve la captura
    en miniatura, que se amplía al hacer clic, para comparar.
  - Si la nota está vacía, se rellena con "Xiaomi Home HH:MM".
  - Un aviso dice: "Revisa los valores y pulsa Guardar." Nada se guarda
    hasta que el usuario pulse Guardar medición.
- Si no se reconoce ningún campo: "No pude leer esta imagen. Usa la
  captura completa del informe de Xiaomi Home, sin recortar ni comprimir."
  El formulario no cambia.
- Si la captura trae una fecha futura, se rechaza como cualquier fecha
  futura en Medir.
- Si en el formulario ya hay cambios sin guardar, antes de leer se pregunta
  "Tienes cambios sin guardar en Medir. ¿Reemplazarlos con la captura?". Si
  responde que no, no se lee nada. *(Decisión del constructor.)*
- Un campo de los cinco que no se pudo leer conserva lo que ya estaba
  guardado ese día. *(Decisión del constructor.)*
- Lo leído cuenta como cambio sin guardar: los valores se conservan en el
  borrador si el usuario cambia de pantalla. Las marcas "de la captura" y la
  miniatura no se conservan: la imagen solo vive en memoria mientras Medir
  está abierto y nunca se guarda. *(Decisión del constructor.)*
- La medición se guarda con `origen: 'manual'`, porque el usuario la revisó
  y la confirmó. La nota "Xiaomi Home HH:MM" deja constancia de dónde vino.
  No se cambia el modelo de datos. *(Decisión del constructor.)*

## Archivos del lector y sin conexión

- `tesseract.js` se carga con `import()` dinámico solo al usar el botón:
  no entra al paquete principal.
- El worker, el núcleo WebAssembly (solo las variantes LSTM, con y sin
  SIMD) y `spa.traineddata.gz` se copian al sitio publicado bajo `ocr/`, y
  `createWorker` apunta a ellos (`workerPath`, `corePath`, `langPath`)
  respetando la base `/MedidasCuerpo/`.
- Esos archivos **no** entran al precache del service worker: se guardan
  con una regla `CacheFirst` la primera vez que se usan, para que después
  funcione sin internet.
- La app sigue sin hacer peticiones a otros dominios.

## Pruebas

- **Unitarias** (`tests/domain/capturaXiaomi.test.ts`), con líneas y cajas
  inventadas: cada campo, unidad mal leída (`33,619`, `45,0rg`), dos
  columnas en una línea, rótulos parecidos, peso por suma, peso que no
  coincide (para revisar), porcentaje calculado, valor fuera de rango,
  imagen sin nada reconocible.
- **Extremo a extremo**: una réplica del informe con números inventados,
  generada con el mismo diseño y guardada como `e2e/fixtures/captura-xiaomi.png`.
  Se elige en Medir y se comprueba que los cinco campos y la fecha quedan
  rellenados, que nada se guarda antes de pulsar Guardar, que se conserva
  una cintura ya guardada ese día, y que no hay peticiones a otros dominios.
- La captura real del usuario no se sube al repositorio.

## Riesgos

- La fuente real de Xiaomi Home no es la de la réplica. La única captura
  real disponible llegó comprimida (216 px de ancho) y no sirve para probar.
  El constructor hace la réplica lo más parecida posible y deja el ancho
  objetivo (620 px) como una constante fácil de ajustar. La primera captura
  real que use el usuario es la verdadera prueba; si falla, se ajusta con
  ella.
- Las imágenes comprimidas por mensajería (por ejemplo, 216 px de ancho)
  no se pueden leer. El mensaje de error pide la captura original.
