#!/usr/bin/env python3
"""Impression Share Trend & Driver Diagnosis — deterministic core.

Per Google Ads SEARCH campaign: reads a DAILY impression-share pull, aggregates it to a weekly
impression-weighted series, classifies the trajectory with the validated `decay_core` engine
(Winning / New / Healthy / Volatile / Losing / Crashing / Crashed), and tags the DRIVER of any
decline as `rank` (auction — bid/Quality) vs `budget` (money), reusing the impression-share rule
that rank loss is NEVER a budget justification.

Usage:  python3 process.py rows.json [meta.json] > findings.json

rows.json = the `query_data` response from ../references/tools.md. Accepts either the native
{columns:[...], rows:[[...]]} shape OR {rows:[{<field>:<val>}...]} OR a bare list of row dicts.
Required fields (daily grain):
  google_ads_date (YYYYMMDD), google_ads_campaign_name,
  google_ads_search_impression_share, google_ads_search_rank_lost_impression_share,
  google_ads_search_budget_lost_impression_share, google_ads_impressions
"""
import json, sys, datetime
from collections import defaultdict

sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else ".")
from decay_core import signals, classify  # noqa: E402

F_DATE   = "google_ads_date"
F_CAMP   = "google_ads_campaign_name"
F_IS     = "google_ads_search_impression_share"
F_RANK   = "google_ads_search_rank_lost_impression_share"
F_BUDGET = "google_ads_search_budget_lost_impression_share"
F_IMPR   = "google_ads_impressions"
# top-of-page (premium position) — used by the SNAPSHOT mode (current period)
F_TOP     = "google_ads_search_top_impression_share"
F_ABSTOP  = "google_ads_search_absolute_top_impression_share"
F_RANKTOP = "google_ads_search_rank_lost_top_impression_share"

# --- thresholds (starting heuristics; tune against the curves, see framework §5) ---
DRIVER_MATERIAL = 0.10   # a loss channel must be >= this to name it
DRIVER_MIXED    = 0.20   # both channels >= this -> mixed
LOW_VOL_IMPR    = 1500   # campaign total impressions over the window below this -> low-confidence
RECENT_WEEKS    = 3      # window for the "current" driver read
SNAPSHOT_DAYS   = 30     # the "current period" window for the snapshot mode


def cap_verdict(rk, bg):
    """Snapshot cap from recent rank-lost vs budget-lost (0-1 fractions). Ports the snapshot framework §3."""
    rkp, bgp = rk * 100, bg * 100
    if rkp >= 20 and bgp >= 20:
        return "mixed", "rank_limited"          # both high -> fix rank first, then fund
    if rkp >= 10 and rkp > bgp:
        return "rank", "rank_limited"
    if bgp >= 10 and bgp > rkp:
        return "budget", "budget_limited"
    return "none", "healthy"


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def load_rows(doc):
    if isinstance(doc, list):
        return doc
    rows = doc.get("rows")
    cols = doc.get("columns")
    if rows and isinstance(rows[0], dict):
        return rows
    if cols and rows:
        return [dict(zip(cols, r)) for r in rows]
    for k in ("data", "results", "records"):
        if isinstance(doc.get(k), list):
            return doc[k]
    raise SystemExit("could not find rows in input")


def iso_week_key(yyyymmdd):
    s = str(yyyymmdd)
    y, m, d = int(s[0:4]), int(s[4:6]), int(s[6:8])
    iy, iw, _ = datetime.date(y, m, d).isocalendar()
    return (iy, iw)


def to_date(yyyymmdd):
    s = str(yyyymmdd)
    return datetime.date(int(s[0:4]), int(s[4:6]), int(s[6:8]))


def weekly_series(daily, dmin, dmax):
    """daily: list of {is,rank,budget,impr,date}. -> ordered weekly impression-weighted dicts.
    Drops any ISO-week bucket the data does NOT fully cover (Mon-Sun) — i.e. the partial leading /
    trailing weeks — so an incomplete edge week never reads as a false crash/spike."""
    buckets = defaultdict(lambda: {"is_w": 0.0, "rk_w": 0.0, "bg_w": 0.0, "impr": 0.0})
    for r in daily:
        wk = iso_week_key(r["date"])
        b = buckets[wk]
        b["is_w"] += r["is"] * r["impr"]
        b["rk_w"] += r["rank"] * r["impr"]
        b["bg_w"] += r["budget"] * r["impr"]
        b["impr"] += r["impr"]
    out = []
    for wk in sorted(buckets):
        mon = datetime.date.fromisocalendar(wk[0], wk[1], 1)
        sun = datetime.date.fromisocalendar(wk[0], wk[1], 7)
        if mon < dmin or sun > dmax:
            continue  # the data window does not fully cover this week -> partial edge week, drop it
        b = buckets[wk]
        imp = b["impr"] or 1.0
        out.append({"week": "%04d-W%02d" % wk,
                    "is": b["is_w"] / imp, "rank": b["rk_w"] / imp,
                    "budget": b["bg_w"] / imp, "impr": b["impr"]})
    return out


