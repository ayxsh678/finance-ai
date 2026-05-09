# Fintrest — Style System
**Compounding Geometry · App + Marketing · v.01**

This style.md replaces the previous brief. It is the single source of truth for visual language across the Fintrest app, marketing site, deck, and any surface bearing the mark. Every choice traces back to the brand book and the Motion Spec.

---

## 1 · Design Philosophy

Modern money, moved precisely. Numbers belong on **ivory paper, in emerald ink**, with a single signal-green moment when something matters. The app reads as a long, calm thesis about money — not as a trading-floor cosplay.

Three rules govern every decision:

- **Editorial over instrumental.** A column of numbers should feel like a printed page, not a Bloomberg terminal. Dense where density earns its keep; quiet everywhere else.
- **Signal is rare.** Signal green `#1FB57A` is reserved. If everything is signal, nothing is. Most of the app is charcoal-on-ivory or ivory-on-emerald, monochrome by default.
- **Numerals are typography.** Tabular Geist Mono everywhere a number lives. Numbers align by digit, not by guess.

The mark is the **Ligature** — F whose final stroke becomes the rupee's descending leg. It anchors the sidebar, the splash, the favicon, the loader. It is never replaced with an aperture, a logomark variant, or any abstract glyph.

---

## 2 · Type System

| Role | Family | Notes |
|---|---|---|
| Display | **Bricolage Grotesque** (500 / 700 / 800) | Hero numbers, section titles, ticker prices, marquee figures. Variable opsz. |
| Body / UI | **Instrument Sans** (400 / 500 / 600) | Descriptions, body copy, button labels, form fields. |
| Mono / numerals | **Geist Mono** (400 / 500 / 600) | All numbers, codes, timestamps, eyebrows, micro-copy. `font-feature-settings: 'tnum' 1, 'ss01' 1`. |

**Never** use Inter, Roboto, DM Sans, DM Serif, JetBrains Mono, or system fonts. The chosen pair is the differentiator — defaults are forbidden.

### Type Scale

| Token | Size | Family | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `t-marquee` | 64px | Bricolage | 700 | -0.04em | Auth headline, splash text |
| `t-hero-num` | 48px | Bricolage | 700 | -0.03em | Ticker price hero |
| `t-section` | 32px | Bricolage | 700 | -0.03em | Page H1 |
| `t-h2` | 22px | Bricolage | 700 | -0.02em | Card titles, panel headers |
| `t-h3` | 16px | Instrument | 600 | -0.005em | Sub-headings, list headers |
| `t-body` | 14px | Instrument | 400 | 0 | Body copy, descriptions |
| `t-meta` | 12px | Instrument | 500 | 0 | Captions, secondary info |
| `t-num-l` | 28–36px | Geist Mono | 500 | 0.02em | Prominent prices, gauge scores |
| `t-num-m` | 16px | Geist Mono | 500 | 0.02em | Table prices, badges |
| `t-num-s` | 13px | Geist Mono | 500 | 0.02em | Inline numbers, change pills |
| `t-eyebrow` | 10–11px | Geist Mono | 500 | 0.24em UPPER | Section eyebrows, table headers |

Ticker symbols (`AAPL`, `RELIANCE.NS`) are always Geist Mono uppercase — they are codes, not words.

---

## 3 · Color System

### Core palette

