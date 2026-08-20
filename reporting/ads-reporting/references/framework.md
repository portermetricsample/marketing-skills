# Framework — SUMAS applied to paid media

The reusable brain of `ads-reporting`. The rule of SUMAS: **use fewer metrics, not
more, and never show a number without a comparison.** Full framework: [`../sumas/`](../../sumas/).

---

## 1 · Strategy — the one question that shapes the report

Report the conversion metric that matches how the business makes money:

| Business type | Conversion metrics to report | AOV/value field |
|---|---|---|
| **E-commerce** | Purchases, Revenue, **ROAS**, AOV | AOV = Revenue / Purchases |
| **Lead-gen / B2B** | Leads (or MQLs/SQLs), **CPA**, cost per lead | — (value often outside the ad platform) |

If the business is B2B with a long sales cycle, flag that platform-reported
conversions understate reality (they miss deals that close after the attribution
window). Don't present platform ROAS as the whole truth there.

---

## 2 · Metrics — the paid funnel spine (per channel)

Organize every metric into the three funnel levels. These are the **base counts** to
pull; rates are computed in step 3.

| Level | Meta Ads | Google Ads | TikTok | LinkedIn | Shopify (outcome) |
|---|---|---|---|---|---|
| **Visibility** | Impressions, Reach | Impressions, Impr. share | Impressions, Reach | Impressions | Sessions |
| **Engagement** | Clicks, ThruPlays | Clicks | Clicks, Video views | Clicks, Reactions | Add-to-cart |
| **Conversion** | Purchases/Leads, Value | Conversions, Conv. value | Conversions | Leads | Orders, Revenue |
| **Cost** | Spend | Cost | Spend | Spend | — |

Discover the exact field names per connector at runtime with `list_fields` — do not
hardcode field names blindly; connectors evolve.

---

## 3 · Add context — counts → rates, always compared

For every base count, compute its rate and **compare vs the previous period and vs the
goal**. Compute rates from the base counts yourself; don't trust account-total rate
fields (several connectors return a broken rate at the total aggregate).

| Rate | Formula |
|---|---|
| CTR | Clicks / Impressions |
| CPC | Cost / Clicks |
| CPM | Cost / Impressions × 1000 |
| CVR (conv. rate) | Conversions / Clicks |
| CPA | Cost / Conversions |
| ROAS | Conversion value / Cost |
| AOV | Revenue / Orders |
| Frequency | Impressions / Reach |

Every metric in the report carries a delta: **▲/▼ vs previous period** and, where a
target exists, **vs goal**. A metric with no comparison does not go in the report.

---

## 4 · Segment — break the blended average (STP)

Never report only the account total; it hides where the money works. Drill in this order:

**Channel → Campaign → Audience/Placement → Creative.**

The most useful cross-channel view is a single table: one row per **channel**, columns
= Spend · Conversions · CPA (or ROAS) · Δ vs previous. That one blended table is the
report's payoff — it's what today takes five Ads Managers and a spreadsheet to make.

---

## Connector traps (verified — don't get burned)

- **Google Ads `cost_micros` is already in currency** on the Porter MCP — it is NOT
  micros. Never divide by 1e6, or you'll report costs 1,000,000× too small.
- **Google Ads campaign budget field** ≠ spend: `campaign_budget_amount_micros`
  returns wrong totals when combined with performance metrics — report actual `cost`.
- **Shopify attribution** ≠ platform attribution: Shopify's `utm_medium` is often blank
  and it credits last-click, so Shopify revenue won't match Meta/Google in-platform
  ROAS. State which attribution the number uses; never silently mix them.
- **TikTok Insights** filters must be a **flat array**, not nested.
- **LinkedIn Pages** demographics are shares that need re-multiplication for counts.

---

## What "good" looks like

A finished paid report answers, in one place: *where is the money going (spend by
channel), what is it buying (conversions/ROAS by channel), which direction is each
moving (vs previous), and where does it leak (the worst segment)* — with every number
compared, and the one insight the reader should act on stated in a sentence.
