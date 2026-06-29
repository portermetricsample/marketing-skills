---
name: google-ads-audit
description: Assemble a complete Google Ads account audit as a single scrolling HTML narrative document. Orchestrates all Google Ads analysis skills, orders findings by dollar impact, and renders them as a professional audit report with Executive Summary, KPI Scorecards, per-section findings tables + callouts, What's Set Up Right, and a prioritized Action Plan. Use this skill when the user asks to audit, review, or health-check a Google Ads account. Output is a Porter report (single HTML page), not a dashboard.
---

# Google Ads Audit — Assembly Orchestrator

## What this builds
A single-page HTML narrative document delivered as a Porter report. Not a dashboard — no charts. The document scrolls from Header to Action Plan, with each section backed by live data and ending in a specific recommendation.

Reference audits — read these to calibrate **tone, density, and finding logic only**. They predate
this template and ship the older hand-written teal/navy CSS, so do **not** copy their look:
- Harper Health (Search, small account): `report_id 69af1804-c1d8-40e7-8cd2-b584c7cf27c0`
- PolicyMe (Search + DG, large account): `report_id 80939d61-817f-45e5-b96a-25c8ba34b039`

> **Visual standard = this skill's own template** ([`pages/main.html`](pages/main.html) + the Porter
> Design System themes), NOT those reference reports. Every audit renders from that template in one
> `data-theme` (default `cream`) so the output is consistent run to run. Deploy via
> [`references/deploy.md`](references/deploy.md).

---

## Step 0 — Gather inputs

| Input | How to get it | Why |
|-------|--------------|-----|
| `account` | `list_accounts` (connector: `google-ads`) | All queries need `customer_id-login_customer_id` |
| `date_range` | Ask user or default to last 90 days + prior 90 days | 90 days gives enough signal; 30 days only for small-spend accounts |
| `brand_terms` | Ask user (optional) | Required for brand vs non-brand split in search terms |
| `campaign_types` | `query_data` → `google_ads_campaign_advertising_channel_type` | Gates which sections apply |

**Run campaign fingerprint first** — determines which sections to include or skip:
- All Search → full audit
- PMax present → skip Keywords/Search Terms sections; note the gap
- Demand Gen present → add DG section
- Shopping present → add product P&L note (out of scope for this skill version)

**Then run a pre-flight access check — BEFORE Step 1, never skip.** Two quick calls confirm the
connector can actually serve the whole audit, so a permission hole surfaces up front instead of as a
hole in section 06+ after the work is done:
1. **Bid-strategy / budget route** — call the `campaign.list` connector action (a tiny GAQL: a few
   campaign rows + `campaign_budget.amount_micros`). It is the *preferred* route for true bid targets and
   budgets when it works.
2. **Geo route** — a 1-row `query_data` on `["google_ads_geo_target_region","google_ads_cost_micros"]`.

Branch on the result:
- **Both OK (HTTP 200 / rows)** → proceed; the Bid-strategy and Geography sections are safe.
- **`campaign.list` returns 403 / "not configured" / a manager-account permission error** → this account
  has report access but no Google Ads API access for this customer. Fall back to the GAQL `report.query`
  route for targets; if that also fails, **tell the user plainly and offer a partial audit** (Bid-strategy
  dropped, footer gap noted). Never let it surface as a silent hole mid-build — that is the failure mode
  this check exists to prevent.
- **Either returns `reauth_required`** → surface the reauth URL and resume after the user reconnects.

> **Reconciles the `campaign.list` question:** earlier notes claimed `campaign.list` "fails for ~75% of
> accounts." Live runs show it working as the reliable route on accounts where API access *is* configured,
> and 403-ing where it is **not**. So don't assert either way — the pre-flight **tests it per account** and
> branches. (The `report.query` GAQL route stays as the documented fallback.)

---

## Step 1 — Run all analysis skills in parallel

Run these concurrently after Step 0. Each returns findings + a verdict.

