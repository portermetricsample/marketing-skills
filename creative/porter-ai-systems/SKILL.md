---
name: porter-ai-systems
description: Build "Porter AI Marketing Systems" — highly graphic, infographic-style LinkedIn visuals for Porter Metrics about using AI agents, Claude, MCPs and marketing data (Meta Ads, Google Ads, SEO, creative, reporting, optimization). Use when the user asks to create, refine, or extend a post in this series, a 1080x1350 / 4:5 marketing infographic in the Porter style, a "X use cases for Y" graphic, a before/after or system-map marketing visual, or mentions "AI Marketing Systems". Enforces one design system, real logos from Porter's CDN, and a hybrid icon method so every post is consistent.
---

# Porter AI Marketing Systems

A repeatable system for the LinkedIn visual series. Goal: posts that look like a diagram from a marketing-intelligence lab — understandable in 2 seconds, detailed enough to save. Not generic SaaS ads.

**Audience:** marketers, founders, growth teams, agencies. **Tone:** practical, intelligent, direct, visually memorable. The visual must communicate "AI connected to marketing data", not "AI chatbot".

## Workflow (follow in order, every time)

1. **Confirm the brief** — topic, the list/comparison, and the `Setup:` line (which data source + Porter MCP + Claude). For a new deliverable, ask 2–4 refinement questions (brand scope, format, metrics) before building — do not ask technical confirmations.
2. **Gather real logos** — never hand-draw a brand mark. See **Logos**. Download into `assets/logos/`.
3. **Pick icons** — map each item to ONE Lucide base icon, then add restrained pink. See **Icons**.
4. **Build** from `template.html` (copy it next to an `assets/` folder). Keep the canvas exactly **1080×1350**.
5. **Render** at 2× and review close-ups. See **Render & QA**.
6. **Self-check** against the **QA checklist** before showing the user.

## Design system

**Canvas:** 1080×1350 (4:5). Outer padding 56px. Subtle 54px dot/line grid at ~3.5% opacity on the cream background. Footer pinned bottom, subtle.

**Palette (CSS vars in template):**
- `--cream:#fdf8f0` background world · `--deep:#1a0340` deep purple (text, outlines, dark world)
- `--purple:#6701e6` primary (system components, key words) · `--lav:#ede9fe` / `--lav2:#c4b5fd` lavender (tiles, fills)
- `--pink:#EC4899` HUMAN ANNOTATION ONLY · `--aqua:#2DD4BF` tech accent, used sparingly · `--claude:#D97757` Claude brand coral (logo only)

**Pink is not decoration.** It marks the human insight / the signal / the mistake: the declining curve, the hand-drawn circle on the headline, the alert `!`, the overlap point, "5 minutes", "one chat". Cap it at ~5 of 10 modules. If pink is everywhere it stops meaning anything.

**Typography:** Inter (400–900) + JetBrains Mono for the eyebrow, metric chips, and small labels.
- Eyebrow: mono, uppercase, ~14px, letter-spacing .22em, purple, with a pink dot. Format: `PORTER METRICS / AI MARKETING SYSTEMS`.
- Headline: Inter 900, ~62px, line-height ~1.0, with ONE pink hand-drawn circle (rough SVG ellipse) around the key term.
- Body/cards: concise. No long paragraphs inside cards. Bold the metric/keyword in `--purple`.

**Layout patterns** (pick one per post): 1) Before vs After · 2) One Connection (central node) · 3) Comparison Table · 4) Simple Chart (one insight) · 5) System Map (data → Porter → Claude → outputs) · 6) Cheat Sheet / N use cases. The realized Meta Ads post = pattern 6 with a **system spine** (Source → Porter MCP → Claude) above a 2-column card grid. Reuse that spine on every "use cases" post.

> Design note: a literal orbit of 10 nodes fails at this size (illegible). Use the horizontal spine for the system metaphor and a grid for the content. Save the orbit for the animated/GIF version.

## Logos — pull the real thing, never draw them

**Primary source: Porter's own connector CDN** (on-brand, consistent, full-color):
`https://cdn.portermetrics.com/prod/data-sources/<source>.svg`
Verified: `meta`, `google_ads-icon`, `ga4`, `instagram`, `shopify`, `hubspot`, `google_sheets`. (`<source>.svg` without `-icon` may be a tiny placeholder — prefer the `-icon` variant for Google Ads.) Check `cdn.portermetrics.com/prod/data-sources/<name>.svg` for new platforms before drawing anything.

**Porter brand marks** (already in `assets/logos/`):
- `porter-mark-192.png` — the unicorn-cat mascot (use in the Porter MCP node + footer)
- `porter-wordmark-black.png` — full wordmark

**Claude / Anthropic** (Iconify): `https://api.iconify.design/simple-icons/claude.svg` (coral sunburst — fill `#D97757`) or `simple-icons/anthropic.svg` (the "A").

**Tool logos for SEO/content posts** (already in `assets/logos/`, full-color): `wordpress-color`, `gsc-color` (Search Console), `google-color`, `ga4-color`.

**Any other brand:** prefer Iconify's **`logos:` set** (`https://api.iconify.design/logos/<name>.svg`) — these have hard-coded brand colors and render correctly via `<img>`. Avoid the `simple-icons:` set for `<img>` use: those are monochrome `currentColor` and render solid black. Always open the file and verify it renders in color before embedding. If a brand is missing (e.g. Ahrefs wasn't in either set), DROP it — never fake or recolor a logo.

**Treatment (decided):** full-color official logos, each inside a **white rounded chip** (~42px, radius 11, 1px border, soft shadow) so they sit cleanly on cream/purple/deep backgrounds. The node background colors stay (lavender → purple → deep); the white chip makes the logo pop. Never recolor a brand logo to fit the palette — that was the mistake to avoid.

