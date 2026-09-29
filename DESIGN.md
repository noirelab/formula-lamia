---
name: Formula LAMIA
description: LAMIA neuroevolution demo dressed as an official race timing dossier, read on a TV from 3 m.
colors:
  navy: "#04497D"
  navy-deep: "#03355C"
  teal: "#0E85A8"
  orange: "#F97A25"
  orange-ink: "#B8520B"
  red: "#C8262C"
  child-cyan: "#7FD3EE"
  asphalt: "#22364D"
  ink: "#0B2239"
  ink-soft: "#3C4F63"
  muted: "#53667A"
  chart-muted: "#8A9AAB"
  paper: "#FFFFFF"
  paper-2: "#F4F7FB"
  rule: "#D6E0EB"
  rule-2: "#E8EEF5"
  grid: "#E1E9F2"
  grid-bold: "#CCD9E7"
  selected-wash: "#E6F1F8"
  confirm-wash: "#FFF4EC"
typography:
  display:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", system-ui, sans-serif"
    fontSize: "clamp(34px, 3.6vw, 60px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  numeral-hero:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", system-ui, sans-serif"
    fontSize: "104px"
    fontWeight: 800
    lineHeight: 0.86
    fontFeature: "tnum"
  numeral-stat:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: "tnum"
  headline:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
  title:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
  bulletin:
    fontFamily: "Saira, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "19px"
    fontWeight: 500
  body:
    fontFamily: "Saira, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Saira, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.1
  caption:
    fontFamily: "Saira, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  hair: "2px"
  tag: "4px"
  control: "6px"
  card: "8px"
  map: "10px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "22px"
  xl: "28px"
  section: "44px"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "42px"
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.navy-deep}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  segment-pressed:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    width: "52px"
    height: "42px"
  select:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "42px"
  chip:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  chip-error:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
  tag-elite:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: "1px 8px"
  tag-random:
    backgroundColor: "{colors.rule-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "1px 8px"
  key-cap:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.navy}"
    rounded: "{rounded.tag}"
    padding: "0 8px"
  sheet-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "26px"
    width: "min(440px, calc(100% - 32px))"
  confirm:
    backgroundColor: "{colors.confirm-wash}"
    rounded: "{rounded.card}"
    padding: "12px 14px"
---

# Design System: Formula LAMIA

## Overview

**Creative North Star: "The Official Timing Dossier"**

The demo is a race weekend's paperwork, not a gamer HUD. Each generation is a session with its own classification sheet; the track is the circuit map from a race programme, printed on light-blue graph paper; the standings tower is a timing screen set in heavy condensed numerals. Everything sits on white paper in LAMIA navy ink, with teal as the second ink and orange reserved for whoever is leading.

Density is split in two. The first viewport is sparse and huge so it reads from 3 m on a TV. The map is about two thirds wide with the tower on the right. Under the map: the bulletin with its two narrative actions (Comparar gerações, Explicar a evolução), and a one-row dock of presenter controls. The whole page is locked to the viewport height (no scrolling): the map takes the largest 1200:760 box that fits its container (container query units), and the tower tightens in steps under 920px and 780px of height. The leader's network lives in the tower as a second tab (Evolução | Cérebro); clicking a car switches to it. Rarely used settings (experiment sliders, champion vault, seed, shortcuts) are not on the page at all. They live in the presenter panel, a right-side native `<dialog>` drawer opened with the header's Painel button or the P key. Presentation mode hides the dock, the narrative actions and the brain figure.

The world rejects the dark neon gamer/HUD dashboard. It is light theme only, by brand commitment.

**Key Characteristics:**
- White paper, navy ink, ruled tables; no dark surfaces except the asphalt ribbon and the selected-car chips.
- Saira Condensed 800 for every number that matters, always tabular.
- The teal/orange double rule from the LAMIA logo as the signature divider.
- Orange marks the leader or the fastest thing, red marks a crash or a mutation, and nothing else.
- Everything scales in `vh` in presentation mode; nothing important is smaller than about 2vh there.

## Colors

Two brand inks on paper, plus two signal colors whose meaning never changes.

### Primary
- **LAMIA Navy** (navy): the ink. Headings, big numerals, primary buttons, pressed segments, chips, the tower's top rule, the map's track outline, turn-number circles, the "best car" chart line. Its hover shade is **Navy Deep** (navy-deep), used only for primary button hover.

### Secondary
- **Petrol Teal** (teal): the second ink. Upper stroke of the brand double rule and the underline under the selected car's name. Used sparingly; it never fills a control.