def driver_of(weeks):
    recent = weeks[-min(RECENT_WEEKS, len(weeks)):]
    imp = sum(w["impr"] for w in recent) or 1.0
    rk = sum(w["rank"] * w["impr"] for w in recent) / imp
    bg = sum(w["budget"] * w["impr"] for w in recent) / imp
    if rk >= DRIVER_MIXED and bg >= DRIVER_MIXED:
        return "mixed", rk, bg
    if rk > bg and rk >= DRIVER_MATERIAL:
        return "rank", rk, bg
    if bg > rk and bg >= DRIVER_MATERIAL:
        return "budget", rk, bg
    return "none", rk, bg


DECLINING = {"Losing", "Crashing", "Crashed"}


def recommend(camp, label, driver, is_now, is_then, rk, bg):
    pct = lambda x: "%.0f%%" % (x * 100)
    if label in DECLINING:
        move = "fell from %s to %s" % (pct(is_then), pct(is_now))
    elif label == "Winning":
        move = "rose from %s to %s" % (pct(is_then), pct(is_now))
    else:
        move = "is holding near %s" % pct(is_now)
    if label in DECLINING and driver == "budget":
        return {"where": camp,
                "what": "Raise the daily budget on this campaign (it's the cap, not the auction).",
                "why": "Impression share %s; the loss is budget (%s lost to budget vs %s to rank) — proven demand it can't afford." % (move, pct(bg), pct(rk))}
    if label in DECLINING and driver == "rank":
        return {"where": camp,
                "what": "Fix bid / Quality (ad relevance, expected CTR, landing) — do NOT add budget.",
                "why": "Impression share %s; the loss is rank (%s to rank vs %s to budget) — money won't help, it's losing the auction." % (move, pct(rk), pct(bg))}
    if label in DECLINING and driver == "mixed":
        return {"where": camp,
                "what": "Fix rank first (bid/Quality), THEN fund — cheaper clicks before more money.",
                "why": "Impression share %s; both losses are high (%s rank, %s budget)." % (move, pct(rk), pct(bg))}
    if label == "Winning":
        return {"where": camp, "what": "Keep — protect the budget that's winning reach.",
                "why": "Impression share %s." % move}
    return {"where": camp, "what": "Keep / monitor.",
            "why": "Impression share %s (rank loss %s, budget loss %s)." % (move, pct(rk), pct(bg))}


