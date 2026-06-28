---
name: landing-page-cro-audit
description: For the highest-spend Google Ads landing pages, judge whether the page itself is built to convert — clear value prop, one strong CTA, message that hits the searcher's real pain points, trust/proof, low form friction. Returns a per-page CRO verdict (converts well / review / weak) + the single highest-leverage fix. Use this skill whenever the user audits a landing page, asks about CRO, conversion rate optimization, message match, whether a landing page is built to convert, why traffic doesn't convert despite good clicks, or whether the messaging is differentiated and touches pain points — even if they don't say "CRO". Judges the page's OWN conversion quality ONLY; whether the page matches the AD (message match) belongs to the complementary keyword-ad-landing-alignment skill.
---

# Landing Page CRO Audit

## Goal (job-to-be-done)
For the highest-spend landing pages, decide whether the page is **built to convert on its own** —
a clear value prop, one strong CTA, a message that hits the specific searcher's pain, credible
proof, and a form that doesn't ask too much too soon. The unit of analysis is the **landing page**;
the output is a CRO verdict per page plus the single highest-leverage fix, ranked by the spend
flowing to the page.

- **Who:** media buyer / PPC manager / marketer. **When:** a "beyond-Acme-8" check in the
  [account-audit](../README.md) cluster, run when auditing or inheriting an account.
- **Decision it drives:** which landing page to rewrite first, and the exact fix to make on it.
- **The differentiator:** not page-speed or generic UX scoring — a **reading of the actual page
  copy** against a CRO rubric, grounded in quotes from the page, written for a non-technical owner.

## Scope
- ✅ **The page's own conversion quality** (value prop, CTA, differentiation + pain, proof, form
  friction). Input: the scraped page content of the high-spend final URLs.
- ❌ **Message match to the ad** (does the page tell the same story as the ad?) → complementary
  [`keyword-ad-landing-alignment`](../../keyword-ad-landing/alignment/) skill. They overlap on
  "read the page" but ask different questions; run both for a full landing audit.
- ❌ **Page UX/speed beyond copy** (load time, mobile rendering) — flag only what's visible in the
  scrape; don't assert what isn't.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the URL pull + the `scrape` call.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the C1-C5 CRO rubric + the three verdict states.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** the **unique high-spend final URLs** (from the ads pull) and, for each, its **scraped
page content** (full-page `markdown` + a structured `json`: headline, subhead, primary_offer,
primary_cta, proof_points, form_summary). Plus the **spend** flowing to each page (to rank).

**Process:** pull the top-spend final URLs, scrape each, then judge each page against the CRO
rubric (C1 value prop · C2 primary CTA · C3 differentiation + pain · C4 proof/trust · C5 form
friction) in [`references/framework.md`](references/framework.md). This is reading comprehension,
not arithmetic — ground every claim in a quote from the page. Empty scrape → links unknown →
verdict `review` (never guess). Per the [cluster rule](../README.md), every finding names the
exact page URL + the exact change.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the weakest high-spend page + the single
  fix), `diagnosis` (where it leaks — the CRO link most pages fail on, via the funnel identity),
  `action` (the highest-$ fix, where / what / why).
- `pages[]` — one per landing page: the C1-C5 reads, the verdict, the spend, and the single
  highest-leverage `recommendation {where, what, why}`.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — question heading the data
> answers yes/no; the metric+delta carried as data, never spelled out in prose; first sentence
> answers the heading, then names the driver; one bridge line to the next section. Plain language
> for a non-technical owner.

## Example (illustrative — NOT rules)
- **Weak (no value prop):** the top-spend page's H1 reads "Welcome — Get a Quote", no differentiator
  → C1 Fail → verdict `weak` → recommendation: lead the headline with the specific offer the
  searcher wanted.
- **Review (empty scrape):** an SPA page returns empty without `waitFor` → C-links unknown →
  verdict `review`, say why, don't guess.
- **Converts well:** clear value prop, one above-the-fold CTA, named-customer proof, short form →
  C1-C5 mostly Pass → verdict `converts_well`; the page earns the click.