| Skill | Output needed |
|-------|--------------|
| `measurement/conversion-tracking` | Is the conversion signal trustworthy? List of primary actions, shallow ones, missing values |
| `campaigns/spend-allocation` | Per-campaign spend / conversions / CPA / IS — who's wasting, who's capped |
| `campaigns/impression-share` | IS earned + lost-to-budget + lost-to-rank per campaign |
| `campaigns/bid-strategy` | Strategy type + target vs actual per campaign |
| `campaigns/value-based-bidding` | Is value bidding set up correctly? |
| `campaigns/campaign-settings` | Location = Presence? Search Partners / Display off? |
| `ads/metrics` | QS 3 pillars per keyword (not numeric — categorical only) |
| `search-terms/performance` | Winning / Watch / Waste by spend |
| `search-terms/n-grams` | Top waste buckets by 1/2/3-gram pattern |
| `search-terms/classifier/branded` | Brand leak detection + competitor terms |
| `search-terms/negatives` | Layer 1 (presence) + Layer 2 (brand containment) — feeds the search terms section |
| `search-terms/match-types` | Spend concentration by Broad/Phrase/Exact — is budget too heavy on one match type? |
| `ads/copy` | RSA Ad Strength + asset labels (PENDING/GOOD/LOW/BEST) |
| `ads/assets` | Sitelinks / callouts / snippets / images present? |
| `ads/alignment` | Keyword → Ad → Landing chain coherence |
| `ads/landing-cro` | Live page scrape: value prop / CTA / proof / form friction |
| `segmentation/audience/demographics-audit` | Age/gender bid adjustment opportunities |
| `segmentation/audience/geography` | Province/city CPA vs account average |
| `segmentation/audience/devices` | Desktop vs mobile efficiency gap |
| `segmentation/time/cyclical` | Day-of-week + hour performance vs average |
| `campaigns/demand-gen` | DG campaign audit vs Search baseline *(only if DG campaigns exist)* |

---

## Step 2 — Score and order sections by impact

Each skill returns a verdict and a dollar estimate. Score sections before writing:

**Severity rule — assign based on $ at stake:**
- `HIGH` — affects >15% of total spend, or conversion tracking is broken (always HIGH)
- `MED` — real impact but not the biggest lever; or structural fix with medium spend exposure
- `LOW` — housekeeping, optimization when ready, or low-volume signal

**Ordering rule:**
1. `measurement/conversion-tracking` is **always 01** — a broken conversion signal corrupts every other number. Run and write this first regardless of severity score.
2. Remaining sections ordered by `HIGH → MED → LOW`, then by spend at stake within each tier.
3. `What's Set Up Right` and `Action Plan` always come last.

---

## Step 3 — Write the document

### Document skeleton (in order, no exceptions)

```
1. Header
2. Executive Summary
3. KPI Scorecards
4. Legend
5. Sections (ordered by impact per Step 2)
6. What's Set Up Right
7. Action Plan
8. Footer / Methodology
```

---

### 1. Header

```html
<header>
  <div class="brandrow">
    <div>
      <span class="eyebrow">Google Ads Account Audit</span>
      <h1>[Client Name]</h1>
      <p class="sub">[Business description — 1 line]</p>
    </div>
    <span class="ga-badge"><span class="ga-dot"></span> Google Ads</span>
  </div>
  <div class="metarow">
    Period · Account ID · Campaign type · Markets/geography · Audit date · Currency
  </div>
</header>
```

---

### 2. Executive Summary

**Structure:**
- `<span class="tag">Executive summary</span>`
- `<h3>` — One diagnosis headline. Lead with the biggest finding and the dollar number. Never generic ("results were mixed"). Example: *"$483K spent and CPA fell 32% — but only because the conversion signal got noisier, not because buying got smarter."*
- 2–3 paragraphs. Para 1: what the top-line looks like and why it's misleading (or not). Para 2: where the money leaks. Para 3: what's working.
- `<div class="do"><b>Do first:</b>` — exactly 3 actions, the ones with most $ at stake. Reference them to sections.

