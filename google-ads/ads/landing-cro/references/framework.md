# Framework: Landing Page CRO Audit

## 1. Business question
> For the highest-spend landing pages: is the page **built to convert** — clear value prop, one
> strong CTA, message that hits the searcher's pain, trust, low friction?

## 2. The flow
1. **Pick pages** — the unique final URLs of the top-spend ad groups (same pull as `alignment`,
   step 2b: `ad_group_ad_ad_final_urls` + `cost`). Rank by spend.
2. **Scrape** each — Porter's native `tool:porter-tools:scrape` (read-only via `fetch`; no API key) →
   full-page `markdown` + structured `json` (headline, subhead, primary_offer, primary_cta,
   proof_points, form_summary). See [`tools.md`](tools.md).
3. **Judge** each page against the CRO rubric (below). Reading comprehension, not arithmetic.

## 3. The CRO rubric — grade each link, ground every claim in the page text
| # | Link | Pass when | Fail when |
|---|---|---|---|
| **C1 · Value prop** | the H1/hero says **what it is + why it's better** in one read | generic ("Welcome", "Get a quote") with no differentiator |
| **C2 · Primary CTA** | one **obvious** primary action, above the fold, low-friction | no clear CTA, multiple competing CTAs, or buried |
| **C3 · Differentiation + pain** | copy speaks to the **specific** searcher's situation/pain | generic boilerplate that could be any competitor |
| **C4 · Proof / trust** | credible proof (reviews, numbers, badges, named customers) | none, or vague ("trusted by many") |
| **C5 · Form friction** | the form asks **only what's needed** to start | asks too much too soon (long form before any value) |

## 4. The verdict — three states, no score (same discipline as `alignment`)
- **🟢 Converts well** — C1-C5 mostly Pass; the page earns the click.
- **🟡 Review** — ambiguous OR the page couldn't be scraped (links unknown) → say why, don't guess.
- **🔴 Weak** — a clear Fail on a high-leverage link (no value prop / no CTA / generic message).

## 5. Output contract — what each page emits (content only)
> Executable + plain ([cluster rule](../../README.md)). Name the exact **page URL** + the exact fix.
1. **Identity** — page URL · spend flowing to it.
2. **CRO read** — C1-C5, each Pass/Partial/Fail + a one-line reason quoted from the page.
3. **Verdict** — 🟢 / 🟡 / 🔴.
4. **Recommendation** — the single highest-leverage fix, plain + exact, Where·What·Why
   ("the headline on `<url>` is generic — lead with the specific offer the searcher wanted").

**Roll-up:** weakest-CRO pages by spend; the top fix per page by dollar impact.

## 6. When it applies / when it does NOT
- **Applies to:** the high-spend landing pages of any account — once scraping works.
- **Does NOT / caveat:**
  - **Empty scrape** (after a `proxy:"stealth"` retry) → C-links unknown → 🟡 review, never guess.
    `tool:porter-tools:scrape` is the source — never reach for an external scraper.
  - **Judgment, not a metric** — two runs may phrase differently; the rubric keeps the bands comparable.
  - **Page UX/speed beyond copy** (load time, mobile) is partly visible in the scrape, partly not —
    flag what's visible, don't assert what isn't.
  - **Message match to the ad** is `alignment`'s job, not here — this judges the page on its own.
