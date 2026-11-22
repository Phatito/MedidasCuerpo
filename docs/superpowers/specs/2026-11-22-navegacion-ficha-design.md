# Navegación sin pestañas y ficha completa — Diseño

Fecha: 2026-11-22
Maquetas: https://claude.ai/artifact/PEKz4NPt3cK2eksKpFTUYV (privadas; elegida la **A · Panel**)

## Propósito

El usuario encuentra la app incómoda: seis pestañas arriba (Familia, Ficha,
Medir, Evolución, Historial, Datos), "Registrar medición" salta a otra
pestaña sin forma de volver, e importar un archivo obliga a ir a Datos.

Quiere:
- que al abrir la app se vea **su ficha** (la de la persona principal);
- cambiar a otra persona con un **selector de perfil** en forma de lista;
- que la ficha muestre el gráfico y **todas las medidas, como el informe de
  Xiaomi Home**, con un aspecto tan bonito como el de otras apps;
- que "Registrar medición" se abra como **pantalla aparte con botón para
  volver**, y que desde ahí se pueda cargar un archivo sin pasar por Datos;
- conservar la figura del cuerpo actual (curva, con líneas y rótulos a los
  lados), que le gusta más que la de la maqueta.

Regla de siempre: **no se quita ninguna función ni dato**, solo cambia dónde
se encuentra cada cosa. Los datos siguen solo en el dispositivo.

## Fuera de alcance (va en el trabajo siguiente)

- Leer la captura de Xiaomi Home. Su diseño ya está aprobado
  (`2026-11-22-captura-xiaomi-design.md`). Se implementa después, dentro de
  la pantalla Registrar medición de este diseño, y su plan se reescribirá
  para ella. Aquí solo queda el lugar reservado (ver Registrar medición).

## Enfoques considerados

- **A · Panel (elegido).** Ficha de dos columnas en el computador: peso,
  botón de registrar y figura a la izquierda; gráfico y tarjetas de todas
  las medidas a la derecha. Todo a la vista sin otra pantalla. Las reseñas
  de apps de básculas critican los rediseños que esconden datos.
- **B · Informe.** Una columna centrada con un anillo de peso y tarjetas;
  gráfico y figura detrás de "Ver evolución". Es más limpio, pero obliga a
  un clic extra para lo que más se mira. Descartado por el usuario.

## Navegación

No hay barra de pestañas. Hay cinco pantallas, cada una con su dirección
en el hash, para que el botón Atrás del navegador y del mouse funcione:

| Pantalla | Dirección | Se llega desde |
|---|---|---|
| Ficha (inicio) | `#/p/<personaId>` | abrir la app; selector de perfil |
| Registrar medición | `#/p/<personaId>/registrar` (opcional `?fecha=AAAA-MM-DD`) | botón de la ficha; "Editar" en Todas las mediciones |
| Todas las mediciones | `#/p/<personaId>/mediciones` | enlace de la ficha |
| Familia | `#/familia` | selector de perfil → "Administrar familia…" |
| Ajustes y datos | `#/ajustes` | botón ⚙ |

- **Encabezado** (en todas las pantallas): logo a la izquierda, selector de
  perfil en el centro, ⚙ a la derecha. Las pantallas que no son la ficha
  muestran además "← Volver" bajo el encabezado. Volver lleva a la
  pantalla anterior de la app si la hay, y si no a la ficha.
- **Inicio:** la ficha de la persona principal. Si no hay persona
  principal o ya no existe, la primera persona creada. Sin personas, la
  pantalla Familia con el formulario para la primera.
- **Persona principal:** nuevo ajuste `personaPrincipalId`. Se elige en
  Ajustes y datos y en Familia (estrella ★ en la tarjeta). Al crear la
  primera persona queda como principal.
- **Selector de perfil:** botón con avatar y nombre. Abre una lista con
  cada persona (avatar, nombre, "Al día · fecha" o "Le toca medirse", ★ en
  la principal), "+ Agregar persona" y "Administrar familia…". Se cierra
  con Escape o al hacer clic fuera. Se puede usar con el teclado.
- **Dirección con una persona que no existe** (borrada, o un enlace viejo)
  lleva al inicio.

## Ficha (opción A)

En pantallas anchas, dos columnas (izquierda de 420 px). En pantallas
angostas, una columna en este orden: peso, gráfico, tarjetas, figura.