```css
:root {
  /* Surfaces */
  --emerald:        #0B3B2E;   /* primary brand surface, sidebar, hero panels */
  --emerald-deep:   #082A21;   /* hover/elevation on emerald */
  --emerald-line:   #0F4937;   /* hairline borders on emerald */
  --ivory:          #F1EDE3;   /* primary content surface */
  --ivory-deep:     #E6E0D2;   /* card/hover surface */
  --ivory-line:     #DCD6C8;   /* hairline borders on ivory */

  /* Type */
  --charcoal:       #141414;   /* primary text */
  --grey-70:        #3A3631;   /* secondary text */
  --grey-50:        #6E6960;   /* tertiary text, eyebrows on ivory */
  --grey-30:        #A8A39B;   /* disabled, ticks, axis labels */

  /* Brand accent — used sparingly */
  --signal:         #1FB57A;   /* the rare highlight */
  --signal-deep:    #169062;   /* signal hover */

  /* Semantics — financial */
  --bull:           var(--signal);   /* positive change */
  --bull-soft:      rgba(31,181,122,0.12);
  --bear:           #B83A3A;          /* negative change — carmine, not red-red */
  --bear-soft:      rgba(184,58,58,0.10);
  --neutral:        var(--grey-50);

  /* Semantics — system */
  --warn:           #C8813A;   /* alerts, threshold breaches — never decorative */
  --warn-soft:      rgba(200,129,58,0.12);
  --info:           var(--emerald);
}
```

### Allocation rules

- **70% surface** is ivory or emerald. Pick one per page; never mix as equals.
- **20%** is type and hairline borders.
- **8%** is data accents (bull/bear pills, gauge fills).
- **2%** is signal green or warn amber. If a screen needs more accent than that, the screen is too busy.

### Bull/bear discipline

`--signal` and `--bull` happen to be the same token. **They are not interchangeable.** `--signal` is for *brand* moments (active nav, key CTA, sentiment positive). `--bull` is for *price* moments (positive change, up candle). Use the right name in the right place — the meaning should be visible in the code.

`--bear` (carmine) replaces the usual fintech red-red. Reads as serious, not panicked. Saturation matched to `--signal` so neither shouts louder than the other.

### Night variant (optional, not default)

The app defaults to ivory. A `[data-theme="night"]` selector can flip the surfaces:

```css
[data-theme="night"] {
  --ivory:        var(--emerald);
  --ivory-deep:   var(--emerald-deep);
  --ivory-line:   var(--emerald-line);
  --charcoal:     #F1EDE3;
  --grey-70:      #C9C3B6;
  --grey-50:      #8E8A7E;
  --grey-30:      #5A574E;
}
```

Night is a *user choice*, not a brand mode. Marketing surfaces stay ivory.

---

## 4 · The Mark

The Ligature is the only logo. Four strokes, drawn in conception order: stem (foundation) → top bar (horizon) → middle bar (balance) → diagonal (the rupee descent). All four are charcoal-on-ivory or ivory-on-emerald. Never gold, never gradient, never outlined.

### Sizing

| Context | Size | Stroke-width (in 100u) |
|---|---|---|
| Favicon / chrome | 16–24px | 14u |
| Sidebar | 22–28px | 14u |
| Loader / inline | 32–56px | 14u |
| Splash / hero | 96–280px | 14u |

### Animation states

Pulled directly from the Motion Spec:

- **Intro** — 1.08 s, `ease-precision`. Splash, first paint, auth load.
- **Loop** — 2.80 s, `ease-compounding`. Loaders, indeterminate progress.
- **Success** — 1.80 s, `ease-precision`. Diagonal flashes signal-green on confirmations.
- **App-nav** — 0.62 s, `ease-snap`. Tab switches, route transitions.

`prefers-reduced-motion` disables all four — mark renders static.

---

## 5 · Layout & Shell

### App shell

- **Sidebar fixed left**, 240 px wide on desktop, 64 px (icon-only) on tablet, hidden on mobile (replaced by bottom tab bar with 4 tabs: Market · Chat · Watchlist · More).
- **Sidebar surface:** emerald `#0B3B2E`. Type ivory.
- **Content surface:** ivory `#F1EDE3`. Type charcoal.
- **No top navbar.** Brand mark + wordmark live in sidebar only.
- **Max content width:** 1240 px, centered, padding `24px` desktop / `16px` mobile.

### Grid

- 12-column grid inside content.
- Gutter: 16 px.
- Cards: 4 / 6 / 8 / 12 col spans.

### Hairlines, not shadows

The brand uses **1 px hairline borders** in `--ivory-line` (or `--emerald-line` on dark). Drop shadows are reserved for: (a) hover lift on stock cards, (b) elevation on slide-in panels. Nothing else floats.

