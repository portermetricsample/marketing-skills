#!/usr/bin/env python3
"""Google Search ads teardown: fetch → clean → enrich → structured JSON.

    python3 ads_pipeline.py "keyword one" "keyword two" [options]

Options
    --loc  "Bogota,Bogota,Colombia"   where the search runs from (default: United States)
    --gl   co        country code (default: us)
    --hl   es        language code (default: en)
    --device both    desktop | mobile | tablet | both | comma list (default: both)
    --repeat N       sample each keyword N times and merge (default 1). Ads rotate
                     between calls, so N>1 is what makes "who competes here"
                     defensible. Implies --fresh. Costs N credits per keyword per device.
    --fresh          bypass the 1h cache and force a live auction. Without this,
                     repeating a keyword inside an hour returns the SAME cached
                     result (free, but not a new sample).
    --out  DIR       output directory (default: ./ads_out)
    --csv            also write a flat one-row-per-ad CSV
    --raw            also keep the untouched API responses
    --schema         print the output contract and exit (spends nothing)

Cost: 1 credit per keyword, per device, per repeat.
Key is read from $SERPAPI_KEY or ~/.serpapi_key.
"""
import csv, json, os, re, sys, time, urllib.parse as up, urllib.request
from collections import defaultdict


# --------------------------------------------------------------- key --------
def api_key():
    k = os.environ.get('SERPAPI_KEY')
    if k:
        return k.strip()
    path = os.path.expanduser('~/.serpapi_key')
    if os.path.exists(path):
        return open(path).read().strip()
    sys.exit('No API key. Set $SERPAPI_KEY or write it to ~/.serpapi_key')


# -------------------------------------------------------------- fetch -------
def fetch(q, loc, gl, hl, key, device='desktop', fresh=False, attempts=2):
    """THE TRANSPORT — the only function to swap when the Porter Metrics MCP ships
    its live SERP-ads action. Everything downstream (decoding, normalising,
    structuring, merging) is transport-agnostic and keeps the same output contract.

    engine=google_ads is mandatory — engine=google returns ZERO ads.

    Returns (data, error). Never raises: one bad keyword must not kill a run
    that has already spent credits on the keywords before it.
    """
    params = {'engine': 'google_ads', 'q': q, 'gl': gl, 'hl': hl,
              'device': device, 'api_key': key}
    if loc:
        params['location'] = loc
    if fresh:
        params['no_cache'] = 'true'
    url = 'https://serpapi.com/search.json?' + up.urlencode(params)
    last = None
    for n in range(attempts):
        if n:
            time.sleep(3)
        try:
            data = json.load(urllib.request.urlopen(url, timeout=120))
        except Exception as e:
            last = f'{type(e).__name__}: {e}'
            continue
        status = (data.get('search_metadata') or {}).get('status')
        if data.get('error') or status == 'Error':      # failures arrive inside a 200
            last = data.get('error') or f'status={status}'
            continue
        return data, None
    return None, last


def credits(key):
    try:
        a = json.load(urllib.request.urlopen(
            f'https://serpapi.com/account?api_key={key}', timeout=60))
        return a.get('this_month_usage'), a.get('total_searches_left')
    except Exception:
        return None, None


# ------------------------------------------------------- url decoding -------
# Google's per-impression click identifiers. They change on every call, say
# nothing about the advertiser's setup, and make two samples of the same ad look
# different. Kept inside tracked_url as evidence, stripped from `params`.
CLICK_IDS = {'gclid', 'gbraid', 'wbraid', 'gad_source', 'ved', 'sa', 'sig', 'ai',
             'cid', 'ase', 'cce', 'category', 'co', 'nis', 'q', 'pf', 'ae', 'srsltid'}


def unwrap(url):
    """Google wraps ad links in /aclk. The real destination hides in ?adurl="""
    if not url or 'aclk' not in url:
        return url
    v = up.parse_qs(up.urlparse(url).query).get('adurl', [''])[0]
    return up.unquote(up.unquote(v)) if v else ''


def params_of(url):
    if not url or '?' not in url:
        return {}
    return {k: up.unquote(v[0]) for k, v in
            up.parse_qs(up.urlparse(url).query, keep_blank_values=True).items()}


