# Framework: Google Ads — Financial Overview (executive)

Applies [SUMAS](../../_framework/sumas.md). A minimalist case: **fewer metrics, not more**.

## S — Strategy
- **Who cares:** whoever puts up the money (manager / finance / owner). Not a marketer:
  don't talk to them about CTR, keywords or devices.
- **Their question:** "Is this giving me a return and are we doing better than before?"
- **Decision it triggers:** keep investing the same / raise / lower the budget.

## U — Use case
**Performance management**, executive read. A **single-screen** report, 30 sec.

## M — Metrics (conversion and money only; nothing from the upper funnel)
Only the bottom of the funnel + efficiency. No impressions/clicks: they say nothing
to this reader.

| KPI (total) | Porter field (`google-ads`) |
|-------------|------------------------------|
| Conversions | `google_ads_conversions` |
| Conversion value | `google_ads_conversions_value` |
| **Average conversion value (AOV)** | **calculate** `conversions_value / conversions` (NOT the native field at aggregate — same honesty rule as CPA) |
| Spend | `google_ads_cost_micros` |
| Cost per conversion (CPA) | **calculate** `cost_micros / conversions` (NOT the native field — see datos.md) |
| **ROAS** (return per $1) | `google_ads_conversion_value_per_cost` |

> **Why AOV is a default headline KPI** (not just a per-row number): it is the bridge that explains
> ROAS moves — *"more conversions, each worth less"* is only visible if AOV is on the front page.
> **Lead-gen branch:** if `conversions_value` is ~0 across the account, AOV is meaningless → hide it
> (and ROAS), lead with CPA. Auto-detect; don't assume.

## A — Add context
- **vs previous period** on EVERY KPI (arrow ↑/↓ + % change). It is the only
  comparison in this report — no targets or benchmarks (keep it simple).
- ROAS is the financial translation: "for every $1 invested, $X came back".

## S — Segments
A single breakdown (flat table, no subtotals). Columns in this order:
- **Conversion name** (`google_ads_conversion_action_name`)
- **Conversion type** (`google_ads_conversion_action_category`)
- **Counts in KPI** — primary / secondary (derived, see `datos.md`)
- **Conversions** (`google_ads_conversions`)
- **Value** (`google_ads_conversions_value`)
- **Value per conversion** (`google_ads_value_per_conversion`) — honest per row
- **% of value** — share = row value / total value (calculation)

## Report structure
1. **Headline** — 1 sentence: "Google Ads generated X conversions for $Y, ROAS Z, [better/worse]
   than the previous period."
2. **Row of big KPIs** — Conversions · Value · **AOV** · Spend · CPA · ROAS, each
   with its comparison vs the previous period.
3. **Breakdown table** — by conversion Name and Type (see columns in step
   S). Valid metrics per row: **Conversions, Value, Value per conversion, % of
   value**, plus the **primary/secondary** flag. It helps read the *relationship* between
   conversions: Value/conv. says not all are worth the same; % of value says which ones
   dominate the money.
   (and their change vs the previous period). See the rule below.

## Interpretation / honesty rules
- **Why the table does NOT carry Spend or CPA per row:** Google does not split spend by
  conversion type. Spend is a single thing (what you paid for clicks); each conversion
  is a *result*, not a slice of the spend. Putting Spend/CPA per row would be making it up.
  → Spend, CPA and ROAS go ONLY in the totals KPIs above.
- **Why the table can add up to more than the "Conversions" KPI:** the breakdown by
  name includes ALL conversion actions (including secondary ones: calls,
  etc.), while the big KPI counts only the **primary** ones (= Google UI
  column). Add a note: "the detail includes secondary conversions".
- Conditional color: ↑ green / ↓ red vs previous period. Careful: in CPA and Spend, "more"
  is not always good — interpret carefully (a rising CPA = worse).

## Delivery format
Single-screen document / report hosted on Porter. Typical period:
`date_range = {"preset": "last_month"}` + a second query of the prior month for the "vs".
