# Design recipe — brand tokens (D1) and the approval kit (D2)

## D1 — Brand mode

Asked once, in the planning interview: **Porter brand or client brand
(white-label)? Light or dark?**

### Porter mode (default)

Use `assets/design-kit/` as-is. Themes: cream (default light) / white / blue /
purple via `data-theme` on the kit page; for the report, the cream light and
purple-dark mappings are pre-baked in the kit template's variable block.

### White-label mode — the extraction chain (Porter-native, no external keys)

1. **Find the site** (skip if the user gave a URL):
   `list_actions(task="search the web")` → `search.perplexity_search`
   with `"<client name> official website"`. Confirm the URL with the user
   before scraping — a wrong site means a wrong brand.
2. **Extract the brand** in ONE action:
   `web_scraping.firecrawl_scrape` with
   `{"url": "<site>", "formats": ["branding"], "onlyMainContent": true}`.
   Returns: `colors` (primary/secondary/accent/background/text/link),
   `typography` (families + roles + sizes), `spacing` (baseUnit,
   borderRadius), button component styles, `images.logo` (+ favicon), tone —
   each with confidence scores. Costs ~1 scrape credit.
3. **Confidence rule:** if `confidence.overall < 0.8`, or the palette looks
   generic (pure black/white only), do NOT propagate silently — show the
   extracted swatches to the user in the kit and ask before proceeding.
4. **Fallbacks, in order:** retry the scrape with
   `formats:["rawHtml","links","screenshot"]` and parse CSS variables /
   `og:image` / favicon yourself (scrape linked stylesheet URLs in a second
   call if styles are external) → if the Porter MCP itself is unreachable,
   fetch the page with plain HTTP (curl/fetch) from your code-execution tool
   and parse the same way — the extraction is not MCP-dependent, only nicer
   through it → ask the user for a logo + 2–3 hex colors → Porter theme with
   the client logo only.
   **Manually extracted tokens have no confidence score — treat them as
   below-threshold by definition:** they are only ever approved through the
   kit's swatches at HARD STOP #2 (which shows them anyway; say so to the
   user).
5. **Map extraction → tokens.** White-label = overriding token VALUES, never
   new structure: primary → `--accent`, background family → `--bg`/`--panel`,
   text → `--ink`/`--muted`, border feel → `--grid`, plus the logo URL for the
   header. Heading/body fonts: keep the template's vendored fonts unless the
   client font is web-safe or the user provides licensed files — a system-font
   fallback of the client font usually reads worse than Porter's Bricolage/
   Hanken pairing; say so honestly and let the user pick.

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
4. On approval, freeze the output — exactly this, nothing more:
   ```css
   :root { /* approved: <brand>, <date> */
     --bg: …; --panel: …; --ink: …; --muted: …;
     --accent: …; --accent-2: …; --lime: …; --grid: …;
   }
   /* + approved theme mode: light | dark  (brand-locked in code at build) */
   ```
   plus the logo file. These 8 variables are the template's entire theming
   surface (fonts ship vendored in the report template already), so the
   kit → report transfer is a mechanical copy into `styles/globals.css`.

Chart samples in the kit: sparkline + time-series render live via
`porter-charts.js`; bar/donut/table samples are static token-styled SVG/HTML
(the kit lib intentionally has no bar/donut — do not fake a chart lib, the
kit is an approval artifact, not a runtime).
