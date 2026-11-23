---
version: 1
slug: "src-ui-ficha-tsx"
primary_target: "src/ui/Ficha.tsx"
related_targets: ["src/ui/styles.css","src/ui/Medida.tsx","src/ui/App.tsx"]
---

# Mesura app shell (ficha, medida, cifras, semana, registrar, familia, ajustes)

Scope: the whole app UI, Operate mode. Audience: the owner and his family, on the phone right after the weekly weigh-in and tape measuring. Task: see how the body changed and what to do; record a measurement. Constraints: every function and route kept; 44 px targets, AA contrast, screen-reader text; tests stay green.

## Direction contract

THESIS: Mesura reads like a dressmaker's pattern sheet: each person is a pattern line, each measurement a labeled mark on that line. It refuses the category default of dark health-dashboard cards with neon accents.

OWN-WORLD: Cool white pattern paper (#F3F5F8 ground, white sheets), ink near-black, a cobalt envelope band for the shell header. Pattern-line inks carry meaning: cobalt for actions and the current person, red/green/amber only for states. Lines are drawn like pattern lines: solid for now, dashed for before, triangular notch marks for changes. Archivo variable: condensed widths for figures and labels, normal width for reading. Thin 1.5 px rules, square-ish 10 px corners, no glow.

STORY: Open the app, read weight trend and its notch (change), four key figures, and the body pattern with its girths; tap any figure to open its chart; register the next measurement.

FIRST VIEWPORT: cobalt header band (logo, profile select, settings). Under it a white sheet: name and goal in one line, weight trend in large condensed numerals with its change notch, the week's action in one line. Then a 2x2 grid of figure cells. Primary action "+ Registrar medición" stays at the bottom of the ficha, full width, cobalt.

FORM: sewing pattern sheet, grounded list position 1 (the user chose IMPECCABLE'S PICK over assigned candidate 5, topographic map). seed:839d212cf3f8c7df. Signature move: the body figure as a pattern piece — outline drawn as a cutting line with a dashed seam-allowance line inside it, each girth a labeled pattern mark with its change notch (▼/▲) under the value, plus the grainline arrow down the center; charts use the same line grammar (trend solid cobalt, weigh-ins as a dashed ink line with open notch dots).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Raises (declined challengers): Crouwel grid specimen — figure cells reflow in whole cells on a strict grid. Boarding pass/gate board — a changed value keeps its notch color until the next measurement.
