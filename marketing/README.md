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

El logo se hizo con la IA de diseño de Canva (para la versión oscura de la app): una cinta de medir que aprieta una cintura, sobre una báscula. El original completo, con la palabra "Mesura", está en `marketing/logo-canva.png`. Los íconos de la app (`public/icon-*.png`, `apple-touch-icon.png`), la marca de la barra (`public/logo-mark.png`) y el favicon (`public/favicon-64.png`) son recortes cuadrados del símbolo, sin el texto. Las propuestas anteriores dibujadas a mano están en `marketing/logos/`.

## El video (24 s)

1. La cinta entra de golpe y se cierra sobre la cintura; la báscula sube.
2. Semana a semana la cinta aprieta, la cintura se afina y la báscula baja de 96,4 a 92,5 kg (números inventados).
3. La cinta se vuelve la línea de tendencia.
4. La app real en un teléfono: la ficha, el gráfico de grasa y "Tu semana" (capturas en `marketing/capturas/`, con datos inventados).
5. Cierre con el logo, "Mide tu progreso." y la dirección.

El logo del video es un redibujo animable del de Canva (cintura, cinta y báscula como trazos SVG dentro de `promo.html`).
