# Handoff: Health Dashboard (WHOOP-style daily cycle view)

## Overview

A single-page personal health dashboard centred on WHOOP's core daily rhythm:
Recovery → Strain → Sleep → Workouts → Trends, with a journal-style footer.
Aesthetically it leans editorial — serif display type, muted cream
background, monospaced metadata — rather than "sports-app neon". The layout
is a 12-column grid with full-width hero + trends and 7/5 and 7/5 splits
for the secondary cards.

## About the Design Files

The file in this bundle (`Health Dashboard.html`) is a **design reference
created in HTML** — a working prototype showing the intended look, content,
and behaviour. It is **not production code to copy directly**.

Your task is to **recreate this design in the target codebase's existing
environment** (React, Vue, SwiftUI, native, etc.) using its established
patterns, component library, typography scale, and tokens. If no
environment exists yet, pick the most appropriate framework and implement
the design there. The HTML is a spec, not source material to ship.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, hover states, and
interactions are all decided. Recreate pixel-perfectly using the
codebase's existing libraries and patterns. Where values are called out
below, match them exactly.

## Screens / Views

There is **one screen** (the dashboard), composed of these sections in
vertical order:

### 1. Masthead

- **Purpose:** brand, sync status, time-range selector, theme + tweaks toggles.
- **Layout:** flex row, space-between. Brand (`Vital Signs` in
  Instrument Serif, italic accent) on the left; chip + select + 2 icon
  buttons on the right.
- **Components:**
  - **Sync chip**: round dot + "Synced · 2m ago" mono label. Border 1px
    `--rule-strong`, no radius.
  - **Range select**: native `<select>` styled to look like a framed
    label. Options: Today, 7d, 30d, 90d, YTD.
  - **Theme button**: crescent-moon icon, toggles `[data-theme]`.
  - **Tweaks button**: sliders icon, toggles the Tweaks aside.

### 2. Dateline

- Large serif "Monday, _20 April_" (date in accent italic).
- Right-aligned mono meta: "Cycle in progress / Started 06:24 · 07h 18m".

### 3. State banners (conditional)

Three mutually exclusive states driven by `body[data-state]`:
`loading` · `empty` · `error`. Each is a thin 1px-bordered strip with
mono copy. Only one is visible at a time; `ok` shows none.

### 4. Recovery hero (full-width card)

- **Left column:**
  - Eyebrow "RECOVERY · 20 APR" (mono, 10.5px, 0.22em tracking).
  - Giant serif score `72` + small `%` (Instrument Serif, ~180px).
  - Headline "Your body is _primed_ for a moderately strenuous day."
    (serif, accent italic on the keyword).
  - Sub paragraph with HRV context and the day's strain target.
- **Right column (inline 2×2 grid):** HRV / RHR / SpO₂ / Skin Temp
  sub-metrics. Each cell: mono eyebrow with delta chip, serif value +
  unit, caption line, mini sparkline SVG with a square end-dot.
  - Dividers: 1px between all 4 cells. Top row padded-top 4px, bottom
    row padded-bottom 4px.
- **Recovery colour ramp** via the `--recovery-hue` CSS var on the hero
  root: green (`--ok`) for high, amber (`--warn`) for mid, red
  (`--danger`) for low.

### 5. Strain card (col-5)

- Eyebrow, serif score "11.4", a short sentence, then four stats in a
  4-col footer row: avg HR, max HR, kJ burned, minutes.
- Includes a tiny live HR readout that pulses via `setInterval` when
  enabled in Tweaks.

### 6. Sleep card (col-7)

- Top row: serif duration "7h 42m" + perf/efficiency/respiratory/
  disturbances in a mono-labelled 4-stat strip.
- **Hypnogram**: 800×140 SVG showing stepped plateaus at 4 heights
  (Awake highest → Deep lowest). Per-segment coloured fill down to the
  floor at 22% opacity, coloured plateau cap on top, single dark outline
  walking the silhouette. Hover tooltip snaps to the segment and shows
  "STAGE · N min".
