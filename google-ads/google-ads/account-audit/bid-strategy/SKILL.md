---
name: bid-strategy-target-alignment
description: For each Google Ads campaign on a target strategy, judge whether the SET target CPA / ROAS is in alignment with the ACTUAL CPA / ROAS of the last 30 days — too tight (throttling spend), too loose (room to tighten), or aligned. Use this skill whenever the user asks about target CPA, target ROAS, bid strategy alignment, target vs actual, "is my tCPA/tROAS realistic", whether a target is starving or wasting spend, or audits an account's bidding — even if they don't say "alignment". Judges target REALISM ONLY; whether the campaign should be ON a value strategy at all belongs to the complementary `value-based-bidding` skill.
---

# Bid Strategy — Target vs Actual Alignment

## Goal (job-to-be-done)
Per campaign on a **target** strategy (tCPA / tROAS), answer the client's question: does the
**target you set** track the **actual** CPA / ROAS of the last 30 days, or is it too tight
(Google can't hit it, so it throttles spend) or too loose (room to tighten for efficiency)?
The unit of analysis is the **campaign**; the output is an alignment verdict + the exact target
move to make.

- **Who:** media buyer / PPC manager. **When:** recurring account audit; the "bid strategy" item
  of the [account-audit](../../README.md) cluster (from Acme's emailed request).
- **Decision it drives:** which campaign's target to lower or raise, and toward what value —
  trading volume against efficiency with the two real numbers in hand.
- **The differentiator:** not "is value bidding the right strategy" — that's `value-based-bidding`.
  This reads the **target you actually set** against the **30-day reality** and flags the gap, with
  a mandatory unit/realism sanity-check (micros vs ratio, portfolio-shared targets).

## Scope
- ✅ **Target realism, per campaign:** set target vs 30-day actual, for both tCPA and tROAS.
- ❌ **Strategy fitness** (are you ON value bidding, do you have value + volume for it?) →
  complementary [`value-based-bidding`](../value-based-bidding/) skill.
- ❌ **Budget allocation** (which campaigns deserve more spend) → [`spend-allocation`](../spend-allocation/).
- ❌ Campaigns with **no target set** (Manual CPC, Max-Conv(-Value) without a target),
  Target Impression Share — nothing to compare.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one campaign-grain query + the per-strategy target fields.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the per-strategy comparison, the alignment bands, the mandatory unit/realism sanity-check.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per campaign — `bidding_strategy_type` (reliable from `query_data`) + the **actuals**
(`cost_micros`, `conversions`, `conversions_value`, `conversion_value_per_cost`) from `query_data`,
and the **true target** (tCPA in micros, tROAS as a ratio) from the **`campaign.list` connector
action** — NOT `query_data`, whose target/budget fields are fan-out corrupted. No business context
needed beyond knowing the account's CPA/ROAS units.

**Process:** apply the rubric in [`references/framework.md`](references/framework.md). For each
campaign on a target strategy: read the **true target from the `campaign.list` connector action**
(the `query_data` target fields are fan-out corrupted — see [`references/tools.md`](references/tools.md));
compute the actual (CPA = `cost_micros / conversions`; ROAS = native `conversion_value_per_cost`);
normalize units (tCPA ÷ 1e6); compare against the alignment bands. **Always run the realism
sanity-check first** — a 24× gap is almost always the `query_data` fan-out artifact (re-pull via the
connector action), not a real mis-set target. Thin-volume campaigns → flag, don't recommend a target change.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the most-off target on the biggest spender + the move),
  `diagnosis` (which way the account leans — throttling vs slack — via the funnel identity),
  `action` (the one target to move now, where / what / why).
- `campaigns[]` — one per target-strategy campaign: strategy, `{ target, actual, gap }`, the
  `verdict`, the `action`, and a `recommendation {where, what, why}`. Flag `thin_volume` and
  `unit_suspect` where they apply.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — the question the data answers
> yes/no; the metric+gap carried as data, never spelled out in prose; first sentence answers it,
> then names the driver. Plain language for a non-technical owner ("lower the target so Google stops
> starving the campaign"), the technical setting in parentheses.

## Example (illustrative — NOT rules)
- **Throttling:** a tROAS campaign set to `4.0` only hitting `1.55` → 🔴 `too_tight` →
  `lower_target` toward ~1.8: the target is starving its spend.
- **Slack:** a tCPA campaign with target `$80` but actual `$48` → 🟡 `too_loose` →
  `raise_target` (tighten) toward the real CPA to chase more efficiency.
- **Fan-out footgun:** a tROAS field reading `37.2` against an actual `1.55` (Acme Insurance) — a 24× gap →
  almost always the `query_data` fan-out bug, not a real target. Re-pull via the `campaign.list`
  connector action (it returned `1.2` here — perfectly aligned); only if the connector value is ALSO
  far off do you flag `unit_suspect` (portfolio-shared target / internal value scale).
