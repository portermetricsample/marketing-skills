#!/usr/bin/env python3
"""creative_performance — Meta Ads creative classifier + visual QA.

Family member of performance_decay: REUSES decay_core for the trend/fatigue
overlay, ADDS the creative-strategist classification (level-vs-benchmark,
spend-weighted, funnel-aware), grounded in industry frameworks (Motion + 2026
benchmarks).

LEVEL  -> full-period, volume-weighted (total clicks / total impressions, etc.)  = robust
TREND  -> WEEKLY buckets (daily CTR% is pure noise on low-impression days)        = fatigue
Outcome metric is adaptive: ROAS if the account tracks purchases, else CTR.

Run: python3 build.py   -> prints verdicts + writes charts/qa.png
"""
import json, os, sys
from datetime import date
sys.path.insert(0, os.path.expanduser('~/.claude/skills/performance_decay/scripts'))
import decay_core
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from collections import defaultdict

HERE = os.path.expanduser('~/.claude/skills/creative_performance')
D = json.load(open(os.path.join(HERE, 'data/creatives_this_year.json')))
cols = D['columns']; idx = {c: i for i, c in enumerate(cols)}
def gf(r, f):
    try: return float(r[idx[f]] or 0)
    except Exception: return 0.0
def isoweek(yyyymmdd):
    s = str(yyyymmdd); return date(int(s[:4]), int(s[4:6]), int(s[6:8])).isocalendar()[:2]

# ---- aggregate per creative: full totals + daily map ----
ads = defaultdict(lambda: defaultdict(lambda: dict(sp=0, im=0, lc=0, vp=0, tp=0, pu=0, val=0)))
for r in D['rows']:
    name = r[idx['facebook_ads_ad_name']]; day = r[idx['facebook_ads_date']]
    d = ads[name][day]
    d['sp'] += gf(r, 'facebook_ads_spend'); d['im'] += gf(r, 'facebook_ads_impressions')
    d['lc'] += gf(r, 'facebook_ads_inline_link_clicks'); d['vp'] += gf(r, 'facebook_ads_video_play_actions')
    d['tp'] += gf(r, 'facebook_ads_video_thruplay_watched_actions'); d['pu'] += gf(r, 'facebook_ads_purchase')
    d['val'] += gf(r, 'facebook_ads_value_omni_purchase')

def wk_series(daymap, num, den):
    """volume-weighted weekly ratio*100 (e.g. clicks/impr). den=None -> raw weekly sum of num."""
    wk = defaultdict(lambda: [0.0, 0.0])
    for dd, x in daymap.items():
        w = isoweek(dd); wk[w][0] += x[num]; wk[w][1] += (x[den] if den else 1)
    out = []
    for w in sorted(wk):
        n, dnm = wk[w]
        out.append((n / dnm * 100 if dnm > 0 else 0) if den else n)
    return out

C = {}
for name, daymap in ads.items():
    days = sorted(daymap)
    a = dict(sp=0, im=0, lc=0, vp=0, tp=0, pu=0, val=0)
    for dd in days:
        for k in a: a[k] += daymap[dd][k]
    C[name] = dict(
        spend=a['sp'], impr=a['im'], days=len(days), pur=a['pu'],
        thumb=a['vp'] / a['im'] * 100 if a['im'] > 0 else 0,
        hold=a['tp'] / a['vp'] * 100 if a['vp'] > 0 else 0,
        ctr=a['lc'] / a['im'] * 100 if a['im'] > 0 else 0,
        roas=a['val'] / a['sp'] if a['sp'] > 0 else 0,
        wk_ctr=wk_series(daymap, 'lc', 'im'),
        wk_roas=[(v) for v in wk_series(daymap, 'val', 'sp')],  # weekly roas*100 -> /100 below
        n_weeks=len({isoweek(dd) for dd in days}),
    )
    C[name]['wk_roas'] = [v / 100 for v in C[name]['wk_roas']]

# ---- account benchmarks (impression / spend weighted) ----
TIM = sum(c['impr'] for c in C.values()) or 1
TLC = sum(c['ctr'] / 100 * c['impr'] for c in C.values())
TVP = sum(c['thumb'] / 100 * c['impr'] for c in C.values())
TTP = sum(c['hold'] / 100 * (c['thumb'] / 100 * c['impr']) for c in C.values())
TPU = sum(c['pur'] for c in C.values()); TSP = sum(c['spend'] for c in C.values()) or 1
TVAL = sum(c['roas'] * c['spend'] for c in C.values())
BM = dict(ctr=TLC / TIM * 100, thumb=TVP / TIM * 100,
          hold=(TTP / TVP * 100 if TVP > 0 else 0), roas=(TVAL / TSP if TSP > 0 else 0))
HAS_CONV = TPU > 0
OUTKEY = 'roas' if HAS_CONV else 'ctr'

