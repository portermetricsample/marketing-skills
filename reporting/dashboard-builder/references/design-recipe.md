# Design recipe — brand tokens (D1) and the approval kit (D2)

## D1 — Brand mode

Asked once, in the planning interview: **Porter brand or client brand
(white-label)? Light or dark?**

### Porter mode (default)

Use `assets/design-kit/` as-is. Themes: cream (default light) / white / blue /
purple via `data-theme` on the kit page; for the report, the cream light and
purple-dark mappings are pre-baked in the kit template's variable block.

### White-label mode — build a CLIENT DESIGN SYSTEM (not just 8 colors)

The goal of this step is a **complete client design system**, researched
rigorously, from which the report tokens are then *projected*. Five sub-steps:

**W1 — Company research (identity brief).**
`list_actions(task="search the web")` → the web-search action
(`search.perplexity_search` at last check) for `"<client name>"`: what they
do, who they sell to, tone (premium/playful/clinical…), and the official
website URL. The brief informs design judgment later (a law firm and a golf
brand should not feel the same even with similar hexes). Confirm the URL with
the user before scraping — a wrong site means a wrong brand.

**W2 — Site exploration (not just the homepage).**
`web_scraping.firecrawl_map` (or the site's own nav) → pick the homepage
PLUS 2–3 *revealing* pages — pricing, product/collection, about — pages that
show how the brand handles **structured information** (tables, buttons,
cards), which is what a dashboard is. Homepages alone are hero-image heavy
and often the least representative.

**W3 — Rigorous extraction.**
- Homepage: `web_scraping.firecrawl_scrape` with `formats:["branding"]` —
  returns colors with roles, typography (families/sizes), spacing,
  borderRadius, button styles, `images.logo`, tone, each with confidence
  scores (~1 credit).
- The extra pages: `formats:["rawHtml"]` (+ scrape linked stylesheet URLs
  when styles are external) — harvest the full palette, neutrals, heading
  hierarchy, backgrounds (solid/gradient/pattern), shadows, table/border
  conventions.
- **Consolidation rule: keep what REPEATS across pages (core brand); discard
  one-offs (noise).** Frequency across pages is the tiebreaker.

**W4 — The Design System document (the real artifact).**
Write `design-system.md` for the project: identity brief · core palette with
roles · neutrals · typography hierarchy · spacing/radius/shadow conventions ·
backgrounds · logo assets. Then the **DERIVATION LAYER** — dashboards need
colors most websites never define, so derive them BY RULE, never improvise
per chart:
- **Chart-series palette (5):** `--series-1..5` — series-1 = accent,
  series-2 = accent-2, 3–5 = fixed color-mix steps of the accents toward
  panel/ink (the kit template computes these automatically; override only if
  the client's site actually defines a data palette).
- **Heat ramp:** `--heat-0..4` — accent tinted from near-panel to full
  accent, for SUMAS table heat.
- **Semantic up/down (`--pos`/`--neg`): ALWAYS universal green/red — never a
  brand color.** COLLISION RULE (decided 2026-07-23): when a brand color
  lives in the red or green family, shift the semantic shade's
  lightness/saturation until the two are distinguishable at a glance —
  different SCALE, same universal meaning — so a red-brand dashboard never
  reads as "everything is a problem". The kit shows brand swatches and
  semantic samples side by side precisely so this collision is resolved
  visually at approval.
- Status colors (enabled green / paused amber) follow the same
  distinguishability check.

**W5 — Projection to report tokens.** The 8 report variables
(`--bg --panel --ink --muted --accent --accent-2 --lime --grid`) + the
derived layer are copied into the kit's token block; Phase B later copies the
same block into `styles/globals.css`. White-label = overriding token VALUES,
never structure. Fonts: keep the template's vendored fonts unless the client
font is web-safe or the user provides licensed files — a system-font fallback
of the client font usually reads worse than Porter's Bricolage/Hanken
pairing; say so honestly and let the user pick.

**Confidence & fallbacks** (unchanged): if `confidence.overall < 0.8` or the
palette looks generic, show the swatches and ask before propagating. If the
scrape fails: rawHtml/links/screenshot parse → plain-HTTP fetch (curl) when
the MCP is unreachable (extraction is not MCP-dependent) → ask the user for
logo + 2–3 hexes → Porter theme with client logo. Manually extracted tokens
have no score — treat as below-threshold: approved only via the kit at HARD
STOP #2.

### Logos

- **Client logo:** from the branding scrape (`images.logo`). Render via URL at
  kit/mockup stage; for the deployed report, download and vendor it into the
  bundle (runtime CSP blocks arbitrary external hosts).
- **Data-source logos** (Google Ads, Meta, GA4 chips): use Porter's CDN set
  (the porter-design system's connector logo list). Fallback for a missing
  one: `search.perplexity_search` for the official brand asset, then vendor it.

## D2 — Report Design Kit (HARD STOP)

One self-contained HTML page the user visually approves before anything is
built. Generate it from `assets/kit-template.html`:

1. Fill in the token block (Porter values or extracted client values).
2. Fill the sample components with fictional data
   (`assets/fixtures/acme-google-ads.json` — Acme Insurance).
3. Show it to the user (open in browser / send the file). Iterate HERE:
   color tweaks, font choice, light vs dark. **Fix the sample, then
   propagate** — never iterate brand decisions on the full report.
4. On approval, freeze the output:
   ```css
   :root { /* approved: <brand>, <date> */
     --bg: …; --panel: …; --ink: …; --muted: …;
     --accent: …; --accent-2: …; --lime: …; --grid: …;
     /* derived layer (auto-computed in the template; override only if the
        client defines its own data palette): */
     --series-1..5; --heat-0..4; --pos; --neg;
   }
   /* + approved theme mode: light | dark  (brand-locked in code at build) */
   ```
   plus the logo file. The kit → report transfer is a mechanical copy of this
   block into `styles/globals.css` (fonts ship vendored in the report
   template already). **The kit is the visual reference CONTRACT: every real
   chart in Phase B must use the series palette, heat ramp and semantic pair
   exactly as approved here — no per-chart color improvisation.**

Chart samples in the kit: sparkline + time-series render live via
`porter-charts.js`; bar/donut/table samples are static token-styled SVG/HTML
(the kit lib intentionally has no bar/donut — do not fake a chart lib, the
kit is an approval artifact, not a runtime).