**Tone rules:**
- Every sentence names a number or a named campaign/keyword/page. No vague statements.
- Lead with the problem, not the context.
- "Do first" = the 3 actions that, if done this week, address the majority of waste.

---

### 3. KPI Scorecards

6 cards, always:
1. Spend (period)
2. Conversions
3. CPA or ROAS (whichever is the primary optimization metric)
4. Clicks or Impression Share
5. One account-specific key metric (e.g. Conversion Value, CPL, IS Budget Lost)
6. One account-specific concern metric (e.g. Value/conversion, Zero-conv spend %)

Each card:
```html
<div class="scard">
  <div class="lab">[Metric name]</div>
  <div class="val num">[Value]</div>
  <span class="delta d-good|d-bad|d-flat">▲/▼ [delta] vs prior</span>
  <span class="cap">[1-line context that explains the delta]</span>
</div>
```

---

### 4. Legend

Always include immediately before the sections. Never skip — the client needs to know what the chips mean.

```
Broken = active problem costing money now
Review = flag — verify or monitor before acting
Pass = working correctly — no action needed
HIGH = largest $ at stake · MED = real impact, lower urgency · LOW = housekeeping
```

---

### 5. Section anatomy (every section follows this pattern)

```html
<div class="section" id="[slug]">
  <div class="section-head">
    <span class="section-num">N</span>
    <h2>[Section title — question form preferred: "Is the conversion signal trustworthy?"]</h2>
    <span class="chip c-broken|c-review|c-ok|c-na">[Verdict]</span>
    <span class="sev sev-h|sev-m|sev-l">[HIGH|MED|LOW]</span>
  </div>

  <p class="lead"><b>[The single most important finding in bold.]</b> [Supporting numbers in the same sentence.]</p>

  <!-- Data table -->
  <div class="tablewrap"><table>
    <thead>...</thead>
    <tbody>
      <!-- Each row: item name + evidence label + metrics + verdict chip + recommended action -->
    </tbody>
  </table></div>

  <!-- Callouts (use as many as needed, in this priority order) -->
  <div class="callout co-fix"><span class="ico">Fix</span><div class="ct"><b>[Action title]</b> [Where · What · Why format]</div></div>
  <div class="callout co-watch"><span class="ico">Watch</span>...</div>
  <div class="callout co-info"><span class="ico">Note</span>...</div>

  <!-- Bridge to next section (one line) -->
  <p class="sec-bridge">[Connect this finding to the next section.]</p>
</div>
```

**Callout types:**
| Type | Class | When to use |
|------|-------|------------|
| Fix | `co-fix` | Immediate action — specific change with expected outcome |
| Watch | `co-watch` | Monitor — signal present but not enough volume to act yet |
| Note/Context | `co-info` | Explains a data limitation or provides useful context |
| Resolved | `co-win` | Correction of a prior version or confirmed fix |

**Table recommendation column format** — always `Where · What · Why`:
- `Where:` the exact location in the Google Ads UI or the URL
- `What:` the specific change to make
- `Why:` the dollar or quality reason

**Verdict chips:**
- `c-broken` = Broken (active waste, misconfiguration, or broken tracking)
- `c-review` = Review (flag, monitor, opportunity — not urgent)
- `c-ok` = Pass (working correctly, no action needed)
- `c-na` = N/A or Limited Data (connector limitation, auth issue)

---

### Sections — what each one covers

#### 01 · Conversion tracking *(always first)*
**Skill:** `measurement/conversion-tracking`  
**Check:** Are conversions down-funnel (policy approved, purchase, form fill) — not page views or app starts? Are values assigned? Are deprecated Universal Analytics goals still counting? Is offline/CRM import active?  
**Bridge:** a noisy conversion signal corrupts bid targets → leads to 02.

#### 02+ · Spend allocation & budget
**Skill:** `campaigns/spend-allocation` + `campaigns/impression-share`  
**Check:** Which campaigns are capped (lost to budget)? Which are losing to rank? Who spends the most and converts the least? Per-campaign spend / conv / CPA / IS table. IS budget-vs-rank split.