Download example:
```
curl -s -o assets/logos/meta.svg https://cdn.portermetrics.com/prod/data-sources/meta.svg
```

## Icons — hybrid method (proven base + pink annotation)

Do NOT cram 2–3 objects into one 24px glyph (that's what made earlier icons "weird"). Instead:

1. **Base = ONE Lucide icon** with a single literal metaphor, drawn in `--deep`, stroke ~1.9, on a lavender tile (66px, radius 13, deep border, icon ~42px). Pull from `https://api.iconify.design/lucide/<name>.svg`.
2. **Annotation = restrained pink** — add at most a small pink mark that carries the *insight*, on ~5 of 10 cards only. Pink = the signal; deep = the object.

Proven map (in `assets/icons-base/`), pink cards marked ★:
| # | Use case | Lucide base | Pink annotation |
|---|----------|-------------|-----------------|
| 01 | Creative fatigue ★ | `image` | declining line + down-arrow over the creative |
| 02 | Winning angle | `search` | — (check inside lens, deep) |
| 03 | Budget shift ★ | two bars (custom) / `trending-up-down` | curved arrow weak→strong adset |
| 04 | Audience overlap ★ | `blend` | filled dot at the intersection |
| 05 | UGC brief | `clapperboard` | — |
| 06 | Comment objection ★ | `message-square-warning` | the `!` in pink |
| 07 | Landing mismatch | `unlink` | break ticks (kept deep to restrain pink) |
| 08 | Ad library spy | `binoculars` | — |
| 09 | Anomaly alerts ★ | `activity` | alert dot at the spike apex |
| 10 | Monday report | `clipboard-list` | the bullet dots in pink |

For new topics, choose the Lucide icon whose literal shape best matches the task; reach for a 2-element composition only if no single icon works. Keep stroke width, tile size, and the deep/pink split identical across the set.

**Optional data chips:** small mono chips under 3–4 cards for directional specificity (`ROAS ▼  SPEND →`, `CPA ▼ ROAS ▲`, `AD ≠ PAGE`, `⚠ SPIKE`). Use directional arrows / metric names — never invent precise percentages on a published asset.

## Render & QA

Render with the Playwright MCP (the `?x2` switch in the template zooms the page 2× for crisp export):
1. Serve the folder: `python3 -m http.server 8731` (run from the post folder).
2. `browser_resize` → **2160 × 2700** (this must be set AFTER navigation can reset it — set it right before the screenshot).
3. `browser_navigate` → `http://localhost:8731/<file>.html?x2`
4. `browser_take_screenshot` → save as `<name>@2x.png`.
5. Downscale a 1× copy: `sips -z 1350 1080 <name>@2x.png --out <name>.png`.
6. **Crop & inspect close-ups** of the spine and the icon grid (`sips -c <h> <w> --cropOffset <top> <left>`), then Read them — catch broken logos / weird icons before the user does.

If the export comes out at an odd size (e.g. 1679×945), the viewport reset — re-run `browser_resize` to 2160×2700 and screenshot again.

## QA checklist (run before showing the user)
- [ ] Canvas is exactly 1080×1350; nothing clipped; footer fully visible.
- [ ] Every brand logo is the REAL asset (Porter CDN / Iconify), full-color, on a white chip — none hand-drawn.
- [ ] Porter mark = the unicorn-cat; Meta = blue infinity; Claude = coral sunburst.
- [ ] Each icon is ONE clear metaphor, readable at tile size; uniform stroke + tile across all icons.
- [ ] Pink appears on ≤5 cards and only as the insight/signal — not decoration.
- [ ] Exactly one pink hand-drawn circle on the headline keyword.
- [ ] Eyebrow reads `PORTER METRICS / AI MARKETING SYSTEMS`; footer has Porter mark + "Follow Porter Metrics · portermetrics.com" + the `Setup:` line.
- [ ] Copy is concise; metric/keywords bolded in purple; no card paragraph wraps awkwardly.
- [ ] Exported @2x (2160×2700) for upload + a 1080×1350 standard.

## Realized layouts (pick the template that fits)
- **`template.html`** — pattern 6, "N use cases": header + 3-node system spine + 2-col card grid. Use for "10 X for Y" cheat-sheets. Example: `examples/meta-ads-10-use-cases.png`.
- **`template-pipeline.html`** — pattern 5, "System Map / workflow": header + horizontal **5-stage pipeline** (chevrons between stages, each stage = number + icon tile + name + step chips + a bottom handoff/logo row) sitting on a dark **"Runs on Porter MCP + Claude" foundation bar**. Use for a process/pipeline (Context → Research → Content → QA → Publish). Example: `examples/seo-content-pipeline.png`.
  - Density note: a 5-column pipeline has far less content than a 10-card grid. To avoid a top-heavy look, COMPACT the stage cards (`min-height` ~476), give EVERY stage a bottom handoff row so none has an empty foot, and vertically center the pipeline+foundation block (`.mid{flex:1;justify-content:center}`).
  - Pipeline data comes from the user's real Celerio "Ops" matrices. Read column names from `~/Library/Application Support/celerio-shared/extension/prompt-orchestrator/data/po-board.json` (keys: `matrices[].columns[].name`). The blog/landing matrices share one column flow that maps onto Context · Research · Content · QA · Publish.

## Files in this skill
- `template.html` / `template-pipeline.html` — the two canonical shells (see above). Both have the `?x2` 2× export switch.
- `assets/logos/` — Porter mark + wordmark, Porter CDN connector logos, and full-color tool logos (WordPress, Search Console, Google, GA4).
- `assets/icons-base/` — Lucide base SVGs (10 use-case icons + 5 pipeline-stage icons: context/research/content/qa/publish).
- `examples/` — the two gold-standard builds.
