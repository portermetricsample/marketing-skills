#!/usr/bin/env python3
"""creative_decay — Meta Ads creative classifier (Content Decay family).

A sibling of `performance_decay`: same philosophy (trend-aware health labels),
but tuned for AD-RATE metrics over short/daily windows instead of SEO traffic.
It REUSES `performance_decay/decay_core` for the trend/fatigue overlay and adds
the creative-strategist layer: level-vs-account-benchmark, spend honesty, and a
3-stage funnel read (Attention -> Engagement -> Conversion).

Design (calibrated visually against a real golf-account dataset):
  LEVEL  -> full-period, volume-weighted (total clicks / total impressions...). Robust. Drives the verdict.
  TREND  -> WEEKLY buckets fed to decay_core. Daily CTR% is pure noise on low-impression days. Only nuances the verdict.
  OUTCOME -> adaptive: ROAS if the account tracks purchases, else CTR (engagement proxy).

Verdicts: Unicorn | Winning | Steady | Fatiguing | Losing | Testing
Pure function -> MCP-exposable. No plotting, no I/O.

Industry grounding (see reference/framework.md): Motion 3-stage funnel; Thumbstop
3s/impr (30-40% solid); Hold = ThruPlay / 3s-plays (40-50% avg); CTR Meta ~0.9-1.5%
avg, >1.5% strong, kill <0.5%; ROAS 2.5-4 avg, scale at 2-3x; fatigue = CTR down + CPM up.
"""
import os, sys
from datetime import date
from collections import defaultdict
sys.path.insert(0, os.path.expanduser('~/.claude/skills/performance_decay/scripts'))
import decay_core

# field names (Porter facebook_ads_*)
F = dict(name='facebook_ads_ad_name', date='facebook_ads_date', spend='facebook_ads_spend',
         impr='facebook_ads_impressions', clicks='facebook_ads_inline_link_clicks',
         vplays='facebook_ads_video_play_actions', thruplay='facebook_ads_video_thruplay_watched_actions',
         purch='facebook_ads_purchase', value='facebook_ads_value_omni_purchase')

# tunable thresholds — every number traces to reference/framework.md
TH = dict(
    min_impr=2000, min_days=4,        # significance gate (Motion: judge only with enough data)
    fatigue_min_days=28, fatigue_min_weeks=4,
    unicorn_rel=1.8, unicorn_impr=5000, unicorn_thumb_rel=0.90, unicorn_hold_rel=0.85,
    winning_rel=1.25, losing_rel=0.80,  # band edges around the account benchmark
    dead_ctr=0.5, dead_roas_mult=0.5,   # absolute kill floors
)


def _iso(d):
    s = str(d); return date(int(s[:4]), int(s[4:6]), int(s[6:8])).isocalendar()[:2]


def _weekly_ratio(daymap, num, den):
    wk = defaultdict(lambda: [0.0, 0.0])
    for dd, x in daymap.items():
        w = _iso(dd); wk[w][0] += x[num]; wk[w][1] += x[den]
    return [(n / d * 100 if d > 0 else 0.0) for w in sorted(wk) for n, d in [wk[w]]]


def _trend_dir(weekly):
    vals = [float(v) for v in weekly]
    if len([v for v in vals if v]) < 4:
        return 'flat'
    lab = decay_core.classify(decay_core.signals(vals), 0)
    if lab in ('Losing', 'Crashing', 'Crashed'):
        return 'down'
    return 'up' if lab == 'Winning' else 'flat'