#### · Bid strategy
**Skill:** `campaigns/bid-strategy` + `campaigns/value-based-bidding`  
**Check:** Target vs actual (tCPA, tROAS). Broken if Maximize Conversions/Value with no tCPA/tROAS target AND rank-lost IS > 40% — the absent guardrail IS the misconfiguration. Is value-based bidding set where conversion values exist? Are $0-value conversions feeding value bidding?  
**Caveat:** pull bid targets via the `campaign.list` connector action when the Step 0 pre-flight shows it works (the reliable route on accounts where Google Ads API access is configured); fall back to GAQL `report.query` if `campaign.list` 403s. A returned 0 on target fields = no guardrail (meaningful signal). Numeric target values from any route are corrupted (fan-out artifact) — trust only the binary "set vs not set".

#### · Quality Score
**Skill:** `ads/metrics`  
**Check:** 3 pillars per keyword (Ad Relevance, Expected CTR, Landing Experience). Pull via GAQL `keyword_view` — these fields are absent from `query_data`/`list_fields` in most accounts (route dependency, not a field gap). Numeric QS via GAQL `keyword_view` IS reliable (1-10 per keyword). Numeric QS via `query_data` is NOT (aggregates to nonsensical values — never use). Focus on keywords with highest spend + below-average pillars.

#### · Search terms & negatives
**Skills:** `search-terms/performance`, `search-terms/n-grams`, `search-terms/classifier/branded`, `search-terms/negatives`

This section has three distinct blocks. Run all four skills in parallel and render them as subsections.

---

**Block 0 — Negative keyword presence check**

**Goal:** establish whether negative keywords exist at all before analyzing waste. This is a binary check that can produce the highest-severity finding in the section.

**How:** run `search-terms/negatives` (Layer 1 + Layer 2) first. Cross-reference campaign list vs campaigns with negatives to find zero-negative campaigns.

**Verdict table columns:** Campaign · Type · Negative count · Verdict chip · Severity

| Finding | Verdict | Severity |
|---------|---------|----------|
| Any Search campaign with 0 negatives | c-broken | HIGH |
| PMax with <50% of Search campaign negative count | c-review | MED |
| 1–9 negatives in a Search campaign | c-review | MED |
| All campaigns have 10+ negatives | c-ok | — |

**Callout — zero negatives:**
```
co-fix: "Add negative keywords to [Campaign name]"
Where: Google Ads UI → [Campaign] → Keywords → Negative keywords
What: Add intent-filter negatives first (free, cheap, DIY, jobs), then brand containment
Why: A campaign with zero negatives serves every query that matches any keyword — including irrelevant, low-intent, and competitor brand searches
```

**Callout — PMax gap (if present):**
```
co-info: "PMax campaign has [N] negatives vs [N] average in Search campaigns"
Why: PMax doesn't support ad-group-level negatives. Apply shared negative lists that cover the same intent filters used in Search.
```

---

**Block 1 — Waste & negatives**

**Check:** What % of non-brand spend drove zero conversions? Top individual waste terms + worst-value n-gram buckets. Competitor terms: conquest or accident?

Table columns: Search term · Campaign · Match type · Spend · Conversions · CPA · Verdict chip (Waste / Watch / Win)

Callout rules:
- `co-fix` if any single term > 2% of total spend with 0 conversions → "Add as negative exact in [Campaign]"
- `co-fix` if a competitor term appears with significant spend → "Conquest or accident? Verify intent — if accidental, add negative. If conquest, isolate in its own ad group with tailored copy."
- `co-watch` if a term has conversions but CPA > 2× account average → flag for bid adjustment before negative

---

**Block 2 — Brand containment**

**Goal:** detect own-brand search terms being captured by non-brand campaigns (the "contain_brand" leak). This is the structural problem Resolve audits flag as "Brand and Non-brand Separation."

