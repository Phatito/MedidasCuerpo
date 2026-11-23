# Marca y promo de Mesura

## Archivos

| Archivo | Qué es |
|---|---|
| `public/logo.svg` | Marca (símbolo) cuadrada, fondo transparente. Para fondos oscuros. |
| `public/logo-horizontal.svg` | Marca + palabra "Mesura" en Plus Jakarta Sans ExtraBold convertida a trazos, con un degradado de blanco a cian al final; para encabezados. |
| `public/favicon.svg` | Marca simplificada (sin marcas de cinta) sobre baldosa #0e1220, para la pestaña del navegador. |
| `public/icon-192.png`, `public/icon-512.png` | Íconos de la app (PWA). Fondo a sangre completa, marca dentro del 80 % central: valen como `maskable`. |
| `public/apple-touch-icon.png` | Ícono 180×180 para iPhone/iPad, sin transparencia. |
| `public/og-image.png` | Vista previa para redes y mensajería (1200×630). |
| `marketing/promo.html` | Fuente animada del video (28 s). Se puede abrir en el navegador: se reproduce en bucle. `?f=v` vertical, `?f=h` horizontal, `?f=og` imagen social, `&t=12` congela un segundo. |
| `marketing/render-promo.cjs` | Script que genera íconos, póster, og-image y videos. |
| `marketing/promo-vertical.mp4` | Video 1080×1920 (H.264, 30 fps, sin audio) para teléfonos e historias. |
| `marketing/promo-horizontal.mp4` | Video 1920×1080 para YouTube, web y presentaciones. |
| `marketing/promo-poster.png` | Cuadro final del video vertical, para usar como portada. |

Todos los nombres (Ana, Tomás, Lucía, Marcos) y números del video son inventados.

## Volver a renderizar

Desde la raíz del repo (necesita `playwright` con Chromium y `ffmpeg`):

```sh
node marketing/render-promo.cjs            # todo (≈10 min)
node marketing/render-promo.cjs icons      # solo íconos PNG
node marketing/render-promo.cjs stills     # póster + og-image
node marketing/render-promo.cjs video      # solo los dos videos
node marketing/render-promo.cjs preview 3 8 12   # cuadros sueltos en marketing/.preview/ (bórrala después)
```

Los textos y datos del video se editan en `marketing/promo.html`. La línea de tiempo está en la constante `SC` (inicio y fin de cada escena).

## La marca

Una cinta métrica cerrada en anillo (degradado violeta → cian, con marcas de medida) y, dentro, una línea de tendencia en zigzag que dibuja una "M" y sale por la abertura de la cinta hasta un punto verde: medir con constancia para ver el progreso.

### Colores

| Uso | Color |
|---|---|
| Fondo | `#0e1220` |
| Tarjetas | `#171c30` |
| Violeta (acento) | `#7c5cff` |
| Cian | `#35e3ff` |
| Verde (bien / progreso) | `#3fe0a5` |
| Naranja (atención) | `#ffb454` |
| Texto | `#f2f4fb` (secundario `#b8bfd6`) |

Tipografía: **Plus Jakarta Sans** ExtraBold (800) para la marca y títulos; 500–700 para texto.
En la palabra, "Medidas" va en `#f2f4fb` y "Cuerpo" en `#35e3ff`.

### Reglas

- **Tamaño mínimo:** símbolo 16 px (usar `favicon.svg`, sin marcas de cinta); logo horizontal 24 px de alto.
- **Espacio libre:** alrededor del logo, como mínimo el diámetro del punto verde × 2 (≈ 1/6 del alto del símbolo).
- **Fondo:** siempre sobre oscuro (`#0e1220`, `#171c30` o una foto oscura). En fondos claros, colocar el símbolo dentro de la baldosa oscura (como `favicon.svg`).
- **Sí:** usar los archivos SVG tal cual; escalar en proporción; usar los colores de la paleta.
- **No:** cambiar colores ni el degradado, estirar, rotar, añadir sombras o contornos, separar el punto verde, cerrar la abertura del anillo, poner el símbolo blanco sobre fondo blanco, ni reescribir la palabra con otra tipografía.
- Texto sobre fondo siempre con contraste AA (blanco `#f2f4fb` o `#b8bfd6` sobre los fondos de la paleta).
