---
name: Mesura
description: Weekly body measurements read like a dressmaker's pattern sheet, drawn in tailor's chalk on charcoal wool.
colors:
  envelope-navy: "#1d2a48"
  cobalt: "#3d6ab0"
  cobalt-deep: "#345c9b"
  chalk-blue: "#9cbde8"
  selection-navy: "#34507d"
  on-cobalt: "#ffffff"
  wool: "#16171a"
  sheet: "#1b1c20"
  soft-fold: "#222327"
  cut-rule: "#3a3b3f"
  sheet-edge: "#45443f"
  seam-dash: "#5a5853"
  field-edge: "#77736b"
  pattern-piece: "#24262c"
  chalk: "#eceef1"
  graphite: "#a8abb2"
  state-good: "#9cc79a"
  state-good-bg: "#1f2a20"
  state-warn: "#e2c36b"
  state-warn-bg: "#2c2717"
  state-bad: "#ec8692"
  range-low: "#8fbbe6"
  range-ok: "#9cc79a"
  range-high: "#e2c36b"
  range-very-high: "#ec8692"
typography:
  display:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "4.2rem"
    fontWeight: 720
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 72"
  figure:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 720
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 72"
  headline:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 750
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 88"
  title:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 88"
  body:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 650
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 82"
rounded:
  hairline: "2px"
  tag: "6px"
  chip: "8px"
  sheet: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  gutter-mobile: "16px"
  gutter: "20px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-cobalt}"
    rounded: "{rounded.sheet}"
    padding: "9px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-primary-large:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-cobalt}"
    rounded: "{rounded.sheet}"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sheet}"
    padding: "9px 18px"
    height: "44px"
  button-link:
    textColor: "{colors.chalk-blue}"
    height: "44px"
  chip-toggle:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "44px"
  chip-toggle-active:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-cobalt}"
  input-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sheet}"
    padding: "9px 12px"
    height: "44px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sheet}"
    padding: "18px"
  figure-cell:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.chalk}"
    padding: "12px 14px"
    height: "96px"
  figure-cell-hover:
    backgroundColor: "{colors.soft-fold}"
  figure-band-cell:
    textColor: "{colors.chalk}"
    padding: "10px 8px"
    height: "82px"
  envelope-band:
    backgroundColor: "{colors.envelope-navy}"
    textColor: "{colors.on-cobalt}"
    padding: "12px 20px"
  state-tag:
    backgroundColor: "{colors.state-good-bg}"
    textColor: "{colors.state-good}"
    rounded: "{rounded.tag}"
    padding: "3px 11px"
---

# Design System: Mesura

## Overview

**Creative North Star: "The Pattern Sheet"**

Mesura reads like a dressmaker's pattern sheet, drawn in tailor's chalk on charcoal wool. The ground is a neutral charcoal wool (wool), never blue slate. Sheets lie on it barely lifted (sheet) and are defined by their chalk cutting lines, not by a lighter fill. Everything is drawn in warm chalk white; a pale chalk blue marks what is "now"; a deep navy wool band runs across the top like the envelope a pattern ships in. Each person is a pattern piece and each measurement a labeled mark on it. The body figure is literally a pattern piece: a wool fill, a chalk cutting line, a dashed chalk-blue seam allowance inside it, a double-headed grainline down the center, and each girth a chalk-blue band with a triangular notch where its dimension line meets the piece.

The system is dark, dense and drafted rather than decorated. The pattern world was first built light; the owner asked for dark colors ("prefiero colores oscuros"), so the same grammar ships as chalk on wool, and that preference is the reason the palette is dark. Depth comes from lines on cloth, never from glow or from stacked fills. Figures are set narrow and firm on Archivo's width axis, the way a pattern prints its sizes; reading text stays at normal width. Meaning lives in line style: solid is now, dashed is before or alongside, a filled triangle notch is a change. Color is reserved and muted: a chalk-blue fill for the action, chalk blue for the current reading, and states in soft chalk tones (muted green, chalk yellow, chalk red).

The rejected category default is the neon health dashboard: glowing cards, saturated cyan and purple accents, gradients. Dark here is cloth, not a screen.

**Key Characteristics:**
- Neutral charcoal wool ground; sheets barely lifted and drawn by 1.5px chalk cutting lines.
- One navy envelope band at the top; a muted cobalt fill only for the primary action and pressed toggles; chalk blue for every line, link and focus.
- States in chalk tones, never bright: muted green, chalk yellow, chalk red, chalk blue.
- Condensed tabular numerals (wdth 72) for every figure; condensed labels (wdth 82); normal width for prose.
- Solid / dashed / notch line grammar shared by the body figure, charts and the week line.
- 10px corners on everything that holds content or takes a tap; no pills.

