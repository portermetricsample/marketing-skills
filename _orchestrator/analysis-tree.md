# Analysis tree — the complete hierarchy (format-independent)

The orchestrator's **core**: *what* gets analyzed, in *what order*, reusing *which* metrics. It is
**independent of format** — the executive report renders it as a vertical document, slides compress
it, an alert fires one node. Every format is a projection of this one tree.

## Principle 1 — one metric set, re-cut at every node

The **reference metrics** are declared once at the top (Intro + Funnel). **Every breakdown re-cuts
those same metrics by a criterion — it never introduces new ones.** Inside any node, order the
metrics by priority:

1. **Money first** — spend · conversions · conversion value · CPA · ROAS · AOV (`financial-overview`).
2. **Then performance, down the funnel** — Conversion → Engagement → Visibility (`funnel-metrics`).

Every movement names its driver from [`metric-relationships.md`](../_framework/metric-relationships.md)
(the funnel identity), and is written in the voice of [`writing.md`](../_framework/writing.md).

## Principle 2 — the hierarchy mirrors the account, broad → fine

Disclose the broadest lever first (product), then descend to the finest (search term). Which nodes
exist is decoded by [`account-structure/structure-map`](../google-ads/account-structure/)
(naming → dimensions). The depth knob trims; the **order** never changes.

## Principle 3 — relevance decides what survives (the materiality gate)