def advertiser_params(url):
    return {k: v for k, v in params_of(url).items() if k.lower() not in CLICK_IDS} or None


KEEP = {
    'utm_campaign': 'campaign', 'utm_source': 'source_param', 'utm_medium': 'medium',
    'utm_content': 'ad_group_label', 'utm_term': 'keyword', 'utm_keyword': 'keyword',
    'kwd': 'keyword', 'keyword': 'keyword',
    'gad_campaignid': 'campaign_id', 'campaignid': 'campaign_id', 'c_id': 'campaign_id',
    'utm_id': 'campaign_id', 'hsa_cam': 'campaign_id',
    'adgroupid': 'ad_group_id', 'adgroup': 'ad_group_id', 'c_agid': 'ad_group_id',
    'hsa_grp': 'ad_group_id', 'utm_adgroup': 'ad_group_label',
    'adid': 'creative_id', 'creative': 'creative_id', 'c_crid': 'creative_id',
    'hsa_ad': 'creative_id',
    'mt': 'match_type', 'matchtype': 'match_type', 'hsa_mt': 'match_type',
    'hsa_kw': 'keyword', 'hsa_tgt': 'keyword_id', 'hsa_acc': 'account_id',
    'psd': 'device', 'device': 'device', 'c_dvc': 'device',
    'spn': 'network', 'network': 'network', 'c_nw': 'network', 'hsa_src': 'network',
    'code': 'internal_code',
}
MATCH = {'e': 'exact', 'p': 'phrase', 'b': 'broad'}
DEVICE = {'c': 'desktop', 'm': 'mobile', 't': 'tablet'}
NETWORK = {'g': 'google search', 's': 'search partners', 'd': 'display'}
TEMPLATE = re.compile(r'^\{.*\}$')       # ValueTrack left unexpanded, e.g. {keyword}


def campaign_intel(url):
    """Normalise UTM / ValueTrack / vendor-specific spellings into one shape."""
    out = {}
    for raw, val in params_of(url).items():
        name = KEEP.get(raw.lower())
        if not name or not val or TEMPLATE.match(val):
            continue
        v = val
        if name == 'match_type':
            v = MATCH.get(v, v)
        elif name == 'device':
            v = DEVICE.get(v, v)
        elif name == 'network':
            v = NETWORK.get(v, v)
        out.setdefault(name, v)
    return out


# ---------------------------------------------------------- url shape -------
PAGE_TYPE = [
    (r'^/?$', 'homepage'),
    (r'/(lp|landing|landingpage|go|visita|preview)\b', 'landing page'),
    (r'/pricing|/planes|/precios', 'pricing'),
    (r'/blog|/articulo|/recursos|/guide', 'content'),
    (r'/connect|/integration|/integrations|/mcp', 'integration page'),
    (r'/compare|/vs\b|/alternative', 'comparison'),
    (r'/cotiz|/quote|/calcul|/simul', 'quote tool'),
    (r'/demo|/trial|/signup|/onboard|/register', 'signup'),
    (r'/product|/features|/solutions', 'product'),
]
COMPOUND = {'com.co', 'com.br', 'com.mx', 'com.ar', 'co.uk', 'com.au', 'co.jp', 'com.pe'}
STOP = {'a', 'the', 'to', 'de', 'y', 'and', 'tu', 'con', 'for'}


def templatize(segments):
    """Path with variable-looking segments replaced by slots, so patterns group."""
    out = []
    for s in segments:
        if re.fullmatch(r'[\w-]*\d[\w-]*', s) and not re.fullmatch(r'\d{4}', s):
            out.append('{id}')
        elif re.search(r'-to-.*-integration|-integration$', s):
            out.append(re.sub(r'^[\w]+(-ads)?-to-[\w]+', '{source}-to-{target}', s))
        else:
            out.append(s)
    return '/' + '/'.join(out) if out else '/'