def classify_creatives(rows, columns, target_cpa=None):
    """rows: list[list], columns: list[str] (Porter query_data shape).
    Returns list of dicts sorted by spend desc, each with verdict + metrics + trend + reason.
    """
    idx = {c: i for i, c in enumerate(columns)}

    def gf(r, key):
        try: return float(r[idx[F[key]]] or 0)
        except Exception: return 0.0

    ads = defaultdict(lambda: defaultdict(lambda: dict(sp=0, im=0, lc=0, vp=0, tp=0, pu=0, val=0)))
    for r in rows:
        nm = r[idx[F['name']]]; dd = r[idx[F['date']]]
        x = ads[nm][dd]
        x['sp'] += gf(r, 'spend'); x['im'] += gf(r, 'impr'); x['lc'] += gf(r, 'clicks')
        x['vp'] += gf(r, 'vplays'); x['tp'] += gf(r, 'thruplay')
        x['pu'] += gf(r, 'purch'); x['val'] += gf(r, 'value')

    C = {}
    for nm, daymap in ads.items():
        a = dict(sp=0, im=0, lc=0, vp=0, tp=0, pu=0, val=0)
        for x in daymap.values():
            for k in a: a[k] += x[k]
        C[nm] = dict(
            spend=a['sp'], impr=a['im'], days=len(daymap), pur=a['pu'],
            thumb=a['vp'] / a['im'] * 100 if a['im'] else 0,
            hold=a['tp'] / a['vp'] * 100 if a['vp'] else 0,
            ctr=a['lc'] / a['im'] * 100 if a['im'] else 0,
            roas=a['val'] / a['sp'] if a['sp'] else 0,
            cpa=a['sp'] / a['pu'] if a['pu'] else None,
            n_weeks=len({_iso(d) for d in daymap}),
            wk_ctr=_weekly_ratio(daymap, 'lc', 'im'),
            wk_roas=[v / 100 for v in _weekly_ratio(daymap, 'val', 'sp')],
        )

    tim = sum(c['impr'] for c in C.values()) or 1
    bm = dict(
        ctr=sum(c['ctr'] / 100 * c['impr'] for c in C.values()) / tim * 100,
        thumb=sum(c['thumb'] / 100 * c['impr'] for c in C.values()) / tim * 100,
    )
    tvp = sum(c['thumb'] / 100 * c['impr'] for c in C.values()) or 1
    bm['hold'] = sum(c['hold'] / 100 * (c['thumb'] / 100 * c['impr']) for c in C.values()) / tvp * 100
    tsp = sum(c['spend'] for c in C.values()) or 1
    bm['roas'] = sum(c['roas'] * c['spend'] for c in C.values()) / tsp
    has_conv = sum(c['pur'] for c in C.values()) > 0
    okey = 'roas' if has_conv else 'ctr'

    out = []
    for nm, c in sorted(C.items(), key=lambda kv: -kv[1]['spend']):
        rel = c[okey] / (bm[okey] or 1)
        rt = c['thumb'] / (bm['thumb'] or 1)
        rh = c['hold'] / (bm['hold'] or 1)
        tdir = _trend_dir(c['wk_' + okey])
        if has_conv:
            dead = c['roas'] < TH['dead_roas_mult'] * 2.5 or (
                target_cpa and c['cpa'] and c['pur'] == 0 and c['spend'] > 3 * target_cpa)
        else:
            dead = c['ctr'] < TH['dead_ctr']
        aged = c['days'] >= TH['fatigue_min_days'] and c['n_weeks'] >= TH['fatigue_min_weeks']

        if c['impr'] < TH['min_impr'] or c['days'] < TH['min_days']:
            v, why = 'Testing', 'insufficient data'
        elif rel >= TH['unicorn_rel'] and rt >= TH['unicorn_thumb_rel'] and rh >= TH['unicorn_hold_rel'] and c['impr'] >= TH['unicorn_impr']:
            v, why = 'Unicorn', f'{okey} {rel:.1f}x avg + strong funnel'
        elif dead or rel < TH['losing_rel']:
            v, why = 'Losing', f'{okey} {rel:.1f}x avg'
        elif aged and tdir == 'down':
            v, why = 'Fatiguing', f'{okey} {rel:.1f}x avg, trending down'
        elif rel >= TH['winning_rel']:
            v, why = 'Winning', f'{okey} {rel:.1f}x avg'
        else:
            v, why = 'Steady', f'{okey} {rel:.1f}x avg'

        out.append(dict(name=nm, verdict=v, reason=why, trend=tdir, outcome_metric=okey,
                        rel=round(rel, 2), spend=round(c['spend'], 2), impressions=int(c['impr']),
                        days=c['days'], ctr=round(c['ctr'], 2), thumbstop=round(c['thumb'], 1),
                        hold=round(c['hold'], 1), roas=round(c['roas'], 2)))
    return dict(benchmarks={k: round(v, 2) for k, v in bm.items()},
                outcome_metric=okey, has_conversions=has_conv, creatives=out)


if __name__ == '__main__':
    import json
    HERE = os.path.expanduser('~/.claude/skills/creative_performance')
    D = json.load(open(os.path.join(HERE, 'data/creatives_this_year.json')))
    res = classify_creatives(D['rows'], D['columns'])
    print('benchmarks', res['benchmarks'], 'outcome', res['outcome_metric'])
    for c in res['creatives']:
        print(f"{c['verdict']:<10} {c['rel']:>4}x  ${c['spend']:>6.0f}  {c['days']:>3}d  "
              f"CTR {c['ctr']:>5}%  trend {c['trend']:<4}  {c['name'][:50]}")
