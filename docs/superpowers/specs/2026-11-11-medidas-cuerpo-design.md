# MedidasCuerpo — Diseño

Fecha: 2026-11-11

## Propósito

Llevar un control semanal de peso, composición corporal y perímetros de una
persona y sus familiares, desde un computador, y explicar en lenguaje claro qué
significan los cambios (por ejemplo: "mismo peso, menos cintura: probablemente
perdiste grasa y mantuviste o ganaste músculo").

Éxito significa que quien administra la app puede, una vez por semana y en
pocos minutos, registrar a cada familiar y ver quién tiene medición pendiente,
cómo evoluciona cada métrica y qué indica la combinación de cambios.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataforma | App web instalable (PWA), uso principal en computador |
| Datos | Solo en el computador (IndexedDB). Sin cuentas ni servidor |
| Host | GitHub Pages, repositorio `Phatito/MedidasCuerpo` (público; expone el código, no los datos) |
| Usuarios | Una persona administra y registra a todos; perfiles, no cuentas |
| Idioma y unidades | Español, kg y cm |
| Entrada de datos | Manual e importación CSV |
| Recordatorio | Evento semanal de calendario (.ics) + estado "pendiente" en la app |

## Fuera de alcance (primera versión)

- Sincronización entre dispositivos y cuentas de usuario.
- Bluetooth directo con básculas o cintas.
- Lectura automática de reportes InBody (sus valores se ingresan a mano).
- Notificaciones del sistema con la app cerrada.
- Planes de dieta o entrenamiento.

## Arquitectura

Sitio estático construido con Vite, React y TypeScript. Tres capas con
dependencias en una sola dirección: interfaz → almacenamiento → dominio.

- **Dominio (`src/domain/`)**: funciones puras, sin React ni navegador.
  - `metrics.ts`: valores derivados de una medición.
  - `insights.ts`: interpretación de cambios entre mediciones.
  - `reminders.ts`: quién tiene medición pendiente; generación del .ics.
  - `csv.ts`: lectura y escritura de CSV, asignación de columnas.
- **Almacenamiento (`src/storage/`)**: `db.ts` envuelve IndexedDB (con Dexie)
  y expone operaciones sobre personas, mediciones y ajustes; `backup.ts`
  exporta e importa el respaldo completo en JSON.
- **Interfaz (`src/ui/`)**: una pantalla por archivo y componentes compartidos
  (gráfico, selector de persona, tarjetas).
- **PWA**: `vite-plugin-pwa` genera el manifiesto y el service worker que deja
  la app disponible sin conexión.
- **Publicación**: GitHub Actions compila y publica en GitHub Pages en cada
  push a `main`. La base de rutas es `/MedidasCuerpo/`.

## Modelo de datos

**Persona**: `id`, `nombre`, `sexo` (`hombre` | `mujer`), `fechaNacimiento`,
`estaturaCm`, `objetivo` (`bajar_grasa` | `ganar_musculo` | `mantener`),
`creadaEn`.

**Medición**: `id`, `personaId`, `fecha` (AAAA-MM-DD), `pesoKg` (obligatorio),
y opcionales: `grasaPct`, `musculoKg`, `grasaVisceral`, `aguaPct`, `cuelloCm`,
`pechoCm`, `cinturaCm`, `caderaCm`, `brazoCm`, `musloCm`, `nota`, `origen`
(`manual` | `csv`).

Hay como máximo una medición por persona y fecha: guardar otra el mismo día
reemplaza la anterior.

**Ajustes**: `diaRecordatorio` (0–6), `horaRecordatorio` (HH:MM).

## Valores derivados (`metrics.ts`)

- IMC = peso / (estatura en m)².
- Relación cintura/estatura y cintura/cadera, cuando existen los perímetros.
- % de grasa: se usa el medido; si falta y hay cuello, cintura, estatura (y
  cadera en mujeres), se estima con la fórmula de perímetros de la Marina de
  EE. UU. y se marca como **estimado** en toda la interfaz.
- Masa grasa (kg) = peso × % grasa; masa magra (kg) = peso − masa grasa.

Un valor derivado que no puede calcularse es `null`; nunca se inventa.

## Interpretación (`insights.ts`)

Entrada: persona y sus mediciones ordenadas por fecha. Salida: lista de
mensajes con tono (`bien` | `atencion` | `neutro`), título y texto.

**Comparaciones**
1. Última medición frente a la anterior.
2. Promedio de las últimas *k* mediciones frente a las *k* previas, con
   *k* = mínimo(4, mitad de las mediciones). Requiere al menos 4 mediciones.
3. Última medición frente a la primera ("desde que empezaste").

**Umbrales**
- Peso estable: cambio menor que el mayor entre 0,4 kg y 0,5 % del peso.
- Cambio de cintura relevante: 1 cm o más.
- Cambio de músculo relevante: 0,3 kg o más de subida; 0,5 kg o más de bajada.
- Ritmo rápido: pérdida mayor a 1 % del peso por semana, normalizada por los
  días transcurridos.

**Reglas**

| Condición | Tono | Mensaje |
|---|---|---|
| Peso estable y cintura baja | bien | Probable pérdida de grasa manteniendo o ganando músculo |
| Peso baja y grasa o cintura bajan | bien | Bajaste peso y grasa |
| Peso baja y músculo baja | atención | Parte de lo perdido es músculo: revisar proteína y fuerza |
| Peso baja a ritmo rápido | atención | Ritmo de bajada muy rápido |
| Peso sube, músculo sube, cintura no sube | bien | Probable ganancia muscular |
| Peso sube y cintura o grasa suben | atención | Probable ganancia de grasa |
| Peso sube sin más datos | neutro | Una semana sola no dice mucho (agua, sal, ciclo) |
| Peso estable y sin cambio de cintura | neutro | Sin cambios esta semana |

**Alertas de estado** (sobre la última medición)
- Cintura mayor que la mitad de la estatura.
- Grasa visceral de 10 o más (escala habitual de básculas domésticas).
- Categoría de IMC, mostrada como dato y no como juicio.

Con una sola medición la salida es un único mensaje que invita a registrar la
segunda. Toda la sección lleva la nota fija: orientación general, no
diagnóstico médico; las cifras de bioimpedancia son estimaciones y lo que
importa es la tendencia.

## Pantallas

1. **Familia**: tarjeta por persona con última fecha, peso y estado ("al día"
   o "le toca medirse" si pasaron 7 días o más, o si no tiene mediciones).
   Botón para agregar persona. Es la pantalla inicial.
2. **Medir**: formulario para la persona seleccionada. Fecha (hoy por
   defecto) y peso obligatorios; el resto opcional. Acepta coma o punto
   decimal. Muestra el valor de la medición anterior junto a cada campo.
3. **Evolución**: selector de métrica, gráfico de línea con promedio móvil de
   4 mediciones, y la lista de interpretaciones.
4. **Historial**: tabla de mediciones con edición y eliminación (con
   confirmación en la propia fila).
5. **Datos**: importar CSV, exportar CSV, descargar y restaurar respaldo,
   configurar y descargar el recordatorio (.ics).

Estados vacíos: sin personas, la pantalla Familia explica el primer paso; sin
mediciones, Evolución e Historial invitan a registrar la primera.

## Importación CSV

El usuario elige un archivo; la app muestra las columnas detectadas y propone
una asignación a los campos de Medición por nombre (español e inglés). El
usuario puede corregirla antes de importar. Se requieren fecha y peso. Las
filas inválidas se omiten y se informan con su número y motivo. Las filas con
fecha ya existente reemplazan la medición de ese día, y el resumen previo a
confirmar indica cuántas son nuevas y cuántas reemplazan.

## Recordatorio

La app genera un archivo `.ics` con un evento semanal recurrente en el día y
hora elegidos. Al abrirlo se agrega al calendario del usuario, que es quien
emite el aviso (también en el teléfono si el calendario está sincronizado).
Dentro de la app, el estado "le toca medirse" depende de la fecha de la última
medición de cada persona, no del día configurado.

## Errores y casos límite

- Valores fuera de rango razonable (por ejemplo peso menor a 2 kg o mayor a
  400 kg) se rechazan con un mensaje junto al campo.
- Si IndexedDB no está disponible, la app lo dice y no simula guardar.
- Restaurar un respaldo reemplaza todos los datos y pide confirmación
  mostrando cuántas personas y mediciones contiene el archivo.
- Borrar una persona borra sus mediciones, con confirmación.
- La app solicita almacenamiento persistente al navegador y recuerda hacer un
  respaldo si pasaron más de 30 días desde el último.

## Pruebas

- **Unitarias (Vitest)**, escritas antes que el código: `metrics`, `insights`
  (una prueba por regla y por umbral), `reminders`, `csv`.
- **Almacenamiento**: operaciones de `db.ts` y ciclo respaldo → restauración,
  con `fake-indexeddb`.
- **Extremo a extremo (Playwright)**: crear una persona, registrar dos
  mediciones y ver la interpretación; importar un CSV.