### Tertiary
- **Leader Orange** (orange): the leading car on the map, the generation clock fill, the bulletin's square bullet, the lower stroke of the brand rule, the focus ring, the draw-mode start circle, and parent B in the explanation deck. **Orange Ink** (orange-ink) is its text-safe shade, used for P1 in the standings.
- **Crash Red** (red): crashed cars ("bateu"), error chips, the kerb dashes on the track, and flashing mutated connections in the network.
- **Child Cyan** (child-cyan): cars that are mutated children. It only appears on the dark asphalt or as a legend swatch.

### Neutral
- **Paper** (paper): page background, button face, explanation deck sheets, turn circles. White cars (elite copies) also use pure white.
- **Graph Paper** (paper-2) with **Grid** (grid) every 40 world units and **Grid Bold** (grid-bold) every 200: the map background. Paper-2 is also the hover wash on rows and unpressed segments.
- **Asphalt** (asphalt): the track ribbon, the draw-mode stroke, and the dark ring around legend swatches.
- **Ink** (ink): body text and the elite tag. **Ink Soft** (ink-soft): car kind labels and sheet subtitles. **Muted** (muted): secondary text, hints, units. **Chart Muted** (chart-muted): the average line in the chart.
- **Rule** (rule) and **Rule 2** (rule-2): table rulings, control borders, the clock track.
- **Selected Wash** (selected-wash) behind the selected standings row; **Confirm Wash** (confirm-wash) behind the destructive-restart confirmation.

### Named Rules
**The One Leader Rule.** Orange means "best right now". One car, P1, the clock and the bullet. If two things are orange on the map, one of them is wrong.

**The Red Is Loss Rule.** Red appears only where something was lost or changed by chance: a crash, an error, a kerb, a mutation. Never for emphasis.

**The Paper Only Rule.** Light theme only. Dark fills are limited to asphalt, the navy chip, and the elite tag.

## Typography

**Display Font:** Saira Condensed 500/700/800 (with Arial Narrow)
**Body Font:** Saira 400/500/600 (with system-ui)

Both are bundled from @fontsource (latin subsets) because the demo runs offline. Canvas renderers use the same stacks.

**Character:** A condensed motorsport numeral face over a matching humanist sans; the condensed face carries the numbers and headings, the regular width carries the sentences.

### Hierarchy
- **Numeral Hero** (800, 104px, 0.86): the generation number in the tower. In presentation mode `clamp(80px, 11vh, 260px)`.
- **Display** (800, clamp(34px, 3.6vw, 60px), 0.95): the masthead title only. Explanation deck titles use the same weight at 56px on canvas.
- **Numeral Stat** (800, 34px, 1.05): record and best lap. Standings positions use 800 at 20px.
- **Headline** (700, 24px): the circuit name caption under the map.
- **Title** (700, 21px): section headings in the tower and the brain figure; the presenter panel uses 22px section titles under a 28px/800 panel title.
- **Bulletin** (500, 19px): the one-line live narration under the map.
- **Body** (400, 16px, 1.5): explanatory text. The lede caps at 70ch.
- **Label** (600, 15px, 1.1): buttons, select, field labels, chips.
- **Caption** (400, 13-14px): hints, legends, chart key, units.

### Named Rules
**The Tabular Numbers Rule.** Every live number (generation, timer, laps, record, car numbers, seed) sets `font-variant-numeric: tabular-nums` so the tower does not jitter while it updates.

**The Numbers Are Condensed Rule.** A number the audience should read goes in Saira Condensed at 700 or 800. Sentences never do.

## Layout

A centered sheet (max 1760px, padding 20px 28px 48px). Masthead: logo spanning two rows at 92px high beside the title and lede, with the utility buttons (Painel, Tela cheia) at the right, then the brand double rule. The board is a two-column grid, map plus a fixed 380px tower with a 28px gap; below 1180px it stacks to one column. The map canvas keeps a 1200 / 760 aspect ratio. Under the map: caption row (circuit name plus legend); the bulletin row, ruled top and bottom, with the narration on the left and the two narrative actions on the right; the dock, whose three labelled groups (Corrida, Pista, Câmera) are separated by space, not boxes; and nothing below it: the page ends at the dock.

Spacing steps are 4, 8, 14, 22, 28 and 44px; 8px is the gap between controls, 22px between tower sections.