---

## 6 · Spacing — 4 px Base Grid

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4 px | Inline gaps, icon adjacency |
| `--space-2` | 8 px | Tight component padding, label-to-input |
| `--space-3` | 12 px | Form field padding, badge interiors |
| `--space-4` | 16 px | Card padding (mobile), section interior |
| `--space-6` | 24 px | Card padding (desktop), grid gutter |
| `--space-8` | 32 px | Section gaps |
| `--space-12` | 48 px | Major section gaps |
| `--space-16` | 64 px | Page-level breathing |

Never invent in-between values. If 16 isn't enough and 24 is too much, the design needs to change, not the token.

---

## 7 · Motion Tokens

```css
:root {
  --ease-precision:   cubic-bezier(0.22, 0.61, 0.36, 1.00);
  --ease-compounding: cubic-bezier(0.65, 0.00, 0.35, 1.00);
  --ease-snap:        cubic-bezier(0.45, 0.00, 0.00, 1.00);
  --ease-recede:      cubic-bezier(0.55, 0.05, 0.68, 0.53);

  --dur-snap:    140ms;   /* button press, micro-feedback */
  --dur-quick:   220ms;   /* hover, tab switch */
  --dur-precise: 360ms;   /* card reveal, panel open */
  --dur-march:   720ms;   /* gauge fill, hero sequence */
}
```

Refer to motion *by name*, not by literal value — `var(--ease-precision)` not `cubic-bezier(...)`. Treat easings the way you treat colors.

### Recurring patterns

- **Hover lift on cards:** `transform: translateY(-2px)` over `var(--dur-quick) var(--ease-precision)`.
- **Button press:** `transform: scale(0.97)` over 80 ms.
- **Page-load card stagger:** translateY(12px) → 0, opacity 0 → 1, 60 ms delay per card.
- **Live price update:** background flashes `--bull-soft` or `--bear-soft` for 400 ms then fades.
- **Tab switch:** content crossfades over 150 ms.
- **Gauge fill:** arc draws 0 → score over 720 ms with `--ease-compounding`.

---

## 8 · Components

### 8.1 Sidebar

- Surface emerald. Width 240 px / 64 px / 0.
- Brand block at top: 22 px Ligature in ivory + "FINTREST" in Bricolage 18 px ivory, 28 px padding.
- Nav items: 16 px Instrument 500, ivory at 80 % opacity. 44 px row, 16 px horizontal padding, 14 px icon left.
- **Active state:** left bar 2 px solid `--signal`, surface `--emerald-deep`, label ivory 100 %.
- Hover: surface `--emerald-deep`, 220 ms `--ease-precision`.
- Footer: 36 px circular avatar (charcoal placeholder), email truncated at 18 char, logout icon. Border-top `1px solid --emerald-line`.

### 8.2 Stock / Asset Card

- Surface ivory, border `1px solid --ivory-line`, radius 12 px, padding 24 px.
- Header row: ticker in Geist Mono 12px UPPERCASE `--grey-50` · company name in Instrument 16 px charcoal.
- Price block: Bricolage 36 px charcoal, tabular numerals, paired with change pill.
- **Change pill:** radius 999 px, padding 4 / 10, Geist Mono 13 px.
  - Bull: bg `--bull-soft`, text `--bull`, prefix `+`.
  - Bear: bg `--bear-soft`, text `--bear`, prefix `−` (true minus, not hyphen).
- Metadata row: PE · Mkt Cap · 52W — Instrument 12 px `--grey-50`, separated by middle dot.
- Hover: border-color `--grey-30`, shadow `0 4px 24px rgba(11,59,46,0.10)`, `translateY(-2px)`.

### 8.3 OHLC Candlestick Chart

