# Framework: Audience & Demographics Audit

## 1. Business question
> Which **age / gender** segments over- or under-perform (bid-adjustment opportunities), and are
> **audiences** in use at all?

## 2. The signals (validated)
- **Age:** `google_ads_age` (AGE_RANGE_18_24 … AGE_RANGE_65_UP, AGE_RANGE_UNDETERMINED).
- **Gender:** `google_ads_gender` (MALE / FEMALE / UNDETERMINED).
- **Metrics:** `cost_micros`, `clicks`, `conversions`, `conversions_value` → compute **CPA** (cost/conv)
  and **ROAS** (value/cost; only when value > 0).
- **Audiences:** `audience_name` / `audience_status` / `audience_dimensions` (the definitions) and the
  `ad_group_audience_view` (attached audiences + their metrics).
- ❌ **Income range & parental status are NOT exposed** — say so; don't infer them.

## 3. The decision logic
**Part A — demographics, per dimension (age, then gender):**
1. Pull the segment performance (one query per dimension; age and gender don't share a row).
2. Compute the **account baseline** = the weighted CPA (and ROAS) across all segments of that dimension.
3. Per segment, compare to baseline:
   - **🔴 under-performer** — CPA materially worse (e.g. ≳ 1.3× baseline) or ROAS materially lower,
     **with enough volume** → bid-down / exclude candidate.
   - **🟢 over-performer** — CPA better / ROAS higher with volume → bid-up candidate.
   - **⚪ inline** — close to baseline → leave.
4. **Rank by spend** — a losing segment with $50k matters; a losing one with $50 is noise.

**Part B — audiences:**
- **Are any audiences attached?** (rows in `ad_group_audience_view`, or `campaign_audience_setting`).
  - **None →** recommend attaching relevant audiences in **Observation** mode (Acme's first step).
  - **Some →** rank attached audiences by performance; recommend shifting the clear top performer
    from Observation to **Targeting** (Acme's second step).

## 4. The UNDETERMINED rule (important)
`AGE_RANGE_UNDETERMINED` / gender UNDETERMINED is often a **large** chunk (Acme Insurance dogfood: ~$50k,
the 2nd-biggest age segment, ROAS 1.22 vs 2.6 for 35-44). **Do not blindly recommend excluding it** —
unknown-demographic users are real people Google couldn't classify; excluding them cuts reach hard.
Flag it as "large + under-performing", note the trade-off, and recommend a **negative bid
adjustment**, not exclusion. (This is the Harper-Health "unknown" lesson.)

## 5. Output contract — what each segment emits (content only)
> **Executable + plain ([cluster rule](../../README.md)).** Bid adjustments happen per **campaign ×
> segment**, so **pull `age × campaign` (not account-level)** and name the exact campaign. Write it
> for a non-technical owner as **Where · What to do (plain + the exact setting in parens) · Why** —
> no bare jargon. e.g. *"`Acme_Life_Embedded_45-54_SEM_(TL)_Test` is spending $1,729 on 55-64
> users (it's meant for 45-54) — lower the bid or exclude ages 55-64 & 65+; that money does better on 25-44."*
> Layout/visuals = `porter-reporting`, NOT here.
1. **Identity** — segment label · spend · conversions · value.
2. **Performance** — CPA · ROAS (if value) · vs baseline (the delta).
3. **Signal** — 🟢 over / 🔴 under / ⚪ inline (volume-gated).
4. **Recommendation** — bid up / bid down / exclude (with the UNDETERMINED caveat) / leave.

Plus the **audience block** (in use? top/bottom attached audiences + the Observation→Targeting call),
and the **roll-up**: top bid-adjustment opportunities ranked by spend.

## 6. When it applies / when it does NOT
- **Applies to:** any account with demographic-eligible campaigns (Search / Display / Video). Gender/
  age targeting exists broadly.
- **Does NOT apply / caveat:**
  - **Income & parental** — not in the connector; report as a gap, not a finding.
  - **Thin segments** — a CPA/ROAS on a handful of conversions is noise; annotate the count, don't
    recommend a bid change off it.
  - **No conversion value** (lead-gen) → judge on **CPA**, not ROAS (same business-model branch as
    the other checks).
  - **UNDETERMINED** → bid-adjust, don't exclude (§4 rule).

## 7. Gotchas
- **One demographic dimension per query** — pull age, then gender separately (different segments).
- **Audiences are a separate query** (`ad_group_audience_view`) — they don't combine with the keyword
  or demographic views (Google's resource model). Join back by campaign/ad group if needed.
- **`conversions`, not `all_conversions`** (UI match); disclose. Cost is in account currency.
