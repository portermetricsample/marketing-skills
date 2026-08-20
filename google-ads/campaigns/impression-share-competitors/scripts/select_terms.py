#!/usr/bin/env python3
"""Bridge step 1 — turn an impression-share diagnosis into a SERP sampling plan.

    python3 select_terms.py <impression_share.json> <search_terms.json> [options]

Deterministic. No network, no credits spent. Decides WHICH search terms are worth
sampling and at what depth, and prints what it would cost before anything is spent.

Options
    --brand "acme"        brand token(s), comma separated — brand terms are always
                          sampled (competitors conquesting your brand is a classic
                          rank-loss cause), and flagged as their own bucket
    --coverage 0.85       keep taking terms, most expensive first, until this share
                          of the campaign's qualifying search spend is covered
    --marginal 0.01       stop early once the next term adds less than this share
    --min-impressions 30  ignore terms below this over the window (noise floor)
    --max-credits N       hard ceiling; off by default (efficiency comes from the
                          coverage rule, not from an arbitrary cap)
    --out plan.json
"""
import json, re, sys, unicodedata
from collections import defaultdict

# Two ways the auction is costing you reach, and both earn a competitor pull:
#
#   losing_to_rank  — the trajectory is deteriorating and the driver is the auction
#   rank_capped     — the trajectory is flat, but a large share of impressions is
#                     permanently lost to rank. A campaign can sit at "Healthy" for
#                     90 days while handing half its impressions to someone else;
#                     trend alone never surfaces it.
#
# Budget-driven declines are excluded on purpose: the fix is money, and sampling
# would spend credits on something competitor data cannot change.
TRIGGER_LABELS = {'Losing', 'Crashing', 'Crashed'}
TRIGGER_DRIVERS = {'rank', 'mixed'}
RANK_CAP_FLOOR = 0.25          # share of impressions lost to rank, current period

TIER1_PER_CAMPAIGN = 3          # deepest sampling: both devices, repeated
TIER1_DEVICES, TIER1_REPEAT = 'both', 2
TIER2_DEVICES, TIER2_REPEAT = 'desktop', 2   # a single sample misses ~1/3 of the
                                             # advertisers; 3 samples of one keyword
                                             # returned 9 unique ads vs 6 in any one