- Background transparent — sits on card.
- Grid: `--ivory-line`, 1 px dashed (3 px dash, 4 px gap).
- Up candle: `--bull`. Down candle: `--bear`. Wicks same color, 1 px.
- Crosshair: `--grey-50`, 1 px dotted.
- Time axis: Geist Mono 11 px `--grey-50`, bottom-aligned.
- Price axis: Geist Mono 11 px `--grey-70`, right-aligned.
- Volume bars: 30 % opacity, same color as candle, separate sub-axis below.
- Time-range pills above chart: `1W · 1M · 3M · 6M · 1Y · ALL` — Instrument 12 px. Active gets `--charcoal` underline, 1 px, 2 px below baseline (no fill, no pill — just underline).

### 8.4 Sentiment Gauge

- 180° arc, 220 px wide, centered.
- Track `--ivory-line`, 8 px stroke.
- Fill gradient: `--bear` → `--neutral` → `--bull`.
- Needle: 2 px charcoal line, small charcoal disc at tip.
- Score below arc: Bricolage 32 px charcoal · label in Geist Mono 11 px UPPERCASE `--grey-50` (e.g. `BULLISH · 7.4`).
- Beneath: scrollable headline list. Each row: 14 px Instrument, 1-line truncation, impact pill on right.
  - Impact 7–10 → bull pill.
  - Impact 4–6 → neutral pill (`--grey-30` text on transparent).
  - Impact 1–3 → bear pill.
- Mount animation: arc draws 0 → score with `--ease-compounding` over `--dur-march`.

### 8.5 Chat Interface

- Full-height scrollable list, max-width 720 px centered.
- **User bubble:** right-aligned. Surface `--emerald`, text ivory, Instrument 14 px. Radius 16 16 4 16. Shadow none.
- **Assistant bubble:** left-aligned. Surface `--ivory-deep`, text charcoal, Instrument 14 px. Radius 4 16 16 16. Border none.
- 12 px Ligature glyph anchors the assistant block at top-left (charcoal, 12 px tall).
- **Typing indicator:** three small charcoal dots, 4 px each, fading sequence 600 ms `--ease-compounding`.
- **Input bar:** sticky bottom. Surface ivory, border-top `1px solid --ivory-line`, padding 12 / 16.
  - Input: Instrument 14 px, border-bottom `1px solid --ivory-line`, no other borders. Focus: border-color `--charcoal`. Placeholder `--grey-30`.
  - Send button: 36 px square, charcoal icon. Hover: surface `--ivory-deep`. Disabled: `--grey-30`.

### 8.6 Watchlist Table

- Full-width, no outer card border.
- Column headers: Geist Mono 11 px UPPERCASE `--grey-50`, padding 12 / 16, border-bottom `1px solid --charcoal`.
- Columns: Ticker · Name · Price · Change · Sentiment.
- Row height 56 px, border-bottom `1px solid --ivory-line`.
- Row hover: surface `--ivory-deep`, 180 ms `--ease-precision`.
- Ticker: Geist Mono 13 px charcoal.
- Name: Instrument 14 px `--grey-70`.
- Price: Geist Mono 14 px charcoal.
- Change: pill (8.2 spec).
- Sentiment: 64 px × 4 px horizontal mini-bar — fill colored by score (`--bull`, `--neutral`, `--bear`), track `--ivory-line`.
- Row click: opens stock detail in slide-in panel from right (no modal).

### 8.7 Portfolio Breakdown

- Header: "Portfolio Overview" — Bricolage 32 px charcoal.
- Summary card: full-width, surface ivory, **left border 3 px solid `--emerald`** (not gradient, not gold), padding 24 px. AI-generated text in Instrument 14 px line-height 1.6, max 4 lines visible (rest collapsed with `Read more`).
- Per-ticker grid: 3 columns desktop / 2 tablet / 1 mobile.
- Mini card: 16 px padding, ticker + price + 48 px sparkline.
- **Sparkline:** Recharts Area, 48 px tall, no axes. Stroke `--bull` or `--bear` 1.5 px, fill at 12 % opacity, 0 grid.

### 8.8 Comparison Panel

