---
name: landing-page-audit
description: "Full technical + performance audit of a landing page (or any URL). Grades Core Web Vitals (LCP / INP / CLS — Lighthouse lab + real-user CrUX field data via Google's PageSpeed Insights API), metadata (title, meta description), indexability (robots.txt, noindex, canonical, sitemap, hreflang, HTTPS, redirects), semantic structure (one H1, heading order, image alt, JSON-LD schema that matches the visible text, Open Graph), and mobile/responsive (viewport, tap targets, responsive images, mobile speed). Every check is verified against the live page and Google's own APIs — nothing is assumed. Use when the user says /landing-page-audit, or asks to audit a landing page's speed / performance / technical SEO, check Core Web Vitals, find why a page is slow, or check whether a page is findable, indexable, mobile-friendly, or technically sound. Works on any public URL, not only landing pages."
user_invocable: true
---

# Landing Page Audit — technical + performance, verified against the live page

Point it at a URL. It runs three engines against the live page and Google's own APIs,
then grades every criterion **pass / warn / fail** across four groups:
**Speed · Findable · Structured · Mobile.**

The guiding rule: **nothing is assumed.** Every grade traces to a value read from the
page's HTML or returned by a Google performance API. If a value can't be measured, it is
marked `n/a` with the reason — never guessed.

---

## Quick start

```bash
cd scripts
python3 run_audit.py https://example.com/landing            # mobile (default, mobile-first)
python3 run_audit.py https://example.com/landing --desktop  # desktop strategy
python3 run_audit.py https://example.com/landing --json report.json   # + full raw data
```

**Setup (once):**
```bash
pip install requests beautifulsoup4
export PSI_API_KEY=YOUR_KEY   # free: https://developers.google.com/speed/docs/insights/v5/get-started
```
Without a key, the Speed group still runs but Google rate-limits shared keyless calls
(HTTP 429) — the audit degrades gracefully and marks Speed `n/a`. **Get a key for the
Speed group to work reliably.** The on-page and indexing groups need no key.

Read the printed report, then walk the user through the fails and warns in plain
language, and offer to fix them in code (this skill measures; you do the fixing in the
same session).

---

## What it checks, and how each is verified

Thresholds are the official web.dev / Google numbers. Full table: `references/thresholds.md`.

### Speed — `scripts/perf.py` (PageSpeed Insights API: Lighthouse lab + CrUX field)
One PSI call returns both lab and field data.
| Check | Good | Verified by |
|---|---|---|
| **LCP** — how fast the main content loads | < 2.5s | field p75 (real users) if the page has traffic, else lab |
| **INP** — how fast it responds to clicks | < 200ms | **field only** — needs real traffic; TBT is the lab proxy when there's none |
| **CLS** — how much the layout jumps | < 0.1 | field p75 if available, else lab |
| **Lighthouse performance** | ≥ 90 | lab score (simulated load) |

> **Field vs lab — say this out loud.** *Field* (CrUX) = real Chrome users at the 75th
> percentile; it only exists once the URL has enough traffic, so **a brand-new landing
> page will have no field data — that's expected, not a failure.** *Lab* (Lighthouse) is
> a simulated load that runs on any URL. The skill prefers field and falls back to lab,
> and labels which one each number came from.

### Findable — `scripts/onpage.py` + `scripts/indexing.py` (live HTML + live robots/sitemap)
| Check | Rule | Verified by |
|---|---|---|
| **HTTPS** | required | final URL scheme |
| **HTTP status** | 200, few redirects | response + redirect chain |
| **noindex** | must be absent | `<meta robots>` **and** `X-Robots-Tag` header — the silent killer |
| **robots.txt allows it** | Googlebot allowed | `/robots.txt` parsed with `robotparser` |
| **Title** | present, 30–60 chars | `<title>` |
| **Meta description** | present, 70–160 chars | `<meta name=description>` |
| **Canonical** | present, self-referencing | `<link rel=canonical>` |
| **In sitemap** | listed | `/sitemap.xml` (follows one level of sitemap-index) |
| **hreflang** | present if multilingual | `<link rel=alternate hreflang>` (reciprocity noted, not verified) |

### Structured — `scripts/onpage.py` (DOM + JSON-LD)
| Check | Rule |
|---|---|
| **One H1** | exactly one |
| **Heading order** | no skipped levels (h2→h4) |
| **Image alt text** | every `<img>` has `alt` |
| **Next-gen images** | WebP / AVIF / SVG, not JPG/PNG |
| **JSON-LD schema** | present, valid JSON, **and its name/headline appears in the visible text** |
| **Open Graph** | og:title + og:description + og:image |

### Mobile — `scripts/onpage.py` + PSI diagnostics
| Check | Rule |
|---|---|
| **Viewport meta** | present |
| **Tap targets** | ≥ 48px (Lighthouse `tap-targets`) |
| **Responsive images** | Lighthouse `uses-responsive-images` |
| **Fast on phones** | mobile Lighthouse performance ≥ 90 |

---

## On AI-readability (be honest — this comes up)

If the user asks about `llms.txt`, an "AI sitemap", or special AI markup: **Google has
publicly said it does not use `llms.txt`** (Illyes, Mueller), and its official AI-features
docs state you don't need special machine-readable files or markup. What actually makes a
page readable to AI is the same thing this skill already checks: **content in real text,
clean semantic structure, and JSON-LD that matches the visible text.** Don't add an
`llms.txt` check and don't recommend one as a ranking/visibility tactic. See
`references/thresholds.md` for the sourced note.

---

## Output contract

- Lead with the **one-line summary**: `N pass · N warn · N fail · N n/a`.
- Then the four groups, fails first within each. Translate every metric to plain English
  ("LCP 4.2s — the hero image loads too slowly"), because the audience is marketers.
- End with the **3–5 highest-impact fixes**, ordered by damage: a stray `noindex` or a
  fail beats a cosmetic warn. Offer to apply them in code now.
- `--json` writes the graded findings **plus** the raw engine output for deeper digging.

## Honest limits (state them, don't paper over them)
- **INP** needs real user traffic; new pages show TBT (lab proxy) instead.
- **hreflang / title uniqueness** can't be fully verified from a single page (needs the
  whole set / a crawl) — flagged, not asserted.
- Google's **Mobile-Friendly Test API** and **Structured Data Testing Tool API** are
  deprecated, so mobile + schema are verified via Lighthouse + DOM parsing, not those.
- **Deeper mobile checks** (no horizontal scroll at 375px, real device throttling) are
  best confirmed by driving **Playwright** — do that when the mobile group warns.

## Manual fallback (if the scripts can't run)
Every check is doable by hand: fetch the page and read `<title>`, `<meta>`, canonical,
`<html lang>`, count `<h1>`, scan `<img>` for `alt`/format/dimensions, parse
`<script type=application/ld+json>`; fetch `/robots.txt` and `/sitemap.xml`; and call the
PageSpeed Insights API URL directly for Core Web Vitals. The scripts just make it
repeatable and fast.