def norm(s):
    """Fold a query to its comparable form so near-duplicates collapse."""
    s = unicodedata.normalize('NFKD', (s or '').lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', ' ', s)).strip()


def as_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def triggered_campaigns(is_doc, rank_floor=RANK_CAP_FLOOR):
    """Campaigns whose reach the auction is costing — declining OR capped."""
    out = {}
    for c in is_doc.get('campaigns', []):
        label = c.get('trend_label')
        driver = c.get('driver') or (c.get('decline') or {}).get('driver')
        cur = c.get('current') or {}
        rank_lost = cur.get('rank_lost')
        if rank_lost is None:
            rank_lost = c.get('rank_lost_recent')
        reasons = []
        if label in TRIGGER_LABELS and driver in TRIGGER_DRIVERS:
            reasons.append('losing_to_rank')
        if (cur.get('verdict') == 'rank_limited'
                or (rank_lost is not None and rank_lost >= rank_floor)):
            reasons.append('rank_capped')
        if reasons:
            out[c.get('campaign')] = {
                'trend_label': label, 'driver': driver,
                'rank_lost': round(rank_lost, 4) if rank_lost is not None else None,
                'trigger': reasons,
            }
    return out


def cluster(rows, campaigns, brand_tokens, min_impressions):
    """Group search terms by the keyword that triggered them.

    Dozens of long-tail variants usually belong to one keyword and one auction.
    Sampling all of them buys near-identical data at full price, so each cluster
    is represented by its highest-spend term and carries the cluster's weight.
    """
    clusters = defaultdict(lambda: {'terms': [], 'cost': 0.0, 'impressions': 0.0})
    skipped = []
    for r in rows:
        camp = r.get('google_ads_campaign_name') or r.get('campaign')
        if camp not in campaigns:
            continue
        term = r.get('google_ads_search_term') or r.get('search_term')
        if not term:
            continue
        impressions = as_float(r.get('google_ads_impressions') or r.get('impressions'))
        cost = as_float(r.get('google_ads_cost') or r.get('cost') or r.get('spend'))
        if impressions < min_impressions:
            skipped.append({'term': term, 'campaign': camp, 'reason': 'below impression floor',
                            'impressions': impressions})
            continue
        kw = r.get('google_ads_keyword_info_text') or r.get('keyword') or term
        key = (camp, norm(kw) or norm(term))
        c = clusters[key]
        c['terms'].append(term)
        c['cost'] += cost
        c['impressions'] += impressions
        c['campaign'] = camp
        c['keyword'] = kw
        c['match_type'] = (r.get('google_ads_keyword_info_match_type')
                           or r.get('match_type') or c.get('match_type'))
        # the representative is the term that actually spends the money
        if cost >= as_float(c.get('rep_cost')):
            c['rep'], c['rep_cost'] = term, cost
        c['brand'] = any(t and t in norm(term) for t in brand_tokens)
    return clusters, skipped


def select(clusters, campaigns, coverage, marginal, max_credits):
    """Take clusters down the spend curve until coverage is met or gains go flat."""
    by_campaign = defaultdict(list)
    for (camp, _), c in clusters.items():
        by_campaign[camp].append(c)

    plan, dropped = [], []
    for camp, items in by_campaign.items():
        total = sum(c['cost'] for c in items) or 1.0
        # The brand exemption exists so a conquesting rival on your name is never
        # dropped by a spend rule. In a BRAND campaign every term is a brand term, so
        # the exemption would bypass coverage entirely and sample the whole tail.
        brand_share = sum(c['cost'] for c in items if c.get('brand')) / total
        brand_privileged = brand_share <= 0.6
        for c in items:
            c['brand_exempt'] = bool(c.get('brand')) and brand_privileged
        items.sort(key=lambda c: (not c.get('brand_exempt'), -c['cost']))
        taken, running = 0, 0.0
        for c in items:
            share = c['cost'] / total
            if taken and not c.get('brand_exempt'):
                if running >= coverage:
                    dropped.append({'term': c['rep'], 'campaign': camp,
                                    'reason': f'coverage {coverage:.0%} already met',
                                    'cost': round(c['cost'], 2)})
                    continue
                if share < marginal:
                    dropped.append({'term': c['rep'], 'campaign': camp,
                                    'reason': f'marginal: adds {share:.1%} of campaign spend',
                                    'cost': round(c['cost'], 2)})
                    continue
            tier = 1 if (taken < TIER1_PER_CAMPAIGN or c.get('brand_exempt')) else 2
            devices = TIER1_DEVICES if tier == 1 else TIER2_DEVICES
            repeat = TIER1_REPEAT if tier == 1 else TIER2_REPEAT
            plan.append({
                'campaign': camp,
                'trend_label': campaigns[camp]['trend_label'],
                'driver': campaigns[camp]['driver'],
                'trigger': campaigns[camp]['trigger'],
                'term': c['rep'],
                'owning_keyword': c.get('keyword'),
                'match_type': c.get('match_type'),
                'brand': bool(c.get('brand')),
                'brand_exempt': bool(c.get('brand_exempt')),
                'cluster_size': len(c['terms']),
                'cost': round(c['cost'], 2),
                'spend_share': round(share, 4),
                'impressions': int(c['impressions']),
                'tier': tier, 'devices': devices, 'repeat': repeat,
                'credits': (2 if devices == 'both' else 1) * repeat,
            })
            taken += 1
            running += share

    # coverage is the honest completeness metric: how much of the money and the
    # impressions behind this decline the sample actually looks at
    universe = defaultdict(lambda: {'cost': 0.0, 'impressions': 0.0, 'clusters': 0})
    for (camp, _), c in clusters.items():
        u = universe[camp]
        u['cost'] += c['cost']
        u['impressions'] += c['impressions']
        u['clusters'] += 1
    coverage_by_campaign = {}
    for camp, u in universe.items():
        picked = [p for p in plan if p['campaign'] == camp]
        coverage_by_campaign[camp] = {
            'brand_share_of_spend': round(
                sum(c['cost'] for (cp, _), c in clusters.items()
                    if cp == camp and c.get('brand')) / (u['cost'] or 1), 3),
            'spend_covered': round(sum(p['cost'] for p in picked) / (u['cost'] or 1), 3),
            'impressions_covered': round(
                sum(p['impressions'] for p in picked) / (u['impressions'] or 1), 3),
            'clusters_sampled': len(picked),
            'clusters_total': u['clusters'],
            'variants_represented': sum(p['cluster_size'] for p in picked),
        }

    plan.sort(key=lambda p: (p['tier'], -p['cost']))
    if max_credits:
        kept, spent = [], 0
        for p in plan:
            if spent + p['credits'] > max_credits:
                dropped.append({'term': p['term'], 'campaign': p['campaign'],
                                'reason': f'--max-credits {max_credits} reached',
                                'cost': p['cost']})
                continue
            kept.append(p)
            spent += p['credits']
        plan = kept
    return plan, dropped, coverage_by_campaign


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    is_path, st_path = argv[0], argv[1]
    opts = dict(zip(argv[2::2], argv[3::2]))
    brand = [norm(b) for b in (opts.get('--brand') or '').split(',') if b.strip()]
    coverage = float(opts.get('--coverage', 0.85))
    marginal = float(opts.get('--marginal', 0.01))
    floor = float(opts.get('--min-impressions', 30))
    max_credits = int(opts['--max-credits']) if opts.get('--max-credits') else None
    out = opts.get('--out', 'plan.json')

    is_doc = json.load(open(is_path))
    st_rows = json.load(open(st_path))
    if isinstance(st_rows, dict):
        st_rows = st_rows.get('rows') or st_rows.get('data') or []

    campaigns = triggered_campaigns(is_doc)
    if not campaigns:
        print('No campaign qualifies: nothing is declining because of the auction, and '
              'nothing is capped by rank above the floor. Competitor sampling would not '
              'change any decision.')
        json.dump({'plan': [], 'skipped': [], 'estimate': {'credits': 0}},
                  open(out, 'w'), indent=2)
        return

    clusters, below_floor = cluster(st_rows, campaigns, brand, floor)
    plan, dropped, cov = select(clusters, campaigns, coverage, marginal, max_credits)
    credits = sum(p['credits'] for p in plan)

    doc = {
        'meta': {'account': (is_doc.get('meta') or {}).get('account'),
                 'source_skill': 'impression-share',
                 'trigger': {'labels': sorted(TRIGGER_LABELS),
                             'drivers': sorted(TRIGGER_DRIVERS),
                             'rank_cap_floor': RANK_CAP_FLOOR},
                 'rules': {'coverage': coverage, 'marginal': marginal,
                           'min_impressions': floor, 'max_credits': max_credits}},
        'campaigns_triggered': campaigns,
        'coverage': cov,
        'estimate': {'terms': len(plan), 'credits': credits,
                     'tier1': sum(1 for p in plan if p['tier'] == 1),
                     'tier2': sum(1 for p in plan if p['tier'] == 2)},
        'plan': plan,
        # never a silent cap: everything left out says why
        'skipped': dropped + below_floor,
    }
    json.dump(doc, open(out, 'w'), ensure_ascii=False, indent=2)

    listed = ', '.join(
        f"{k} [{v['trend_label']}/{v['driver']}"
        + (f", {v['rank_lost']:.0%} lost to rank" if v.get('rank_lost') is not None else '')
        + f" → {'+'.join(v['trigger'])}]" for k, v in campaigns.items())
    print(f"{len(campaigns)} campaign(s) triggered: {listed}")
    print(f"{len(plan)} terms to sample "
          f"({doc['estimate']['tier1']} deep, {doc['estimate']['tier2']} shallow) "
          f"→ ESTIMATED {credits} credits")
    print(f"{len(doc['skipped'])} terms skipped (reasons in {out})")
    for camp, c in cov.items():
        print(f"   coverage · {camp}: {c['spend_covered']:.0%} of spend, "
              f"{c['impressions_covered']:.0%} of impressions, "
              f"{c['clusters_sampled']}/{c['clusters_total']} keyword clusters "
              f"({c['variants_represented']} term variants represented)")
    for p in plan[:10]:
        tag = ' [brand]' if p['brand'] else ''
        print(f"   t{p['tier']} {p['credits']}c  {p['term']!r}{tag}  "
              f"({p['spend_share']:.0%} of {p['campaign']}, {p['cluster_size']} variants)")
    if len(plan) > 10:
        print(f"   … {len(plan) - 10} more in {out}")


if __name__ == '__main__':
    main(sys.argv[1:])