**Check using `search-terms/classifier/branded`:**
1. Classify every search term as `brand` / `competitor` / `generic`.
2. Flag any `brand`-class term served by a campaign NOT in the brand campaign list (`contain_brand = true`).
3. Calculate total spend and conversions on those leaked brand terms.

**Verdict logic:**
- If `contain_brand_spend` > 5% of total non-brand campaign spend → `c-broken` / HIGH
- If `contain_brand_spend` 1–5% → `c-review` / MED
- If 0 contain_brand terms found → `c-ok` / PASS

**Table columns:** Search term · Served by (campaign) · Should be in (brand campaign) · Spend · Conversions · Match type of triggering keyword

**Callout — always include if any contain_brand terms exist:**

```
co-fix: "Add brand terms as negative keywords in generic campaigns"
Where: Each non-brand campaign listed in the contain_brand table
What: Add [exact match] negatives for each brand-class term found — use the exact term strings from the classifier output, not paraphrases
Why: Brand searches convert at lower cost when isolated; generic campaigns inflate CPL by competing with the brand campaign's own intent
Match type rule: always negative exact [brand term] — negative broad risks blocking legitimate generic variants
```

**Structural recommendation (include when contain_brand_spend is HIGH):**

```
co-fix: "Restructure into separate brand and non-brand campaigns if not already done"
Where: Google Ads campaign settings
What: Create a dedicated brand campaign (if none exists) with brand keywords on exact match. Add all brand terms as negative exact in every generic campaign.
Why: Without separation, Smart Bidding learns a blended CPA that undervalues brand intent and overweights generic CPL — the account can't optimize each correctly.
```

**Bridge:** brand containment fixes the intent routing; the next section checks whether the landing pages those terms reach are converting correctly.

#### · Match types
**Skill:** `search-terms/match-types`  
**Check:** Is spend over-concentrated in one match type (usually Broad)? Is any type sitting untested at $0?

**Always open with the concentration table** — one row per type, never skip a type even if $0:

| Match type | Spend | Share | Conversions | CPA | Verdict |
|---|---|---|---|---|---|
| Broad | … | …% | … | … | chip |
| Phrase | … | …% | … | … | chip |
| Exact | … | …% | … | … | chip |

**Blend guardrail (mandatory):** if the account has more than one primary conversion action (e.g. Form Fill + Purchase, or Trial + MQL), mark every CPA value as `directional` and do NOT assert which type is "most efficient." Porter cannot split qualified actions by match type — the per-type CPA is a blend that can invert the true ranking. State this explicitly.

**Verdict per type:**
- `c-broken` — a type holds ≥70% of spend with no concentration benefit (CPA not clearly better), or a type is untested at $0 with obvious upside
- `c-review` — concentration exists but CPA advantage is visible; test advised before rebalancing
- `c-ok` — no concentration issue

**Drill-down rule:** only drill into individual keywords when a type is flagged `c-broken` or `c-review`. Show top 5 keywords by spend for the flagged type only.

**Callout — concentrated:**
```
co-fix: "Rebalance spend off [Match type]"
Where: Google Ads → Keywords tab → filter by match type
What: Shift 20–30% of [Match type] budget to [Exact/Phrase] — run as parallel ad groups first
Why: [N]% of spend on one match type increases query irrelevance risk; diversifying gives bid optimization more signal
```

**Callout — untested type:**
```
co-watch: "Pilot [Match type] on top ad groups"
Where: Google Ads → best-performing ad groups
What: Add 5–10 [Phrase/Exact] keywords mirroring existing Broad winners; run for 30 days
Why: [Match type] has $0 spend — no data on whether it performs better or worse than the current blend
```

**Bridge:** match type distribution explains part of the search term waste pattern — over-indexing on Broad generates more irrelevant queries.

#### · Landing page CRO
**Skills:** `ads/landing-cro`, `ads/alignment`  
**Check:** Live scrape each unique landing page. 5 criteria: value prop / CTA / differentiation / proof / form friction. Flag message-match breaks (keyword searches for X, lands on page about Y).

