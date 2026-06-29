# Audit Document — Structure Spec

Complete blueprint for every block in the audit HTML. Covers content model,
callout rules, and skill → section data mapping. Read alongside `design.md`.

---

## 1. Document skeleton (fixed order, no exceptions)

```
┌─ HEADER ────────────────────────────────────────────────────────┐
│  Client name · eyebrow · meta row (period / account / type)      │
├─ EXECUTIVE SUMMARY ─────────────────────────────────────────────┤
│  Diagnosis headline · 2-3 paragraphs · "Do first" box            │
├─ KPI SCORECARDS ────────────────────────────────────────────────┤
│  6 cards: value + delta + caption                                 │
├─ LEGEND ────────────────────────────────────────────────────────┤
│  Broken / Review / Pass · HIGH / MED / LOW                        │
├─ §01  Conversion Tracking          ← always first, always HIGH   │
├─ §02  [next section by $ impact]                                  │
├─ §03  …                                                           │
│  … ordered by dollar impact, HIGH → MED → LOW                   │
├─ ✓   What's Set Up Right                                         │
├─ →   Action Plan                                                  │
└─ FOOTER / METHODOLOGY ─────────────────────────────────────────┘
```

---

## 2. Fixed blocks

### HEADER

```
eyebrow       "Google Ads Account Audit"  — IBM Plex Mono, --eyebrow-color
h1            Client / account name       — Bricolage 800
sub           Business description (1 line)
badge         "Google Ads"                — IBM Plex Mono pill
meta row      Period · Account ID · Campaign type · Markets · Audit date · Currency
```

Data source: user-provided + `list_accounts` for the Account ID.

---

### EXECUTIVE SUMMARY

**Purpose:** give the reader the verdict in 30 seconds without reading the sections.

**Structure:**
```
<span class="tag">Executive summary</span>
<h3>  [diagnosis headline]  </h3>
<p>   [paragraph 1: what the top-line looks like + why it may be misleading]  </p>
<p>   [paragraph 2: where the money leaks — name campaigns/keywords/numbers]  </p>
<p>   [paragraph 3: what IS working]  </p>
<div class="do">  <b>Do first:</b> [3 actions, each < 20 words, each → §N]  </div>
```

**Writing rules:**
- Headline: name the biggest number + the surprise. Never "results were mixed."
  - ✓ "$2,657 spent. 3 leads. CPL nearly doubled — Glenview is the culprit."
  - ✗ "The account shows both strengths and areas for improvement."
- Every sentence in paragraphs 1–3 contains at least one number or a named campaign/keyword/page.
- "Do first" = the 3 actions that address the most money if done this week. Reference sections.
- Written AFTER all sections are drafted — it synthesizes, it doesn't speculate.

**Data source:** synthesized from all skill outputs after they run.

---

### KPI SCORECARDS

6 cards, always this set:

| # | Metric | Derivation |
|---|--------|-----------|
| 1 | Spend (period) | sum of campaign spend |
| 2 | Conversions | sum of primary conversions |
| 3 | CPA or ROAS | whichever is the primary optimization goal |
| 4 | Clicks | sum |
| 5 | One account-specific concern metric (e.g. Impression Share, Conversion Value, CPL) | determined by campaign type |
| 6 | One trend or signal metric (e.g. Value/conversion, Zero-conv spend %, IS Budget Lost) | most revealing for this account |

Each card: `value + delta (▲/▼ vs prior period) + caption (1-line context)`.

Delta direction: `d-good` (green) if improvement, `d-bad` (pink) if decline, `d-flat` (muted) if neutral.
Caption explains the delta — never just repeats it.
- ✓ "April CPL was $447 · nearly doubled"
- ✗ "+$439 increase vs prior period"

**Data source:** `financial-overview` + `funnel-metrics`

---

### LEGEND

Always immediately before the first section. Never skip.

```html
<div class="legend">
  <span class="chip c-broken">Broken</span> Active problem costing money now
  <span class="chip c-review">Review</span> Flag — verify or monitor before acting
  <span class="chip c-ok">Pass</span>    Working correctly — no action needed
  <span class="sev sev-h">HIGH</span>   Largest money at stake
  <span class="sev sev-m">MED</span>    Real impact, lower urgency
  <span class="sev sev-l">LOW</span>    Housekeeping / optimize when ready
</div>
```

