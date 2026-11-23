---
name: Mesura
description: Weekly body measurements read like a dressmaker's pattern sheet.
colors:
  cobalt: "#1f45c9"
  cobalt-deep: "#17369e"
  cobalt-halo: "#c9d6fb"
  tracing-paper: "#e2e9fb"
  seam-dash: "#9fb0d6"
  ink: "#14171c"
  graphite: "#535d6c"
  pattern-paper: "#eef1f5"
  sheet-white: "#ffffff"
  cut-rule: "#d2d8e1"
  soft-fold: "#e7ebf1"
  state-good: "#0d7a4e"
  state-good-bg: "#ddf2e8"
  state-warn: "#9a5200"
  state-warn-bg: "#fcead2"
  state-bad: "#c21f3a"
  range-low: "#1a73a8"
  range-ok: "#11804f"
  range-high: "#a85a00"
  range-very-high: "#c21f3a"
typography:
  display:
    fontFamily: "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "4.2rem"
    fontWeight: 720
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 72"
  figure:
    fontFamily: "'Archivo Variable', system-ui, sans-serif"
    fontSize: "2.1rem"
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
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.sheet}"
    padding: "9px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-primary-large:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.sheet}"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "9px 18px"
    height: "44px"
  chip-toggle:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "44px"
  chip-toggle-active:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.sheet-white}"
  input-field:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "9px 12px"
    height: "44px"
  sheet:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "18px"
  figure-cell:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    padding: "12px 14px"
    height: "96px"
  envelope-band:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.sheet-white}"
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

Mesura reads like a dressmaker's printed pattern: cool pattern paper underneath, white sheets laid on it, everything drawn in near-black ink, with a cobalt band across the top like the printed envelope a pattern ships in. Each person is a pattern piece and each measurement is a labeled mark on it. The body figure is literally a pattern piece: a tracing-paper fill, an ink cutting line, a dashed cobalt seam allowance inside it, a double-headed grainline down the center, and each girth drawn as a cobalt band with a triangular notch where its dimension line meets the piece.

The system is light, dense and drafted rather than decorated. Depth comes from paper on paper and from rules, never from glow. Figures are set narrow and firm on Archivo's width axis, the way a pattern prints its sizes; reading text stays at normal width. Meaning lives in line style: solid is now, dashed is before or alongside, a filled triangle notch is a change. Color is reserved: cobalt for action and the current reading, green, amber and red only for states.

It explicitly replaced a dark purple health-dashboard look; dark cards with neon accents are the rejected category default.

**Key Characteristics:**
- Cool pattern-paper ground with white sheets and 1.5px rules.
- One cobalt envelope band at the top; cobalt elsewhere only for action, the trend and the current mark.
- Condensed tabular numerals (wdth 72) for every figure; condensed labels (wdth 82); normal width for prose.
- Solid / dashed / notch line grammar shared by the body figure, charts and the week line.
- 10px corners on everything that holds content or takes a tap; no pills.

## Colors

A cool paper-and-ink palette with a single cobalt ink for action, plus a disciplined set of state inks.

### Primary
- **Envelope Cobalt** (cobalt): the header band, primary buttons, active toggles, the weight trend line, the moving-average line, girth bands, the seam allowance, notch pins, links and focus outlines. The single voice of action and "now".
- **Pressed Cobalt** (cobalt-deep): hover and press state of primary buttons only.
- **Cobalt Halo** (cobalt-halo): text selection and the 3px focus ring around a focused input.

### Neutral
- **Pattern Paper** (pattern-paper): the page ground everything sits on.
- **Sheet White** (sheet-white): cards, figure cells, inputs, secondary buttons; every surface that carries content.
- **Drafting Ink** (ink): text, the body figure's cutting line, the ruled border around the hero sheet and the figure-cell grid, the dashed "each weigh-in" line in charts.
- **Graphite** (graphite): labels, units, secondary text, chevrons, inactive change values. Passes AA on white and on pattern paper.
- **Cut Rule** (cut-rule): default 1.5px borders, dotted chart gridlines, table rules, the 1.5px gutters between figure cells.
- **Soft Fold** (soft-fold): quiet fills: neutral pills, chips, menu hover, informational notices.
- **Tracing Paper** (tracing-paper): the body figure's fill and the cover stroke over the seam allowance.
- **Seam Dash** (seam-dash): the dashed border of the "Tu semana" line, the one UI container drawn as a seam rather than a cut.

