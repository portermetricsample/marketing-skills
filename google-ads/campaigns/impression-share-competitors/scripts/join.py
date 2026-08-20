#!/usr/bin/env python3
"""Bridge step 3 — join the SERP samples back onto the impression-share diagnosis.

    python3 join.py <impression_share.json> <plan.json> <ads.json> [<ads.json> ...] [options]

Deterministic. No network. Produces one object per triggered campaign: the visibility
verdict from the account's own data, plus who is actually in the auctions behind it.

Options
    --own-domain acme.com   your domain — used to report whether YOUR ad appeared
    --out competitors.json
"""
import json, math, sys
from collections import defaultdict


def wilson(hits, n, z=1.96):
    """95% confidence interval for a proportion, Wilson score.

    Presence across samples is a proportion estimated from a handful of draws, so it
    carries real uncertainty. Reporting it bare invites reading 6/10 as "60% share";
    the interval shows it is closer to "somewhere between 31% and 83%".
    """
    if not n:
        return None
    p = hits / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0.0, centre - half), 2), round(min(1.0, centre + half), 2)]


def load_ads(paths):
    """Flatten every teardown output into (query, device, ad) triples.

    Also returns every (query, device) that was sampled, including the ones that
    came back with no ads at all — "we looked and nobody advertises here" is a
    finding, and dropping those terms would silently overstate the competition.
    """
    out, sampled = [], []
    for p in paths:
        doc = json.load(open(p))
        for s in doc.get('searches', []):
            sampled.append((s.get('query'), s.get('device'), s.get('ad_count') or 0,
                            s.get('other_blocks')))
            for a in s.get('ads', []):
                out.append((s.get('query'), s.get('device'), a))
    return out, sampled