def url_shape(url):
    if not url:
        return None
    p = up.urlparse(url)
    host = p.netloc.lower()
    bare = host[4:] if host.startswith('www.') else host
    parts = bare.split('.')
    n = 3 if len(parts) >= 3 and '.'.join(parts[-2:]) in COMPOUND else 2
    segs = [s for s in p.path.strip('/').split('/') if s]
    joined = '/' + '/'.join(segs)
    return {
        'host': host,
        'root_domain': '.'.join(parts[-n:]),
        'subdomain': '.'.join(parts[:-n]) if len(parts) > n else None,
        'path': joined if segs else '/',
        'depth': len(segs),
        'segments': segs,
        'page_type': next((l for pat, l in PAGE_TYPE if re.search(pat, joined, re.I)), 'other'),
        'slug_tokens': [t for s in segs for t in re.split(r'[-_]', s)
                        if t and t.lower() not in STOP] or None,
        'pattern': templatize(segs),
    }


# ----------------------------------------------------- campaign naming ------
NAMING_DICT = {
    'channel': {'search', 'sea', 'sem', 'goads', 'gads', 'google', 'gg', 'g', 'display',
                'pmax', 'yt', 'youtube', 'social', 'cpc', 'ppc', 'paid_search'},
    'geo': {'global', 'col', 'us', 'usa', 'uk', 'latam', 'eu', 'mx', 'br', 'co', 'row',
            't1', 't2', 'tier1', 'tier2', 'tier1-2', 'tier-1', 'na', 'emea', 'apac'},
    'objective': {'perfo', 'performance', 'conve', 'convo', 'conversion', 'conversions',
                  'prospecting', 'retargeting', 'remarketing', 'awareness', 'sales',
                  'leads', 'leadgen', 'traffic', 'brand', 'nb', 'nonbrand', 'competencia',
                  'competitor', 'conquesting', 'subscription'},
    'bidding': {'cpa', 'roas', 'tcpa', 'troas', 'maxconv', 'manual'},
    'month': {'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov',
              'dec', 'ene', 'abr', 'ago', 'dic'},
    'format': {'anunciostexto', 'text', 'rsa', 'dsa', 'keywords', 'kw', 'video', 'image'},
}


def decode_naming(name):
    if not name:
        return None
    delim = max(['_', '-', '|', ' '], key=lambda d: name.count(d))
    tokens = [t for t in re.split(r'[_|\s]+', name) if t]   # keep hyphens inside tokens
    tagged, unknown = defaultdict(list), []
    for t in tokens:
        low = t.lower()
        hit = next((c for c, vals in NAMING_DICT.items() if low in vals), None)
        (tagged[hit].append(t) if hit else unknown.append(t))
    return {'raw': name, 'delimiter': delim, 'token_count': len(tokens), 'tokens': tokens,
            'inferred': dict(tagged) or None, 'unclassified': unknown or None}


# ------------------------------------------------------------- CTA ----------
ACTION_VERBS = [
    'get', 'start', 'try', 'compare', 'book', 'buy', 'download', 'install', 'connect',
    'sign up', 'signup', 'request', 'find', 'save', 'switch', 'join', 'build', 'create',
    'see', 'explore', 'discover', 'learn', 'talk', 'chat', 'query', 'unlock', 'automate',
    'cotiza', 'calcula', 'compara', 'descubre', 'contrata', 'solicita', 'obtén', 'obten',
    'ahorra', 'prueba', 'empieza', 'conoce', 'simula',
]
OFFER_PAT = [
    (r'(\d+)[- ]day free trial', 'free trial {0} days'),
    (r'free (\d+)[- ]day trial', 'free trial {0} days'),
    (r'free trial', 'free trial'), (r'free demo', 'free demo'),
    (r'gratis', 'gratis'), (r'(\d+)\s*%\s*off', 'discount {0}%'),
    (r'hasta (\d+)\s*%', 'discount up to {0}%'),
    (r'free quote', 'free quote'), (r'sin costo', 'sin costo'),
    (r'a cuotas', 'installments'), (r'no credit card', 'no credit card'),
]
PROOF_PAT = [
    (r'#\s*1\s+rated', 'rated #1'), (r'(\d+)\+?\s*years', '{0}+ years'),
    (r'(\d+)%\s+(?:customer\s+)?satisfaction', '{0}% satisfaction'),
    (r'ranked', 'ranked'), (r'trusted', 'trusted'),
    (r'(\d[\d,\.]*)\+?\s*(?:customers|users|clients|marketers|companies)', '{0} customers'),
]


