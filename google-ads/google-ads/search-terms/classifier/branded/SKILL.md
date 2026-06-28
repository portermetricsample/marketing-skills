---
name: search-term-branded
description: Classify every Google Ads search term as brand (own brand + misspellings), competitor (named rival / alternative / player), or generic — and flag brand terms being served outside the brand campaign (a "contain_brand" leak). Use this skill whenever the user asks which search terms are branded, which are competitor searches, spots rival brand names appearing in the search terms report, wants to find brand leakage (own brand served by generic campaigns), or needs to apply brand protection negatives. Single-axis brand/competitor classification ONLY — for the full multi-label picture (intent + relevance + cannibalization + brand all at once) use the parent search-term-classifier skill.
---

# Search Term Branded Classifier

## Goal (job-to-be-done)
Classify every search term in the account by **brand class** — the first question the `classifier`
always asks — and flag brand terms being captured by the wrong campaigns.

Three classes:
- **brand** — contains the advertiser's own brand name, product name, or a known misspelling.
- **competitor** — names a direct rival, alternative product, or "X vs Y" comparison.
- **generic** — no brand signal in either direction.

And one alert:
- **contain_brand** — the term is `brand`-class but was served by a *non-brand campaign*. This is a
  campaign-containment leak: the brand campaign should own it; the generic campaign is wasting spend
  competing with the brand's own intent.

## When to use
- "Which search terms are branded?"
- "Are competitors showing up in our search terms?"
- "We're spending on `rival company` — what's our exposure?"
- "Is our brand campaign containing all brand searches?"
- "Find brand leakage."

Single-axis only. For the full term profile (brand + intent + cannibalization + relevance all at
once), use the parent [`../SKILL.md`](../SKILL.md) (`search-term-classifier`).

## Inputs
- The **search terms report**: term text + triggering keyword + campaign name + cost + conversions
  (same superset query as the classifier).
- **Business context** (per-account, never hard-coded):
  - `brand_terms[]` — the brand lexicon: product name, company name, common misspellings.
  - `competitor_terms[]` — competitor brand names and common alternatives.
  - `brand_campaign_markers[]` — name fragments that identify the brand campaign(s)
    (e.g. `["brand", "bmm_brand", "branded"]`).

Derive from account signals (campaign names, keyword texts, past reports). Confirm the doubtful;
ask only what can't be inferred.

## Logic (deterministic — no LLM needed for classification)

```
for each term:
  if term matches brand_terms[]  →  class = "brand"
    if served_campaign NOT in brand_campaign_markers[]  →  contain_brand = true
  elif term matches competitor_terms[]  →  class = "competitor"
  else  →  class = "generic"
```

**Misspelling rule:** apply a fuzzy match (edit-distance ≤ 2) for the brand lexicon — `policym`,
`polycyme`, `policyyme` all fire `brand`. Competitor names are exact-match only (too many false
positives from fuzzy).

**Partial match is enough:** `acme life insurance quote` contains `acme` → `brand`. The term does
not need to be *only* the brand name.

## Output
Per term:
```json
{
  "term": "acme life insurance",
  "class": "brand",
  "contain_brand": true,
  "served_campaign": "Generic - Life Insurance",
  "cost": 42.10,
  "conversions": 2
}
```

Summary:
```json
{
  "brand_count": 12,
  "competitor_count": 7,
  "generic_count": 341,
  "contain_brand_terms": 4,
  "contain_brand_spend": 89.50
}
```

## Operate
1. Discover the account: `list_accounts(component_name="google-ads", query="<name>")`.
2. Pull the search terms report (same query as the classifier — see
   [`../references/tools.md`](../references/tools.md) for the field set).
3. Establish context: extract brand lexicon + competitor lexicon + brand campaign markers from the
   account (campaign names, keyword texts, prior context files if available).
4. Run the classification loop above. Flag `contain_brand` where applicable.
5. Emit the per-term JSON + summary.

## Gotchas
- **Eastpointe trap:** an account that sells to *leads* (not ecommerce) still has brand searches. Do
  not skip brand classification because the business model is lead-gen.
- **Competitor misspellings:** do NOT fuzzy-match competitor names. `rivalco` close to `rivalcom` is
  too likely a false positive. Exact only.
- **Brand ≠ branded campaign:** a term can be `class: brand` and still be served by a generic
  campaign — that is exactly the `contain_brand` case. The class describes the term; the
  `contain_brand` flag describes the campaign routing.
- **This skill does NOT decide the action** (add negative, restructure campaigns). It classifies. The
  action recommendation belongs to the parent `classifier` or the `run` orchestrator.
