---
name: audience-demographics-audit
description: Audit a Google Ads account's audience & demographic SETUP against best practice — which age/gender segments over- or under-perform (the bid-adjustment opportunities), and whether audiences are even in use. Returns a per-segment signal (over / under / inline) + a bid recommendation (up, down, exclude, leave) plus an audience-usage call (attach in Observation, shift the top performer to Targeting). Use this skill whenever the user audits Google Ads demographics, asks about age/gender segments, demographic bid adjustments, audiences in use, observation vs targeting, or which age band is wasting money — even if they don't say "audit". Judges audience/demographic SETUP ONLY; the segmentation movement analysis (how segments shift over time) belongs to the complementary `segmentation/audience/demographics` skill.
---

# Audience & Demographics Audit

## Goal (job-to-be-done)
Audit whether the account's demographic and audience **setup** follows best practice: surface
which **age / gender** segments over- or under-perform (the bid-adjustment opportunities), and
whether **audiences** are attached at all. This is Section 4 of the Acme DIY Audit Checklist —
a QA of setup against external best practice, not a movement/trend read.

- **Who:** media buyer auditing or inheriting an account. **When:** onboarding audit + periodic review.
- **Decision it drives:** bid **up** on winning segments, bid **down / exclude** losing ones, and
  **attach audiences** (Observation → Targeting) where there are none.
- **The differentiator:** it judges against best practice (is this set up the way a good account
  should be?) and reads the real **account baseline** before calling a segment a winner or loser —
  not a naive "highest ROAS wins". It also handles the large `UNDETERMINED` chunk correctly.

## Scope
- ✅ **Demographic & audience SETUP** — age/gender segment performance vs baseline → bid adjustments;
  audiences in use (Observation/Targeting). Reads **age, gender, audiences** only.
- ❌ **Segment movement over time** (how a segment shifts period-over-period) → complementary
  `segmentation/audience/demographics` skill. This skill stays in the audit frame.
- ❌ **Income & parental status** → **not exposed** by the Porter connector (logged as a gap, not faked).
- ❌ **Creative, keywords, settings** → other account-audit checks.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the per-dimension queries + the audience query.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: baseline comparison, the over/under/inline signal, the UNDETERMINED rule, the Observation→Targeting call.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per segment, a **demographic label** (age band or gender) + its `cost / clicks /
conversions / conversions_value` (one query per dimension), pulled at **`segment × campaign`** grain
so the bid recommendation can name the exact campaign. Plus a separate **audiences** query
(definitions + the `ad_group_audience_view` for attached + performance). **Business model**
(ecommerce vs lead-gen) decides whether the judgment uses ROAS or CPA only.

**Process:** apply the rubric in [`references/framework.md`](references/framework.md). Compute the
**account baseline** (weighted CPA, and ROAS when value is tracked) across the segments of each
dimension; compare each segment to it, volume-gated; rank the opportunities by **spend**. Handle
`UNDETERMINED` per §4 (bid-adjust, never blind-exclude). For audiences: none → recommend attaching
in Observation; some → shift the clear top performer to Targeting.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the biggest bid-adjustment opportunity by
  spend + the audience-usage status), `diagnosis` (where the spend leaks — which segment/dimension
  drags the account, via the funnel identity), `action` (the highest-$ fix — where / what / why).
- `segments[]` — one finding per demographic segment (× campaign): `signal` + `action` +
  `recommendation`.
- `audiences[]` — the audience-usage block (attached? top/bottom performers + the Observation→Targeting call).
- `gaps[]` — income & parental, reported as connector gaps, never as findings.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — question heading the data
> answers yes/no; the metric+delta carried as data, never spelled out in prose; first sentence
> answers the heading, then names the driver; one bridge line to the next section. Plain language
> for a non-technical owner — Where · What to do (plain + the exact setting in parens) · Why
> ([cluster executable-finding rule](../README.md)).

## Example (illustrative — NOT rules)
- **Loser with weight:** `AGE_RANGE_55_64` spends $2,959 at ROAS 0.34 vs a 35-44 best of 2.64 →
  🔴 under-performer → bid **down** in the campaigns serving it.
- **The large unknown:** `AGE_RANGE_UNDETERMINED` is the 2nd-biggest spend at ROAS 1.22 → 🔴 large +
  weak → **negative bid adjustment, NOT exclude** (cutting it slashes reach hard).
- **No audiences attached:** zero rows in `ad_group_audience_view` → recommend attaching relevant
  audiences in **Observation** first, then promote the clear winner to **Targeting**.
