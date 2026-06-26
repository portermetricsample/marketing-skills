"""
Content Decay Analysis — source-agnostic engine.

Works with ANY web-analytics export that has, per row: an entity (page/URL/path),
a time period (date or week), and at least one numeric metric. Ships with presets
for Google Search Console (clicks) and Google Analytics 4 (sessions); any other
source works via SOURCE='custom' + a column mapping.

Nothing here is tied to a specific website: thresholds are relative to the dataset,
the time axis is derived from the data, and categorization is generic by default.
"""
import json, re, csv, os
from collections import defaultdict
from datetime import date, timedelta, datetime
import numpy as np
from decay_core import smooth, signals, classify

# =====================================================================
# CONFIG — the only thing a new user edits. Pick a preset or go custom.
# =====================================================================
SOURCE = os.environ.get("CD_SOURCE", "gsc")   # "gsc" | "ga4" | "custom"

PRESETS = {
    # Google Search Console: page + week + clicks (+ impressions)
    "gsc": dict(
        input="data/gsc_weekly_6mo.json",
        entity_col="google_search_console_page",
        period_col="google_search_console_week",
        metric_col="google_search_console_clicks",
        metric2_col="google_search_console_impressions",
        period_kind="gsc_week",
        metric_label="clicks", metric2_label="impressions",
    ),
    # Google Analytics 4: page path + date + sessions (no 2nd metric by default)
    "ga4": dict(
        input="data/ga4_daily.json",
        entity_col="google_analytics_4_pagePath",
        period_col="google_analytics_4_date",
        metric_col="google_analytics_4_sessions",
        metric2_col=None,
        period_kind="date",
        metric_label="sessions", metric2_label=None,
    ),
    # Generic: set these to your own column names.
    "custom": dict(
        input="data/input.json",
        entity_col="entity", period_col="period",
        metric_col="metric", metric2_col=None,
        period_kind="date",                 # "date" (YYYYMMDD/ISO) or "gsc_week" (YYYYWW)
        metric_label="metric", metric2_label=None,
    ),
}
CFG = PRESETS[SOURCE]

# Keep entities worth analyzing: at least this share of total traffic (RELATIVE,
# so it adapts to any site size — no hardcoded click counts).
MIN_SHARE = float(os.environ.get("CD_MIN_SHARE", "0.0002"))

# Categorization: "path1" = group by the URL's path segments generically;
# "none" = per-page only. Or provide CATEGORY_RULES below for custom grouping.
CATEGORIZE = os.environ.get("CD_CATEGORIZE", "path1")
# Optional: list of (label, [substrings]) — first match wins. None = use CATEGORIZE.
# Default is None (generic, unbiased). A site can plug in its own rules file;
# e.g. `CD_RULES=porter python3 analyze.py` loads categories_porter.py.
CATEGORY_RULES = None
_rules = os.environ.get("CD_RULES")
if _rules:
    mod = __import__(f"categories_{_rules}")
    CATEGORY_RULES = mod.RULES

# =====================================================================
# LOAD — tabular JSON {columns, rows} or a CSV with a header row.
# =====================================================================
def load(path):
    if path.endswith(".csv"):
        with open(path, newline="") as f:
            rd = csv.reader(f); cols = next(rd); rows = [r for r in rd]
        return cols, rows
    d = json.load(open(path))
    return d["columns"], d["rows"]

cols, rows = load(CFG["input"])
ci = {c: i for i, c in enumerate(cols)}
for key in ("entity_col", "period_col", "metric_col"):
    if CFG[key] not in ci:
        raise SystemExit(f"Column '{CFG[key]}' not found. Available: {cols}")
E, Pp, M = ci[CFG["entity_col"]], ci[CFG["period_col"]], ci[CFG["metric_col"]]
M2 = ci.get(CFG["metric2_col"]) if CFG.get("metric2_col") else None

# =====================================================================
# TIME AXIS — derived from the data; buckets daily data into weeks.
# =====================================================================
def to_monday(d):  # snap a date to the Monday of its week
    return d - timedelta(days=d.weekday())

def parse_period(val):
    """Return (sort_key, display_monday). Each distinct source period keeps its
    own bucket (no merging); daily data is bucketed into ISO weeks."""
    s = str(val).strip()
    if CFG["period_kind"] == "gsc_week":
        # YYYYWW (Google week numbering; WW may be 00). Keep the raw week as the
        # bucket key (1 source week = 1 bucket); derive a display Monday.
        s2 = s.replace("-", "")
        year, wk = int(s2[:4]), int(s2[4:6])
        if wk <= 0:
            disp = to_monday(date(year, 1, 1))
        else:
            try: disp = date.fromisocalendar(year, min(wk, 52), 1)
            except ValueError: disp = to_monday(date(year, 1, 1))
        return (f"{year:04d}{wk:02d}", disp)
    # "date": accept YYYY-MM-DD or YYYYMMDD -> bucket into the ISO-week Monday
    s2 = s.replace("-", "")[:8]
    mon = to_monday(datetime.strptime(s2, "%Y%m%d").date())
    return (mon.isoformat(), mon)

# build sorted weekly axis from actual data (preserves every distinct period)
keymap = {}
days_per_key = defaultdict(set)
for r in rows:
    k, disp = parse_period(r[Pp]); keymap[k] = disp
    if CFG["period_kind"] == "date":
        days_per_key[k].add(str(r[Pp]).replace("-", "")[:8])
order = sorted(keymap)