### Tertiary (states)
- **Good Green** (state-good on state-good-bg): a change in the direction of the person's goal, success notices.
- **Caution Amber** (state-warn on state-warn-bg): a change against the goal, pending items, warnings.
- **Alarm Red** (state-bad): errors, destructive actions, "no" in the weekly review.
- **Range inks** (range-low, range-ok, range-high, range-very-high): the four segments of a health-range bar and the matching state word ("Bajo", "Normal", "Alto", "Muy alto"). Never used for anything else.

### Named Rules
**The Envelope Rule.** Cobalt fills exactly one large area per screen: the header band. Below it, cobalt appears only as ink (lines, text, outlines) or on the one primary action and active toggles.

**The State Ink Rule.** Green, amber and red mean a state and nothing else. A change value is graphite unless it is judged against the person's goal; then it takes green or amber.

## Typography

**Display Font:** Archivo Variable (with system-ui, -apple-system, Segoe UI fallback), loaded with its width axis.
**Body Font:** Archivo Variable at normal width.

**Character:** One family, three widths. Narrow (72) for numbers, semi-narrow (82–88) for labels and headings, normal (100) for reading. The width axis does the work another system would hand to a second typeface.

### Hierarchy
- **Display** (720, 4.2rem, line-height 0.95, wdth 72): the trend weight on the ficha. One per screen.
- **Figure** (720, 2.1rem in figure cells, 2rem in metric tiles, 2.2rem on a metric screen, wdth 72, tabular): every measured value. Units drop to a small graphite span at normal tracking.
- **Headline** (750, 1.65rem, wdth 88, -0.015em): screen titles; the person's name on the ficha at 1.45rem.
- **Title** (700, 1.1rem, wdth 88): section and card titles; the "Mesura" wordmark sets at 760, 1.3rem, wdth 80 in the band.
- **Body** (400, 16px, line-height 1.5, wdth 100): prose, insights, the week's action. Secondary text at 0.875rem.
- **Label** (650, 0.78rem, wdth 82, +0.01em, sentence case): field labels over figures ("Peso de tendencia", "Grasa"), chart axes, legends, figure labels.

### Named Rules
**The Narrow Numeral Rule.** Every measured number is set at wdth 72, weight 720, tabular. Prose numbers stay at body width.

**The Sentence-Case Label Rule.** Labels are condensed and graphite, never uppercase-tracked. Width carries the label voice, not capitals.

## Layout

A single centered column (max 1200px) with 16px side gutters on phones and 20px from 600px up. The ficha is one sheet: on phones it stacks hero, body figure, week line, the 2x2 figure-cell grid, links and the full-width "Registrar medición" button, so the name, trend weight and body figure share the first viewport. From 900px it becomes two columns, with the body figure spanning the full height of the right column (max 520px wide) and the stack on the left.

Rhythm runs in small steps: 4 / 8 / 12 / 14 / 18px. Sheets pad 18px; figure cells pad 12px 14px with a 96px minimum height; stacks gap 12–18px; the main column breathes 18–22px from the band. Metric tiles flow in an auto-fill grid (min 160px); a lone last tile spans the row. Breakpoints in use: 600, 760, 860 and 900px. Nothing scrolls horizontally at 400px except full-size charts, which sit in their own scroller.

## Elevation & Depth

Flat. Depth is paper on paper: white sheets on pattern paper, separated by 1.5px rules. The hero sheet and the figure-cell grid take an ink border, which lifts them by contrast, not by shadow.

### Shadow Vocabulary
- **Floating menu** (`box-shadow: 0 18px 40px rgba(16, 28, 66, 0.22)`): the profile menu, the only element that floats over the sheet.
- **Dialog scrim** (`background: rgba(16, 28, 66, 0.4)`): behind modal dialogs; the dialog itself takes a cobalt border, no shadow.

### Named Rules
**The Paper On Paper Rule.** Surfaces never cast shadows at rest. Only an overlay that truly floats (menu) gets the one soft cobalt-tinted shadow; no glows, no colored halos except the input focus ring.

## Shapes

Square-ish and drafted. Content containers, buttons, toggles, inputs, icon buttons and the weekly line all take 10px corners; tags take 6px, chips and avatars 8px, range-bar segments 2px. Borders are 1.5px everywhere (2px for the selected register mode). The figure cells and metric tiles are not separate cards: they are cells of one ruled sheet, an ink-bordered grid whose 1.5px cut-rule gutters read as cutting lines.