- **Axis**: 5 mono tick labels below the chart.
- **Stage totals row** under the axis: 4-column strip with swatch + mono
  stage name + serif duration (Awake 38m / REM 1h 37m / Light 4h 14m /
  Deep 1h 13m).

### 7. Trends card (full-width, filled background)

- **Header:** title, sub-caption, and a 3-item legend (Recovery/Strain/
  Sleep with small coloured bars).
- **Chart:** 1000×260 SVG plotting **3 simultaneous lines** on
  **independent normalised scales** (recovery 0–100, strain 0–21, sleep
  0–10h). 5 horizontal gridlines.
- **Interaction:** a single transparent rect covers the plot area.
  Mousemove snaps to the nearest day index, drawing:
  - a dashed vertical cursor line,
  - one focus dot per line (filled with that line's colour, 2px bg
    stroke),
  - a tooltip positioned at the snapped x with weekday label and the
    4 metric values.
  - Click anywhere on the plot opens the drilldown for that day.
- **Axis labels**: 5 date ticks below.

### 8. Workouts card (full-width)

- 3 rows, one per recent workout. Each row: 4-column grid of
  name+time / stats / zone-distribution bar + Z1–Z5 legend / strain number.
- Zone bar: 6 stacked segments (`z0..z5`), widths from data.

### 9. Journal footer

- 3-column grid with serif-italic micro-essays: weekly summary, a thing
  to watch, the next check-in.

### 10. Drilldown modal (opens on trends click)

- Centred 700px-wide card, `--overlay` backdrop with blur.
- Eyebrow date, serif headline with accent metric, narrative sentence,
  then a 4×2 stat grid: HRV / RHR / SpO₂ / Skin Temp / Sleep / Strain /
  kJ / Max HR.

### 11. Tweaks aside (opens from masthead icon)

- Fixed 320px panel bottom-right. Contains: Theme (dark/light), Data
  state, Recovery score, Live HR, Units.

## Interactions & Behavior

- **Theme toggle:** flips `html[data-theme]` between `dark` and `light`.
- **Tweaks panel:** toggled by the masthead icon; also persists via the
  host `__edit_mode_set_keys` protocol (see the prototype source — this
  is environment-specific and can be ignored in production).
- **Recovery preset** (Tweaks): swaps score, headline, sub, sub-metrics
  and `--recovery-hue` simultaneously.
- **Live HR:** 900 ms `setInterval` updates the strain card's HR readout
  with a sinusoidal-plus-noise value. Pause when tweak is "off".
- **Trend hover:** nearest-x snapping as described above. Cursor and
  focus dots only visible during hover.
- **Trend click:** opens drilldown modal, populated from the hovered day.
- **Drilldown close:** backdrop click, X button, or Escape key.
- **Range picker, zone bars, workouts:** static in this prototype.
- **Text selection** (`::selection`): dark `--fg` bg, cream `--bg` text.
- **No rounded corners anywhere.** All borders are sharp.

## State Management

- `state`: shallow object `{ theme, state, recoveryLevel, liveHR, units }`
  seeded from `TWEAK_DEFAULTS`.
- `activeIdx`: last-hovered trend index; drives the click→drilldown.
- `hrTimer`: `setInterval` handle for live HR.
- Drilldown open/closed is tracked via a DOM class (`.open`).

Data sources in the prototype are all synthetic:

- `HYPNO` — hand-authored sleep segments.
- `TREND_DATA` — 30-day procedurally generated with `Math.sin`/`cos` +
  jitter.
- Replace both with real backend data when wiring up.

## Design Tokens

### Colours — dark theme

| Token           | Value       | Use                     |
| --------------- | ----------- | ----------------------- |
| `--bg`          | `#1f1e1d`   | page background         |
| `--fg`          | `#f0eee6`   | body text               |
| `--fg-soft`     | `#f0eee6cc` | secondary text          |
| `--fg-mute`     | `#f0eee680` | muted labels            |
| `--fg-faint`    | `#f0eee640` | bars, faint marks       |
| `--rule`        | `#f0eee61f` | thin dividers           |
| `--rule-strong` | `#f0eee633` | stronger dividers       |
| `--card`        | `#26241f`   | card surface            |
| `--card-elev`   | `#2b2925`   | elevated card / tooltip |
| `--overlay`     | `#15141380` | modal scrim             |