## Colors

A chalk-and-wool palette: neutral charcoal cloth, warm chalk white, one muted cobalt fill for action, one pale chalk blue for marks, and state tones that read as chalk, not ink.

### Primary
- **Envelope Navy** (envelope-navy): the header band only. The single large colored area on any screen; white text and controls sit on it, and the profile avatar's initial takes this navy on a white tile.
- **Chalk-Blue Fill** (cobalt): fill of primary buttons ("Registrar medición"), pressed toggles and selects, always under white text. Never a line and never text on the wool.
- **Pressed Fill** (cobalt-deep): hover and press state of primary buttons only.
- **Chalk Blue** (chalk-blue): blue as chalk. Links, the "Tu semana." lead-in, chart trend and average lines and their end dot, the lean bars of the week chart, girth bands, the seam allowance, grainline and notch pins on the body figure, hover borders on cells and the week line, the selected register mode, and every focus outline.
- **Selection Navy** (selection-navy): text selection and the 3px focus ring around a focused input.

### Neutral
- **Charcoal Wool** (wool): the page ground. Neutral; a blue cast is a regression.
- **Sheet** (sheet): cards, figure cells, inputs, secondary buttons, toggles, the week line on the ficha. Barely above the wool on purpose: the line, not the fill, makes the sheet.
- **Soft Fold** (soft-fold): quiet fills and washes: neutral tags, menu item hover, notices, the inline intake form, the selected register mode, and the hover wash of a figure cell.
- **Cut Rule** (cut-rule): inner rules: the lines that divide the ficha's figure band, the gutters between "Todas las cifras" tiles, dashed chart gridlines, menu dividers.
- **Sheet Edge** (sheet-edge): the default 1.5px border of every sheet, tile and register mode. A quiet cut, not a boundary a control depends on.
- **Seam Dash** (seam-dash): the dashed border of the "Tu semana" line, the one container drawn as a seam rather than a cut.
- **Field Edge** (field-edge): borders of inputs, selects and textareas. Set to hold 3:1 against the sheet; a control's boundary never uses sheet-edge or cut-rule.
- **Pattern Piece** (pattern-piece): the body figure's fill and the cover stroke over the seam allowance.
- **Chalk** (chalk): text, figures, and the cutting lines: the ficha's weight sheet border, the outer border of the "Todas las cifras" grid, the body figure's outline; also the dashed "each weigh-in" chart line and the dashed previous-value band on the figure, and the range-bar dot.
- **Graphite** (graphite): labels, units, secondary text, chevrons and icons in lines, inactive change values.

### Tertiary (states)
- **Muted Green** (state-good on state-good-bg): a change in the direction of the person's goal, success notices, "yes" marks in the weekly review.
- **Chalk Yellow** (state-warn on state-warn-bg): a change against the goal, pending items, warnings, the fat bars in the week chart.
- **Chalk Red** (state-bad): errors, destructive actions, "no" marks in the weekly review.
- **Range tones** (range-low, range-ok, range-high, range-very-high): the four segments of a health-range bar and the matching state word ("Bajo", "Normal", "Alto", "Muy alto"). Never used for anything else.

### Named Rules
**The Envelope Rule.** One large colored area per screen: the navy header band. Below it, the cobalt fill appears only on the one primary action and on pressed toggles; every other blue is chalk-blue line or text.

**The Chalk Rule.** On wool, blue as ink is chalk blue, never the cobalt fill. The fill sits under white text; chalk blue is the line, the link, the mark and the focus ring.

**The Chalk Tone Rule.** Every state color is a soft chalk tone with AA contrast on the wool. No saturated or bright state inks; if a state color glows, it is wrong.

**The State Ink Rule.** Green, yellow and red mean a state and nothing else. A change value is graphite unless it is judged against the person's goal; then it takes green or yellow.

## Typography

**Display Font:** Archivo Variable (with system-ui, -apple-system, Segoe UI fallback), loaded with its width axis.
**Body Font:** Archivo Variable at normal width.

**Character:** One family, three widths. Narrow (72) for numbers, semi-narrow (80–88) for labels, headings and the wordmark, normal (100) for reading. The width axis does the work another system would hand to a second typeface.

