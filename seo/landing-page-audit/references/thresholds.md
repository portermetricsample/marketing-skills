# Thresholds & sources — landing-page-audit

Every number the audit grades against, with its official source. Verified July 2026.

## Core Web Vitals (web.dev / Google, measured at the 75th percentile of real users)

| Metric | What it measures | Good | Needs improvement | Poor |
|---|---|---|---|---|
| **LCP** — Largest Contentful Paint | Loading — when the main content is visible | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** — Interaction to Next Paint | Responsiveness — how fast clicks respond | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** — Cumulative Layout Shift | Visual stability — how much the layout jumps | ≤ 0.1 | ≤ 0.25 | > 0.25 |

- **INP replaced FID** as a Core Web Vital on **March 12, 2024**. FID is retired.
- Supporting (non-Core) metrics: **TTFB, FCP, TBT**. TBT is the lab proxy for INP.
- There is **no** "LCP.web", "Engagement Reliability", or "Smooth Visual Transitions"
  metric — those appear only in third-party SEO blogs, not on web.dev. As of July 2026
  the good LCP threshold is still **2.5s**. Don't grade against invented metrics.

Source: https://web.dev/articles/vitals · https://web.dev/blog/inp-cwv-march-12

## Data sources (Google's own APIs — what makes this verifiable)

| API | Gives | Note |
|---|---|---|
| **PageSpeed Insights API** (`pagespeedonline/v5/runPagespeed`) | Lighthouse lab **+** CrUX field in one call | free API key; keyless is rate-limited |
| **CrUX API / CrUX History API** | field data by URL/origin, daily/weekly | optional, for trend/INP history |
| **Lighthouse** (`npx lighthouse`) | lab data locally | optional; PSI already runs Lighthouse server-side |

- **Field data requires traffic.** CrUX only reports a URL/origin once it has enough real
  Chrome users. New landing pages legitimately have none → fall back to lab.

## On-page thresholds (this skill's rules)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Title length | 30–60 chars | <30 or >60 | empty |
| Meta description | 70–160 chars | <70 or >160 | empty |
| Canonical | present, self-ref | present, points elsewhere | missing |
| noindex (`<meta robots>` + `X-Robots-Tag`) | absent | — | present |
| H1 count | exactly 1 | >1 | 0 |
| Image alt | all images | some missing | — |
| Image format | WebP/AVIF/SVG | any JPG/PNG | — |
| JSON-LD | valid + text matches | present but no text match / none | invalid JSON |
| Open Graph | title+desc+image | any missing | — |
| Viewport meta | present | — | missing |

## AI readability — the sourced note (say this, don't hedge)

Google **does not use `llms.txt`** and does not recommend special AI files or markup:
- Google Search Relations (Gary Illyes) + John Mueller stated Search neither uses nor
  endorses `llms.txt`; Mueller compared it to the abandoned keywords meta tag.
- Google's AI-features docs: *"You don't need to create new machine readable files, AI
  text files, or markup … There's also no special schema.org structured data that you
  need to add."*
- Ahrefs (May 2026): 97% of `llms.txt` files received zero requests.

What Google **does** recommend for AI = SEO fundamentals this skill already grades:
crawlable (robots.txt), content in real text, JSON-LD schema that matches the visible
text, good internal linking, solid page experience.

Sources: https://developers.google.com/search/docs/appearance/ai-features ·
https://www.seroundtable.com/google-does-not-endorse-llms-txt-40789.html
