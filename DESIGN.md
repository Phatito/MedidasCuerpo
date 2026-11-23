---
name: Mesura
description: Weekly body measurements read like a dressmaker's pattern sheet, chalked on dark wool.
colors:
  envelope-navy: "#1b2a78"
  cobalt: "#3d5cf0"
  cobalt-deep: "#2f4bd6"
  chalk-blue: "#93a8ff"
  selection-navy: "#2c3f8f"
  on-cobalt: "#ffffff"
  wool: "#0f131b"
  sheet: "#171c27"
  soft-fold: "#1f2532"
  cut-rule: "#2b3242"
  cell-hover: "#1c2232"
  pattern-piece: "#1d2540"
  seam-dash: "#4a5672"
  chalk: "#eef1f6"
  chalk-line: "#e9edf5"
  graphite: "#a3acbd"
  state-good: "#52d69c"
  state-good-bg: "#13372a"
  state-warn: "#f2b45a"
  state-warn-bg: "#3b2a12"
  state-bad: "#ff7a88"
  range-low: "#6cc3f5"
  range-ok: "#52d69c"
  range-high: "#f2b45a"
  range-very-high: "#ff7a88"
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
    backgroundColor: "{colors.cell-hover}"
  figure-row-cell:
    backgroundColor: "{colors.sheet}"
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

Mesura reads like a dressmaker's pattern sheet, chalked on dark wool. The ground is a blue-black wool (wool), sheets lie on it one tone lighter (sheet), and everything is drawn in tailor's chalk: near-white chalk for text and cutting lines, a chalk blue for the marks that mean "now". A deep navy band runs across the top like the envelope a pattern ships in. Each person is a pattern piece and each measurement a labeled mark on it. The body figure is literally a pattern piece: a navy wool fill, a chalk cutting line, a dashed chalk-blue seam allowance inside it, a double-headed grainline down the center, and each girth a chalk-blue band with a triangular notch where its dimension line meets the piece.

The system is dark, dense and drafted rather than decorated. The pattern world was first built light (cool paper, white sheets, ink); the owner asked for dark colors, so the same grammar now ships as chalk on wool, and that preference is the reason the palette is dark. Depth comes from cloth on cloth and from rules, never from glow. Figures are set narrow and firm on Archivo's width axis, the way a pattern prints its sizes; reading text stays at normal width. Meaning lives in line style: solid is now, dashed is before or alongside, a filled triangle notch is a change. Color is reserved: cobalt fills only the action, chalk blue draws the current reading, and green, amber and red mean states.

The rejected category default is the neon health dashboard: glowing cards, saturated cyan and purple accents, gradients. Dark here is cloth, not a screen.

**Key Characteristics:**
- Blue-black wool ground with one-tone-lighter sheets and 1.5px rules.
- One navy envelope band at the top; cobalt fill only for the primary action and active toggles; chalk blue for every line, link and focus.
- Condensed tabular numerals (wdth 72) for every figure; condensed labels (wdth 82); normal width for prose.
- Solid / dashed / notch line grammar shared by the body figure, charts and the week line.
- 10px corners on everything that holds content or takes a tap; no pills.

## Colors

A wool-and-chalk palette: blue-black cloth, near-white chalk, one cobalt for action and one chalk blue for marks, plus a disciplined set of bright state inks tuned for AA on dark.

### Primary
- **Envelope Navy** (envelope-navy): the header band only. The single large colored area on any screen; white text and controls sit on it, and the profile avatar's initial takes this navy on a white tile.
- **Cobalt** (cobalt): fill of primary buttons ("Registrar medición") and pressed toggles, always under white text. Never used as a line or as text on the dark ground.
- **Pressed Cobalt** (cobalt-deep): hover and press state of primary buttons only.
- **Chalk Blue** (chalk-blue): the blue as ink. Links, the "Tu semana." lead-in, chart trend and average lines, the end dot, girth bands, the seam allowance, the grainline and notch pins on the body figure, hover borders on cells and the week line, and every focus outline.
- **Selection Navy** (selection-navy): text selection and the 3px focus ring around a focused input.