def main(rows_path, meta_path=None):
    rows = load_rows(json.load(open(rows_path)))
    meta_extra = json.load(open(meta_path)) if meta_path else {}
    spend_map = meta_extra.pop("spend", {}) or {}   # optional {campaign: 90d_spend} from a paired cost query

    by_camp = defaultdict(list)
    for r in rows:
        is_ = fnum(r.get(F_IS)); rk = fnum(r.get(F_RANK)); bg = fnum(r.get(F_BUDGET))
        impr = fnum(r.get(F_IMPR))
        if is_ == 0 and rk == 0 and bg == 0:
            continue  # non-Search (DEMAND_GEN etc.) — IS family is meaningless there
        by_camp[r.get(F_CAMP)].append({"date": r.get(F_DATE), "is": is_, "rank": rk,
                                       "budget": bg, "impr": impr,
                                       "top": fnum(r.get(F_TOP)), "abstop": fnum(r.get(F_ABSTOP)),
                                       "ranktop": fnum(r.get(F_RANKTOP))})

    all_dates = [to_date(r["date"]) for daily in by_camp.values() for r in daily]
    if not all_dates:
        raise SystemExit("no Search rows with impression-share data")
    dmin, dmax = min(all_dates), max(all_dates)

    campaigns = []
    for camp, daily in by_camp.items():
        weeks = weekly_series(daily, dmin, dmax)
        if len(weeks) < 3:
            continue  # too short to read a trend
        series = [w["is"] for w in weeks]
        s = signals(series)
        label = classify(s, crash_min_volume=0.0)  # IS units; volume gating handled below
        driver, rk, bg = driver_of(weeks)
        total_impr = sum(w["impr"] for w in weeks)
        low_vol = total_impr < LOW_VOL_IMPR
        is_now, is_then = series[-1], series[0]
        # --- snapshot mode: current-period (last SNAPSHOT_DAYS days) impression-weighted, incl. top-of-page ---
        cutoff = dmax - datetime.timedelta(days=SNAPSHOT_DAYS - 1)
        recent_d = [d for d in daily if to_date(d["date"]) >= cutoff] or daily
        cti = sum(d["impr"] for d in recent_d) or 1
        cw = lambda k: sum(d.get(k, 0) * d["impr"] for d in recent_d) / cti
        cur_rk, cur_bg = cw("rank"), cw("budget")
        cap, verdict = cap_verdict(cur_rk, cur_bg)
        current = {"is": round(cw("is"), 4), "top": round(cw("top"), 4), "abs_top": round(cw("abstop"), 4),
                   "rank_lost": round(cur_rk, 4), "budget_lost": round(cur_bg, 4),
                   "rank_lost_top": round(cw("ranktop"), 4), "cap": cap, "verdict": verdict}
        # --- render-handoff fields (consumed by the porter-reporting impression-share-trend-monitor) ---
        n = len(weeks); win = 4 if n >= 8 else max(1, n // 2)
        wavg = lambda ws: sum(w["is"] * w["impr"] for w in ws) / (sum(w["impr"] for w in ws) or 1) * 100
        campaigns.append({
            "campaign": camp,
            "current": current,
            "trend_label": label,
            "is_now": round(is_now, 4),
            "is_then": round(is_then, 4),
            "is_slope_pct_per_week": round(s["slope_pct"], 2),
            "driver": driver,
            "rank_lost_recent": round(rk, 4),
            "budget_lost_recent": round(bg, 4),
            "impressions": int(total_impr),
            "spend": spend_map.get(camp),
            "weeks": [w["week"] for w in weeks],          # week LABELS (the monitor's x axis)
            "week_count": n,
            "got": [round(w["is"] * 100, 1) for w in weeks],      # 0-100 weekly IS (= the "got" segment)
            "rank": [round(w["rank"] * 100, 1) for w in weeks],   # 0-100 weekly reach lost to rank
            "budget": [round(w["budget"] * 100, 1) for w in weeks],  # 0-100 weekly reach lost to budget
            "prior_is": round(wavg(weeks[-2 * win:-win]), 1),    # 4-wk-prior average (the change column)
            "recent_is": round(wavg(weeks[-win:]), 1),           # last-4-wk average
            "short": n < 8,
            "low_volume": low_vol,
            "series": [round(v, 4) for v in series],
            "recommendation": recommend(camp, label, driver, is_now, is_then, rk, bg),
        })

    campaigns.sort(key=lambda c: -c["impressions"])

    decaying = [c for c in campaigns if c["trend_label"] in DECLINING]
    growing = [c for c in campaigns if c["trend_label"] in ("Winning", "New")]
    stable = [c for c in campaigns if c["trend_label"] in ("Healthy", "Volatile")]
    # dominant driver among decaying, weighted by impressions
    dw = defaultdict(float)
    for c in decaying:
        dw[c["driver"]] += c["impressions"]
    dominant_driver = max(dw, key=dw.get) if dw else "none"

    meta = {"connector": "google-ads", "skill": "impression-share", "grain": "weekly (from daily)"}
    meta.update(meta_extra)

    out = {
        "meta": meta,
        "synthesis": {"headline": "", "diagnosis": "", "action": ""},  # LLM fills
        "campaigns": campaigns,
        "rollup": {
            "dominant_driver": dominant_driver,
            "decaying_by_impact": [c["campaign"] for c in sorted(decaying, key=lambda c: -c["impressions"])],
            "growing": [c["campaign"] for c in growing],
            "stable": [c["campaign"] for c in stable],
            "counts": {"decaying": len(decaying), "growing": len(growing), "stable": len(stable),
                       "total": len(campaigns)},
        },
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        print("usage: process.py rows.json [meta.json]", file=sys.stderr); sys.exit(1)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else None)