---

## 3. Section anatomy (every section)

```html
<div class="section" id="[slug]">

  <!-- A. Section header — always present -->
  <div class="section-head">
    <span class="section-num">§N</span>        <!-- IBM Plex Mono, --eyebrow-color -->
    <h2>[Title]</h2>                             <!-- Bricolage 700 -->
    <span class="chip c-broken|c-review|c-ok|c-na">[Verdict]</span>
    <span class="sev sev-h|sev-m|sev-l">[HIGH|MED|LOW]</span>
  </div>

  <!-- B. Lead paragraph — always present -->
  <p class="lead">
    <b>[The single most important finding in bold — must include a number.]</b>
    [Supporting context in the same or next sentence.]
  </p>

  <!-- C. Data table — present in almost all sections -->
  <div class="tablewrap"><table>
    <thead><tr>...</tr></thead>
    <tbody>
      <!-- Each row: the item + evidence + metrics + verdict chip + recommendation -->
    </tbody>
  </table></div>

  <!-- D. Callouts — 0 to 3, in this order: Fix → Watch → Note → Resolved -->
  <div class="callout co-fix"><span class="ico">Fix</span>
    <div class="ct"><b>[Action title]</b> [Where · What · Why]</div></div>

  <div class="callout co-watch"><span class="ico">Watch</span>
    <div class="ct">...</div></div>

  <div class="callout co-info"><span class="ico">Note</span>
    <div class="ct">...</div></div>

  <!-- E. Bridge — present on HIGH and MED sections, omit on LOW -->
  <p class="sec-bridge">[One sentence connecting this finding to the next section.]</p>

</div>
```

---

## 4. Language rules — plain English + term chips

The audit has two audiences in the same document: the **client** (reads title, lead, callouts) and the **account manager** (reads the table to execute). Write for both without dumbing down either.

### Rules

| Block | Write for | Language rule |
|-------|-----------|---------------|
| `h2` section title | Client | Business question, not tool name. Add `<span class="term">ToolName</span>` after the question. |
| `p.lead` | Client | Open with the business consequence (money / leads lost). Jargon goes inside `<span class="term">` when it appears. No raw acronyms in the first sentence. |
| Table content | Account manager | Technical language is fine — this is the execution instruction. |
| Callout `Why:` | Both | Plain language. Technical term in `<span class="term">` if needed. |
| Callout `Where: / What:` | Account manager | Full technical path — UI navigation, exact setting names. |

### Section title pattern

```html
<h2>Business question in plain language? <span class="term">Technical Name</span></h2>
```