def _matches(text, patterns):
    out = []
    for pat, label in patterns:
        m = re.search(pat, text, re.I)
        if m:
            out.append(label.format(*m.groups()) if m.groups() else label)
    return out


def extract_cta(headline, body, sitelinks):
    """Derived summary. The sitelinks themselves live at ad level, not in here."""
    text = ' '.join(filter(None, [headline, body] +
                           [c.get('text') for c in sitelinks] +
                           [c.get('snippet') for c in sitelinks]))
    low = text.lower()
    verbs = [v for v in ACTION_VERBS if re.search(rf'\b{re.escape(v)}\b', low)]
    primary, primary_url = None, None
    for c in sitelinks:
        t = (c.get('text') or '').strip().lower()
        if any(t.startswith(v) for v in ACTION_VERBS):
            primary = c['text']
            primary_url = (c.get('destination') or {}).get('url')
            break
    return {'primary': primary, 'primary_url': primary_url,
            'action_verbs': sorted(set(verbs)) or None,
            'offer': _matches(text, OFFER_PAT) or None,
            'proof': _matches(text, PROOF_PAT) or None}


# ------------------------------------------------------- destination --------
def destination(raw_url, tracked=None, compare_to=None):
    """One shape for "where does this link go", reused at ad and sitelink level.

    `url` is the identity (params stripped). `params` sit INSIDE this object
    because they describe this URL, not the ad. `structure` decomposes the path.
    """
    stub = bool(raw_url and re.search(r'google\.[\w.]+/aclk', raw_url))
    best = tracked or raw_url or ''
    clean = (best.split('?')[0] or None) if best and not stub else None
    return {
        'url': clean,
        'tracked_url': tracked or None,
        'tracking_exposed': bool(tracked),
        'is_google_stub': stub or None,
        'params': advertiser_params(best),
        'structure': url_shape(clean) if clean else None,
        'same_page_as_ad': (bool(clean and clean.rstrip('/') == compare_to.rstrip('/'))
                            if compare_to else None),
    }


def build_sitelinks(sitelinks, main_landing):
    out = []
    for s in sitelinks or []:
        if not s.get('title'):
            continue
        u = s.get('url') or ''
        out.append({
            'text': s['title'],
            'snippet': s.get('snippet'),
            'destination': destination(u, tracked=u if '?' in u else None,
                                       compare_to=main_landing),
        })
    return out


# ------------------------------------------------------------ record --------
KNOWN = {'position', 'block_position', 'title', 'link', 'displayed_link', 'description',
         'source', 'tracking_link', 'sitelinks', 'extensions', 'thumbnail',
         'price', 'rating', 'reviews'}


def build(ad, ad_type='search', rank_in_slot=None, device='desktop'):
    tracked = unwrap(ad.get('tracking_link'))
    landing = ad.get('link')
    landing_clean = (landing or '').split('?')[0] or None
    sitelinks = build_sitelinks(
        [{'title': s.get('title'), 'url': unwrap(s.get('link')) or s.get('link'),
          'snippet': (s.get('snippets') or [None])[0]} for s in (ad.get('sitelinks') or [])],
        landing_clean)

    dest = destination(landing, tracked=tracked)
    intel = campaign_intel(tracked)
    for c in sitelinks:                  # sitelinks can carry params the ad hides
        for k, v in campaign_intel((c['destination'] or {}).get('tracked_url') or '').items():
            intel.setdefault(k, v)

    return {
        'device': device,
        'rank': ad.get('position'),
        'slot': ad.get('block_position'),
        'rank_in_slot': rank_in_slot,
        'ad_type': ad_type,
        'advertiser': ad.get('source'),
        'domain': (dest.get('structure') or {}).get('root_domain'),
        'copy': {
            'headline': ad.get('title'),
            'body': ad.get('description'),
            'display_url': ad.get('displayed_link'),
            'extensions': ad.get('extensions') or None,
            'price': ad.get('price'), 'rating': ad.get('rating'),
            'reviews': ad.get('reviews'), 'thumbnail': ad.get('thumbnail'),
        },
        'destination': dest,
        'campaign': (dict(intel, naming=decode_naming(intel.get('campaign')))
                     if intel else None),
        'sitelinks': sitelinks or None,
        'cta': extract_cta(ad.get('title'), ad.get('description'), sitelinks),
        'extra': {k: v for k, v in ad.items()
                  if k not in KNOWN and v not in (None, '', [], {})} or None,
    }