def root(a):
    return (a.get('domain') or '').lower()


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    is_path, plan_path = argv[0], argv[1]
    opts, ad_paths, i = {}, [], 2
    while i < len(argv):
        if argv[i].startswith('--'):
            opts[argv[i]] = argv[i + 1] if i + 1 < len(argv) else ''
            i += 2
        else:
            ad_paths.append(argv[i])
            i += 1
    own = (opts.get('--own-domain') or '').lower().replace('www.', '')
    out_path = opts.get('--out', 'competitors.json')

    is_doc = json.load(open(is_path))
    plan_doc = json.load(open(plan_path))
    plan = plan_doc.get('plan', [])
    ads, sampled = load_ads(ad_paths)

    # which terms belong to which campaign
    term_campaign = {p['term']: p for p in plan}
    by_campaign = defaultdict(lambda: {'terms': [], 'rivals': defaultdict(
        lambda: {'terms': set(), 'devices': set(), 'ranks': [], 'landing_pages': set(),
                 'offers': set(), 'campaigns_seen': set(), 'samples_present': 0,
                 'samples_total': 0, 'intermittent': False,
                 'by_term': defaultdict(lambda: {'ranks': [], 'devices': set()})})})

    sampled_terms = defaultdict(lambda: {'devices': set(), 'ad_count': 0, 'own_ranks': [],
                                         'no_ads_blocks': None})
    # register every sampled term first, so zero-ad terms survive into the output
    for query, device, count, blocks in sampled:
        p = term_campaign.get(query)
        if not p:
            continue
        st = sampled_terms[(p['campaign'], query)]
        st['devices'].add(device)
        if not count:
            st['no_ads_blocks'] = blocks

    for query, device, ad in ads:
        p = term_campaign.get(query)
        if not p:
            continue
        camp = p['campaign']
        bucket = by_campaign[camp]
        st = sampled_terms[(camp, query)]
        st['devices'].add(device)
        st['ad_count'] += 1

        if ad.get('ad_type') != 'search':
            # kept as context, never as an explanation for search impression share
            bucket.setdefault('other_inventory', defaultdict(
                lambda: {'terms': set(), 'devices': set(), 'ranks': []}))
            oi = bucket['other_inventory'][(ad.get('advertiser') or root(ad), ad.get('ad_type'))]
            oi['terms'].add(query)
            oi['devices'].add(device)
            if ad.get('rank') is not None:
                oi['ranks'].append(ad['rank'])
            continue

        d = root(ad)
        if own and own in d:
            st['own_ranks'].append(ad.get('rank'))
            continue                      # your own ad is not a rival
        r = bucket['rivals'][ad.get('advertiser') or d]
        r['terms'].add(query)
        r['devices'].add(device)
        r['ranks'].append(ad.get('rank'))
        cell = r['by_term'][query]          # per-term cell, for the rank matrix
        if ad.get('rank') is not None:
            cell['ranks'].append(ad['rank'])
        cell['devices'].add(device)
        o = ad.get('observations') or {}
        r['samples_present'] += o.get('times_seen', 1)
        r['samples_total'] += o.get('of_samples', 1)
        if o.get('of_samples', 1) > 1 and o.get('times_seen', 1) < o['of_samples']:
            r['intermittent'] = True
        if (ad.get('destination') or {}).get('url'):
            r['landing_pages'].add(ad['destination']['url'])
        for offer in (ad.get('cta') or {}).get('offer') or []:
            r['offers'].add(offer)
        r['campaigns_seen'].add(camp)

    campaigns = []
    for c in is_doc.get('campaigns', []):
        name = c.get('campaign')
        if name not in by_campaign:
            continue
        terms = [{'term': t, 'devices': sorted(v['devices']), 'ads_seen': v['ad_count'],
                  'no_ads_anywhere': (v['ad_count'] == 0) or None,
                  'page_had': v['no_ads_blocks'] if v['ad_count'] == 0 else None,
                  'own_ad_ranks': [r for r in v['own_ranks'] if r is not None] or None,
                  'own_ad_rank_best': (min([r for r in v['own_ranks'] if r is not None])
                                       if any(r is not None for r in v['own_ranks']) else None),
                  'own_ad_present': bool(v['own_ranks'])}
                 for (camp, t), v in sampled_terms.items() if camp == name]
        rivals = []
        for adv, r in by_campaign[name]['rivals'].items():
            ranks = [x for x in r['ranks'] if x is not None]
            rivals.append({
                'advertiser': adv,
                'terms_present_on': len(r['terms']),
                'terms_sampled': len(terms),
                'presence': round(len(r['terms']) / max(len(terms), 1), 2),
                'devices': sorted(r['devices']),
                'rank_best': min(ranks) if ranks else None,
                'rank_worst': max(ranks) if ranks else None,
                'landing_pages': sorted(r['landing_pages']) or None,
                'offers': sorted(r['offers']) or None,
                # present in every sample, or rotating in and out
                'appearance': ('intermittent' if r['intermittent'] else 'consistent'),
                'samples_present': r['samples_present'],
                'samples_total': r['samples_total'],
                # a visibility proxy, with the uncertainty attached. NOT impression share:
                # every sample comes from one location, one device and one short window,
                # so it cannot see dayparting or budget exhaustion — the two things that
                # actually drive impression share down.
                'sample_presence': (round(r['samples_present'] / r['samples_total'], 2)
                                    if r['samples_total'] else None),
                'sample_presence_ci95': wilson(r['samples_present'], r['samples_total']),
                'by_term': {t: {'rank_best': min(v['ranks']) if v['ranks'] else None,
                                'devices': sorted(v['devices'])}
                            for t, v in r['by_term'].items()},
            })
        other = [{'advertiser': a, 'ad_type': t, 'terms_present_on': len(v['terms']),
                  'devices': sorted(v['devices']),
                  'rank_best': min(v['ranks']) if v['ranks'] else None}
                 for (a, t), v in (by_campaign[name].get('other_inventory') or {}).items()]
        other.sort(key=lambda x: (x['rank_best'] if x['rank_best'] else 99))
        rivals.sort(key=lambda x: (-x['terms_present_on'],
                                   x['rank_best'] if x['rank_best'] else 99))
        intermittent = sum(1 for r in rivals if r['appearance'] == 'intermittent')
        empty = sum(1 for t in terms if t.get('no_ads_anywhere'))
        plan_cov = (plan_doc.get('coverage') or {}).get(name, {})
        completeness = {
            'spend_covered': plan_cov.get('spend_covered'),
            'impressions_covered': plan_cov.get('impressions_covered'),
            'keyword_clusters_sampled': plan_cov.get('clusters_sampled'),
            'keyword_clusters_total': plan_cov.get('clusters_total'),
            'term_variants_represented': plan_cov.get('variants_represented'),
            'terms_with_no_ads_at_all': empty or None,
            'rivals_found': len(rivals),
            'rivals_intermittent': intermittent,
            # rotation means the roster was still moving when sampling stopped
            'roster_likely_incomplete': bool(rivals and intermittent / len(rivals) > 0.3),
        }
        # A rival that REACHES your best rank is taking the slot from you in some
        # share of auctions — best ranks are per-term maxima, so a tie means the two
        # of you alternate. Ties count as being outranked, not as leading.
        outranked = sum(1 for t in terms
                        for r in rivals
                        if (r.get('by_term') or {}).get(t['term'])
                        and t.get('own_ad_rank_best') is not None
                        and (r['by_term'][t['term']].get('rank_best') or 99)
                        <= t['own_ad_rank_best'])
        absent = sum(1 for t in terms
                     if not t['own_ad_present'] and not t.get('no_ads_anywhere'))
        if not own:
            verdict = 'no_own_domain_given'
        elif absent:
            verdict = 'not_shown'          # missing from auctions you pay for
        elif outranked:
            verdict = 'outranked'          # rivals reach or beat your position
        elif rivals:
            verdict = 'leading'            # rivals are here and you are ahead of all of
                                           # them — the lost reach is in auctions this
                                           # sample did not reach
        else:
            verdict = 'unexplained'        # nobody is competing at all, yet reach is lost
        campaigns.append({
            'campaign': name,
            'completeness': completeness,
            'verdict': verdict,
            'other_inventory': other or None,
            'trend_label': c.get('trend_label'),
            'driver': c.get('driver') or (c.get('decline') or {}).get('driver'),
            'terms_sampled': terms,
            'own_presence': {
                'terms_where_our_ad_appeared':
                    sum(1 for t in terms if t['own_ad_present']),
                'of_terms_sampled': len(terms),
            } if own else None,
            'rivals': rivals,
        })

    doc = {
        'meta': {
            'account': (is_doc.get('meta') or {}).get('account'),
            'skill': 'impression-share-competitors',
            'inputs': {'impression_share': is_path, 'plan': plan_path, 'serp': ad_paths},
            'own_domain': own or None,
            # the honest boundary, carried in the data so a reader can't miss it
            'caveat': ('SERP samples are live and point-in-time. They describe who is in '
                       'these auctions now, not who was there when impression share fell. '
                       'Presence is a sample rate across sampled terms, not an '
                       'impression-weighted overlap rate. sample_presence is a visibility '
                       'proxy for rivals only — for your own campaigns the account already '
                       'reports exact, impression-weighted impression share.'),
        },
        'synthesis': {'headline': '', 'diagnosis': '', 'action': ''},
        'campaigns': campaigns,
    }
    json.dump(doc, open(out_path, 'w'), ensure_ascii=False, indent=2)

    print(f"{len(campaigns)} campaign(s) joined → {out_path}")
    for c in campaigns:
        print(f"\n  {c['campaign']}  [{c['trend_label']} / {c['driver']}]  "
              f"{len(c['terms_sampled'])} terms sampled")
        cm = c['completeness']
        if cm.get('spend_covered') is not None:
            print(f"     covers {cm['spend_covered']:.0%} of campaign spend · "
                  f"{cm['keyword_clusters_sampled']}/{cm['keyword_clusters_total']} clusters · "
                  f"{cm['rivals_found']} rivals"
                  + (" · roster still moving, sample deeper"
                     if cm['roster_likely_incomplete'] else " · roster stable"))
        if c.get('own_presence'):
            op = c['own_presence']
            print(f"     our ad appeared on {op['terms_where_our_ad_appeared']}"
                  f"/{op['of_terms_sampled']} terms")
        print(f"     verdict: {c['verdict']}")
        if c.get('other_inventory'):
            kinds = {}
            for o in c['other_inventory']:
                kinds[o['ad_type']] = kinds.get(o['ad_type'], 0) + 1
            print("     other inventory (different auction, not counted): "
                  + ", ".join(f"{v} {k}" for k, v in kinds.items()))
        for r in c['rivals'][:5]:
            offers = f" · {', '.join(r['offers'])}" if r['offers'] else ''
            print(f"     {r['advertiser']:<24} on {r['terms_present_on']}/{r['terms_sampled']} "
                  f"terms, best rank {r['rank_best']}{offers}")


if __name__ == '__main__':
    main(sys.argv[1:])