# For daily sources, drop incomplete weeks at the edges (a partial trailing week
# — e.g. data through Monday only — would look like a site-wide crash). Interior
# weeks are kept. GSC weekly buckets are pre-aggregated, so this only runs on dates.
DROP_PARTIAL = os.environ.get("CD_KEEP_PARTIAL") != "1"
if CFG["period_kind"] == "date" and DROP_PARTIAL and len(order) > 3:
    while order and len(days_per_key[order[-1]]) < 7:   # trailing partial week(s)
        order.pop()
    while order and len(days_per_key[order[0]]) < 7:    # leading partial week(s)
        order.pop(0)

widx = {k: i for i, k in enumerate(order)}
n = len(order)
week_dates = [keymap[k].isoformat() for k in order]   # display dates (week Mondays)
weeks = week_dates
_keyset = set(order)

# =====================================================================
# PER-ENTITY SERIES
# =====================================================================
pg_m  = defaultdict(lambda: np.zeros(n))           # primary metric
pg_m2 = defaultdict(lambda: np.zeros(n))           # secondary (optional)
for r in rows:
    k = parse_period(r[Pp])[0]
    if k not in _keyset:        # row falls in a dropped partial edge week
        continue
    e = r[E]; i = widx[k]
    pg_m[e][i] += float(r[M] or 0)
    if M2 is not None:
        pg_m2[e][i] += float(r[M2] or 0)

# =====================================================================
# CATEGORIZE — generic by default; pluggable rules for any site.
# =====================================================================
def strip_url(u):
    return re.sub(r'^https?://', '', str(u).lower()).split('?')[0]

def categorize(entity):
    if CATEGORY_RULES:
        u = strip_url(entity)
        for label, subs in CATEGORY_RULES:
            if any(sub in u for sub in subs):
                return label
        return "Other"
    if CATEGORIZE == "none":
        return "All"
    # "path1": first meaningful path segment (host kept separate). Generic & unbiased.
    u = strip_url(entity).rstrip('/')
    parts = u.split('/')
    host = parts[0]
    seg = next((p for p in parts[1:] if p), None)
    return f"{seg}" if seg else f"{host} (root)"

# (signals/classify/smooth now imported from decay_core — shared, validated math)

# =====================================================================
# RUN
# =====================================================================
grand_total = sum(float(y.sum()) for y in pg_m.values())
min_total = MIN_SHARE * grand_total
kept = {e: y for e, y in pg_m.items() if float(y.sum()) >= min_total}

# relative crash threshold: alerts fire only on bigger pages — those above a
# high percentile of the dataset's own per-entity weekly volume. Configurable.
CRASH_PCTILE = float(os.environ.get("CD_CRASH_PCTILE", "85"))
kept_means = sorted(float(smooth(y).mean()) for y in kept.values())
crash_min_volume = (np.percentile(kept_means, CRASH_PCTILE) if kept_means else 0.0)
crash_min_volume = max(5.0, float(crash_min_volume))

def pack_series(y, y2):
    out = {CFG["metric_label"]: [round(float(v), 2) for v in y]}
    if CFG.get("metric2_label"):
        out[CFG["metric2_label"]] = [round(float(v), 2) for v in y2]
    return out

# categories — aggregate over ALL entities (the full category traffic, not just
# the big pages we analyze individually), so category trends aren't distorted.
cat_m  = defaultdict(lambda: np.zeros(n)); cat_m2 = defaultdict(lambda: np.zeros(n))
page_cat = {}
for e, y in pg_m.items():
    c = categorize(e); page_cat[e] = c
    cat_m[c] += y; cat_m2[c] += pg_m2[e]

pages_out = []
for e, y in kept.items():
    s = signals(y, n, weeks)
    pages_out.append(dict(page=e, category=page_cat[e], label=classify(s, crash_min_volume), **s))

cats_out = []
for c, y in cat_m.items():
    s = signals(y, n, weeks)
    cats_out.append(dict(category=c, label=classify(s, crash_min_volume),
                         series=pack_series(y, cat_m2[c]), **s))

out = dict(source=SOURCE, metric=CFG["metric_label"], metric2=CFG.get("metric2_label"),
           weeks=weeks, week_dates=week_dates, n=n,
           min_share=MIN_SHARE, crash_min_volume=crash_min_volume,
           pages=pages_out, categories=cats_out,
           page_series={p["page"]: pack_series(kept[p["page"]], pg_m2[p["page"]]) for p in pages_out})
os.makedirs("data", exist_ok=True)
json.dump(out, open("data/analysis.json", "w"))

# =====================================================================
# SUMMARY
# =====================================================================
from collections import Counter
ML = CFG["metric_label"]
print(f"source={SOURCE}  metric={ML}  weeks: {weeks[0]} -> {weeks[-1]}  ({n} weeks)")
print(f"entities kept (>= {MIN_SHARE:.4%} of traffic): {len(pages_out)} of {len(pg_m)}   "
      f"categories: {len(cats_out)}   crash_min_volume≈{crash_min_volume:.0f}/wk")
print(f"total {ML} (window): {sum(c['total'] for c in cats_out):,.0f}\n")
print("label distribution:", dict(Counter(p['label'] for p in pages_out)))
print("\nCATEGORIES — ranked by total:")
for c in sorted(cats_out, key=lambda x: -x['total'])[:20]:
    print(f"  {c['category'][:28]:<28} {c['total']:>10,.0f}  slope {c['slope_pct']:+5.1f}%  "
          f"off-peak {c['pct_off_peak']*100:>3.0f}%  -> {c['label']}")