# ------------------------------------------------------------ sampling ------
def parse_sample(data, dev):
    """One API response → (ad records, per-type counts, per-slot counts)."""
    ads, counts, per_slot = [], {}, defaultdict(int)
    for block, kind in (('ads', 'search'), ('shopping_results', 'shopping'),
                        ('local_ads', 'local')):
        items = data.get(block) or []
        if items:
            counts[kind] = len(items)
        for a in items:
            per_slot[a.get('block_position')] += 1
            ads.append(build(a, kind, per_slot[a.get('block_position')], dev))
    ads.sort(key=lambda r: (r['rank'] is None, r['rank']))
    return ads, counts, dict(per_slot)


def merge_samples(samples):
    """Collapse N samples of the same query+device into one ad list.

    Identity is advertiser + param-free landing page. Ads rotate, so an ad seen
    in 1 of 3 samples is a real but intermittent competitor — `observations`
    records that rather than hiding it or double-counting it.
    """
    merged = {}
    for ads in samples:
        seen_this_sample = set()
        for a in ads:
            key = (a.get('advertiser'), (a.get('destination') or {}).get('url'))
            keep = merged.get(key)
            if keep is None:
                a['observations'] = {'times_seen': 0, 'of_samples': len(samples),
                                     'placements': 0, 'ranks': [], 'slots': []}
                merged[key] = keep = a
            elif ((a.get('destination') or {}).get('tracking_exposed') and
                  not (keep.get('destination') or {}).get('tracking_exposed')):
                a['observations'] = keep['observations']   # richer record wins
                merged[key] = keep = a
            o = keep['observations']
            o['placements'] += 1
            if key not in seen_this_sample:                # once per sample, not per slot
                o['times_seen'] += 1
                seen_this_sample.add(key)
            o['ranks'].append(a.get('rank'))
            o['slots'].append(a.get('slot'))
    for a in merged.values():
        o = a['observations']
        ranks = [r for r in o['ranks'] if r is not None]
        o['rank_best'] = min(ranks) if ranks else None
        o['rank_worst'] = max(ranks) if ranks else None
        o['slots'] = sorted(set(s for s in o['slots'] if s))
        a['rank'] = o['rank_best']
    return sorted(merged.values(), key=lambda r: (r['rank'] is None, r['rank']))


