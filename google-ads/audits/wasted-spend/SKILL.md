---
name: wasted-spend
description: Quantify the TOTAL wasted spend in a Google Ads account and pinpoint the biggest leaks — money spent on search terms, keywords, ad groups, or campaigns that returned ~0 conversions or cost far more per conversion than target. Rolls the leaks up to one dollar number and a % of spend, then lists the top leaks by scope, each with the dollars wasted and a recommended action. Use this skill whenever the user asks how much they're wasting, where the money is leaking, "what spend is doing nothing", zero-conversion keywords/terms, spend with no return, or an account-level waste roll-up — even if they don't say "wasted spend". Quantifies and prioritizes waste ONLY; writing the negatives belongs to `negative-keywords`, reallocating the freed budget to `spend-allocation`, and classifying WHY a term is irrelevant to `search-term-classifier`.
---

# Wasted Spend

## Goal (job-to-be-done)
Answer the question the account owner is really asking when they say "am I wasting money?":
**how many dollars of this account's spend returned nothing (or cost far too much per conversion),
and where are the biggest leaks?** Google shows you cost and conversions per entity, but never a
single "this is your wasted spend" number, and never ranks the leaks so you know which one to plug
first. This skill reads cost + conversions at every grain (search term, keyword, ad group,
campaign), flags each entity that spends above a floor while returning ~0 conversions **or** running
at a CPA far above target, rolls the wasted dollars up to one account number + % of spend, and
returns the top leaks in priority order.

- **Who:** account owner / media buyer / PPC manager inheriting or auditing an account. **When:** the
  "how much are we wasting" item on the account-audit checklist, or a one-off leak hunt.
- **Decision it drives:** which leaks to plug first — the single biggest dollar drains, at the level
  where you can act on them (add a negative, pause a keyword, restructure an ad group, cap a campaign).
- **The differentiator:** it produces **one honest account number, counted once**. The naive version
  double-counts — a wasted search term is inside a wasted keyword is inside a wasted ad group is
  inside a campaign, so summing "waste" across scopes inflates the total 3–4×. This skill counts each
  wasted dollar at exactly one grain and uses the finer scopes only to **pinpoint** the leak, not to
  add it up again.

## Scope
- ✅ **Quantify + prioritize waste** — cost with ~0 conversions, or CPA far above target, across search terms / keywords / ad groups / campaigns; rolled up to a total, a % of spend, and the top leaks by dollars.
- ❌ **Writing the negatives** (which term, which match type, which level) → complementary `negative-keywords` skill. This skill flags the term and its wasted dollars; it does not author the negative list.
- ❌ **Reallocating the freed budget** (where the recovered dollars should go) → `spend-allocation`.
- ❌ **Classifying WHY a term is irrelevant** (intent mismatch, wrong geo, competitor, etc.) → `search-term-classifier`. This skill is the account-level roll-up those search-term skills feed.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the four scope queries (one per grain), the fields, and the conversion-lag caveat.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the leak test, the wasted-dollars formula, and the count-once rule that keeps the total honest.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** the reporting window, an optional **target CPA** (or target ROAS for a value-tracking
account — if none is supplied, derive the account baseline CPA = account cost ÷ account conversions),
and the account's known **conversion-lag window** (default ~7 days). Per grain: `cost_micros`,
`conversions`, `conversions_value` segmented by search term / keyword / ad group / campaign — see
[`references/tools.md`](references/tools.md).

**Process:** apply [`references/framework.md`](references/framework.md). For each entity above the
spend floor, compute CPA (`cost ÷ conversions`) and the **wasted dollars** = `cost − (conversions ×
target_cpa)`, bounded to `[0, cost]` — so a zero-conversion entity wastes 100% of its cost, and an
over-CPA entity wastes only the overspend beyond target. Flag it as a leak when conversions are ~0
**or** CPA ≥ ~3× target. Then **count the total once**: sum wasted dollars at the keyword grain for
Search/Shopping + at the campaign grain for the channels with no keyword breakdown (Performance Max,
Display, Video, Demand Gen); the search-term and ad-group scopes are diagnostic lenses that pinpoint
*where inside* the keyword/campaign the leak sits, never added to the total. Gate on volume (ignore
sub-floor entities), and mark leaks whose spend falls inside the conversion-lag window as
**provisional** — a recent zero-conversion term may just be waiting for conversions to land.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the number — total wasted, its % of spend, and the single
  loudest leak), `diagnosis` (the shape of the waste — is it concentrated in a few terms, spread
  across a whole ad group, or a dead campaign), `action` (the highest-dollar plug, where / what / why,
  handing the mechanics to the sibling skill).
- `leaks[]` — the top leaks, each tagged with its `scope`, its `wasted_amount`, why it's a leak, and
  the executable `recommendation {where, what, why}`.
- `rollup` — `total_wasted`, `wasted_pct_of_spend`, the count-once components, the `by_scope`
  breakdown (canonical vs diagnostic-lens), and the top leaks by dollars.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`_framework/writing.md`](../../../_framework/writing.md) — a question heading the data answers
> yes/no; the metric+delta carried as data, never spelled out in prose; first sentence answers the
> heading, then names the driver; one bridge line to the next section. Plain language for a
> non-technical owner — "this search term spent $840 and got nothing", not "high-CPA query with
> zero attributed conversions".

## Example (illustrative — NOT rules)
- **The number:** the account wasted **$11,400 (18% of spend)** last 30 days — counted once, no
  double-counting across scopes.
- **The loudest leak (search term):** the query "free crm" spent **$840** across two campaigns with
  **0 conversions** → the whole $840 is wasted; hand it to `negative-keywords` to add as a negative
  (this skill won't pick the match type or level).
- **A hidden over-CPA leak (keyword):** the keyword "project software" spent **$2,300** for 3
  conversions — a **$767 CPA** at a **$120 target** → ~$1,940 wasted (the overspend beyond target);
  pause or cut the bid, don't reallocate yet (that's `spend-allocation`).
- **A dead campaign (campaign):** "Display — Prospecting" spent **$3,100** for 1 conversion → counted
  at campaign grain because Display has no keyword breakdown; review the whole campaign, not a keyword.
- **Provisional, not counted firm:** "new pricing tool" spent $310 with 0 conversions but all of it
  in the last 5 days → inside the conversion-lag window; flagged provisional, wait before cutting.