- Two stock cards side-by-side, gutter 32 px. VS divider centered.
- **VS divider:** vertical, 1 px `--ivory-line` from top to bottom, with "VS" in Bricolage 24 px `--ivory-line` (yes, same color as line — almost-invisible, intentional) sitting on a 24 px ivory pad break.
- Below the two cards: full-width verdict card. Left border 3 px `--signal`. AI verdict in Instrument 14 px charcoal, max 6 lines.

### 8.9 Forex Card

- Pair name: Bricolage 28 px (e.g. `EUR / USD`). 24 px flag emoji each side, baseline-aligned.
- Rate: Geist Mono 36 px charcoal, paired with change pill.
- 80 px Recharts LineChart below, no axes, stroke `--charcoal` 1.5 px.
- Insight text: Instrument 13 px `--grey-70` italic, 2 line max.

### 8.10 Price Alert Form

- Inline (not modal). Slide-in panel from right on mobile.
- Three fields in a row on desktop: ticker · threshold price · direction toggle.
- **Direction toggle:** segmented pill, two options `Above` / `Below`. Selected: surface `--charcoal`, text ivory. Unselected: surface `--ivory-deep`, text `--grey-70`. 220 ms `--ease-precision` transition.
- Active alerts list below: each row = ticker · threshold · direction · trash icon. 48 px row.
- **Triggered:** small filled `--signal` dot at left edge, threshold price gets `text-decoration: line-through`, `--grey-50`.

### 8.11 Auth Screens (Login · Register)

- Full-page split: left half emerald, right half ivory (desktop). Mobile: ivory only with emerald header band.
- Left panel: Ligature mark 96 px ivory, marquee text in Bricolage 64 px `Modern money,\nmoved precisely.`
- Right panel: centered card max-width 400 px, 40 px padding. No card border or shadow — sits on ivory directly. Internal hairline `1px solid --ivory-line` between fields.
- Inputs: border-bottom only, Instrument 14 px. Focus: border-color `--charcoal`. Placeholder `--grey-30`. Label above input in Geist Mono 10 px UPPERCASE `--grey-50` letter-spacing 0.20 em.
- **Submit button:** full-width, surface `--charcoal`, text ivory, Instrument 15 px 600. Radius 8 px. Hover: surface `--emerald`. Active: `scale(0.98)`.
- Secondary action (e.g. Google SSO): full-width, surface ivory, border `1px solid --ivory-line`, text charcoal.

---

## 9 · Copy Tone

- **Headings:** declarative, lowercase by default, no exclamation. `Portfolio overview`. `Today's movers`. `Set an alert`.
- **AI responses:** analyst register. Names instruments, cites figures, notes uncertainty. No emoji. No "Sure!" or "Happy to help!" preambles.
- **Errors:** factual. `Couldn't fetch AAPL — retry?` Not `Oops!` Not `Something went wrong.`
- **Empty states:** one Bricolage 18 px line + one Instrument 14 px `--grey-70` line. No illustration. `No alerts set.` / `Add a ticker to begin tracking.`
- **Loading:** `Fetching market data` (no ellipsis if a thin progress line is present; with ellipsis if not). Geist Mono 12 px `--grey-50`. Always paired with the **Loop** mark variant in the same view.
- **Numbers:** always use thin space as thousands separator and minus sign `−` (U+2212), not hyphen. Geist Mono handles spacing.

