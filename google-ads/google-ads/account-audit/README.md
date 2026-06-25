# Google Ads — Account Audit (skill cluster)

> **Mission:** a **QA / health-check** of a paid Google Ads account against
> **external best practice** — the "is this account set up to not waste money?" review a
> media buyer runs when auditing or inheriting an account. Origin: the Acme PPC
> DIY Audit Checklist + the team's own asks.

Each check is an **atomic sub-skill** (one question, small context). The cluster is the
checklist that runs them and rolls the findings up into one prioritized report.

## Cross-cutting principles (apply to every performance read)

Two rules live in `_framework` so the whole cluster shares them — apply them in any check that reports
CPA / ROAS / efficiency:

- **[Brand vs non-brand](../../_framework/brand-vs-nonbrand.md)** — separate branded from non-branded
  **before** judging performance. Branded conversions are demand *capture*, not *generation* (they'd
  largely happen anyway), so blending them flatters the account. Baseline on **non-brand**; treat the
  Brand campaign as **defense**, not a performance model. *(Typical shape: brand is a low-single-digit %
  of spend yet a large share of value, so the non-brand baseline is materially worse than the blended one
  — see the doc for an illustrative split.)*
- **[Ad Rank & impression share](../../_framework/ad-rank-and-impression-share.md)** — you can't see
  Ad Rank as a number; you read its consequence via Impression Share. Use the **overall** lost-IS
  fields to split missed reach into **budget** (raise money) vs **rank** (fix bid/Quality) — never
  confuse the two.

## The hard boundary with `account-structure/` (read this first)

These two clusters both say "audit", but they judge against **different references** —
keep them separate or the findings contradict each other:

- **`account-structure/structure-audit`** validates the account against **its OWN inferred
  convention** (no universal ideal). *"Is it internally consistent?"*
- **`account-audit/` (this cluster)** validates the account against **external best
  practice** (the Acme checklist / industry standard). *"Is it set up the way a good
  account should be?"*

So a target-CPA that's 3× the real CPA passes `structure-audit` (the name and config agree)
but **fails** `account-audit` (best practice says targets should track reality). That's the point.

## The cluster's checks

Aligned 1:1 to the Acme DIY Audit Checklist (8 sections, in its order):