### Colours — light theme (default)

| Token           | Value       |
| --------------- | ----------- |
| `--bg`          | `#f0eee6`   |
| `--fg`          | `#1f1e1d`   |
| `--fg-soft`     | `#1f1e1dcc` |
| `--fg-mute`     | `#1f1e1d80` |
| `--fg-faint`    | `#1f1e1d30` |
| `--rule`        | `#1f1e1d1a` |
| `--rule-strong` | `#1f1e1d33` |
| `--card`        | `#e8e5da`   |
| `--card-elev`   | `#ded9cb`   |
| `--overlay`     | `#ffffff99` |

### Accent palette (shared)

| Token      | Value     | Use                      |
| ---------- | --------- | ------------------------ |
| `--accent` | `#d97757` | brand / strain / awake   |
| `--select` | `#2688a8` | sleep / chart highlight  |
| `--warn`   | `#c9a24a` | mid recovery             |
| `--danger` | `#c8573d` | low recovery / temp warn |
| `--ok`     | `#6f9a6a` | high recovery            |

### Typography

| Family                                   | Role                              | Key sizes                                                         |
| ---------------------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| **Instrument Serif** (400, italic avail) | display, headlines, metric values | 180px hero, 96px strain/sleep, 28px card title, 20px inline stats |
| **Inter** (400/500/600)                  | body copy                         | 14–16px                                                           |
| **JetBrains Mono** (400/500)             | eyebrows, deltas, ticks, tooltips | 10–11px, 0.14–0.22em tracking, uppercase                          |

All tracking on mono labels is **letter-spaced 0.14–0.22em** and
**uppercased**. Serif headlines use `letter-spacing: -0.01em to -0.02em`
and `line-height: 0.95`.

### Spacing

- Page padding: `28px` horizontal (`--pad`).
- Card padding: `28px` (hero) / `24px` (std cards).
- Grid gap: `24px` between cards.
- Dividers: `1px solid var(--rule)` between grid cells; no outer border
  on sub-grids.

### Borders & radii

- **All radii: 0.** No rounded corners anywhere — chips, buttons, cards,
  selects, tooltips, modals, tabs.
- Card border: `1px solid var(--rule-strong)`, hover → same.

### Shadows

- None. Elevation is done with a slightly lighter surface (`--card-elev`)
  and sharper rules, not shadow.

## Assets

- **Fonts:** Google Fonts
  - `Instrument Serif` (regular + italic)
  - `Inter` (400, 500, 600)
  - `JetBrains Mono` (400, 500)
- **Icons:** inline 24px SVG strokes, 1.6 stroke-width, `currentColor`.
  Five icons total: moon (theme), sliders (tweaks), close (X), and a few
  small chart markers. No icon library dependency.
- **No images.** All visuals are SVG or CSS.

## Files

- `Health Dashboard.html` — the complete single-file prototype
  (tokens, layout, SVG charts, interactions, tweaks).

## Implementation Notes

- Instrument Serif at very large sizes (the hero "72", "11.4", "7h 42m")
  carries the whole visual identity. Don't substitute a generic serif.
- The hypnogram and trends chart are both bespoke SVG — don't pull in
  Chart.js / Recharts / etc. unless your codebase already uses one; if
  so, match the stepped-plateau shape and nearest-x hover exactly.
- The "jagged 2×2" sub-metrics grid in the hero is intentional
  (`1.1fr 0.9fr` columns). Keep the asymmetry.
- Strain values display without a "/ 21" denominator — just the bare
  number.
- The `Tweaks` panel is a prototype-only affordance used during design
  iteration; production UI may omit it or repurpose it as a settings
  drawer.