### Neutral
- **Wool** (wool): the page ground.
- **Sheet** (sheet): cards, figure cells, inputs, secondary buttons, toggles; every surface that carries content.
- **Soft Fold** (soft-fold): quiet fills: neutral tags, chips, menu item hover and current item, informational notices, the inline intake form.
- **Cut Rule** (cut-rule): default 1.5px borders, dashed chart gridlines, table rules, the 1.5px gutters between figure cells. A quiet rule, not a boundary a control depends on.
- **Cell Hover** (cell-hover): the wash a figure cell takes on hover.
- **Pattern Piece** (pattern-piece): the body figure's fill and the cover stroke over the seam allowance.
- **Seam Dash** (seam-dash): the dashed border of the "Tu semana" line, the one UI container drawn as a seam rather than a cut.
- **Chalk** (chalk): text, figures, the dashed "each weigh-in" line in charts, the dashed previous-value band on the figure, the range-bar dot.
- **Chalk Line** (chalk-line): the cutting lines: the ficha's weight sheet border, the outer border of the "Todas las cifras" grid, the body figure's outline.
- **Graphite** (graphite): labels, units, secondary text, chevrons, inactive change values.

### Tertiary (states)
- **Good Green** (state-good on state-good-bg): a change in the direction of the person's goal, success notices, "yes" marks in the weekly review.
- **Caution Amber** (state-warn on state-warn-bg): a change against the goal, pending items, warnings, the fat bars in the week chart.
- **Alarm Red** (state-bad): errors, destructive actions, "no" marks in the weekly review.
- **Range inks** (range-low, range-ok, range-high, range-very-high): the four segments of a health-range bar and the matching state word ("Bajo", "Normal", "Alto", "Muy alto"). Never used for anything else.

### Named Rules
**The Envelope Rule.** One large colored area per screen: the navy header band. Below it, cobalt appears only as the fill of the one primary action and of pressed toggles; every other blue is chalk-blue line or text.

**The Chalk Rule.** On wool, blue as ink is chalk blue, never cobalt. Cobalt is a fill under white text; chalk blue is the line, the link, the mark and the focus ring.

**The State Ink Rule.** Green, amber and red mean a state and nothing else. A change value is graphite unless it is judged against the person's goal; then it takes green or amber.

## Typography

**Display Font:** Archivo Variable (with system-ui, -apple-system, Segoe UI fallback), loaded with its width axis.
**Body Font:** Archivo Variable at normal width.

**Character:** One family, three widths. Narrow (72) for numbers, semi-narrow (80–88) for labels, headings and the wordmark, normal (100) for reading. The width axis does the work another system would hand to a second typeface.

### Hierarchy
- **Display** (720, 4.2rem, line-height 0.95, wdth 72, tabular): the trend weight on the ficha. One per screen.
- **Figure** (720, wdth 72, tabular): every measured value. 2rem in "Todas las cifras" tiles, 2.2rem on a metric screen, 1.55rem in the ficha's four-cell row (1.9rem from 900px). Units drop to a small graphite span at normal tracking.
- **Headline** (750, 1.65rem, wdth 88, -0.015em): screen titles, set as h1; the person's name on the ficha at 1.45rem beside the goal and date.
- **Title** (700, 1.1rem, wdth 88): section and card titles; the "Mesura" wordmark sets at 760, 1.3rem, wdth 80 in the band.
- **Body** (400, 16px, line-height 1.5, wdth 100): prose, insights, the week's action. Secondary text at 0.875rem.
- **Label** (650, 0.78rem, wdth 82, +0.01em, sentence case): labels over figures ("Peso de tendencia", "Grasa"), chart axes, legends; 0.72rem in the ficha's four-cell row; body-figure labels at 14.5px.