**Presentation mode** (the `present` class, fullscreen on the TV) removes the dock, narrative actions, tower tabs and lede, sets the app to exactly 100vh with rows auto / auto / 1fr, and switches every size to vh-based `clamp()` so it scales from a laptop to a 4K TV. The tower becomes `clamp(300px, 25vw, 1000px)`, the map is width-limited so it fits the remaining height, and the standings drop from 8 rows to 5.

**The Three Metres Rule.** In presentation mode every text size has a vh term and a floor of at least 12px; anything the audience needs is sized as a share of the screen height, not in fixed pixels.

## Elevation & Depth

Mostly flat and ruled, like printed paper. Depth appears only where paper lies on top of paper.

### Shadow Vocabulary
- **Map lift** (`box-shadow: 0 1px 0 rgba(4,73,125,.04), 0 12px 32px -18px rgba(4,73,125,.35)`): the circuit map canvas, a sheet resting on the page.
- **Chip float** (`box-shadow: 0 6px 18px -8px rgba(3,26,52,.6)`): navy status chips over the map.
- **Sheet over map** (`box-shadow: 0 24px 60px -20px rgba(3,26,52,.55)`; on canvas `rgba(2,24,48,.35)`, blur 40, offset 14): the "Pista pronta" dialog and the explanation deck sheets.
- **Printed ribbon** (canvas: `rgba(4,40,80,.18)`, blur 18, offset 6): under the track ribbon so it reads as slightly embossed.

### Named Rules
**The Paper On Paper Rule.** Shadows are always navy-tinted, soft and negative-spread, and only on something laid over the page or the map. Tables, controls and the tower stay flat and use rules instead.

## Shapes

Small, even radii: 2px on swatches and brand-rule strokes, 4px on tags and key caps, 6px on buttons, selects, chips and inputs, 8px on the dialog card and confirm box, 10px on the map. The only circles are the turn-number badges on the map, and network neurons. Tables are open: horizontal rules only (1px rule and rule-2), with heavier navy rules (4px on the tower, 2px on the stats) marking the start of a block.

The brand double rule is the signature form: a 4px teal stroke from the left edge to 78%, and a 4px orange stroke from 34% to the right edge, offset 7px below, both with 2px ends. The explanation deck repeats it under every title.

## Components

### Buttons
Thin-wire and calm: paper face, navy label, 1.5px rule border.
- **Shape:** 6px radius, min height 42px, padding 10px 14px, label type.
- **Default:** hover darkens only the border to navy. Transitions on background, border and color at .15s with `cubic-bezier(0.16, 1, 0.3, 1)`; removed under reduced motion.
- **Primary:** navy fill, white label, navy-deep on hover. One or two per group ("Tela cheia", the recommended choice in a dialog).
- **Quiet:** transparent border, muted label, for the least important action in a stack.
- **Disabled:** label #9AA9B8, border rule-2, default cursor.
- **Focus:** 3px solid orange outline, 2px offset, on every button and input.

### Segmented control
Speed (1× 3× 10× 30×) and sensor count (3 5 7). Buttons fuse with a -1.5px overlap, outer corners 6px, min width 52px. Pressed state (`aria-pressed="true"`) is a navy fill with white label; unpressed hover is the paper-2 wash.

### Select and inputs
The circuit select shares the button recipe (max width 270px). The seed input is 1.5px rule border, 6px radius. Range sliders and checkboxes are native, tinted with `accent-color` navy; checkboxes are 20px.