| # | Acme section | Sub-skill | Question it answers | Feasibility | Status |
|---|---|---|---|---|---|
| 1 | Exact Match & Negative Keywords | *reuse — no own folder* → **`search-terms/relevance` + `term-routing`** | Which terms are irrelevant (→ negatives)? Which high-volume → exact match? | ✅ data | ✅ **covered** (relevance + term-routing) |
| 2 | Offline Conversion Tracking | [conversion-tracking/](conversion-tracking/) | Is offline/CRM import set up? Are counted conversions down-funnel + valued? | ✅ data (conversion-action config exposed) | ✅ **ready** (validated live) |
| 3 | Value-Based Bidding | [value-based-bidding/](value-based-bidding/) | On Max-Conv-Value / tROAS? Does the target track real ROAS? Enough conversions? | ✅ data | ✅ **ready** (validated live) |
| 4 | Audience & Demographics | [audience-demographics/](audience-demographics/) | Which age/gender segments over- or under-perform? Are audiences in use? | ✅ data (age+gender+audiences; income+parental NOT exposed) | ✅ **ready** (validated live) |
| 5 | Quality Score | *folded — no own folder* → **`keyword-ad-landing-metrics` + `-alignment`** | QS + 3 pillars (Google's own grade) — surfaced by `metrics`, causes fixed by `alignment` | ✅ data | ✅ **covered** (folded) |
| 6 | Location Targeting | [campaign-settings/](campaign-settings/) | Is location set to **Presence** (not "presence or interest")? How much geo spend leaked? | ✅ data (direct toggle field) | ✅ **ready** (validated live) |
| 7 | Search Partners & Display | [campaign-settings/](campaign-settings/) | Are Search Partners / Display off on Search campaigns? | ✅ data (direct toggle fields) | ✅ **ready** (validated live) |
| 8 | Ad Extensions | [ad-assets/](ad-assets/) | Are sitelinks / callouts / structured snippets / images present? | ✅ data (asset fields; 4 gotchas) | ✅ **ready** (validated live) |

### Two sections have no own folder (covered by reuse)
Building these here would duplicate skills we already have, so they have **no sub-folder** —
invoke the serving skills when running the audit:
- **§1 Exact Match & Negatives** → `search-terms/relevance` (which terms are irrelevant → negatives)
  + `search-terms/term-routing` (a term served by a worse keyword → another negative case). Report the
  wasted-spend headline + the negatives to add. (Irrelevant clicks ≈ 20–40% of spend.)
  > **Negatives are a RELEVANCE call, never a performance one** (the `relevance` skill's "Performance
  > trap" — do not override it at assembly time). A term that's semantically relevant (we sell it) but
  > converts poorly is a **fix-the-ad / landing / bid / cost** item, NOT a negative — negativing it
  > throws away real demand. Only *irrelevant* terms (off-vertical, wrong intent, info-only) become
  > negatives. So a 0-conversion **relevant** term (e.g. "term life insurance quotes", "life insurance
  > alberta") is a leak to **diagnose**, not waste to cut; an expensive relevant term → bid-down /
  > tighter match, not a negative; and a handful of clicks with 0 conv is **thin data**, not proof.
  > **Brand terms** (the advertiser's own name) are neither a generic "keep" nor a negative — they belong to the
  > brand-defense / incrementality logic ([brand-vs-nonbrand](../../_framework/brand-vs-nonbrand.md)).
- **§5 Quality Score** → `keyword-ad-landing-metrics` **surfaces** the QS (1–10) + its 3 pillars
  (Expected CTR · Ad Relevance · Landing Page Experience), straight from Google's fields;
  `keyword-ad-landing-alignment` **diagnoses/fixes the causes** (ad echoes the keyword? page matches
  the ad?). QS is Google's own grade, not something we infer.

## Beyond Acme's public 8 — the rest of the client's emailed request
Acme's actual email asked for three things the public page doesn't list. Built here too:

| Client ask | Sub-skill | Feasibility | Status |
|---|---|---|---|
| Spend breakdown — which ad groups should get more spend but aren't; do the top spenders deliver? | [spend-allocation/](spend-allocation/) | ✅ data (efficiency × budget-lost-IS) | ✅ **ready** (validated) |
| Bid strategy — is the **target** CPA/ROAS aligned with the **actual** of the last 30d? | [bid-strategy/](bid-strategy/) | ✅ data (target fields per strategy) | ✅ **ready** (validated) |
| CRO — are the landing pages built to convert (message, pain points)? | [landing-cro/](landing-cro/) | ✅ data | ✅ **ready** (Porter scrape live, no API key needed) |

Plus the standalone [`keyword-ad-landing-alignment`](../keyword-ad-landing/alignment/) +
[`keyword-ad-landing-metrics`](../keyword-ad-landing/metrics/) (journey relevance + its metrics),
which cover the "search terms ↔ keyword/ad/landing" item the client marked *already built*.

## Output rule — findings are EXECUTABLE, in plain voice

Every finding names the **exact entity** (campaign / ad group / keyword / ad / landing /
conversion action / account setting) and the **exact change**, written **Where · What · Why** for a
non-technical owner — never bare jargon or vague verbs. This is the repo-wide voice: see
[`_framework/writing.md`](../../_framework/writing.md) (do not re-copy the rules here). Each
sub-skill's `output.md` carries it as `recommendation {where, what, why}`.

The **assembled audit's executive synthesis** (money headline → where it leaks → culprit +
opportunity, insight-first before any section) is produced by the **orchestrator** when it composes
the report, per `writing.md` + `output-contract.md`. Each sub-skill only emits its canonical
`synthesis {headline, diagnosis, action}`; the orchestrator weaves them.

## Feasibility — the honest line

`query_data` (Porter MCP) is a **metrics / reporting** interface, not a **settings** one.
- ✅ **Pure data (safe):** checks 1–4. These come straight from `query_data` fields
  (Quality Score, bidding strategy type, target vs actual CPA/ROAS, spend by
  campaign/ad group).
- ⚠️ **Settings (verify before promising):** checks 5–7 read account *configuration*
  (network toggles, location option, conversion-action setup, asset presence). **Confirm in
  the MCP whether these fields exist** before writing the recipe. If they don't → log a gap
  in `porter-mcp-feedback` and the check degrades to "manual, with the supporting data we
  *can* pull (e.g. % spend outside target geo)".
- ✅ **Landing CRO:** scraping runs natively via `tool:porter-tools:scrape` (Porter MCP,
  no external API key). Empty → retry `proxy:"stealth"`; still empty → degrade to "review",
  never guess. See [`_framework/porter-mcp-calls.md`](../../_framework/porter-mcp-calls.md).

## How it composes (the report)

Each check returns findings with a **severity** (🔴 High / 🟠 Medium / 🟡 Low) by **money at
stake** (wasted spend, mis-set targets, missed conversions). The cluster report is the
checklist, ordered by severity across all checks — *aspirin, not a vitamin* (SUMAS golden
rule): every finding ends in an action (turn off / fix target / move budget / add asset).

## Build order (one at a time)
Pure-data first (2 → 3 → 4), then the settings checks **after** a quick MCP feasibility pass
on Acme Insurance (5 → 6 → 7), and `landing-cro` (8) once scraping is back. Each follows the
standard skill anatomy (`_template/`): `SKILL.md` + `references/{tools,framework,output}.md`, plus
`scripts/{query.json,process.py}` when a check is deterministic.