### Named Rules
**The Narrow Numeral Rule.** Every measured number is set at wdth 72, weight 720, tabular. Prose numbers stay at body width.

**The Sentence-Case Label Rule.** Labels are condensed and graphite, never uppercase-tracked. Width carries the label voice, not capitals.

## Layout

A single centered column (max 1200px) with 16px side gutters on phones and 20px from 600px up. The ficha stacks one weight sheet (name and goal on one line, trend weight with its notch line, and the four key figures as a ruled row of cells inside the same sheet), then the body figure (max 320px wide on phones), the week line, the links sheet and the full-width "Registrar medición" button. Name, trend weight and all four figures share the first viewport at 400px. From 900px it becomes two columns, with the body figure sheet spanning the full height of the right column (figure up to 520px wide).

Rhythm runs in small steps: 4 / 8 / 12 / 14 / 18px. Sheets pad 18px; figure cells pad 12px 14px with a 96px minimum height (10px 8px and 82px in the ficha row); stacks gap 12–18px; the main column sits 22px under the band. "Todas las cifras" tiles flow in an auto-fill grid (min 160px); a lone last tile spans the row. Breakpoints in use: 600, 760, 860 and 900px. Nothing scrolls horizontally at 400px except full-size charts, which sit in their own scroller.

## Elevation & Depth

Flat. Depth is cloth on cloth: sheets one tone above the wool, separated by 1.5px rules. The weight sheet and the cifras grid take a chalk-line border, which lifts them by contrast, not by shadow.

### Shadow Vocabulary
- **Floating menu** (`box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55)`): the profile menu, the only element that floats over the sheet.
- **Dialog scrim** (`background: rgba(4, 6, 12, 0.7)`): behind modal dialogs; the dialog itself takes a cobalt border, no shadow.

### Named Rules
**The Paper On Paper Rule.** Surfaces never cast shadows at rest. Only an overlay that truly floats (the profile menu) gets the one soft black shadow; no glows, no colored halos except the input focus ring.

## Shapes

Square-ish and drafted. Content containers, buttons, toggles, chips, notices, inputs, icon buttons, the profile selector and the week line all take 10px corners; tags take 6px, chips and avatars 8px, range-bar segments 2px. Borders are 1.5px everywhere (2px for the selected register mode, in chalk blue). Figure cells are not separate cards: they are cells of one ruled sheet, a bordered grid whose 1.5px cut-rule gutters read as cutting lines.

The recurring geometry is the **notch**: a small filled triangle (point down for a decrease, up for an increase) used for every change value and at the end of every girth dimension line on the body figure. Icons are drawn strokes on a 24px grid, 2px stroke, round caps and joins, inheriting color: open, back, plus, yes, no, edit and "this week" (three ruled lines with an arrow). Disclosure markers are a drawn chevron that rotates open.

## Components

### Buttons
Firm, drafted, never pill-shaped.
- **Shape:** 10px corners, 1.5px border, 44px minimum height.
- **Primary:** cobalt fill, white text, weight 700. The ficha's "Registrar medición" is the large variant: full width, 52px, 1.05rem, weight 800, with the drawn plus icon at 18px.
- **Hover / Focus:** primary deepens to pressed cobalt (no brightness filter); secondary's border lightens to graphite. Focus is a 2.5px chalk-blue outline, 2px offset; white inside the band.
- **Secondary:** sheet fill, cut-rule border, chalk text. "Volver" adds the drawn back chevron.
- **Link:** no fill, chalk-blue text, 44px tall hit area, underline on hover.

### Toggles (chips)
- **Style:** 44px tall, 10px corners, sheet fill, 1.5px cut-rule border, 0.875rem weight 700.
- **State:** pressed / active fills cobalt with white text; hover lightens the border to graphite.

