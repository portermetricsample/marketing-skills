# Audit Document — Design Spec

Bridges the Porter Design System (`~/porter-design/`) to the Google Ads audit HTML.
Read this before writing or editing audit CSS.

Source files:
- `~/porter-design/tokens/themes.css` — the 4 official themes (single source of truth)
- `~/porter-design/tokens/colors.css` — raw brand tokens
- `~/porter-design/tokens/typography.css` — font families and scale
- `~/porter-design/docs/PATTERN-AUDIT.md` — report pattern inventory

---

## The 4 official themes

Apply one `data-theme` attribute on the `<div id="audit">` wrapper. That's it —
every semantic variable resolves automatically. Never hard-code hex values; always
paint from `--surface-bg`, `--text-title`, `--callout-*`, etc.

```html
<div id="audit" data-theme="cream">   <!-- light · soft paper · DEFAULT    -->
<div id="audit" data-theme="white">   <!-- light · pure white               -->
<div id="audit" data-theme="blue">    <!-- dark  · deep indigo              -->
<div id="audit" data-theme="purple">  <!-- dark  · deep purple              -->
```

| Theme | Background | Card | Primary text | Eyebrow / accent | Best for |
|-------|-----------|------|-------------|-----------------|---------|
| `cream` | `#fdf8f0` | `#ffffff` | `#1a0340` | `#6701e6` purple | Default deliverable |
| `white` | `#ffffff` | `#ffffff` | `#1a0340` | `#6701e6` purple | Clean / minimal |
| `blue` | `#100225` | `#1c0942` | `#ffffff` | `#a78bfa` lavender | Dark executive |
| `purple` | `#1b0e36` | `#2a1850` | `#fff8ec` warm cream | `#3fbe86` green | Dark premium |

---

## Semantic variables — use these, never raw hex

These resolve differently per theme. The CSS only needs to reference the variable name.

| Variable | Role |
|----------|------|
| `--surface-bg` | Page / document background |
| `--surface-card` | Section card background |
| `--card-border` | Card 1px hairline border |
| `--text-title` | Headings, h2, KPI values |
| `--text-body` | Body paragraphs, table cells |
| `--text-muted` | Labels, captions, meta info |
| `--eyebrow-color` | Section numbers, eyebrow text, brand accent |
| `--good` | Positive delta (CPA down, conv up) |
| `--bad` | Negative delta (CPA up, conv down) |
| `--chip-bg` / `--chip-text` | Neutral tags and pills |

### Callout types — fully theme-aware

Map audit callout types directly to theme callout tokens:

| Audit callout | Theme variable | Meaning |
|--------------|---------------|---------|
| **Fix** (action now) | `--callout-risk-bg` / `--callout-risk-tx` | Urgent — active problem |
| **Watch** (monitor) | `--callout-warn-bg` / `--callout-warn-tx` | Yellow flag — not urgent yet |
| **Note / Context** | `--callout-info-bg` / `--callout-info-tx` | Informational / data caveat |
| **Resolved** | `--callout-win-bg` / `--callout-win-tx` | Green — confirmed good or corrected |

### Verdict chips — map to callout tokens

| Verdict | Background | Text |
|---------|-----------|------|
| `Broken` | `--callout-risk-bg` | `--callout-risk-tx` |
| `Review` | `--callout-warn-bg` | `--callout-warn-tx` |
| `Pass` | `--callout-win-bg` | `--callout-win-tx` |
| `N/A` | `--chip-bg` | `--chip-text` |

### Severity badges — HIGH / MED / LOW

These need to be visible on both light and dark. Use `--bad`, `--callout-warn-tx`, and `--text-muted` as text color with a matching tint background, or render as solid small pills using `--bad`, amber, and gray respectively.

### Delta pills on scorecards

```css
.delta-good { color: var(--good); }
.delta-bad  { color: var(--bad);  }
.delta-flat { color: var(--text-muted); }
```

### Table header row
```css
thead th { background: var(--tint-a-bg); color: var(--tint-a-text); }
```
`--tint-a-bg` / `--tint-a-text` are purple-tinted on light, lavender-tinted on dark — exactly right for a table header.

### "What's Set Up Right" cards
```css
.passcard { background: var(--callout-win-bg); color: var(--callout-win-tx); }
```

### "Do first" box in Executive Summary
```css
.do { background: var(--surface-card); border-left: 3px solid var(--eyebrow-color); }
```

---

## Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
```

| Role | Font | Weight | Token |
|------|------|--------|-------|
| KPI values, h1, big numbers | Bricolage Grotesque | 700–800 | `--font-display` |
| Section headings (h2) | Bricolage Grotesque | 700 | `--font-display` |
| Body, paragraphs, table text | Hanken Grotesk | 400–600 | `--font-body` |
| Section numbers `§01`, chips, badges, `.num` cells | IBM Plex Mono | 400–600 | `--font-mono` |

**Rule:** IBM Plex Mono is reserved for badges, chips, code, and metric values in table cells — never for body text or headings.

---

## CSS base for audit `style.css`

Import the theme tokens from porter-design, then build all audit-specific rules on top of the semantic variables. No hex in the audit CSS — only `var(--...)`.

```css
/* Link porter-design themes first, then audit-specific overrides */
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque...');

/* Audit layout and component rules — all colors via semantic vars */
.doc {
  background: var(--surface-bg);
  color: var(--text-body);
  font-family: var(--font-body, 'Hanken Grotesk', sans-serif);
}

h1, h2 { font-family: var(--font-display, 'Bricolage Grotesque', sans-serif); color: var(--text-title); }

.section-num { font-family: var(--font-mono); color: var(--eyebrow-color); }

.scard { background: var(--surface-card); border: 1px solid var(--card-border); }
.val   { font-family: var(--font-display); color: var(--text-title); }

.chip.c-broken  { background: var(--callout-risk-bg); color: var(--callout-risk-tx); }
.chip.c-review  { background: var(--callout-warn-bg); color: var(--callout-warn-tx); }
.chip.c-ok      { background: var(--callout-win-bg);  color: var(--callout-win-tx);  }
.chip.c-na      { background: var(--chip-bg);          color: var(--chip-text);        }

.callout.co-fix     { border-left-color: var(--bad);             background: var(--callout-risk-bg); }
.callout.co-watch   { border-left-color: var(--callout-warn-tx); background: var(--callout-warn-bg); }
.callout.co-info    { border-left-color: var(--eyebrow-color);   background: var(--callout-info-bg); }
.callout.co-win     { border-left-color: var(--good);            background: var(--callout-win-bg);  }

thead th { background: var(--tint-a-bg); color: var(--tint-a-text); font-family: var(--font-body); }
.num     { font-family: var(--font-mono); }

.delta.d-good { color: var(--good); }
.delta.d-bad  { color: var(--bad);  }
.delta.d-flat { color: var(--text-muted); }

.passcard { background: var(--callout-win-bg); color: var(--callout-win-tx); }
.do       { background: var(--stat-bg); border-left: 3px solid var(--eyebrow-color); }
```

---

## The five rules from porter-design (never break these)

1. **No gradients.** All backgrounds are solid fills — `var(--surface-bg)`, `var(--surface-card)`, callout backgrounds.
2. **No drop shadows.** Cards use `1px solid var(--card-border)` only.
3. **IBM Plex Mono is reserved** for `§N` numbers, chips/badges, and `.num` table cells — never body text.
4. **Max 3 colors per surface.** Each section: background + one accent (`--eyebrow-color`) + text.
5. **Bricolage Grotesque for big numbers and headings.** KPI values, h1, h2 — always `--font-display`.
