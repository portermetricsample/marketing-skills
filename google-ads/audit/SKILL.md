---
name: google-ads-audit
description: Assemble a complete Google Ads account audit as a single scrolling HTML narrative document. Orchestrates all Google Ads analysis skills, orders findings by dollar impact, and renders them as a professional audit report with Executive Summary, KPI Scorecards, per-section findings tables + callouts, What's Set Up Right, and a prioritized Action Plan. Use this skill when the user asks to audit, review, or health-check a Google Ads account. Output is a Porter report (single HTML page), not a dashboard.
---

# Google Ads Audit — Assembly Orchestrator

## What this builds
A single-page HTML narrative document delivered as a Porter report. Not a dashboard — no charts. The document scrolls from Header to Action Plan, with each section backed by live data and ending in a specific recommendation.

Reference audits (read these to calibrate tone and density):
- Harper Health (Search, small account): `report_id 69af1804-c1d8-40e7-8cd2-b584c7cf27c0`
- PolicyMe (Search + DG, large account): `report_id a4324a0f-fc99-4f4a-b2e3-2410016bf187`

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
- Demand Gen present → add §DG section
- Shopping present → add product P&L note (out of scope for this skill version)

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
1. `measurement/conversion-tracking` is **always §01** — a broken conversion signal corrupts every other number. Run and write this first regardless of severity score.
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
    <span class="section-num">§N</span>
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

#### §01 · Conversion tracking *(always first)*
**Skill:** `measurement/conversion-tracking`  
**Check:** Are conversions down-funnel (policy approved, purchase, form fill) — not page views or app starts? Are values assigned? Are deprecated Universal Analytics goals still counting? Is offline/CRM import active?  
**Bridge:** a noisy conversion signal corrupts bid targets → leads to §02.

#### §02+ · Spend allocation & budget
**Skill:** `campaigns/spend-allocation` + `campaigns/impression-share`  
**Check:** Which campaigns are capped (lost to budget)? Which are losing to rank? Who spends the most and converts the least? Per-campaign spend / conv / CPA / IS table. IS budget-vs-rank split.

#### §· Bid strategy
**Skill:** `campaigns/bid-strategy` + `campaigns/value-based-bidding`  
**Check:** Target vs actual (tCPA, tROAS). Is value-based bidding set where conversion values exist? Are $0-value conversions feeding value bidding?  
**Caveat:** pull bid targets directly from the API via `campaign.list` — NOT from performance metrics (known Porter artifact: budget fields return wrong values when combined with performance metrics).

#### §· Quality Score
**Skill:** `ads/metrics`  
**Check:** 3 pillars per keyword (Ad Relevance, Expected CTR, Landing Experience). Never report numeric QS — it sums across ad groups and is meaningless. Focus on keywords with highest spend + below-average pillars.

#### §· Search terms & negatives
**Skills:** `search-terms/performance`, `search-terms/n-grams`, `search-terms/classifier/branded`  
**Check:** What % of non-brand spend drove zero conversions? Top individual waste terms + worst-value n-gram buckets. Competitor terms: conquest or accident?

#### §· Landing page CRO
**Skills:** `ads/landing-cro`, `ads/alignment`  
**Check:** Live scrape each unique landing page. 5 criteria: value prop / CTA / differentiation / proof / form friction. Flag message-match breaks (keyword searches for X, lands on page about Y).

#### §· Audience & demographics
**Skill:** `segmentation/audience/demographics-audit`  
**Check:** Age/gender efficiency vs account average. Undetermined bucket size (often 30%+ of spend). Which segments deserve bid up/down.

#### §· Geography
**Skill:** `segmentation/audience/geography`  
**Check:** Province/region CPA vs account average. Language/market mismatch (e.g. English ads in French Quebec). Best and worst geos.  
**Caveat:** Porter Canada geo = no map atlas. Use bars, not geo bubble.

#### §· Ad assets (RSA copy)
**Skills:** `ads/copy`, `ads/assets`  
**Check:** Sitelinks / callouts / snippets / images present? RSA asset labels (PENDING = not enough data yet; note this honestly). Pinning abuse. Ad Strength.  
**Known gap:** sitelinks and snippets often return blank from the Porter connector → flag for manual UI verification, never report as missing.

#### §· Device & ad schedule
**Skills:** `segmentation/audience/devices`, `segmentation/time/cyclical`  
**Check:** Desktop vs mobile CPA/ROAS gap. Day-of-week conversion pattern vs spend distribution. Weekend efficiency vs weekday.  
**Rule:** don't recommend bid adjustments if < 30 conversions per device — low-confidence signal, say so explicitly.

#### §· Campaign settings
**Skill:** `campaigns/campaign-settings`  
**Check:** Location = Presence (not "presence or interest")? Search Partners OFF? Display Network OFF on Search campaigns? These are pass/fail checks.

#### §· Demand Gen *(only if DG campaigns exist)*
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
    <span class="tmeta">§[N] · [HIGH|MED|LOW] · Est. [time] in [tool]</span>
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
| Bid targets (tCPA / tROAS) | Pull via `campaign.list` action directly, NOT from query_data performance fields |
| Numeric Quality Score | Never report — use 3 categorical pillars only |
| Geographic data (reauth) | If unavailable, infer from campaign structure + note the gap |

---

## Design system

The audit HTML must follow the Porter Design System. Before writing or editing the `style.css` of any audit, read:

1. `references/design.md` (in this folder) — the complete element-by-element mapping: fonts, color tokens, chip specs, table rules, callout styles, action plan layout.
2. `~/porter-design/tokens/colors.css` — the full color token set.
3. `~/porter-design/tokens/typography.css` — font families and scale.

**The three non-negotiables from porter-design:**
- Bricolage Grotesque for KPI values and h2 headings. Hanken Grotesk for body and tables. IBM Plex Mono only for section numbers, chips, badges, and `.num` cells.
- No gradients, no drop shadows — 1px `#e5e7eb` hairline borders only.
- `--porter-purple` (#6701e6) is the single brand anchor — section numbers, eyebrows, verdict chip borders, "Do first" accent.

---

## Relationship to other skills

| Skill | Relationship |
|-------|-------------|
| `google-ads/dashboard/` | Same analysis skills, different output (live charts vs narrative document) |
| `account-audit/run-audit/` | Predecessor — superseded by this skill for the HTML document format |
| `google-ads/slides/` | Future: takes this document's HIGH/MED findings and compresses into exec slides |