The recurring geometry is the **notch**: a small filled triangle (point down for a decrease, up for an increase) used for every change value and at the end of every girth dimension line on the body figure. Icons are drawn strokes on a 24px grid, 2px stroke, round caps, inherit color.

## Components

### Buttons
Firm, drafted, never pill-shaped.
- **Shape:** 10px corners, 1.5px border, 44px minimum height.
- **Primary:** cobalt fill, white text, weight 700. The ficha's "Registrar medición" is the large variant: full width, 52px, 1.05rem, weight 800, with a drawn plus icon.
- **Hover / Focus:** primary deepens to pressed cobalt (no brightness filter); secondary's border darkens to graphite. Focus is a 2.5px cobalt outline, 2px offset; white inside the band.
- **Secondary:** white fill, cut-rule border, ink text. "Volver" adds a drawn back chevron.
- **Link:** no fill, cobalt text, 44px tall hit area, underline on hover.

### Toggles (chips)
- **Style:** 44px tall, 10px corners, white fill, 1.5px cut-rule border, 0.875rem weight 700.
- **State:** pressed / active fills cobalt with white text; hover darkens the border.

### Cards / Sheets
- **Corner Style:** 10px.
- **Background:** sheet white on pattern paper.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1.5px cut-rule; the ficha hero sheet takes an ink border.
- **Internal Padding:** 18px.

### Inputs / Fields
- **Style:** white fill, 1.5px cut-rule border, 10px corners, 44px minimum height, graphite 0.8rem label above.
- **Focus:** border turns cobalt with a 3px cobalt-halo ring, no outline.
- **Error:** 0.8rem alarm-red text under the field, weight 600.

### Navigation (envelope band)
The header is a full-width cobalt band: the logo on a white 9px-rounded tile, the condensed wordmark (hidden under 600px), the profile selector as a translucent white control with a white initial avatar, and a settings icon button with a 45%-white border. Hover is a 14% white wash. Focus outlines turn white.

### Figure Cells
The ficha's 2x2 grid and the "Todas las cifras" tiles. Each cell: condensed graphite label, narrow figure with small unit, a footer with the state word in its range ink and the change as notch plus value. Cells sit in one ink-bordered grid with 1.5px gutters; hover washes the cell faint cobalt; the whole cell is the tap target and opens its chart.

### Range Bar
A 5px bar of four 2px-rounded segments in the range inks, with a 12px ink dot ringed in white marking the current value. Always paired with the state word in text.

### Week Line
"Tu semana" as one tappable line: white fill, 1.5px dashed seam-dash border, a drawn lines-and-arrow icon, a cobalt bold lead-in, two-line clamp, a chevron. Hover turns the border solid cobalt: the seam becomes a cut.

### Body Figure (signature)
The person as a pattern piece in SVG: tracing-paper fill, 1.6px ink cutting line traced in on open (0.9s, ease-out-expo, skipped under reduced motion), a dashed cobalt seam allowance clipped inside, a cobalt grainline with arrowheads. Each girth: a 2.5px cobalt band, the previous value as a dashed ink band beneath it at scale, a thin ink leader to a condensed label, the value in narrow figures, and the change as a notch plus number. The figure carries a full text description for screen readers.

### Charts
Same line grammar: dotted cut-rule gridlines, condensed graphite axes. With a trend or average present, the cobalt line is the 3px solid reading and each weigh-in is a 1.25px dashed ink line with open white dots; the last value is labeled in narrow ink figures. A single series draws solid cobalt with a 7% cobalt area. Legends draw their line samples in the same styles.

## Do's and Don'ts

### Do:
- **Do** set every measured number in Archivo at wdth 72, weight 720, tabular figures.
- **Do** mark every change with the notch triangle (down for less, up for more) plus a screen-reader word, colored green or amber only when judged against the goal.
- **Do** draw "now" as a solid line and "before" or "each reading" as a dashed one, on the figure and in charts alike.
- **Do** keep 10px corners and 1.5px borders on every container, control and input.
- **Do** group related figures as cells of one ruled sheet rather than loose cards.
- **Do** keep every tap target at least 44px and pair every color state with a word.

### Don't:
- **Don't** return to dark health-dashboard cards with neon accents, the look this world replaced.
- **Don't** use pill shapes (999px radius) for buttons, toggles or tags.
- **Don't** fill a second large area with cobalt below the envelope band.
- **Don't** use green, amber, red or the range inks decoratively.
- **Don't** add shadows or glows to resting surfaces; the floating menu's shadow is the only one.
- **Don't** set labels in tracked uppercase.