**Columna izquierda**
1. **Tarjeta de peso**:
   - fecha de la última medición;
   - peso de tendencia grande;
   - cambio desde la primera medición;
   - "Última pesada X kg";
   - fichas de IMC con su categoría y de meta ("Meta 95 kg · faltan 9,6");
   - botón principal **"+ Registrar medición"**.

   Lo que hoy muestra la tarjeta Meta (fecha estimada o avisos) va como
   línea bajo las fichas.
2. **Figura de perímetros**: el componente `Cuerpo` actual, sin cambios de
   dibujo, con la fecha de los perímetros, las líneas de asimetría y el
   enlace **"Ver todas las mediciones →"**.

**Columna derecha**
3. **Gráfico**:
   - fichas para elegir la medida: Peso, Grasa, Músculo y Cintura a la
     vista, y el resto en "Más ▾" (todas las medidas numéricas y
     derivadas que hoy ofrece Evolución, más las nuevas);
   - período: 3 meses, 1 año o Todo;
   - para el peso, línea de tendencia; para las demás medidas, el promedio
     móvil de 4 mediciones de hoy;
   - leyenda.
4. **Tarjetas de medidas** en cuadrícula de 3 columnas: una por medida que
   tenga valor en la última medición que la tenga. Cada tarjeta muestra:
   - nombre, valor y unidad;
   - estado en color, si la medida tiene rangos (tabla abajo);
   - barra de rango con un punto en la posición del valor, si tiene rangos;
   - una línea con el cambio frente a la medición anterior que tenga esa
     medida, o una referencia ("65,1 % del peso").

   Orden: % grasa, grasa visceral, músculo esquelético, agua, IMC, grasa
   (kg), peso sin grasa, masa muscular total, proteína, masa ósea,
   metabolismo basal, edad corporal, frecuencia cardíaca.
5. **"Qué indican tus cambios"**: la lista completa de interpretaciones que
   hoy está en Evolución, con su nota fija ("orientación general…").

Estados vacíos: sin mediciones, la ficha muestra la figura vacía y "Registra
la primera medición" con el botón.

## Medidas nuevas

Se agregan a `Medicion`, todas opcionales, con rango válido en `RANGOS`:

| Campo | Nombre | Unidad | Rango |
|---|---|---|---|
| `musculoTotalKg` | Masa muscular total | kg | 5–200 |
| `masaOseaKg` | Masa ósea | kg | 0,5–10 |
| `proteinaPct` | Proteína | % | 5–40 |
| `metabolismoBasalKcal` | Metabolismo basal | kcal | 500–5000 |
| `edadCorporal` | Edad corporal | años | 5–120 |
| `frecuenciaCardiacaLpm` | Frecuencia cardíaca | lpm | 30–220 |

- Aparecen en Registrar medición, en un grupo "Más de la báscula"
  (plegable, abierto si alguno tiene valor), en Todas las mediciones, en el
  CSV (exportar e importar, con alias en español e inglés), en el respaldo
  y en el gráfico.
- **Dos campos de músculo** *(decisión del constructor)*. `musculoKg` es la
  masa muscular **esquelética**, que es lo que el usuario ya tiene
  guardado (unos 40 kg), y `musculoTotalKg` es la "Masa muscular" total de
  Xiaomi (unos 70 kg).
  - **Alias del CSV:** un encabezado con "esquelético", "skeletal" o "SMM",
    o solo "músculo" o "muscle" (como los archivos que ya se importaron),
    va a `musculoKg`. "Masa muscular", "muscle mass" o "músculo total"
    van a `musculoTotalKg`.
  - El usuario puede corregir la asignación en la pantalla de importar,
    como hoy.
  - Lo ya guardado no se mueve ni se modifica.
- **Grasa (kg)**, **peso sin grasa** e **IMC** no se guardan: se calculan
  como hoy (`derivar`).
- Un respaldo antiguo sin estos campos se restaura igual.

## Estados y rangos

Funciones puras en el dominio. Para menores (`esMenor`) no se muestra
estado ni barra, igual que el resto de reglas de adultos.