### Cards / Sheets
- **Corner Style:** 10px.
- **Background:** sheet on wool.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1.5px cut-rule; the ficha weight sheet takes a chalk-line border.
- **Internal Padding:** 18px.
- **Insight sheets:** a good or caution insight keeps the sheet shape with a faint state-tinted fill and a border mixed 45% state ink into the sheet.

### Inputs / Fields
- **Style:** sheet fill, 1.5px cut-rule border, 10px corners, 44px minimum height, graphite 0.8rem label above.
- **Focus:** border turns cobalt with a 3px selection-navy ring, no outline.
- **Error:** 0.8rem alarm-red text under the field, weight 600.

### Navigation (envelope band)
The header is a full-width navy band: the logo on a white 9px-rounded tile, the condensed wordmark (hidden under 600px), the profile selector as a translucent white control with a white initial tile, and a settings icon button with a 45%-white border. Hover is a 14% white wash. Focus outlines turn white.

### Figure Cells
Two arrangements of one cell. On the ficha, the four key figures sit as a ruled row of four cells inside the weight sheet (cut-rule outer border, state word and change stacked under the value). In "Todas las cifras", tiles form a two-column grid with a chalk-line outer border. Each cell: condensed graphite label, narrow figure with small unit, the state word in its range ink and the change as notch plus value. Gutters are 1.5px cut rule; hover washes the cell to cell hover and turns the border chalk blue; the whole cell is the tap target and opens its chart.

### Range Bar
A 5px bar of four 2px-rounded segments in the range inks, with a 12px chalk dot ringed in sheet color marking the current value. Always paired with the state word in text.

### Week Line
"Tu semana" as one tappable line: sheet fill, 1.5px dashed seam-dash border, the drawn "this week" icon, a chalk-blue bold lead-in, two-line clamp, a drawn chevron. Hover turns the border solid chalk blue: the seam becomes a cut.

### Body Figure (signature)
The person as a pattern piece in SVG: pattern-piece fill, 1.6px chalk-line cutting line traced in on open (0.9s, ease-out-expo, skipped under reduced motion), a dashed chalk-blue seam allowance clipped inside, a chalk-blue grainline with arrowheads. Each girth: a 2.5px chalk-blue band, the previous value as a dashed chalk band beneath it at 45%, a thin chalk leader to a condensed label, the value in narrow figures, and the change as a drawn notch plus number. The figure carries a full text description for screen readers.

### Charts
Same line grammar: dashed cut-rule gridlines, condensed graphite axes. With a trend or average present, the chalk-blue line is the 3px solid reading and each weigh-in is a 1.25px dashed chalk line at 55% with open dots; the last value is labeled in narrow chalk figures. A single series draws solid chalk blue with an 8% chalk-blue area. Legends draw their line samples in the same styles. The week's fat and lean bars use caution amber and chalk blue.

## Do's and Don'ts

### Do:
- **Do** set every measured number in Archivo at wdth 72, weight 720, tabular figures.
- **Do** mark every change with the notch triangle (down for less, up for more) plus a screen-reader word, colored green or amber only when judged against the goal.
- **Do** draw "now" as a solid line and "before" or "each reading" as a dashed one, on the figure and in charts alike.
- **Do** draw lines, links and focus in chalk blue; keep cobalt for fills under white text.
- **Do** keep 10px corners and 1.5px borders on every container, control and input.
- **Do** group related figures as cells of one ruled sheet rather than loose cards.
- **Do** keep every tap target at least 44px and pair every color state with a word.

### Don't:
- **Don't** turn the dark into a neon health dashboard: no glows, gradients or saturated cyan and purple accents.
- **Don't** use pill shapes (999px radius) for buttons, toggles, chips or tags.
- **Don't** fill a second large area with color below the envelope band.
- **Don't** use green, amber, red or the range inks decoratively.
- **Don't** add shadows or glows to resting surfaces; the floating menu's shadow is the only one.
- **Don't** set labels in tracked uppercase.
