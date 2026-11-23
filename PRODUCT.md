# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner and his family. The owner is the primary user and keeps a profile for each family member. They measure about once a week: stepping on a Xiaomi smart scale (read through the Xiaomi Home app) and taking tape-measure perimeters (waist, hips, chest, arms and thighs by side, neck). Use is mostly on the phone, right after measuring; the computer is secondary and shares the same data through an optional encrypted account.

## Product Purpose

Mesura (Spanish, "measure"; internal ids remain `medidascuerpo` / `MedidasCuerpo`) records weekly body measurements per person and turns them into understanding and action: a smoothed weight trend instead of noisy single weigh-ins, fat versus lean mass, health-state ranges for scale metrics, and a weekly report ("Tu semana") with at most two concrete actions and a review of last week's. Success: opening the app answers "how is my body changing and what do I do this week" at a glance.

## Positioning

The whole body in one place. Most weight apps show a scale number; Mesura joins the scale's composition metrics with tape-measure perimeters on a body figure, per person and per side, and reads them together (weight trend, waist, fat and lean mass) to say what changed and what to do next.

## Operating Context

- Weekly ritual: weigh in on the Xiaomi scale, measure with a tape, then record in Mesura by typing, by reading a Xiaomi Home screenshot locally (OCR), or by importing a CSV.
- A daily intake figure ("2.500 kcal/día") is typed by hand and changed over time; it comes from the user's own nutrition app, not integrated.
- Several family profiles; a main profile opens by default.

## Capabilities and Constraints

- Local-first PWA (installable, works offline). Data in IndexedDB; optional account with end-to-end encrypted sync on Cloudflare (username + secret phrase).
- Screens: profile ficha, metric screens with charts, all figures, weekly report, register measurement (type / screenshot / file), all measurements table, family, settings and data (CSV import/export, backup, calendar reminder, account).
- Same rules for every age (no special handling for minors).
- Spanish UI. Hash routes and the browser Back button must keep working. Never remove functions or stored data; keep internal ids and the `/MedidasCuerpo/` URL.

## Brand Commitments

- Name: Mesura. A body figure showing the measurements is liked by the owner, but may be replaced if something better carries the same job.
- Everything else (colors, type, theme, card shapes, logo treatment) is open: the owner gave full creative freedom.

## Evidence on Hand

- Real measurement data exists only on the owner's devices; tests and visuals use invented numbers. No testimonials, users, or metrics to cite.

## Product Principles

1. Glance first: the main screen answers the essential question without scrolling; detail lives one tap away.
2. Trend over noise: show the smoothed reading and say when a weigh-in is likely water, not fat.
3. Say what to do: every insight ends in an action or stays out of the way.
4. The body, not just a number: perimeters and composition read together.
5. Orientation, not diagnosis: estimates are labeled as such.

## Accessibility & Inclusion

44 px touch targets, WCAG AA contrast, screen-reader labels (charts and figures carry text descriptions), focus moves to the title on screen change, no horizontal scroll at 400 px.