def prune(obj):
    """Drop empty values so a record only states what is actually true of it."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            v = prune(v)
            if v is None or v == '' or v == [] or v == {}:
                continue
            out[k] = v
        return out
    if isinstance(obj, list):
        return [prune(v) for v in obj]
    return obj


# ------------------------------------------------------------ schema --------
# Single source of truth for the output contract. `--schema` prints this, so the
# documentation can never drift from what the code actually emits. Empty values
# are pruned, so a field absent from a record simply did not apply to it.
SCHEMA = {
    'request': {
        'location': 'where the search ran from — decides which ads exist',
        'gl': 'country code', 'hl': 'language code',
        'devices': 'devices run, one search each', 'repeat': 'samples per query+device',
        'engine': 'always google_ads', 'queries': 'keywords requested',
        'searches_run': 'queries x devices x repeat = credits spent',
    },
    'search': {
        'query': 'the keyword', 'location': 'location Google resolved',
        'language': 'language used', 'device': 'desktop | mobile | tablet',
        'samples': 'how many times this query+device was sampled',
        'sampled_at': 'per sample: fetched_at, search_id, ad_count — search_id is '
                      're-pullable from the provider archive for 31 days',
        'ad_count': 'unique ads across samples',
        'ads_by_type': 'peak count per ad type', 'ads_by_slot': 'peak count per block',
        'other_blocks': 'non-ad blocks present — tells a real zero from a failure',
        'error': 'present only if the call failed after retry',
        'ads': 'ad records, ranked as shown on the page',
    },
    'ad': {
        'device': 'device this ad was served to',
        'rank': 'best rank observed across samples, 1 = first',
        'slot': 'page block: top | bottom | right',
        'rank_in_slot': 'position within that block',
        'ad_type': 'search | shopping | local',
        'advertiser': 'advertiser name as Google shows it',
        'domain': 'root domain of the destination (compound TLDs handled)',
        'copy': 'headline, body, display_url, extensions, price, rating, reviews, thumbnail',
        'destination': 'see the destination object',
        'campaign': 'campaign, campaign_id, ad_group_id, ad_group_label, creative_id, '
                    'keyword, match_type, device, network, internal_code — normalised '
                    'across UTM / ValueTrack / vendor spellings, codes expanded, '
                    'unexpanded templates dropped — plus naming{} tokenising the '
                    'campaign name and classifying each token',
        'sitelinks': 'array of {text, snippet, destination} — same destination shape',
        'cta': 'derived: primary, primary_url, action_verbs, offer, proof',
        'observations': 'times_seen (samples containing it), of_samples, placements '
                        '(total slots held), ranks, slots, rank_best, rank_worst',
        'extra': 'any field the API returned that this schema does not name',
    },
    'destination': {
        'url': 'param-free destination — the identity, group on this',
        'tracked_url': 'full destination with parameters, when exposed',
        'tracking_exposed': 'whether advertiser parameters were recoverable',
        'is_google_stub': 'true when the link is an empty click wrapper, no destination',
        'params': 'advertiser parameters on this URL; per-impression click ids '
                  '(gclid, gbraid, …) stripped — they change on every call',
        'structure': 'host, root_domain, subdomain, path, depth, segments, page_type, '
                     'slug_tokens, pattern',
        'same_page_as_ad': "sitelinks only: does it point at the ad's own landing page",
    },
}


# --------------------------------------------------------------- CSV --------
CSV_COLS = ['query', 'location', 'device', 'advertiser', 'domain', 'slot', 'rank',
            'headline', 'body', 'url', 'page_type', 'pattern', 'campaign', 'campaign_id',
            'ad_group_label', 'keyword', 'match_type', 'network', 'primary_cta', 'offer',
            'times_seen', 'of_samples', 'tracked_url']


def csv_row(r):
    d = r.get('destination') or {}
    st = d.get('structure') or {}
    c = r.get('campaign') or {}
    o = r.get('observations') or {}
    return {
        'query': r.get('query'), 'location': r.get('location'), 'device': r.get('device'),
        'advertiser': r.get('advertiser'), 'domain': r.get('domain'),
        'slot': r.get('slot'), 'rank': r.get('rank'),
        'headline': (r.get('copy') or {}).get('headline'),
        'body': (r.get('copy') or {}).get('body'),
        'url': d.get('url'), 'tracked_url': d.get('tracked_url'),
        'page_type': st.get('page_type'), 'pattern': st.get('pattern'),
        'campaign': c.get('campaign'), 'campaign_id': c.get('campaign_id'),
        'ad_group_label': c.get('ad_group_label'), 'keyword': c.get('keyword'),
        'match_type': c.get('match_type'), 'network': c.get('network'),
        'primary_cta': (r.get('cta') or {}).get('primary'),
        'offer': ', '.join((r.get('cta') or {}).get('offer') or []),
        'times_seen': o.get('times_seen'), 'of_samples': o.get('of_samples'),
    }


# -------------------------------------------------------------- main --------
def main(argv):
    loc, gl, hl, device, out = 'United States', 'us', 'en', 'both', 'ads_out'
    keep_raw = want_csv = fresh = False
    repeat, queries = 1, []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--loc':      loc = argv[i + 1]; i += 2
        elif a == '--gl':     gl = argv[i + 1]; i += 2
        elif a == '--hl':     hl = argv[i + 1]; i += 2
        elif a == '--device': device = argv[i + 1]; i += 2
        elif a == '--out':    out = argv[i + 1]; i += 2
        elif a == '--repeat': repeat = max(1, int(argv[i + 1])); i += 2
        elif a == '--raw':    keep_raw = True; i += 1
        elif a == '--csv':    want_csv = True; i += 1
        elif a == '--fresh':  fresh = True; i += 1
        elif a == '--schema':
            print(json.dumps(SCHEMA, ensure_ascii=False, indent=2)); return
        else: queries.append(a); i += 1
    if not queries:
        sys.exit(__doc__)

    key = api_key()
    os.makedirs(out, exist_ok=True)
    searches = []
    devices = (['desktop', 'mobile'] if device == 'both'
               else [d.strip() for d in device.split(',') if d.strip()])

    def save():
        payload = {'request': {'location': loc, 'gl': gl, 'hl': hl, 'devices': devices,
                               'repeat': repeat, 'engine': 'google_ads',
                               'queries': len(queries),
                               'searches_run': len(queries) * len(devices) * repeat},
                   'searches': searches}
        json.dump(prune(payload), open(os.path.join(out, 'ads.json'), 'w'),
                  ensure_ascii=False, indent=2)

    failed = []
    for q in queries:
        for dev in devices:
            samples, sample_meta, counts, slots = [], [], {}, {}
            other, resolved = None, None
            for n in range(repeat):
                # repeating without bypassing the 1h cache re-reads one sample
                data, err = fetch(q, loc, gl, hl, key, dev, fresh or repeat > 1)
                if err:
                    failed.append(f'{q} [{dev}] sample {n + 1}')
                    print(f"   ✗ FAILED · {q} [{dev}] sample {n + 1}   ({err[:50]})")
                    continue
                if keep_raw:
                    slug = ''.join(ch if ch.isalnum() else '_'
                                   for ch in f'{q}_{dev}_{n}')[:50]
                    json.dump(data, open(os.path.join(out, f'raw_{slug}.json'), 'w'),
                              ensure_ascii=False, indent=2)
                p, meta = data.get('search_parameters', {}), data.get('search_metadata', {})
                resolved = resolved or p
                ads, c, per_slot = parse_sample(data, dev)
                samples.append(ads)
                sample_meta.append({'fetched_at': meta.get('created_at'),
                                    'search_id': meta.get('id'), 'ad_count': len(ads)})
                for k, v in c.items():
                    counts[k] = max(counts.get(k, 0), v)
                for k, v in per_slot.items():
                    slots[k] = max(slots.get(k, 0), v)
                other = {k: len(data[k]) for k in
                         ('immersive_products', 'organic_results', 'ai_overview')
                         if isinstance(data.get(k), list) and data[k]} or None

            if not samples:
                searches.append({'query': q, 'location': loc, 'device': dev,
                                 'ad_count': 0, 'ads': [], 'error': 'all samples failed'})
                save()
                continue

            ads = merge_samples(samples)
            p = resolved or {}
            searches.append({
                'query': q,
                'location': p.get('location_used') or p.get('gl', ''),
                'language': p.get('hl'), 'device': dev,
                'samples': len(samples), 'sampled_at': sample_meta,
                'ad_count': len(ads),
                'ads_by_type': counts or None, 'ads_by_slot': slots or None,
                'other_blocks': other,
                'ads': ads,
            })
            if ads:
                seen_once = sum(1 for a in ads
                                if a['observations']['times_seen'] < len(samples))
                extra = f" ({seen_once} intermittent)" if len(samples) > 1 and seen_once else ''
                print(f"  {len(ads):>2} ads · {q} [{dev}] · {len(samples)} sample(s){extra}")
            else:
                seen = [f"{k}:{v}" for k, v in (other or {}).items()]
                note = ('' if dev == 'desktop' else
                        f"  ← device={dev} is unreliable on this engine "
                        f"(try country-level --loc, or confirm on desktop)")
                print(f"   0 ads · {q} [{dev}]   (blocks → {', '.join(seen) or 'none'}){note}")
            save()

    save()
    written = 'ads.json'
    rows = [dict(r, query=s['query'], location=s['location'])
            for s in searches for r in s['ads']]
    if want_csv:
        with open(os.path.join(out, 'ads.csv'), 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction='ignore')
            w.writeheader()
            for r in rows:
                w.writerow(csv_row(r))
        written += ' · ads.csv'

    used, left = credits(key)
    exposed = sum(1 for r in rows if (r.get('destination') or {}).get('tracking_exposed'))
    print(f"\n{len(rows)} ads from {len(queries)} queries → {out}/{written}")
    print(f"tracking exposed: {exposed}/{len(rows)}")
    if failed:
        print(f"FAILED ({len(failed)}): {', '.join(failed)}")
    if left is not None:
        print(f"credits: {used} used this month, {left} left")


if __name__ == '__main__':
    main(sys.argv[1:])
