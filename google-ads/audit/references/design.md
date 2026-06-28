# Audit Document — Design Spec

Bridges the Porter Design System (`porter-design` skill / `~/porter-design/`) to the
Google Ads audit HTML document. Read this before writing or editing audit CSS.

The design system source: `~/porter-design/tokens/` · `~/porter-design/docs/PATTERN-AUDIT.md`  
The five rules: type is the hero · solid color only · no shadows · IBM Plex Mono for badges only · two-line stacked headline.

---

## Fonts (load from Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
```

| Role | Font | Weight | When |
|------|------|--------|------|
| KPI values, big numbers | Bricolage Grotesque | 700–800 | Scorecard values, metric highlights |
| Section headings (h2) | Bricolage Grotesque | 700 | Section titles |
| Body, table text, paragraphs | Hanken Grotesk | 400–600 | All prose and table content |
| Section numbers, eyebrows, chips, badges | IBM Plex Mono | 400–600 | `§N`, verdict chips, severity badges, meta labels |

Token aliases: `--font-display: 'Bricolage Grotesque'` · `--font-body: 'Hanken Grotesk'` · `--font-mono: 'IBM Plex Mono'`

---

## Color tokens (from `~/porter-design/tokens/colors.css`)

### Surfaces
| Element | Token | Hex |
|---------|-------|-----|
| Page background | `--porter-cream` | `#fdf8f0` |
| Card / section background | `--porter-white` | `#ffffff` |
| Table header row | `--purple-100` | `#ede9fe` |
| Dark callout / "Do first" box | `--porter-dark` | `#1a0340` |
| Dark callout text | `--porter-white` | `#ffffff` |

### Text
| Element | Token | Hex |
|---------|-------|-----|
| Primary headings, KPI values | `--ink` = `--porter-dark` | `#1a0340` |
| Body text | `--ink-soft` | `#4a4458` |
| Secondary labels, captions | `--ink-mute` | `#8b85a0` |
| Brand accent (eyebrows, section numbers) | `--porter-purple` | `#6701e6` |

### Deltas
| Direction | Token | Hex | Note |
|-----------|-------|-----|------|
| Positive (good) | `--delta-up` | `#0d9488` (aqua on light) | CPA down, conversions up |
| Negative (bad) | `--delta-down` = `--porter-pink` | `#ec4899` | CPA up, conversions down |
| Flat / neutral | `--ink-mute` | `#8b85a0` | No material change |

### Verdict chips (`.chip`)
| Verdict | Background | Text | Border |
|---------|-----------|------|--------|
| Broken | `#fde8e8` | `#c0392b` | `#f5c6c6` |
| Review | `#fef3e2` | `#b45309` | `#fde68a` |
| Pass | `#ecfdf5` | `#065f46` | `#a7f3d0` |
| N/A / Limited | `--purple-100` `#ede9fe` | `--purple-600` `#6701e6` | `--purple-300` |

### Severity badges (`.sev`)
| Level | Background | Text |
|-------|-----------|------|
| HIGH | `#c0392b` | `#ffffff` |
| MED | `#b45309` | `#ffffff` |
| LOW | `#6b7280` | `#ffffff` |

### Callout types
| Type | Left border | Background | Icon label |
|------|------------|-----------|-----------|
| Fix (action now) | `--porter-purple` `#6701e6` | `#f5f3ff` | Fix |
| Watch (monitor) | `--porter-yellow` `#fbbf24` | `#fffbeb` | Watch |
| Note / Context | `--ink-mute` `#8b85a0` | `#f9fafb` | Note |
| Resolved / Correction | `--delta-up` `#0d9488` | `#f0fdfa` | Resolved |

---

## Key element specs

### Header
- Background: `--porter-cream` (#fdf8f0)
- Eyebrow ("Google Ads Account Audit"): IBM Plex Mono, uppercase, `--porter-purple`, 11px, letter-spacing 2px
- h1 (client name): Bricolage Grotesque 800, `--ink` (#1a0340), tight tracking
- Sub (business description): Hanken Grotesk 400, `--ink-soft`
- Meta row: IBM Plex Mono 400, `--ink-mute` for labels, `--ink` for values

### Section header
- Section number (`§01`): IBM Plex Mono, `--porter-purple`, 12px
- h2: Bricolage Grotesque 700, `--ink`, 22px
- Border-bottom of section header area: 1px `--neutral-200`

### KPI Scorecards
- Card: white background, border-radius 12px, 1px `--border-hairline`
- Label: Hanken Grotesk 500, `--ink-mute`, 12px, uppercase
- Value: Bricolage Grotesque 700, `--ink`, 28–32px
- Delta pill: IBM Plex Mono, 11px, rounded — color from delta tokens above
- Caption: Hanken Grotesk 400, `--ink-mute`, 11px

### Data tables
- `<th>` background: `--purple-100` (#ede9fe), Hanken Grotesk 600, `--ink`, 12px
- `<td>`: Hanken Grotesk 400, 13px, `--ink-soft`
- `.num` (metric cells): IBM Plex Mono 600, right-aligned
- `.rec` (recommendation column): Hanken Grotesk 400, 12px
- Row hover: `#fafafa`
- Best-performer highlight row: `#f5f3ff` (light purple tint)

### Action Plan
- Container: white card, border-radius 12px
- Rank number: Bricolage Grotesque 800, `--porter-purple`, large (auto-numbered via CSS counter)
- Action title: Hanken Grotesk 600, `--ink`, 15px
- Description: Hanken Grotesk 400, `--ink-soft`, 13px
- Meta tag (§ref · severity · time): IBM Plex Mono 400, `--ink-mute`, 11px

### "What's Set Up Right" cards
- Card: `#ecfdf5` (light green), border-radius 10px, border `#a7f3d0`
- Check mark: `#065f46` (green)
- Title: Hanken Grotesk 600, `--ink`
- Body: Hanken Grotesk 400, `--ink-soft`, 13px

---

## Rules that apply from porter-design

1. **No gradients.** All backgrounds are solid fills.
2. **No drop shadows.** Cards use a 1px hairline border (`--border-hairline` = `#e5e7eb`) only.
3. **IBM Plex Mono is reserved** for badges, chips, section numbers, code, and metric values in tables — never for body text.
4. **Max 3 colors per surface.** Each section: white + one accent + text.
5. **Bricolage Grotesque for big numbers.** KPI values, the "Do first" stat callouts — always Bricolage, never Hanken.
6. **`--porter-purple` is the single brand anchor.** Use it for section numbers, eyebrows, active chip borders, and the "Do first" box accent. Never scatter it as decoration.

---

## CSS variable quick-reference for the audit `style.css`

```css
:root {
  /* Surfaces */
  --audit-bg:         #fdf8f0;  /* --porter-cream */
  --audit-card:       #ffffff;
  --audit-th:         #ede9fe;  /* --purple-100 */
  --audit-dark:       #1a0340;  /* --porter-dark */

  /* Text */
  --audit-ink:        #1a0340;
  --audit-ink-soft:   #4a4458;
  --audit-ink-mute:   #8b85a0;
  --audit-purple:     #6701e6;  /* --porter-purple */

  /* Deltas */
  --audit-good:       #0d9488;
  --audit-bad:        #ec4899;  /* --porter-pink */

  /* Borders */
  --audit-border:     #e5e7eb;  /* --border-hairline */

  /* Fonts */
  --f-display:        'Bricolage Grotesque', sans-serif;
  --f-body:           'Hanken Grotesk', sans-serif;
  --f-mono:           'IBM Plex Mono', monospace;
}
```
