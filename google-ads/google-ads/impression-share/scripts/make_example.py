#!/usr/bin/env python3
"""Generate a FICTIONAL Acme Insurance daily dataset (query_data shape) + meta, for the demos.
Synthetic, deterministic (no randomness, no real data) — per RULES.md. Run: python3 make_example.py
Writes example/acme_daily_90d.json (daily IS rows) and example/acme_meta.json (account + spend)."""
import json, os, math, datetime

# fictional Acme campaigns: (raw name, friendly label, 90d spend, base IS, driver lean, daily impressions)
# driver lean splits the lost share: "rank" → mostly rank-lost, "budget" → mostly budget-lost, "mixed" → both
CAMPS = [
    ("Acme_Auto_SEM_(TL)", "Auto (non-brand)", 184200, 0.30, "rank", 1700),
    ("Acme_Home_SEM_(HD)", "Home", 52400, 0.23, "budget", 1300),
    ("Acme_Life_SEM_(TL)", "Life", 39800, 0.27, "rank", 1500),
    ("Acme_Health_SEM_(HD)", "Health", 31100, 0.20, "budget", 1100),
    ("Acme_Renters_SEM_(HA)", "Renters", 19600, 0.20, "mixed", 700),
    ("Acme_Pet_SEM_Test_(HA)", "Pet (test)", 8900, 0.11, "rank", 250),   # short history (starts late)
    ("Acme_Brand_SEM_(BR)", "Brand", 7300, 0.83, "rank", 350),           # near-saturated, flat
]
START = datetime.date(2026, 4, 1)
DAYS = 84

COLS = ["google_ads_campaign_name", "google_ads_date", "google_ads_search_impression_share",
        "google_ads_search_rank_lost_impression_share", "google_ads_search_budget_lost_impression_share",
        "google_ads_impressions", "google_ads_search_top_impression_share",
        "google_ads_search_absolute_top_impression_share", "google_ads_search_rank_lost_top_impression_share"]


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def main():
    rows = []
    for ci, (name, _lab, _sp, base, lean, impr) in enumerate(CAMPS):
        start_day = 60 if "Test" in name else 0   # the test campaign has a short history
        for d in range(start_day, DAYS):
            date = START + datetime.timedelta(days=d)
            # gentle upward trend (brand stays flat) + a deterministic daily wiggle
            trend = 0.0 if base > 0.7 else 0.12 * (d / DAYS)
            wig = 0.05 * math.sin((d + ci * 5) / 4.0)
            is_ = clamp(base + trend + wig, 0.05, 0.95)
            lost = 1 - is_
            if lean == "rank":
                rk = lost * (0.72 + 0.1 * math.sin((d + ci) / 6.0))
            elif lean == "budget":
                rk = lost * (0.22 + 0.1 * math.sin((d + ci) / 6.0))
            else:
                rk = lost * (0.5 + 0.12 * math.sin((d + ci) / 5.0))
            rk = clamp(rk, 0.0, lost)
            bg = lost - rk
            day_impr = round(impr * (0.85 + 0.3 * abs(math.sin((d + ci) / 7.0))))
            # top-of-page (premium position): you reach the top a fraction of the time you show
            top = clamp(is_ * 0.72, 0.0, 0.95); abstop = top * 0.55; ranktop = clamp(rk * 0.85, 0.0, 1.0)
            rows.append([name, date.strftime("%Y%m%d"),
                         round(is_, 6), round(rk, 6), round(bg, 6), float(day_impr),
                         round(top, 6), round(abstop, 6), round(ranktop, 6)])

    os.makedirs(os.path.join(os.path.dirname(__file__), "example"), exist_ok=True)
    out = {"columns": COLS, "rows": rows, "total_rows": len(rows)}
    base_dir = os.path.join(os.path.dirname(__file__), "example")
    json.dump(out, open(os.path.join(base_dir, "acme_daily_90d.json"), "w"))
    meta = {"account": "Acme Insurance (1234567890-1234567890)",
            "period": {"from": START.strftime("%Y-%m-%d"),
                       "to": (START + datetime.timedelta(days=DAYS - 1)).strftime("%Y-%m-%d")},
            "spend": {c[0]: c[2] for c in CAMPS}}
    json.dump(meta, open(os.path.join(base_dir, "acme_meta.json"), "w"), indent=1)
    print("wrote example/acme_daily_90d.json (%d rows) + example/acme_meta.json (%d campaigns)" % (len(rows), len(CAMPS)))


if __name__ == "__main__":
    main()