### Hierarchy
- **Display** (720, 4.2rem, line-height 0.95, wdth 72, tabular): the trend weight on the ficha. One per screen.
- **Figure** (720, wdth 72, tabular): every measured value. 2rem in "Todas las cifras" tiles, 2.2rem on a metric screen, 1.55rem in the ficha's figure band (1.9rem from 900px), 17.5px on the body figure. Units drop to a small graphite span.
- **Headline** (750, 1.65rem, wdth 88, -0.015em): screen titles, set as h1; the person's name on the ficha at 1.45rem beside the goal and date.
- **Title** (700, 1.1rem, wdth 88): section and card titles; the "Mesura" wordmark sets at 760, 1.3rem, wdth 80 in the band.
- **Body** (400, 16px, line-height 1.5, wdth 100): prose, insights, the week's action. Secondary text at 0.875rem.
- **Label** (650, 0.78rem, wdth 82, +0.01em, sentence case): labels over figures ("Peso de tendencia", "Grasa"), chart axes, legends; 0.72rem in the ficha's figure band, truncated on one line; body-figure labels at 14.5px.

### Named Rules
**The Narrow Numeral Rule.** Every measured number is set at wdth 72, weight 720, tabular. Prose numbers stay at body width.

**The Sentence-Case Label Rule.** Labels are condensed and graphite, never uppercase-tracked. Width carries the label voice, not capitals.

## Layout

A single centered column (max 1200px) with 16px side gutters on phones and 20px from 600px up. The ficha stacks one weight sheet (name, goal and date on one line; trend weight with its notch line; the four key figures as a ruled band inside the same sheet), then the body figure (max 320px wide on phones), the week line, the links sheet and the full-width "Registrar medición" button. Name, trend weight and all four figures share the first viewport at 400px. From 900px it becomes two columns, with the body figure sheet spanning the full height of the right column (figure up to 520px wide).

Rhythm runs in small steps: 4 / 8 / 12 / 14 / 18px. Sheets pad 18px; tiles pad 12px 14px with a 96px minimum height; figure-band cells pad 10px 8px with an 82px minimum; stacks gap 12–18px. "Todas las cifras" tiles flow in a ruled grid; a lone last tile spans the row. Breakpoints in use: 600, 760, 860 and 900px. Nothing scrolls horizontally at 400px except full-size charts, which sit in their own scroller.

## Elevation & Depth

Flat. Depth is line on cloth: sheets sit one hair above the wool and are drawn by their edges. The weight sheet and the "Todas las cifras" grid take a full chalk cutting line, which lifts them by contrast, not by shadow; every other sheet takes the quieter sheet-edge.

### Shadow Vocabulary
- **Floating menu** (`box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6)`): the profile menu, the only element that floats over the sheet.
- **Dialog scrim** (`background: rgba(4, 6, 12, 0.7)`): behind modal dialogs; the dialog itself takes a cobalt border, no shadow.

### Named Rules
**The Cutting Line Rule.** A sheet is made by its line, not its fill. Lift a surface with a chalk or sheet-edge border, never with a lighter fill, a glow or a shadow.

**The Cloth On Cloth Rule.** Surfaces never cast shadows at rest. Only an overlay that truly floats (the profile menu) gets the one soft black shadow; no glows, no colored halos except the input focus ring.

## Shapes

Square-ish and drafted. Content containers, buttons, toggles, chips, notices, inputs, icon buttons, the star toggle, the profile selector and the week line all take 10px corners; tags take 6px, chips and avatars 8px, range-bar segments 2px. Borders are 1.5px everywhere (2px for the selected register mode, in chalk blue). Grouped figures are never separate cards: on the ficha they are a band ruled by cut-rule lines above, below and between cells; in "Todas las cifras" they are cells of one grid with a chalk outer line and cut-rule gutters.

The recurring geometry is the **notch**: a small filled triangle (point down for a decrease, up for an increase) used for every change value and at the end of every girth dimension line on the body figure. Icons are drawn strokes on a 24px grid, 2px stroke, round caps and joins, inheriting color: open, back, plus, yes, no, edit, star, and "this week" (three ruled lines with an arrow). Disclosure markers are a drawn chevron that rotates open.

## Components

### Buttons
Firm, drafted, never pill-shaped.
- **Shape:** 10px corners, 1.5px border, 44px minimum height.
- **Primary:** cobalt fill, white text, weight 700. The ficha's "Registrar medición" is the large variant: full width, 52px, 1.05rem, weight 800, with the drawn plus icon at 18px.
- **Hover / Focus:** primary deepens to the pressed fill (no brightness filter). Focus is a 2.5px chalk-blue outline, 2px offset; white inside the band.
- **Secondary:** sheet fill, edge border, chalk text. "Volver" adds the drawn back chevron.
- **Link:** no fill, chalk-blue text, 44px tall hit area.

