#!/usr/bin/env python3
"""
Deterministic arithmetic layer for the google-ads-analyst skill.

Purpose: the LLM does the JUDGMENT; this script does the ARITHMETIC, so the
narrative never miscomputes a ratio, mislabels a stat, or breaks a subset sum.
It computes the canonical derived metrics (CPA, ROAS, CTR, CPC, conv-rate, AOV)
from the raw query rows and surfaces flags the narrative must respect. It does
NOT decide the business model / KPI — that is the brain's call; it only exposes
the signals (e.g. near-zero or round/assigned conversion value).

Input : a snapshot JSON file:
  {"account": {...}, "period": {...},
   "queries": [{"name": "...", "columns": [...], "rows": [[...], ...]}]}
  Column names may be plain ("cost","conversions") or Porter-style
  ("google_ads_cost_micros", ...) — both are handled.

Usage : python3 verify.py <snapshot.json>
Output: JSON {computed:{per_query...}, account_totals, flags} to stdout.
"""
import json, sys

# canonical metric aliases -> normalized key
ALIASES = {
    "cost": {"cost", "cost_micros"},
    "clicks": {"clicks"},
    "impressions": {"impressions"},
    "conversions": {"conversions"},
    "conversions_value": {"conversions_value", "conversion_value"},
}

def norm(col):
    c = col.lower().replace("google_ads_", "")
    return c

def idx(columns, canonical):
    wants = ALIASES.get(canonical, {canonical})
    for i, c in enumerate(columns):
        if norm(c) in wants:
            return i
    return None

def label_idx(columns):
    """Index of the most meaningful dimension column to label rows by.
    Prefers the entity being analyzed (search term, campaign, geo, ...) over
    secondary dimensions like match_type or channel_type."""
    priority = ["search_term", "campaign_name", "geo_target_region", "region",
                "geo_target_city", "geo_target_country", "geo_target_state",
                "geo_target_metro", "device", "keyword", "keyword_info_text", "year_month"]
    normed = [norm(c) for c in columns]
    for want in priority:
        if want in normed:
            return normed.index(want)
    metric_norms = set().union(*ALIASES.values()) | {"average_cpc", "ctr", "average_cpm"}
    for i, c in enumerate(columns):
        if norm(c) not in metric_norms:
            return i
    return 0

def div(a, b):
    return round(a / b, 4) if b else None

def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0

def metrics(cost, clicks, impr, conv, value):
    return {
        "cost": round(cost, 2), "clicks": int(clicks), "impressions": int(impr),
        "conversions": round(conv, 2), "conversions_value": round(value, 2),
        "CPA": div(cost, conv), "CPC": div(cost, clicks),
        "CTR_pct": (round(100 * clicks / impr, 2) if impr else None),
        "conv_rate_pct": (round(100 * conv / clicks, 2) if clicks else None),
        "ROAS": div(value, cost), "AOV": div(value, conv),
    }