| Medida | Rangos (estado) |
|---|---|
| IMC | <18,5 Bajo · 18,5–24,9 Normal · 25–29,9 Sobrepeso · ≥30 Obesidad |
| % grasa, hombre 18–39 | <8 Bajo · 8–19,9 Estándar · 20–24,9 Alto · ≥25 Muy alto |
| % grasa, hombre 40–59 | <11 · 11–21,9 · 22–27,9 · ≥28 |
| % grasa, hombre 60+ | <13 · 13–24,9 · 25–29,9 · ≥30 |
| % grasa, mujer 18–39 | <21 · 21–32,9 · 33–38,9 · ≥39 |
| % grasa, mujer 40–59 | <23 · 23–33,9 · 34–39,9 · ≥40 |
| % grasa, mujer 60+ | <24 · 24–35,9 · 36–41,9 · ≥42 |
| Grasa visceral | 1–9 Estándar · 10–14 Alto · ≥15 Muy alto |
| Agua % | hombre <50 Bajo · 50–65 Estándar · >65 Alto; mujer <45 · 45–60 · >60 |
| Proteína % | <16 Bajo · 16–20 Estándar · >20 Alto |

- Las demás medidas no tienen estado ni barra: los rangos de músculo,
  hueso y metabolismo dependen de la estatura y del aparato, y no
  inventamos uno.
- El % de grasa sin edad conocida usa la franja 18–39.
- Colores del estado: Bajo = cian, Estándar o Normal = verde, Alto o
  Sobrepeso = naranja, Muy alto u Obesidad = rojo. Todos son tokens de
  `:root`.
- La barra muestra los tramos de la tabla con anchos fijos y el punto en
  la posición del valor dentro de su tramo.
- Las fuentes de los cortes (OMS para el IMC; Gallagher et al. 2000 para el
  % de grasa; escala habitual de básculas domésticas para visceral, agua y
  proteína) se citan en un comentario en el código y en "Cómo leer estas
  cifras" de la ficha.

## Registrar medición

Pantalla aparte, con encabezado, "← Volver a la ficha" y el título
"Registrar medición · <nombre>". Tres pestañas internas, con "Escribir"
elegida al entrar:

1. **Escribir:** el formulario de Medir de hoy, con todo su comportamiento
   (borradores por persona, valores anteriores, aviso de reemplazo, guía
   para medir), más el grupo "Más de la báscula". Al guardar, vuelve a la
   ficha y muestra "Medición guardada" en ella.
2. **Captura de Xiaomi Home:** por ahora, un texto que dice que llegará
   pronto. El trabajo siguiente la llena.
3. **Archivo:** la importación de hoy (elegir archivo, asignar columnas,
   resumen, confirmar), con la persona fijada a la del perfil. Al
   confirmar, vuelve a la ficha.

"Cancelar" y Volver no guardan. Si hay cambios sin guardar, el borrador se
conserva como hoy.

## Todas las mediciones

La tabla del Historial de hoy (columnas, edición, borrado con confirmación
en la fila), con Volver. "Editar" abre Registrar medición en esa fecha.

## Familia y Ajustes y datos

- **Familia:** la pantalla de hoy (tarjetas, agregar, editar, borrar), más
  la ★ para elegir la persona principal. "Ver ficha" lleva a la ficha de
  esa persona, y "Registrar medición" a su pantalla de registro.
- **Ajustes y datos:** todo lo de la pestaña Datos de hoy: importar CSV de
  cualquier persona, exportar, respaldo, restaurar y recordatorio. Arriba
  se agrega "Persona principal" con una lista para elegirla.

## Estilo

- Tema oscuro y tokens actuales, tipografía Plus Jakarta Sans.
- Botones y fichas de al menos 44 px de alto.
- La tarjeta de peso con un degradado sutil de `--accent`, como en la
  maqueta.
- Sin colores literales fuera de `:root`.
- Ningún texto ni control se corta a 400 px de ancho, y la página no
  tiene desplazamiento horizontal (las tablas se desplazan dentro de su
  caja).

## Pruebas

- **Unitarias:**
  - estados y rangos: cada medida, cada borde de tramo, sexo y edad, sin
    edad, menor;
  - nuevos campos en la validación, el CSV y el respaldo;
  - resolución del inicio (principal, principal borrada, sin personas);
  - lectura de las direcciones.
- **Extremo a extremo:** se reescriben las pruebas actuales para la nueva
  navegación, manteniendo lo que cada una comprueba. Se agregan:
  - abrir la app lleva a la ficha principal;
  - cambiar de perfil;
  - Registrar → Volver;
  - Atrás del navegador;
  - importar desde Registrar;
  - medidas nuevas visibles en la ficha;
  - sin desplazamiento horizontal a 400 px.