Examples:
- ✓ `Are we counting leads correctly? <span class="term">Conversion Tracking</span>`
- ✓ `Are we bidding the right amount per lead? <span class="term">Bid Strategy</span>`
- ✓ `Are our ads relevant to what people search? <span class="term">Quality Score</span>`
- ✗ `Conversion Tracking` (tool name only — client doesn't know what this means)

### Term chip — `.term`

Used inline in titles, leads, and callout text to surface the technical name without breaking the plain-language flow.

```html
<span class="term">tCPA</span>
<span class="term">Primary Conversion</span>
<span class="term">Search Partners</span>
```

Styling: neutral pill (`--chip-bg` / `--chip-text`) — same token as `c-na` chips but smaller. Never colored like verdict chips — it's a label, not a status.

### Lead paragraph pattern

```
[Bold sentence: business consequence with a number.]
[Plain explanation of what caused it, with <span class="term"> wrapping the jargon.]
```

Examples:
- ✓ `The account thinks it got 214 leads this quarter. The real number is 28. The other 186 were people who just visited the homepage — because <span class="term">Page View</span> is set as the main goal instead of the contact form.`
- ✗ `87% of recorded conversions are Page View events with no value attached.` (pure jargon, no business translation)

---

## 5. Callout rules

### When to use each type

| Type | Class | Use when | Max per section |
|------|-------|---------|-----------------|
| **Fix** | `co-fix` | There is one specific action to take now — name exactly where + what + expected outcome | 1 |
| **Watch** | `co-watch` | Signal is real but volume too low or timing not right to act yet | 1–2 |
| **Note** | `co-info` | Data caveat (connector gap, low sample), context that changes how to read the table | 1–2 |
| **Resolved** | `co-win` | Correcting a prior version of the audit, or confirming a fix already implemented | 1 |

### Callout ordering within a section
Always: Fix first → Watch → Note → Resolved (if present).
Never put Note before Fix — caveats come after the action, not before.

### When to omit callouts entirely
- Section verdict is **Pass** and data is clean — no callout needed.
- Data table already makes the point clearly — don't add a Note that repeats it.
- **LOW** severity sections with a complete data table can have zero callouts.

### "Where · What · Why" format for Fix and Watch bodies
- **Where:** the exact location — Google Ads UI path, URL, or account element.
- **What:** the specific change. No vague "optimize" or "improve."
- **Why:** the dollar consequence or quality reason.
- ✓ "**Where:** Glenview campaign → Keywords. **What:** Pause 'medical concierge services near me' (BROAD) or convert to EXACT. **Why:** This single keyword drove $401 into hospital-brand and off-vertical searches with zero conversions."
- ✗ "The broad match keyword needs to be reviewed for relevance."

---

## 5. Data table patterns per section

### Table column conventions

| Column type | Alignment | Font | When |
|-------------|-----------|------|------|
| Item name (campaign / keyword / term / page) | left | Hanken 400 | Always col 1 |
| Evidence label (sub-text under item) | left, smaller, muted | Hanken 400 | Inside `<span class="ev">` under item name |
| Metric values (spend / conv / CPA / IS) | right | IBM Plex Mono `.num` | All numeric cols |
| State / verdict chip | center | IBM Plex Mono `.state` | Penultimate col |
| Recommendation | left | Hanken 400 `.rec` | Last col — `<b>Where/What:</b>` |

### State chip classes (inside `.state`)
```
s-ok      green      Working, keep
s-raise   green+     Bid up / scale
s-review  amber      Monitor
s-flag    amber      Flag for action
s-broken  red        Active problem
s-cut     red        Negative / pause / remove
```

---

## 6. Section content models + skill mapping

### §01 · Conversion Tracking
**Verdict logic:** Broken if primary actions include page views / app starts / $0-value actions feeding value bidding. Pass if only down-funnel actions are primary with values attached.

**Skill:** `measurement/conversion-tracking`
**Data needed from skill:**
- List of all enabled conversion actions: name, type (`WEBPAGE`, `UPLOAD_CLICKS`, `UNIVERSAL_ANALYTICS_GOAL`), primary/secondary, value, 30-day conversion count
- Offline/CRM import present? (look for `UPLOAD_CLICKS` actions)

**Table columns:** What we checked · State · Evidence · Recommendation (Where · What · Why)

**Rows to always include:**
1. Offline / CRM import in place?
2. Are primary conversions down-funnel?
3. Are deprecated UA goals still enabled?
4. Do primary actions carry a value?

**Callout rules:**
- Fix: if primary actions are shallow (page views / app starts) — "one change fixes most of this"
- Note: if total conversions < 50 in the period — "low-volume caveat, patterns are directional"

**Bridge:** → connects to bid strategy (a noisy signal corrupts targets)

---

### §· Spend Allocation & Impression Share
**Verdict logic:** Broken if a campaign takes >20% of spend with zero conversions. Review if any campaign is significantly budget-capped while efficient.

**Skills:** `campaigns/spend-allocation`, `campaigns/impression-share`
**Data needed:**
- Per-campaign: spend, prior spend, conversions, prior conversions, CPA, IS earned, IS lost to budget, IS lost to rank, status
- Account total row

**Table columns:** Campaign · Period spend · Prior spend · Conv · Prior conv · CPA · IS · Budget lost IS · Rank lost IS · Status

**State chips:** `s-raise` (efficient + capped), `s-broken` (zero conv), `s-review` (monitor), `s-cut` (consistently poor)

**Callouts:**
- Fix: if one campaign dominates spend and has zero conversions — name the campaign, the amount, and what to do
- Watch: if a good campaign has >40% lost-to-budget — "raise budget once X is resolved"
- Info: if there's an unexpected absence (paused campaign with no explanation)

**Bridge:** → connects to bid strategy or quality score (rank-loss → quality)

---

### §· Bid Strategy
**Verdict logic:** OK if targets are set near actual performance. Broken if targets are wildly misaligned (>2× gap) or if $0-value actions feed value-based bidding.

**Skill:** `campaigns/bid-strategy`, `campaigns/value-based-bidding`
**Data needed:**
- Per campaign: strategy type, target (tCPA or tROAS), actual CPA/ROAS last 30d, daily budget
- Pull targets via `campaign.list` directly — NOT from query_data performance fields (known artifact: budget fields return wrong values when mixed with metrics)

**Table columns:** Campaign · Strategy · Target · Actual (30d) · State · Recommendation

**Callouts:**
- Fix: if target is >2× above actual (underbidding) or >50% below actual (overbidding)
- Resolved: if correcting a prior audit version where targets appeared wrong due to a connector bug

---

### §· Quality Score
**Verdict logic:** Review if any top-spend keyword (>5% of total spend) is Below Average on Ad Relevance or Expected CTR. Pass if all are Average or above.

**Skill:** `ads/metrics`
**Data needed:**
- Per keyword: keyword text, match type, campaign, 90d spend, Ad Relevance, Expected CTR, Landing Page Experience (categorical only — never numeric QS)
- Filter to keywords with spend > threshold (e.g. >$500 in 90d, or top 20 by spend)

**Table columns:** Keyword (match type) · Spend · Ad Relevance · Exp. CTR · Landing Exp. · Recommendation

**Callout rules:**
- No Fix callout for QS — QS is a diagnostic, not a direct action. Actions go to the sections that fix it (ad group structure → bid strategy, landing → CRO section).
- Info: explain why numeric QS is excluded ("sums across ad groups, meaningless above 10")
- Watch: if a large group of keywords has no QS data (broad match, PENDING) — note the risk

**Bridge:** → connects to budget allocation (rank loss from poor QS caps IS)

---

### §· Budget Allocation (deep-dive when needed)
Used when there are 5+ campaigns with mixed efficiency — breaks out the spend/IS analysis into a dedicated reallocation section separate from the basic spend table.

**Skills:** `campaigns/spend-allocation`, `campaigns/impression-share`

**Table columns:** Campaign · Spend · Efficiency (90d) · Lost to budget · Lost to rank · State · Move

**State logic:**
- Raise = below account avg CPA + lost >40% to budget
- Fix first = above account avg CPA, or losing more to rank than budget
- Fine = efficient, uncapped

**Callout:** Win/Resolved callout summarizing the net reallocation move.

---

### §· Landing Page CRO
**Verdict logic:** Broken if there is a clear message-match break (campaign sends clicks to a page about a different product/service). Review if CTA or value prop is weak.

**Skills:** `ads/landing-cro`, `ads/alignment`
**Data needed:**
- Live scrape of each unique final URL in the account (via `tool:porter-tools:scrape`)
- 5 criteria per page: C1 Value Prop · C2 CTA · C3 Differentiation · C4 Proof · C5 Form Friction
- Each criterion: Pass / Partial / Fail + 1-line evidence

**Table columns:** Page URL · C1 Value Prop · C2 CTA · C3 Differentiation · C4 Proof · C5 Form Friction · Verdict

**Evidence sub-text:** inside `<span class="ev">` under each criterion — quote the exact text from the page.

**Callouts:**
- Fix: the single most damaging CRO issue (usually: wrong page for the campaign, or broken CTA link)
- Watch: something that isn't broken but may hurt conversion rate (JS rendering, missing social proof)

---

### §· Search Terms & Negatives
**Verdict logic:** Broken if >15% of non-brand spend drove zero conversions and includes clearly off-vertical queries. Review if the waste is structural (broad match) but terms aren't egregiously off-topic.

**Skills:** `search-terms/performance`, `search-terms/n-grams`, `search-terms/classifier/branded`
**Data needed:**
- Top waste terms by spend (zero or near-zero conv, clear negative candidates): term, campaign, matched keyword, match type, spend, conversions, classification label
- n-gram bucket summary: which 1/2/3-gram patterns concentrate the waste, total $ per bucket
- Brand / competitor / off-vertical classification for flagged terms

**Table columns:** Search Term · Campaign · Matched Keyword · Match Type · Spend · Conv · Verdict · Recommended Action

**Evidence sub-text:** classification label under the term name (e.g. "Competitor brand", "Off-vertical — wrong service", "Correct intent — confirmed converter")

**Verdict chips per row:** `s-cut` (Negative), `s-review` (Diagnose first), `s-ok` (Keep & grow), `s-raise` (Protect)

**Callouts:**
- Fix: the single biggest waste pattern (usually a broad match keyword) — name keyword, spend, example queries it triggered, and the fix
- Info: "Zero-conversion ≠ automatic negative. Relevant terms need more data before pattern emerges."
- Note: if conversion signal is noisy (§01 finding) — warn that zero-conv terms may be under-counted

---

### §· Audience & Demographics
**Verdict logic:** Review if any age/gender segment runs at >20% worse CPA/ROAS than account average AND takes >10% of spend.

**Skill:** `segmentation/audience/demographics-audit`
**Data needed:**
- Per age segment: spend, conversions, CPA, ROAS, state vs account average
- Flag "Undetermined" bucket separately — it's always large and always needs a bid-down, not an exclude

**Table columns:** Age segment (90d) · Spend · CPA · ROAS · State · Recommendation

**State logic:**
- Raise = CPA < 80% of avg AND spend > $5K
- Keep = within ±20% of avg
- Bid down = CPA > 120% of avg, meaningful spend
- Watch = borderline, or small spend

**Callout:**
- Watch: "Add audiences in Observation mode on non-brand Search campaigns — costs nothing, unlocks bid adjustments later."
- Note: if income / parental-status segments aren't available ("not exposed by connector")

---

### §· Geography
**Verdict logic:** Review if any geo takes >5% of spend at ROAS < 0.7× (or CPA > 150%) of account average.

**Skill:** `segmentation/audience/geography`
**Data needed:** Per region/province/city: spend, conversions, CPA, ROAS, state

**Table columns:** Region/Province · Spend · Conv · CPA · ROAS · State · Recommendation

**Known gap:** Porter has no Canada atlas — use bar-based table, not geo bubble. Note this if account is Canadian.

**Callout:** Fix only if there's a clear language/market mismatch (e.g. English ads in French Quebec).

---

### §· Ad Assets (RSA Copy)
**Verdict logic:** Review (not Broken) — even missing assets are low-severity unless all assets are PENDING or sitelinks are definitely absent.

**Skills:** `ads/copy`, `ads/assets`
**Data needed:**
- RSA asset labels per ad group: PENDING / GOOD / LOW / BEST (Google's labels)
- Extensions present: sitelinks, callouts, snippets, images — returned as present/blank

**Table columns:** Extension · State · Evidence · Action

**Known gap:** sitelinks / snippets / images often return blank from Porter connector.
Rule: never report them as absent — report as "Verify in Google Ads UI." Flag the gap in the callout, not the verdict.

**Callouts:**
- Fix: only if there is a confirmed structural problem (wrong ad/landing page for an ad group — a message-match issue surfaced by `ads/alignment`)
- Watch: if all RSA assets are PENDING ("resolve in 4–6 weeks; then prune Low, pin Best")
- Info: data note about the connector gap on sitelinks/snippets/images

---

### §· Device & Ad Schedule
**Verdict logic:** Review if desktop and mobile CPA differ by >30% AND mobile takes >50% of spend. Watch (not broken) for day-of-week patterns unless conversion volume justifies adjustment.

**Skills:** `segmentation/audience/devices`, `segmentation/time/cyclical`
**Data needed:**
- Per device: spend, CVR, CPA, ROAS, state
- Per day-of-week: spend, clicks, impressions, conversions, signal

**Two sub-tables in one section:**

Sub-table 1 — Device: Device · Spend · CVR · CPA · ROAS · State · Recommendation
Sub-table 2 — Day of week: Day · Spend · Clicks · Impressions · Conversions · Signal

**Volume floor rule:** don't recommend bid adjustments if < 30 conversions per device in the period. Say so explicitly: "low-confidence signal — monitor before acting."

**Callouts:**
- Watch: device efficiency gap (positive bid on desktop / trim mobile — but only if volume floor is met)
- Watch: day-of-week pattern (e.g. "weekends run ~23% worse — modest negative bid adjustment or dayparting recovers efficiency")
- Note: if conversions < 30 per device, state the caveat

---

### §· Campaign Settings
**Verdict logic:** Pass or Broken — these are binary checks. One Broken setting = whole section Broken.

**Skill:** `campaigns/campaign-settings`
**Data needed (pass/fail per campaign):**
- Location targeting = Presence (not "presence or interest")?
- Search Partners = OFF on Search campaigns?
- Display Network = OFF on Search campaigns?

**Table columns:** Setting · State · Campaigns affected · Recommendation

**No callouts needed for Pass.** For Broken: one Fix callout naming the exact setting and campaign.

---

### §· Demand Gen *(only if DG campaigns exist)*
**Verdict logic:** Review if DG CPA > account Search average. Trim/Broken if CPA >50% above average with low ROAS.

**Skill:** `campaigns/demand-gen`
**Data needed:** Per DG campaign: spend, conversions, CPA, ROAS, state vs non-brand Search baseline

**Table columns:** Campaign · Spend · Conv · CPA · ROAS · State · Recommendation

**Known gap:** asset-group detail not available via Porter connector. Always note: "Review creatives/audiences in Google Ads UI → Demand Gen campaign → Asset groups."

---

## 7. What's Set Up Right

**Purpose:** always end with positives — what the team built correctly. Never skip.

**Rules:**
- 4–6 cards only. Don't inflate with generic praise.
- Every card must be confirmed by data from the audit skills — not assumed.
- Title: starts with a checkmark `✓` — short noun phrase.
- Body: 1–2 sentences of specific evidence.

**Common confirmed positives to look for:**
- Location targeting = Presence (from `campaign-settings`)
- Search Partners + Display Network off (from `campaign-settings`)
- Offline/CRM import active (from `conversion-tracking`)
- Landing pages strong (from `landing-cro` scores)
- 100% Search campaigns (from campaign fingerprint — no wasteful channel mixing)
- Brand campaign efficiency (from `search-terms/classifier/branded`)

---

## 8. Action Plan

**Purpose:** everything the client needs to do, ranked by dollar impact. The busy reader stops here.

**Rules:**
- Maximum 7 items. Fold LOW-severity housekeeping into one final "Quick wins" item.
- Order: strictly by $ at stake — not by section order.
- Each item must reference its section (`§N`) so the client can read more.
- Time estimates are honest: "Est. 30 mins in Google Ads" or "Est. 2–4 hrs."
- No vague verbs: "review," "consider," "look into." Every item is: do X to Y in Z tool.

**Item structure:**
```html
<div class="item">
  <div class="rank"></div>      <!-- CSS counter: 01, 02, 03... -->
  <div class="tc">
    <div class="tt">[Imperative title — verb + object + context]</div>
    <div class="td">[2–3 sentences: exactly what to do, where, expected outcome]</div>
    <span class="tmeta">§N · HIGH|MED|LOW · Est. [time] in [tool]</span>
  </div>
</div>
```

---

## 9. Footer / Methodology

Always include. Covers:
1. Data source: "Data pulled live from Google Ads API via Porter Metrics MCP on [date]."
2. Period and comparison window.
3. What was excluded and why (QS numeric, auction insights, asset groups if DG, any reauth failures).
4. Conversion volume caveat if < 50 conversions in the period.
5. Currency (especially for non-USD accounts).

---

## 10. Section block profiles

Each section has a fixed set of blocks. `✓` = always present · `?` = conditional · `–` = never.

| Section | Lead | Table type | Fix | Watch | Note | Resolved | Bridge |
|---------|------|-----------|-----|-------|------|----------|--------|
| **Header** | – | – | – | – | – | – | – |
| **Exec Summary** | paragraphs + "Do first" | – | – | – | – | – | – |
| **KPI Scorecards** | – | scorecard-grid (6 cards) | – | – | – | – | – |
| **Legend** | – | chip-legend | – | – | – | – | – |
| §01 Conversion Tracking | ✓ | evidence-table (4 rows: check · state · evidence · rec) | ✓ | – | ? | – | ✓ |
| §· Spend Allocation | ✓ | campaign-table (spend · conv · CPA · IS · status) | ✓ | ? | ? | – | ✓ |
| §· Bid Strategy | ✓ | campaign-table (strategy · target · actual · state · rec) | ? | – | – | ? | ✓ |
| §· Quality Score | ✓ | keyword-table (spend · 3 pillars · rec) | – | ? | ✓ | – | ✓ |
| §· Search Terms | ✓ | term-table (term · campaign · keyword · match · spend · conv · verdict · action) | ✓ | – | ✓ | – | – |
| §· Landing Page CRO | ✓ | page-table (URL · C1–C5 criteria · verdict) | ✓ | ? | – | – | – |
| §· Audience & Demographics | ✓ | segment-table (age · spend · CPA · ROAS · state · rec) | – | ✓ | ? | – | – |
| §· Geography | ✓ | geo-table (region · spend · conv · CPA · ROAS · state · rec) | ? | – | ? | – | – |
| §· Ad Assets | ✓ | extension-table (extension · state · evidence · action) | ? | ? | ✓ | – | – |
| §· Device & Ad Schedule | ✓ | **dual-table**: device-table + dayofweek-table | – | ✓ | ? | – | – |
| §· Campaign Settings | ✓ | checklist-table (setting · state · campaigns · rec) | ? | – | – | – | – |
| §· Demand Gen *(if present)* | ✓ | campaign-table (spend · conv · CPA · ROAS vs baseline · rec) | – | – | ✓ | – | – |
| **What's Set Up Right** | – | passcard-grid (4–6 cards) | – | – | – | – | – |
| **Action Plan** | – | ranked-items (max 7) | – | – | – | – | – |
| **Footer** | – | text-only | – | – | – | – | – |

### Table types

| Type | When | Rows describe |
|------|------|--------------|
| `evidence-table` | Conversion tracking — structured pass/fail checks | One check per row |
| `campaign-table` | Campaign-level sections (spend, bid strategy, demand gen) | One campaign per row |
| `keyword-table` | QS, match types | One keyword per row |
| `term-table` | Search terms | One search term per row |
| `page-table` | Landing CRO | One unique landing page per row |
| `segment-table` | Demographics, geography | One audience segment or geo per row |
| `extension-table` | Ad assets | One extension type per row |
| `checklist-table` | Campaign settings | One setting per row |
| `dual-table` | Device & Ad Schedule | Two sub-tables inside one section (device rows, then day-of-week rows) |
| `scorecard-grid` | KPI block | 6 cards in a grid (not a `<table>`) |
| `passcard-grid` | What's Set Up Right | 4–6 cards in a grid (not a `<table>`) |
| `ranked-items` | Action Plan | Numbered items with title + detail + meta (not a `<table>`) |

### Conditional rules for Fix callout

Fix callouts are not always present. This table defines when they fire:

| Section | Fire Fix when… |
|---------|----------------|
| Conversion Tracking | Primary conversions include page views, app starts, or $0-value actions |
| Spend Allocation | One campaign takes >20% of spend with zero conversions |
| Bid Strategy | Target is >2× above actual (underbidding) or >50% below actual (overbidding) |
| Search Terms | >15% of non-brand spend is off-vertical or competitor waste |
| Landing CRO | Message-match break confirmed (keyword vs landing page mismatch), or broken CTA link |
| Geography | Language/market mismatch confirmed (e.g. English ads in French Quebec) |
| Ad Assets | Confirmed structural message-match issue (from `ads/alignment`) |
| Campaign Settings | Any setting is Broken (Presence off, Search Partners on, Display on for Search) |

---

## 11. Section ordering decision tree

```
1. Always start with §01 Conversion Tracking.

2. Score remaining sections:
   HIGH  → $ impact > 15% of total spend
   MED   → real impact, < 15% of spend
   LOW   → structural / housekeeping

3. Within HIGH: order by spend at risk (highest first).
4. Within MED: order by spend at risk.
5. Within LOW: campaign settings → ad assets → device/ad schedule → demand gen (if present).

6. If a section has N/A verdict (connector gap, reauth failure):
   → include it at the end of its severity tier
   → use c-na chip and "Limited Data" label
   → keep it brief: explain what couldn't be pulled and where to find it manually

7. Never omit a section entirely just because data is unavailable.
   A section with "could not be pulled" is still useful (tells the client to check manually).
```
