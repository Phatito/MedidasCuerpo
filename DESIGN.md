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

<!-- impeccable:design-map -->
Name: Mesura
Colors: primary: envelope-navy #1d2a48; tertiary: state-good #9cc79a; neutral: on-cobalt #ffffff; primary: cobalt #3d6ab0; primary: cobalt-deep #345c9b; primary: chalk-blue #9cbde8 (+19 more in the sidecar)
Fonts: Archivo Variable (display, figure, headline, title, body, label)
Spacing: xs 4px, sm 8px, md 12px, lg 14px, xl 18px, gutter-mobile 16px, gutter 20px
Radius: hairline 2px, tag 6px, chip 8px, sheet 10px
North Star: "The Pattern Sheet"
Rules:
- The Envelope Rule. One large colored area per screen: the navy header band.
- The Chalk Rule. On wool, blue as ink is chalk blue, never the cobalt fill.
- The Chalk Tone Rule. Every state color is a soft chalk tone with AA contrast on the wool.
- The State Ink Rule. Green, yellow and red mean a state and nothing else.
- The Narrow Numeral Rule. Every measured number is set at wdth 72, weight 720, tabular.
- The Sentence-Case Label Rule. Labels are condensed and graphite, never uppercase-tracked.
- The Cutting Line Rule. A sheet is made by its line, not its fill.
- The Cloth On Cloth Rule. Surfaces never cast shadows at rest.
Elevation:
- Floating menu: 0 18px 40px rgba(0, 0, 0, 0.6)
- Dialog scrim: background: rgba(4, 6, 12, 0.7)
Don't:
- Don't turn the dark into a neon health dashboard: no glows, gradients or saturated cyan and purple accents.
- Don't tint the wool or the sheets blue; the ground is neutral charcoal.
- Don't lift a sheet with a lighter fill; lift it with a line.
- Don't use pill shapes (999px radius) for buttons, toggles, chips or tags.
- Don't fill a second large area with color below the envelope band.
- Don't use green, yellow, red or the range tones decoratively.
- Don't add shadows or glows to resting surfaces; the floating menu's shadow is the only one.
- Don't set labels in tracked uppercase.
Do:
- Do set every measured number in Archivo at wdth 72, weight 720, tabular figures.
- Do mark every change with the notch triangle (down for less, up for more) plus a screen-reader word, colored green or yellow only when judged against the goal.
- Do draw "now" as a solid line and "before" or "each reading" as a dashed one, on the figure and in charts alike.
- Do define a sheet by its cutting line: chalk for the weight sheet and the cifras grid, sheet-edge for the rest.
- (+4 more)
Motion (Emil Kowalski's principles):
- Custom ease-out (cubic-bezier(0.23, 1, 0.32, 1)) for entering and state changes; ease-in-out only for the mannequin camera; drawer curve (0.32, 0.72, 0, 1) for bars and dialogs.
- Interactions ≤ 300 ms (press 80 ms, state 160–240 ms); only one-off drawings (chart line, tape wrap) run longer.
- Nothing appears from scale 0: enter from 0.95–0.96 and opacity 0; menus scale from their trigger (transform-origin).
- Every tappable thing presses to scale 0.97; hover exists only on hover-capable devices.
- State changes use transitions (interruptible); keyframes only for first appearance. Frequent actions (switching tabs) get no bounce.
- Reduced motion keeps opacity fades and drops movement.
Full: .impeccable/design-full.md (read a section when you need its detail)