### Chips and tags
- **Chip:** navy status pill over the map (draw instructions, "Pausado", ghost generation key), with the chip float shadow. Error variant is red.
- **Tag:** 13px/600 inline label after a heading: elite in ink, child in light cyan (#D8F0FA) with navy text, random in rule-2.
- **Key cap:** shortcut name in 700 13px navy on paper-2 with a 1px rule border, in a two-column definition list.

### Standings tower (signature)
Opens with a 4px navy top rule. Generation block: muted "Geração" and a tabular timer on one line, the hero numeral, then a 6px clock bar (rule-2 track, orange fill). The standings are an ordered list of full-width row buttons in a 26px / 22px / 1fr / auto / 64px grid: condensed position, car color swatch, "Carro 007", kind, laps right-aligned. P1's position is orange-ink. Crashed rows fade to 55% with a red "bateu". The selected row gets the selected wash and a 2px teal underline under the car name. Below: a two-cell stats block between a 2px navy rule and a 1px rule, then the chart and the network.

### Bulletin
One line of 19px/500 ink between two 1px rules, led by a 10px orange square. It is the narration channel (`aria-live="polite"`).

### Circuit map (canvas)
Graph paper (40-unit grid, bold every 200), then the track built from nested strokes: navy outline with the printed-ribbon shadow, white border, red/white dashed kerb, asphalt ribbon, faint white dashed centre line. Checkered start line. Turns are numbered in 12px white circles with a 2px navy ring and Saira Condensed 700 15px navy numerals, placed outside the corner. Cars are 17 x 8.5 rounded rectangles with a dark windscreen: child cyan, elite white, leader orange at 1.35x. The focused car shows its sensor rays; a selected car gets a navy-and-white double ring and a navy "Carro 007" tag. Ghost comparisons use grey, cyan and orange for oldest to newest.

### Explanation deck (canvas)
Opened on demand by the presenter ("Explicar a evolução", key E); it never interrupts the run on its own. Seven paper sheets over a light-washed map, built from the last finished generation's real data: 1 Enxergar (the P1 car's actual sensor rays and the numbers they become), 2 Decidir (its network with live input/output values), 3 Classificação (top 6 with distance bars), 4 Escolha dos pais (the rank-biased selection chance per position, the two drawn parents highlighted), 5 Cruzamento (child network colored by which parent each connection came from), 6 Mutação (mutated connections flashing red, with before → after values), and 7 Nova geração (the new population car by car). Each sheet: 8px radius, sheet shadow, orange-ink step number beside a 56px/800 navy title, a 23px/500 ink-soft subtitle, the brand double rule, and a footer with navigation hints and 7 progress pills. It opens as a full-screen presentation: the slide canvas fills the left, and a right column holds the LAMIA brand, a clickable agenda of the 7 steps (current step in navy with an orange numeral, finished steps with teal numerals), prev/next/close buttons, and a pulsing red "Ao vivo" label. Below that column the real track keeps running as a picture-in-picture: the same .stage element is repositioned by CSS, it is not a copy. The presenter moves with → or a click on the slide, goes back with ←, and closes with Esc.

### Network and chart (canvas)
Network: connections colored by the sign of the weight (navy positive, orange negative), with alpha and width from the magnitude; neurons are white discs with a #C9D6E3 ring, filled by activation. Chart: ruled like timing paper, one line per whole lap (every 2 above 10), best car in navy and the average in chart-muted, each ending in a dot.

### Step list
Presenter panel: a native `<dialog>` drawer, 460px wide and full height, sliding in from the right over a navy-tinted backdrop. It has a sticky header with a 4px navy rule and sections split by 1px rules (Experimente mudar, Cérebro campeão, Repetir uma execução, Atalhos). The dock uses lucide icons at 18px and a 2.2 stroke inside thin-wire buttons. Icon-only buttons are 42px square and always carry an aria-label and a title.

## Do's and Don'ts

### Do:
- **Do** set every live number in Saira Condensed 700/800 with tabular numerals.
- **Do** use the brand double rule (teal over orange, offset) to open a sheet or page.
- **Do** separate data with horizontal rules (rule, rule-2), with a heavier navy rule at the start of a block.
- **Do** use orange-ink, not orange, when the leader's color has to be text on paper.
- **Do** give every text size a vh-based clamp in presentation mode.
- **Do** back every car color with a legend or a text label; color alone never identifies a role.

### Don't:
- **Don't** use a dark background, neon glows or a HUD look; this is light theme only.
- **Don't** use orange or red for emphasis, decoration or a generic call to action.
- **Don't** add shadows to flat controls, tables or the tower; shadows are only for paper laid over something.
- **Don't** set sentences in the condensed face or numbers in the body face.
- **Don't** redefine the palette per renderer; the canvas renderers repeat the CSS hex values and must stay in sync with them.

### Race mode
A race-day layer on the same dossier. The **Corrida** button (primary, in the masthead; key R) opens a native `<dialog>` sheet with a 4px navy header rule and two columns. The left column holds participants: a big condensed stepper, a names textarea and colour chips. The right column holds option cards (radio buttons with a navy border and a pale-blue fill when checked) for start, laps, circuit and brain, plus a prize input. During a race the tower becomes a timing screen: a phase title ("Grid de largada", "Volta 3 de 10", "Resultado final") and the full standings with a gap column. Rows tighten automatically above 12 cars so 30 fit on the TV. Each racer gets its own colour from a golden-angle hue ramp; text on it is picked by WCAG luminance. Over the map sit the F1 start gantry (5 pairs of red lamps on near-black) and then the podium: a white card with the 1st place plinth in orange, 2nd in navy and 3rd in teal. Name tags ride above the cars: all of them in the chase camera, only the provisional top 3 in the overview, so 30 names never pile up.