Forbidden words: `awesome`, `great`, `oops`, `whoops`, `let's`, `together`, `journey`, `seamless`, `revolutionary`, `next-gen`, `AI-powered` (the last especially — show, don't shout).

---

## 10 · Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `< 640 px` (Mobile) | Single column. Bottom tab bar (4 tabs). Sidebar hidden. Stock card 1-up. |
| `640–1024 px` (Tablet) | Two-column. Icon-only sidebar (64 px). Stock cards 2-up. |
| `> 1024 px` (Desktop) | Full sidebar (240 px) + content. Stock cards 3-up. Comparison side-by-side. |
| `> 1440 px` (Wide) | Same as desktop. Content stays at max-width 1240 px — do not stretch. |

---

## 11 · Build Priority

1. **Tokens & shell** — install fonts, declare CSS variables, build sidebar + content frame + bottom tab.
2. **Stock card + Watchlist table** — these define the visual register; everything else inherits.
3. **OHLC chart + Sentiment gauge** — the data-viz canon.
4. **Chat interface** — distinct register; gets its own canvas.
5. **Auth screens** — first impression; do them right after the canon is locked.
6. **Portfolio · Comparison · Forex · Alerts** — last, because they recombine 1–4.

Skip nothing in 1–2. Half-done tokens = whole-broken system.

---

## 12 · Do Not

Anti-patterns specific to this brand. Treat as hard rules.

- No gold accent. Not `#C8A96E`, not any warm metallic. Signal green is the only accent.
- No purple anything.
- No dark-default trading UI. Ivory is the canvas.
- No `Inter`, `Roboto`, `DM Sans`, `DM Serif Display`, `JetBrains Mono`, system fonts. The brand pair is non-negotiable.
- No drop shadows in brand color. Shadows are `rgba(11,59,46,X)` only, low opacity.
- No rounded XL pills on buttons (radius 999 only on change-pills and toggles).
- No emoji in product copy (except flag emoji on forex pairs).
- No loading spinners. Use the **Loop** mark variant.
- No modals. Use slide-in panels from right (mobile) or bottom (desktop ephemeral).
- No multi-color sentiment gradients beyond the bear → neutral → bull arc. Other gradients are forbidden.
- No "AI-powered" badges, sparkle emoji, or magic-wand icons. The intelligence shows in the answers.
- No font weight 800+ on body text. Weight is for display only.
- No card backgrounds darker than the page. Cards are ivory on ivory-deep page (or vice versa for night) — elevation reads via *border*, not surface darkness.

---

## 13 · Token Reference (full CSS)

```css
:root {
  /* Surfaces */
  --emerald: #0B3B2E;
  --emerald-deep: #082A21;
  --emerald-line: #0F4937;
  --ivory: #F1EDE3;
  --ivory-deep: #E6E0D2;
  --ivory-line: #DCD6C8;

  /* Type */
  --charcoal: #141414;
  --grey-70: #3A3631;
  --grey-50: #6E6960;
  --grey-30: #A8A39B;

  /* Accent */
  --signal: #1FB57A;
  --signal-deep: #169062;

  /* Financial semantics */
  --bull: #1FB57A;
  --bull-soft: rgba(31,181,122,0.12);
  --bear: #B83A3A;
  --bear-soft: rgba(184,58,58,0.10);
  --neutral: #6E6960;

  /* System semantics */
  --warn: #C8813A;
  --warn-soft: rgba(200,129,58,0.12);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --r-sm: 4px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-pill: 999px;

  /* Motion */
  --ease-precision: cubic-bezier(0.22, 0.61, 0.36, 1.00);
  --ease-compounding: cubic-bezier(0.65, 0.00, 0.35, 1.00);
  --ease-snap: cubic-bezier(0.45, 0.00, 0.00, 1.00);
  --ease-recede: cubic-bezier(0.55, 0.05, 0.68, 0.53);

  --dur-snap: 140ms;
  --dur-quick: 220ms;
  --dur-precise: 360ms;
  --dur-march: 720ms;

  /* Type families */
  --font-display: 'Bricolage Grotesque', serif;
  --font-body: 'Instrument Sans', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
}
```

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@10..48,500;10..48,700;10..48,800&family=Instrument+Sans:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 14 · Cross-references

- **Brand book:** Compounding Geometry — covers mark construction, color philosophy, application contexts.
- **Motion Spec v.01:** the four named easings, the four mark-animation variants, the choreography of the Ligature reveal.
- **Wordmark + Mark assets:** SVG sources in `/brand/marks/`.

If anything in this style.md conflicts with the brand book, the brand book wins. If anything conflicts with the motion spec, the motion spec wins. Both supersede component-level decisions.

---

*© Fintrest · Brand Council · 2026 · style.md v.01*