### Toggles (chips)
- **Style:** 44px tall, 10px corners, sheet fill, 1.5px border, 0.875rem weight 700.
- **State:** pressed / active fills cobalt with white text.

### Cards / Sheets
- **Corner Style:** 10px.
- **Background:** sheet on wool.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1.5px sheet-edge; the ficha weight sheet takes the chalk cutting line.
- **Internal Padding:** 18px.
- **Insight sheets:** a good or caution insight keeps the sheet shape with its state wash fill and a border mixed 45% state tone into the sheet.

### Inputs / Fields
- **Style:** sheet fill, 1.5px field-edge border (3:1), 10px corners, 44px minimum height, graphite 0.8rem label above.
- **Focus:** border turns cobalt with a 3px selection-navy ring, no outline.
- **Error:** 0.8rem chalk-red text under the field, weight 600.

### Navigation (envelope band)
The header is a full-width navy band: the logo on a white 9px-rounded tile, the condensed wordmark (hidden under 600px), the profile selector as a translucent white control with a white initial tile, and a settings icon button with a 45%-white border. Hover is a 14% white wash. Focus outlines turn white.

### Figure Band (ficha)
The four key figures as a ruled band of the weight sheet: no box and no fill of its own, a cut-rule line above and below, a cut-rule line between cells, the first cell flush with the sheet's text. Each cell: condensed graphite label on one line, narrow figure with small unit, then the state word in its range tone and the change as notch plus value, stacked. Hover washes the cell in soft fold; the whole cell is the tap target and opens its chart.

### Figure Tiles (Todas las cifras)
A two-column grid of cells inside one chalk cutting line, with 1.5px cut-rule gutters. Same cell anatomy as the band, at 2rem figures; hover washes to soft fold and draws a chalk-blue edge.

### Range Bar
A 5px bar of four 2px-rounded segments in the range tones, with a 12px chalk dot ringed in sheet color marking the current value. Always paired with the state word in text.

### Week Line
"Tu semana" as one tappable line: sheet fill, 1.5px dashed seam-dash border, the drawn "this week" icon in graphite, a chalk-blue bold lead-in, two-line clamp, a drawn chevron. Hover turns the border solid chalk blue: the seam becomes a cut.

### Body Figure (signature)
The person as a pattern piece in SVG: pattern-piece fill, 1.6px chalk cutting line traced in on open (0.9s, ease-out-expo, skipped under reduced motion), a dashed chalk-blue seam allowance clipped inside, a chalk-blue grainline with arrowheads. Each girth: a 2.5px chalk-blue band with filled chalk-blue pins, the previous value as a dashed chalk band beneath it at 45%, a thin chalk leader to a condensed label, the value in narrow figures, and the change as a drawn notch plus number in graphite or its state tone. The figure carries a full text description for screen readers.

### Charts
Same line grammar: dashed cut-rule gridlines, condensed graphite axes. With a trend or average present, the chalk-blue line is the 3px solid reading and each weigh-in is a 1.25px dashed chalk line at 55% with open dots; the last value is labeled in narrow chalk figures. A single series draws solid chalk blue with an 8% chalk-blue area. Legends draw their line samples in the same styles. The week's fat and lean bars use chalk yellow and chalk blue.

## Do's and Don'ts

### Do:
- **Do** set every measured number in Archivo at wdth 72, weight 720, tabular figures.
- **Do** mark every change with the notch triangle (down for less, up for more) plus a screen-reader word, colored green or yellow only when judged against the goal.
- **Do** draw "now" as a solid line and "before" or "each reading" as a dashed one, on the figure and in charts alike.
- **Do** define a sheet by its cutting line: chalk for the weight sheet and the cifras grid, sheet-edge for the rest.
- **Do** draw lines, links and focus in chalk blue; keep the cobalt fill for surfaces under white text.
- **Do** keep 10px corners and 1.5px borders on every container, control and input.
- **Do** group related figures as a ruled band or a ruled grid rather than loose cards.
- **Do** keep every tap target at least 44px, control borders at 3:1, and pair every color state with a word.

### Don't:
- **Don't** turn the dark into a neon health dashboard: no glows, gradients or saturated cyan and purple accents.
- **Don't** tint the wool or the sheets blue; the ground is neutral charcoal.
- **Don't** lift a sheet with a lighter fill; lift it with a line.
- **Don't** use pill shapes (999px radius) for buttons, toggles, chips or tags.
- **Don't** fill a second large area with color below the envelope band.
- **Don't** use green, yellow, red or the range tones decoratively.
- **Don't** add shadows or glows to resting surfaces; the floating menu's shadow is the only one.
- **Don't** set labels in tracked uppercase.
