# Framework: Term Routing (cannibalization → consolidation)

## Mission (a single job)
For each search term matched by **2+ different keywords**, find the single **most-relevant owner**
and produce the **negatives** that consolidate the term under it. Route each term to its best
keyword and stop the looser ones from catching it. Nothing more.

## What "cannibalization" means here (and what it does NOT)
It is real and worth fixing — but the harm is **not** "bidding against yourself / a higher CPC":
Google runs **one auction** per query and picks **one** keyword. The damage is:
1. **Routing** — a looser / less-relevant keyword wins a query the more-relevant one should own
   (the wrong ad shows, weaker message match).
2. **Split signal** — the query's clicks / conversions / Quality-Score data scatter across several
   keywords, weakening each one's optimization.

So frame the output as *"route each term to its most-relevant keyword"*, never as *"stop bidding
against yourself."*

## The trigger (the key)
A term is **actionable** when it is served by **2+ distinct keyword TEXTS** competing to match it.
This covers three patterns (all reported):
- `same_campaign_cross_adgroup` — split across ad groups of ONE campaign (usually the most common,
  highest-spend pattern).
- `cross_campaign_same_line` — across campaigns of the same product line (excluding intentional copies).
- `cross_product` — across different product lines (e.g. a Dental campaign serving a health query).

## Intentional segmentation (left alone)
The **same keyword** deliberately replicated across segment/test campaigns (age / geo / audience /
`*_Test`) is **one** distinct keyword for the term → **not** cannibalization → `skipped_intentional`.
The guard is now **keyword-identity based** (same text = intentional), which is more precise than a
campaign-count rule. Overlap within a single ad group (same keyword) never surfaces — harmless.

## Choosing the owner (the most relevant keyword)
In order:
1. **Right product line** — a health term belongs to the health campaign, not the dental one.
2. **Match specificity** — exact > phrase > broad.
3. **Keyword-text closeness** — text == term > keyword contains the term > term contains the keyword
   > token overlap.
4. **Spend** — tie-break.

## The fix
Add the term as a **negative** in every OTHER keyword's ad group, so the owner serves it.
- A negative that would land **inside a segment/test campaign** → `review_segment` (human review;
  do not auto-disturb an intentional test).
- If **no** competing keyword's text equals the term (`term_has_no_exact_owner`), the term may also
  deserve its **own exact keyword** — that is a handoff to `intent-discovery` / keyword ideas, NOT
  an action this skill takes (this skill only routes among keywords that already exist).

## Detection (deterministic — process.py)
Group by `search_term`; keep terms with **2+ distinct keyword texts**; pick the owner; emit
negatives (quarantining test-campaign ones to `review_segment`); tag the pattern; sort by term
spend. The model intervenes only when the "right product line" is ambiguous.

## Boundaries (cluster)
- Relevance of a single term↔keyword pair → `relevance`.
- Prioritizing / sizing by spend, keep-cut verdicts → `performance`.
- New keyword / asset ideas for unmet intent → `intent-discovery`.

> Examples (illustrative, FICTIONAL Acme Insurance — see `../scripts/example.json`, NOT rules):
> - **same-campaign:** `life insurance` matched by exact `life insurance online`, phrase `best life
>   insurance`, phrase `cheap life insurance` (3 ad groups, one campaign) → owner = `life insurance
>   online` (exact) → add `life insurance` as a negative in the other 2 ad groups.
> - **cross-product:** `health insurance` served by the Dental campaign (broad `best dental
>   insurance plan`) AND Health (exact `health insurance coverage`) → owner Health/exact → negative
>   in the Dental campaign.
> - **intentional:** `life insurance canada` repeated under the same keyword across age-test
>   campaigns → skipped.

## Period
`last_month` or `{date_from, date_to}` of 30–90 days.