#### · Audience & demographics
**Skill:** `segmentation/audience/demographics-audit`  
**Check:** Age/gender efficiency vs account average. Undetermined bucket size (often 30%+ of spend). Which segments deserve bid up/down.

#### · Geography
**Skill:** `segmentation/audience/geography`  
**Check:** Province/region CPA vs account average. Language/market mismatch (e.g. English ads in French Quebec). Best and worst geos.  
**Caveat:** Porter Canada geo = no map atlas. Use bars, not geo bubble.

#### · Ad assets (RSA copy)
**Skills:** `ads/copy`, `ads/assets`  
**Check:** Sitelinks / callouts / snippets / images present? RSA asset labels (PENDING = not enough data yet; note this honestly). Pinning abuse. Ad Strength.  
**Known gap:** sitelinks and snippets often return blank from the Porter connector → flag for manual UI verification, never report as missing.

#### · Device & ad schedule
**Skills:** `segmentation/audience/devices`, `segmentation/time/cyclical`  
**Check:** Desktop vs mobile CPA/ROAS gap. Day-of-week conversion pattern vs spend distribution. Weekend efficiency vs weekday.  
**Rule:** don't recommend bid adjustments if < 30 conversions per device — low-confidence signal, say so explicitly.

#### · Campaign settings
**Skill:** `campaigns/campaign-settings`  
**Check:** Location = Presence (not "presence or interest")? Search Partners OFF? Display Network OFF on Search campaigns? These are pass/fail checks.

#### · Demand Gen *(only if DG campaigns exist)*
**Skill:** `campaigns/demand-gen`  
**Check:** DG campaign CPA/ROAS vs non-brand Search baseline. Is it earning its place?  
**Known gap:** asset-group detail not available via Porter connector → note in section, direct to UI.

---

### 6. What's Set Up Right

Never skip this section. Always 4–6 cards of things that are genuinely working.  
Use `<div class="passgrid">` with `<div class="passcard">`.  
Only include things that are actually confirmed by data — not generic praise.  
Examples: "100% Search campaigns", "Offline CRM import active", "Location set to Presence", "Landing pages strong".

---

### 7. Action Plan

Ranked by $ at stake (not by section order). Each item:
```html
<div class="item">
  <div class="rank"></div>  <!-- CSS auto-numbers these -->
  <div class="tc">
    <div class="tt">[Action title — imperative verb]</div>
    <div class="td">[2-3 sentences: what exactly to do, where, expected outcome]</div>
    <span class="tmeta">[N] · [HIGH|MED|LOW] · Est. [time] in [tool]</span>
  </div>
</div>
```

Maximum 7 items. If there are more, fold low-severity ones into a single "housekeeping" item.

---

### 8. Footer / Methodology

Always include:
- Data source (Porter Metrics Google Ads connector, date pulled)
- Period and comparison
- What was excluded and why (QS numeric, auction insights, asset groups if DG, any reauth failures)
- Conversion volume caveat if total conversions < 50 in the period

---

## Known connector gaps — handle gracefully

Always acknowledge in the relevant section, never pretend data is missing:

| Gap | How to handle |
|-----|--------------|
| Auction Insights competitor overlap | Note as unavailable, direct to Google Ads UI → Auction Insights tab |
| Demand Gen asset-group detail | Note as unavailable, direct to UI → Demand Gen campaign → Asset groups |
| Sitelinks / snippets / images | Flag for UI verification, do NOT report as absent |
| Bid targets (tCPA / tROAS) | Pull via the `campaign.list` connector action; the Step 0 pre-flight tests it per account. It works where Google Ads API access is configured and 403s where it isn't (an access check, not "broken ~75%"). On a 403 fall back to GAQL `report.query`. A returned 0 or null on target fields = no guardrail set (meaningful signal — not a data error). Trust only the binary "target set vs not set" — numeric values from any route are corrupted by fan-out artifact. |
| Numeric QS via query_data | Never use — `query_data` aggregates values across ad groups, returns numbers like 16, 35, 46, 205 (outside the 1-10 scale). Use GAQL `keyword_view` instead: `adGroupCriterion.qualityInfo.qualityScore` returns correct 1-10 per keyword. |
| QS 3 categorical pillars | NOT available via `query_data`/`list_fields` in most accounts — this is a route dependency, not a field gap. Use GAQL `keyword_view`: `adGroupCriterion.qualityInfo.searchPredictedCtr`, `.creativeQualityScore`, `.postClickQualityScore` |
| Network settings booleans all False | When `target_search_network`, `target_content_network`, `target_partner_search_network` all return False for every campaign including active ones — this is a Porter rendering artifact, not real account config. Do NOT report as "correctly OFF". Add co-info callout directing to Google Ads UI → Campaign → Settings → Networks. |
| Geographic data (reauth) | If unavailable, infer from campaign structure + note the gap |
| Geographic view — city/region granularity | `geographic_view` returns country-level criterion IDs only (integers: 2840=US, 2124=Canada). Sub-national data (city, region, DMA) requires `user_location_view`, not `geographic_view`. Canada has no Porter atlas — use bar tables, not geo bubble. |
| Search terms — sort order | `order_by` is not supported in `query_data` — results return in default order, not sorted by spend. Sort results client-side after retrieval. Cannot guarantee "top by spend" ordering from query_data directly. |
| PMax search terms | Zero rows returned from `search_term_view` for PMax campaigns — confirmed Google API limitation, not a Porter gap. Direct client to Google Ads UI → Performance Max campaign → Insights tab → Search terms. |
| Age + gender in single query | Cannot be combined — universal Google API restriction. Run two separate queries: `age_range_view` and `gender_view`. PMax does not expose either view at all. |
| Landing page URL field | `google_ads_final_url` is not a valid field name. Use `google_ads_unexpanded_final_url` as the proxy field. |

---

## Design system &amp; deploy

**Do not write a stylesheet per account.** Render from the template [`pages/main.html`](pages/main.html)
— it already carries the full audit layout and pulls every colour from the Porter Design System tokens
(`~/porter-design/dist/porter-tokens.css`). You fill the content; you never invent CSS. Pick one
`data-theme` on the `#audit` wrapper (`cream` default · `white` · `blue` · `purple`). This is what
makes every audit look identical run to run.

To understand the token mapping before editing the template's layout, read
[`references/design.md`](references/design.md) (element-by-element: fonts, tokens, chips, tables,
callouts, action plan).

**The three non-negotiables (baked into the tokens — keep them if you ever touch the template):**
- Bricolage Grotesque for KPI values and h2 headings. Hanken Grotesk for body and tables. IBM Plex Mono only for section numbers, chips, badges, and `.num` cells.
- No gradients, no drop shadows — 1px hairline borders only.
- The brand purple is the single accent — section numbers, eyebrows, verdict chip borders, "Do first" accent.

### Step 4 — Deploy as a hosted Porter report
After the standalone HTML is written + verified, deploy it per [`references/deploy.md`](references/deploy.md):
make the file deploy-safe (wrap in `<div id="audit" data-theme="…">`, scope the style under `#audit`,
strip the dev theme switcher) → `scripts/to_porter_bundle.py` (inlines the tokens + assembles the
3-file bundle) → `get_report_template('blank')` → `create_report` (`config.charts:{}`,
`/* porter:no-compare */`, `visibility:"PRIVATE"`). Reply with the local file path **and** the report URL.

---

## Relationship to other skills

| Skill | Relationship |
|-------|-------------|
| `google-ads/dashboard/` | Same analysis skills, different output (live charts vs narrative document) |
| `account-audit/run-audit/` | Predecessor — superseded by this skill for the HTML document format |
| `google-ads/slides/` | Future: takes this document's HIGH/MED findings and compresses into exec slides |
