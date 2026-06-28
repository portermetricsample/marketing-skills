---
name: search-term-opportunity
description: Mine a Google Ads account's PAID search terms to discover demand by intent and angle that the advertiser is NOT serving well — and turn it into ideas (new landing pages, content assets like a calculator/listicle/guide, and ad variations). Use this skill whenever the user wants to find content/landing/ad opportunities from search terms, asks what to build next, mentions unmet/unserved demand, intent or angle discovery, search-term mining for ideas, "what should I create", a content/creative roadmap from paid demand, or feeding the SEO team real demand — even if they don't say "intent". This is the OFFENSIVE twin of the relevance skill: it discovers opportunity, it does NOT prune or judge term hygiene, and it does NOT produce the content itself.
---

# Search Intent & Angle Discovery

## Goal (job-to-be-done)
Mine the account's **paid** search terms to discover demand by **intent** and **angle** that
the advertiser is not serving well — and translate it into **ideas**: new landing pages,
content assets (calculator, listicle, guide) and ad variations. It is the **offensive** twin of
the relevance skill (which is defensive: it prunes; this one discovers).

- **Who:** marketer / media buyer / content strategist. **When:** periodically, to feed the
  content and creative roadmap.
- **Decision it drives:** which new landing/content/angle to create, based on **real** demand
  already demonstrated in the account.
- **The differentiator:** each query here **already spent the advertiser's money** = demand
  demonstrated in THEIR market, geo and moment — not a theoretical volume from a keyword
  database. The unit of analysis is the **intent/angle cluster**, sized by demand.

## Scope
- ✅ **Detect intent/angle** in the terms that ALREADY triggered, **size their demand**, and
  propose **which asset to create** and **which ad angle to test**. Unlike the relevance skill,
  this one **DOES use volume** (impressions/clicks) — without sizing demand the ideas are noise.
- ❌ **It does NOT produce the content** (that's the landing/listicle builders / the SEO team).
- ❌ **It does NOT judge term hygiene / relevance** (negatives, tighten, move) → relevance skill.
  No performance verdicts on individual terms — this is opportunity discovery.
- ❌ **It does NOT see demand that never triggered** in the account → that's SEO keyword research
  with DataForSEO. This only sees what already went through the paid account — but with money
  behind it. It **complements** SEO: it hands it intent with real demand.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the demand-sizing query (uses volume).
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: intent taxonomy (modifier dictionaries), the opportunity signal, the asset map.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **search term** + **impressions**, **clicks**, **conversions** (+
**campaign name** optional, for the "already served?" check). Plus **business context**
(required): products & geos served, current landing/campaign themes (read from campaign names),
own brand. Derive context from account signals first; confirm the doubtful; ask only what
can't be inferred.

**Process:** classify each search term by **intent/angle** using the **deterministic modifier
dictionaries** in [`references/framework.md`](references/framework.md) (cost · comparison ·
informational · persona · geo · transactional). Apply regex/lists first; the AI only resolves
the ambiguous terms and names the angle — this keeps it reproducible, not "by eye". Then
**cluster and size by demand** (sort by impressions desc, not by spend). Read the opportunity:
prioritize clusters with **high demand + low conversion + an informational/comparative
modifier** = intent the current landing doesn't satisfy. Only include clusters the advertiser
is NOT serving well; skip transactional intent the current provider landing already satisfies.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the biggest unmet-intent opportunity + the single
  asset to ship), `diagnosis` (that opportunity stated as intent + demand + the asset it wants,
  plus a recurring angle the advertiser isn't using), `action` (the one content/ad idea to ship
  first, where / what / why).
- `clusters[]` — one per intent/angle, sorted by demand. Each carries its sample queries, demand
  (impressions/clicks/# terms), converts-today flag, recommended asset, ad angle to test,
  already-served flag, and hand-to-SEO flag.

A renderer (porter-reporting, or a chat view) turns that JSON into the human map. Do not bake
emojis/layout into the analysis output.

## Example (illustrative — life insurance advertiser, NOT rules)
- **Cost / calculator:** `how much is life insurance`, `life insurance cost ontario`, `life
  insurance rates by age` → ~4,200 impr · 180 clicks · 22 terms · converts low → asset:
  interactive premium calculator; ad angle "See your real monthly price in 60 seconds — no call
  needed"; already served: no (only a quote form); hand to SEO: yes.
- **Comparison / listicle:** `best life insurance companies canada`, `term life insurance
  comparison` → ~2,600 impr · 95 clicks · 18 terms · converts no → asset: "Best term life
  insurance in Canada (2026)" comparison listicle; ad angle "We compared 12 Canadian insurers —
  here's the honest ranking"; already served: no; hand to SEO: yes.
- **The signal (Acme Insurance):** `how much is life insurance` and `best life insurance companies in
  canada` → lots of demand, ~0 conversion on the quote landing. Not bad traffic — demand for a
  **calculator** and a **comparison listicle** the account doesn't offer. ("Low conversion" here
  is NOT a performance judgment on the term; it's the **clue** that intent ≠ offered asset.)