Principle 2 says the depth knob "trims" but not **by what**. This is the rule: a section earns its
place by **money impact**, not by the template and not by a bare percentage. The text is relevant when
the *selection* is right — not when the prose is pretty. (Expression — no filler inside a kept block —
is the voice's job, [`writing.md`](../_framework/writing.md). This principle is **selection**.)

**The trap: measuring relevance by percentage.** A +40% swing on a campaign that spends $50 is noise;
a +3% swing on the campaign that takes 70% of the budget is real money. **Weight materiality by
dollars, not by %.**

**The gate — every candidate node / finding must pass all three:**

1. **Material?** Did it move the result in **money**, or cross a **target / benchmark**? (not a bare %)
2. **Decision-changing?** Does knowing it change what the owner does or thinks? (aspirin, not vitamin)
3. **Explained?** Can its driver be named from the arithmetic
   ([`metric-relationships.md`](../_framework/metric-relationships.md)), or does it point to the node
   that explains it? (no orphan findings)

**What each verdict produces:**

| Verdict | Result in the outline |
|---------|----------------------|
| Passes all 3 | **Full block** — heading + answer + cause + bridge |
| Material but not yet actionable | **One line + bridge** to the node that explains it |
| Fails | **Omit**, or roll into a single *"everything else held steady"* line |

**Two structural consequences:**

- **Order by money within each level.** Principle 2 fixes the *spine* order (product → campaign →
  keyword); inside each node, lead with the **biggest dollar mover**. The synthesis opener leads with
  the biggest mover *wherever it sits in the tree* — this extends that emphasis down the body.
- **Depth = decompose-on-surprise.** Descend into a node's children **only where the parent moved and
  a child explains it**. Revenue flat because everything's flat → stop, don't decompose. Follow the
  anomaly, not the full tree.

**Safety rule — relevance is not "only alarms."** The top-line verdict is **always** stated, even when
flat (one line). For the person who pays, *"nothing needs touching this month"* is a relevant finding.
Don't let the gate produce an all-alarms report that buries the all-clear.

## The tree

```
1. Intro — financial / business metrics        → financial-overview
2. Funnel metrics (Conversion→Engagement→Visibility) → funnel-metrics

3. Breakdowns  (each re-cuts the metrics from 1+2, money-first)
   ├─ Product / business line                  → structure-map (naming → product) · P&L view = compose ⬜  (ecommerce/Shopping only; lead-gen skips)
   ├─ Campaigns
   │   ├─ Campaign type (Search/PMax/Shopping/Demand Gen/Display/Video/App)  → fingerprint; gates what's reportable*
   │   ├─ Ad groups (hygiene + concentration)  → structure-audit · ad-group concentration: spend-allocation §3b (C6)
   │   ├─ Bidding strategy                      → bid-strategy + value-based-bidding
   │   ├─ Settings / objectives                 → campaigns/campaign-settings
   │   ├─ Spend allocation                      → campaigns/spend-allocation
   │   ├─ Ad schedule (day/hour efficiency)     → campaigns/ad-schedule
   │   ├─ Demand Gen audit                      → campaigns/demand-gen
   │   └─ Competitive — Auction Insights + IS   → IS budget-vs-rank: campaigns/impression-share · Auction Insights competitor overlap ⬜ (not exposed)
   ├─ Keywords & search terms
   │   ├─ Match type / keyword conversion       → search-terms/match-types (directional when conversions blend)
   │   ├─ Search term relevance + landing align → ads/alignment + ads/metrics · search-terms/classifier/relevance
   │   ├─ Landing CRO (does the page convert?)  → ads/landing-cro
   │   ├─ Term routing / cannibalization        → search-terms/classifier/duplicates
   │   ├─ Brand / competitor classification     → search-terms/classifier/branded
   │   ├─ N-gram mining (waste + themes)         → search-terms/n-grams
   │   ├─ Search term performance               → search-terms/performance
   │   ├─ Intent discovery (new terms)          → search-terms/classifier/opportunity
   │   ├─ Multi-label per term (all tags at once)→ search-terms/classifier (composes branded + relevance + duplicates + opportunity)
   │   ├─ Quality & negatives                   → QS: ads/metrics · negatives: search-terms/classifier/relevance + classifier/duplicates (reuse, no own folder)
   │   └─ Brand vs non-brand split              → search-terms/classifier/branded (brand term list required)
   ├─ Ads & assets
   │   ├─ Asset QA                              → ads/assets
   │   └─ Ad performance (RSA copy strength)    → ads/copy · deeper per-ad metrics ⬜ partial
   ├─ Audiences
   │   ├─ Demographics / geography / device     → segmentation/audience/*
   │   ├─ Placement / network (Mobile · Feed · Search partners · YouTube · Display)  → ⬜ gap (device only today)
   │   └─ Audience QA                           → segmentation/audience/demographics-audit
   ├─ Conversion tracking                       → measurement/conversion-tracking (emits primaryCount → gates segment efficiency)
   ├─ UTM / tagging hygiene                      → measurement/utm-tracking
   └─ Time / trends (orthogonal)                → segmentation/time

4. Actions — rollup of topFixes across all nodes, ranked by $
```

\* **Campaign type gates reportability.** PMax & Demand Gen expose **no keywords/search terms** →
skip the Keywords node for those campaigns; Shopping reports by product, Video by placement. Read the
type fingerprint first (`google_ads_campaign_advertising_channel_type`).

## Gaps this tree surfaces (skills to build)

| Gap | Where | Note |
|-----|-------|------|
| **Impression Share (budget vs rank)** | Campaigns → Competitive | ✅ **built** → `campaigns/impression-share`. *Still gap:* Auction Insights competitor overlap/outranking (not exposed by the connector) |
| **Ads performance** | Ads & assets | 🟡 **partial** → `ads/copy` (RSA strength + copy diversity); deeper per-ad metrics still thin |
| **Placement / network** | Audiences | `segmentation/audience/devices` covers device; network/placement (Feed, Search partners, YouTube) not yet |
| **Ad-group performance** | Campaigns → Ad groups | ✅ **built** → `spend-allocation` §3b (C6) concentration + efficiency; `structure-audit` still owns hygiene |
| **Product P&L view** | Product | detection exists (`structure-map`); the metrics-by-line view is a composition, **not a new skill**. Product only appears on ecommerce / Shopping accounts — lead-gen accounts skip this node entirely. |
| **naming-convention** | (cross) | ⬜ generates conventions; doesn't block the report |
| **Match type analysis** | Keywords | ✅ **built** → `account-audit/match-types` (concentration + efficiency, directional when conversions blend) |
| **Brand vs non-brand split** | Keywords / Foundation | ✅ **built** → `search-terms/classifier/branded` (brand + competitor + generic classification + leak detection; needs the brand term list) |
| **UTM / tagging hygiene** | Conversion tracking | ✅ **built** → `account-audit/utm-tracking` |
