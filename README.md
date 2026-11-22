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

No hay pestañas: la app abre en la **ficha de la persona principal** y desde
ahí se llega a todo.

- **Selector de perfil** (arriba): cambia de persona, avisa a quién le toca
  medirse (7 días o más desde su última medición), y lleva a agregar personas
  y a Familia. La **persona principal** (★) es la que se abre al iniciar; se
  elige en Familia o en Ajustes y datos.
- **Ficha:** a la izquierda, el peso de tendencia, el IMC y la meta, el botón
  **+ Registrar medición** y la figura del cuerpo con cada perímetro sobre su
  zona. A la derecha, el gráfico (peso, grasa, músculo, cintura y "Más…", en 3
  meses, 1 año o todo), una tarjeta por cada medida de la báscula y "Qué
  indican tus cambios".
- **Estados en color:** IMC (OMS), % de grasa por sexo y edad (Gallagher y
  otros, 2000), grasa visceral, agua y proteína (escala habitual de las
  básculas domésticas) muestran Bajo, Estándar, Alto o Muy alto, con una barra
  de rango. Músculo, hueso y metabolismo no tienen un rango que sirva para
  todos y solo muestran su cambio. A menores de 18 años no se les asigna
  estado.
- **Medidas de la báscula:** peso, % de grasa, músculo esquelético, grasa
  visceral, % de agua y, en "Más de la báscula", masa muscular total, masa
  ósea, proteína, metabolismo basal, edad corporal y frecuencia cardíaca, como
  en el informe de básculas como la Xiaomi S400. La grasa en kg, el peso sin
  grasa y el IMC se calculan solos.
- **Registrar medición:** pantalla aparte con **← Volver a la ficha** y tres
  formas de cargar: escribir, leer una captura de Xiaomi Home y archivo CSV,
  sin pasar por Ajustes. Brazo y muslo van por lado y hay una guía de dónde
  tomar cada medida.
- **Peso de tendencia:** un promedio que da más importancia a las pesadas
  recientes y suaviza las subidas y bajadas de un día. Es el número principal
  del peso y la línea celeste del gráfico de peso.
- **Meta:** con un peso objetivo en la persona, la ficha muestra cuánto falta y
  la fecha estimada al ritmo de las últimas cuatro semanas.
- **Todas las mediciones:** tabla con edición y eliminación.
- **Ajustes y datos** (⚙): persona principal, importar y exportar CSV,
  respaldo, y recordatorio semanal como evento de calendario.
- El botón Atrás del navegador funciona en todas las pantallas.

### Leer la captura de Xiaomi Home

Para la báscula Xiaomi Body Composition Scale S400 (o cualquier informe de
Xiaomi Home en español):

1. En Xiaomi Home abre el informe de la pesada y haz una **captura de pantalla
   completa**, sin recortar.
2. Pásala al computador **sin comprimir**: AirDrop, iCloud Drive, o como
   archivo adjunto por correo. Las apps de mensajería la reducen y así ya no se
   puede leer.
3. En **Registrar medición → Captura de Xiaomi Home**, elige la imagen o pégala
   con Ctrl+V.
4. La app rellena la fecha, el peso, la grasa, el agua, el músculo esquelético,
   la grasa visceral, la masa muscular total, la masa ósea, la proteína, el
   metabolismo basal, la edad corporal y la frecuencia cardíaca. Cada campo dice
   **"de la captura"** si cuadra con otras cifras del mismo informe, o **"revisa
   con la imagen"** si no se pudo comprobar. Compara con la miniatura y pulsa
   **Guardar medición**: nada se guarda antes.

La imagen se lee en tu propio navegador y nunca sale del computador. La primera
vez se descarga el lector desde este mismo sitio (unos 6 MB); después funciona
sin conexión. Si ese día ya tenías perímetros guardados, se conservan.

### Pasar una hoja escrita a mano

La importación reconoce los nombres habituales de una hoja de entrenador:
`Fecha`, `Peso`, `Torso`, `Brazo izquierdo`, `Brazo derecho`, `Cintura`,
`Cadera`, `Pierna izquierda`, `Pierna derecha`. Con las cifras en un archivo CSV
con esas columnas (separado por punto y coma), se cargan en Registrar medición →
Archivo (o en Ajustes y datos → Importar).

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
