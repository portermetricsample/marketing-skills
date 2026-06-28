# Framework: Search Term Performance (SUMAS)

Applies [SUMAS](../../../_framework/sumas.md). The defensive skill that judges the **money** a
search term makes or wastes — not the matching. Unit of analysis = the **search term**
(aggregated across the keywords that triggered it), ranked by spend.

## S — Strategy
- **Who cares:** the media buyer running the paid account.
- **Their question:** "Which search terms are winning my money, and which are burning it?"
- **Decision it triggers:** promote winners to exact, negativize losers, leave the rest —
  in spend order, so the biggest dollars move first.

## U — Use case
Recurring spend hygiene on the search terms report. Pairs with `relevance` (the matching axis)
and `term-routing` (the ownership axis); this is the **performance axis**. Discipline:
**irrelevant ≠ poor performance** — a term can be relevant and wasteful, or loose and
converting. This skill reads dollars, not semantics.

## M — Metrics (per search term, computed from base counts)
- **Volume:** Cost — `cost_micros / 1e6`. Clicks — `clicks`. Conversions — `conversions`.
  Value — `conversions_value` (ecommerce only).
- **Efficiency (cost):** CPA = `cost / conversions` *(calculated; ∞ when conversions = 0)*.
- **Effectiveness (rate):** Conversion rate = `conversions / clicks` *(calculated)*.
- **Unit value (ecommerce only):** ROAS = `conversions_value / cost` *(calculated, value > 0)*.

> ⚠️ **Compute every rate/cost from the base counts — do NOT trust the native ratio fields.**
> Same failure as funnel-metrics: `cost_per_conversion` and `conversion_value_per_cost` are
> wrong at aggregate. The **base counts** (cost, clicks, conversions, value) aggregate
> correctly across a term's keywords; everything else is derived. ⚠️ **`cost_micros` carries an
> automatic `cost > 0` filter** — zero-spend terms never appear, so "no row" ≠ "no waste"; it
> means no spend, nothing to judge.

## A — Add context (the benchmark + the floor)
- **Benchmark = the account's own CPA** (median across converting terms, or the account tCPA
  when known). A term is judged against *this account*, not a generic threshold.
- **Thin-data floor:** do not classify a term with too few clicks. A 2-click, 0-conversion
  term is not "waste" — it is **unproven**; with the account CPA you need roughly enough clicks
  for one conversion to be expected before calling it. Below the floor → Watch, never Waste.

## S — Segments (optional breakdowns)
By **campaign** (`campaign_name`) and **match type** (`keyword_info_match_type`) to see where
the waste/winners concentrate. Match type also informs the destination (a broad-served winner
is the promote-to-exact candidate).

## Classification (the verdict, against the account benchmark)
| Class | Condition (with enough clicks) | Destination |
|-------|--------------------------------|-------------|
| **Winning** | converts at/under account CPA (or ROAS over target) | promote high-spend ones to an **exact keyword** |
| **Watch** | converts but above CPA, OR below the thin-data floor | leave; revisit next period |
| **Waste** | real spend, conversions ≈ 0, past the floor | add as a **negative** (or fix the keyword) |

Every finding names the **exact term + exact action** (the term text, its spend, its
conversions, and "promote to exact / add negative in [campaign] / leave").

## Interpretation / honesty rules
- **Compute from base counts** (above) — native ratio fields are wrong at aggregate.
- **`cost_micros > 0` is automatic** — absence of a row means no spend, not zero waste.
- **Thin-data floor** — never call a low-click term "waste"; it is unproven (Watch).
- **One auction, one keyword** — the lever for a loser is a **negative**, not a CPC tweak;
  there is no "bidding against yourself" to fix here (that myth belongs to `term-routing`).
- **Business-model branch** — lead-gen: judge on CPA + conv. rate, hide ROAS. Ecommerce
  (value > 0): show ROAS. Auto-detect from `conversions_value`.
- **Performance ≠ relevance** — do not negativize a term *because it doesn't convert if it is
  the right product*; flag the conversion gap, but the matching verdict is `relevance`'s.

## Report structure
1. **Headline** — one line: "$X of spend on terms that don't convert" + the top waste term.
2. **Spend-ranked table** — term · spend · clicks · conversions · CPA · class · destination.
3. **Winners block** — convert-at-CPA terms, biggest spend first, marked promote-to-exact.
4. **Waste block** — real-spend non-converters past the floor, with the negative to add.

## Delivery format
Spend-ranked read. Consumed by the reporting layer (`porter-reporting`): a **table + objective
narrative** (figures, exact term, exact action — no subjective adjectives unless tied to the
benchmark). Period: `last_month` or `{date_from, date_to}` of 30-90 days for conversion volume.