def main():
    snap = json.load(open(sys.argv[1]))
    out = {"account": snap.get("account", {}), "period": snap.get("period", {}),
           "computed": {}, "flags": []}

    tot = {"cost": 0.0, "clicks": 0, "impressions": 0, "conversions": 0.0, "conversions_value": 0.0}
    nonzero_values = []
    fingerprint_seen = False

    for q in snap.get("queries", []):
        cols, rows = q["columns"], q["rows"]
        ci, ki, ii = idx(cols, "cost"), idx(cols, "clicks"), idx(cols, "impressions")
        ni, vi = idx(cols, "conversions"), idx(cols, "conversions_value")
        li = label_idx(cols)
        per = []
        qtot = {"cost": 0.0, "clicks": 0, "impressions": 0, "conversions": 0.0, "conversions_value": 0.0}
        is_fingerprint = "fingerprint" in q["name"] or "campaign" in norm(cols[li])
        for r in rows:
            cost = num(r[ci]) if ci is not None else 0.0
            clicks = num(r[ki]) if ki is not None else 0.0
            impr = num(r[ii]) if ii is not None else 0.0
            conv = num(r[ni]) if ni is not None else 0.0
            value = num(r[vi]) if vi is not None else 0.0
            label = " | ".join(str(r[j]) for j in range(len(r)) if j in (li,) ) or str(r[li])
            m = metrics(cost, clicks, impr, conv, value)
            m["label"] = label
            per.append(m)
            for k, val in (("cost", cost), ("clicks", clicks), ("impressions", impr),
                           ("conversions", conv), ("conversions_value", value)):
                qtot[k] += val
            if value > 0:
                nonzero_values.append(value)
        out["computed"][q["name"]] = {
            "rows": per,
            "query_total": metrics(qtot["cost"], qtot["clicks"], qtot["impressions"],
                                   qtot["conversions"], qtot["conversions_value"]),
        }
        # account totals come from the campaign fingerprint (most reliable, no double count)
        if is_fingerprint and not fingerprint_seen:
            fingerprint_seen = True
            for k in tot:
                tot[k] += qtot[k]

    out["account_totals"] = metrics(tot["cost"], tot["clicks"], tot["impressions"],
                                    tot["conversions"], tot["conversions_value"])

    # ---- flags (signals for the brain; NOT decisions) ----
    f = out["flags"]
    period_txt = json.dumps(snap.get("period", {})).lower()
    if ("to-date" in period_txt or "to date" in period_txt or "partial" in period_txt
            or "mtd" in period_txt or "incomplete" in period_txt or "still running" in period_txt
            or "in progress" in period_txt):
        f.append("PARTIAL_PERIOD: the trend window includes a month-to-date/partial period — "
                 "do not compare it head-to-head with full months; normalize to a run-rate and "
                 "add an attribution-lag caveat before any headline.")
    tv, tc = tot["conversions_value"], tot["cost"]
    blended_roas = div(tv, tc)
    if tc > 0 and (blended_roas is None or blended_roas < 0.1):
        f.append(f"VALUE_NEAR_ZERO: total conversion value ({round(tv,2)}) is negligible vs spend "
                 f"({round(tc,2)}) -> this is lead-gen; feature CPA/conv-rate, do NOT feature ROAS.")
    # round/assigned-value detector: most nonzero values divisible by 25
    if nonzero_values:
        roundish = sum(1 for v in nonzero_values if abs(v - round(v / 25) * 25) < 0.01)
        if roundish / len(nonzero_values) >= 0.8:
            f.append("ASSIGNED_VALUES_SUSPECTED: most conversion values are round multiples (~/25) -> "
                     "these look like assigned per-lead values, not marketplace revenue; a high ROAS "
                     "here does NOT mean real return — treat as lead-gen with a value proxy.")
    # zero-conversion high-cost search terms = negative-keyword candidates
    for name, comp in out["computed"].items():
        if "search_term" in name:
            rws = comp["rows"]
            costs = sorted(m["cost"] for m in rws)
            med = costs[len(costs) // 2] if costs else 0
            cands = [m["label"] for m in rws if m["conversions"] == 0 and m["cost"] >= max(med, 1e-9)]
            if cands:
                f.append("NEGATIVE_KEYWORD_CANDIDATES (0 conversions, cost >= median spend): "
                         + ", ".join(cands[:15]))
    # impression-share presence check
    has_is = any("impression_share" in norm(c) for q in snap.get("queries", []) for c in q["columns"])
    if not has_is:
        f.append("NO_IMPRESSION_SHARE_DATA: the snapshot has no Impression Share fields -> the "
                 "Visibility/lost-to-rank-vs-budget diagnostic cannot be made; name it as a data gap, "
                 "do not infer it.")

    # ---- measurement-frame guards (added after the live audit review) ----
    def col_index(cols, want):
        for i, c in enumerate(cols):
            if norm(c) == want:
                return i
        return None

    # (1) bid-strategy / target / budget present -> unit + reconcile guard
    target_hints = ("target_roas", "target_cpa", "target_cpm", "budget_amount",
                    "campaign_budget", "bidding_strategy")
    if any(any(h in norm(c) for h in target_hints)
           for q in snap.get("queries", []) for c in q["columns"]):
        f.append("TARGETS_FANOUT_GUARD: snapshot includes bid-strategy/target/budget fields. The numeric "
                 "target/budget fields are fan-out-corrupted via query_data — the SAME field returns "
                 "different values depending on which other fields share the query (verified on a live "
                 "account: the same field came back several-fold apart on both target and budget). Trust "
                 "ONLY bidding_strategy_type. Do NOT print a "
                 "numeric tROAS/tCPA/budget; report strategy + ACTUAL ROAS/CPA and route the target value "
                 "to the Google Ads UI (or the connector action), never to a printed number.")

    # (2) conversion frame: what does `conversions` count, and is it stable over time?
    for q in snap.get("queries", []):
        cols = q["columns"]
        cai = col_index(cols, "conversion_action_name")
        cvi = idx(cols, "conversions")
        if cai is None or cvi is None:
            continue
        ymi = col_index(cols, "year_month")
        if ymi is None:
            counted = sorted({str(r[cai]) for r in q["rows"] if num(r[cvi]) > 0})
            if counted:
                f.append("CONVERSION_COUNTED_SET (actions credited in `conversions` = primary-for-goal): "
                         + ", ".join(counted[:20]) + ". Read every CPA/ROAS/conv figure as cost/return on "
                         "THESE actions only; if they are shallow (app-start/page-view/quote) say "
                         "cost-per-that-event, not cost-per-customer.")
        else:
            by_month = {}
            for r in q["rows"]:
                v = num(r[cvi])
                if v > 0:
                    m, a = str(r[ymi]), str(r[cai])
                    by_month.setdefault(m, {})
                    by_month[m][a] = by_month[m].get(a, 0.0) + v
            tops = {m: max(d, key=d.get) for m, d in by_month.items() if d}
            if len(set(tops.values())) > 1:
                seq = ", ".join(f"{m}:{tops[m]}" for m in sorted(tops))
                f.append("CONVERSION_FRAME_SHIFT: the top action credited in `conversions` CHANGES across "
                         "months (" + seq + "). The account redefined what it counts -> CPA/ROAS/conversion "
                         "deltas across this change are NOT comparable; lead with the shift, do not trend "
                         "through it.")

    json.dump(out, sys.stdout, indent=2)
    print()

if __name__ == "__main__":
    main()