# ---- classification ----
def trend_dir(weekly):
    vals = [float(v) for v in weekly]
    if len([v for v in vals if v]) < 4:   # need >=4 weeks for a real trend
        return 'flat'
    sig = decay_core.signals(vals); lab = decay_core.classify(sig, 0)
    if lab in ('Losing', 'Crashing', 'Crashed'): return 'down'
    if lab == 'Winning': return 'up'
    return 'flat'

def classify(c):
    if c['impr'] < 2000 or c['days'] < 4:
        return 'Testing', 'insufficient data', 'flat'
    out = c[OUTKEY]; bm = BM[OUTKEY] or 1; rel = out / bm
    rt = c['thumb'] / (BM['thumb'] or 1); rh = c['hold'] / (BM['hold'] or 1)
    tdir = trend_dir(c['wk_' + OUTKEY])
    dead = (out < 0.5 * 2.5) if HAS_CONV else (c['ctr'] < 0.5)
    enough_for_fatigue = c['days'] >= 28 and c['n_weeks'] >= 4
    # Unicorn: rare top outlier on outcome + healthy funnel + significant volume
    if rel >= 1.8 and rt >= 0.9 and rh >= 0.85 and c['impr'] >= 5000:
        return 'Unicorn', f'{OUTKEY} {rel:.1f}x avg, funnel strong', tdir
    # Losing: clearly below the account (or absolutely dead) — cut or iterate
    if dead or rel < 0.8:
        return 'Losing', f'{OUTKEY} {rel:.1f}x avg', tdir
    # Fatiguing: a healthy (>=0.8x) ad with enough history and a real downtrend
    if enough_for_fatigue and tdir == 'down':
        return 'Fatiguing', f'{OUTKEY} {rel:.1f}x avg, trending down', tdir
    if rel >= 1.25:
        return 'Winning', f'{OUTKEY} {rel:.1f}x avg', tdir
    return 'Steady', f'{OUTKEY} {rel:.1f}x avg', tdir

# ---- print + render ----
order = sorted(C.items(), key=lambda kv: -kv[1]['spend'])
print(f"benchmarks: CTR {BM['ctr']:.2f}%  Thumb {BM['thumb']:.0f}%  Hold {BM['hold']:.1f}%  "
      f"ROAS {BM['roas']:.2f}  has_conv={HAS_CONV}  outcome={OUTKEY}")
print("=" * 116)
res = {}
for name, c in order:
    v, why, tdir = classify(c); res[name] = (v, tdir)
    print(f"{v:<10} | ${c['spend']:>5.0f} | {c['days']:>3}d/{c['n_weeks']}w | "
          f"CTR {c['ctr']:>5.2f}%({c['ctr']/(BM['ctr'] or 1):>4.1f}x) | Th {c['thumb']:>4.0f}% | "
          f"Hold {c['hold']:>4.1f}% | trend:{tdir:<4} | {name.split('_')[-1][:24]:<24} <- {why}")

n = len(order); cn = 5; rn = (n + cn - 1) // cn
fig, axes = plt.subplots(rn, cn, figsize=(cn * 3.0, rn * 2.4)); axes = axes.flatten()
COL = {'Unicorn': '#7c3aed', 'Winning': '#16a34a', 'Steady': '#2563eb',
       'Fatiguing': '#ea580c', 'Losing': '#dc2626', 'Testing': '#9aa3b2'}
for i, (name, c) in enumerate(order):
    ax = axes[i]; v, tdir = res[name]; col = COL[v]
    s = c['wk_' + OUTKEY]
    ax.plot(range(len(s)), s, color=col, lw=2.0, marker='o', ms=3)
    ax.fill_between(range(len(s)), s, color=col, alpha=0.12)
    ax.axhline(BM[OUTKEY], color='#888', lw=0.9, ls='--')
    ax.set_title(f"{v}  ({c[OUTKEY]/(BM[OUTKEY] or 1):.1f}x, trend {tdir})", color=col, fontsize=9, weight='bold')
    ax.set_xlabel(f"${c['spend']:.0f} · {c['days']}d · Th{c['thumb']:.0f} Ho{c['hold']:.0f} CTR{c['ctr']:.1f}\n{name.split('_')[-1][:22]}", fontsize=6.3)
    ax.set_xticks([]); ax.tick_params(labelsize=6)
for j in range(n, len(axes)): axes[j].axis('off')
fig.suptitle(f"Creative QA (WEEKLY trend) — outcome={OUTKEY}, benchmark(dashed)={BM[OUTKEY]:.2f}", fontsize=11)
fig.tight_layout(rect=[0, 0, 1, 0.96])
fig.savefig(os.path.join(HERE, 'charts/qa.png'), dpi=110, bbox_inches='tight')
print("\nwrote charts/qa.png")
