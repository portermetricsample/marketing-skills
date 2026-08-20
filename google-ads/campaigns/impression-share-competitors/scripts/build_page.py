#!/usr/bin/env python3
"""Render competitors.json as a standalone HTML doc in the Porter design system.

    python3 build_page.py <competitors.json> [out.html] [--anon] [--label "..."]

    --anon           hide the account: generic title, campaign names stripped of
                     agency prefixes and account identifiers. Rivals are public
                     advertisers on a public SERP and are always shown.
    --label "..."    the generic label to use (default: "Confidential account")

Reads only the joined output — no network, no credits. The hero visual is a rank
matrix: rivals and you down the side, sampled terms across the top, best rank in
each cell. Absence is as informative as presence, so empty cells are drawn, not
skipped.
"""
import json, re, sys

# Porter palette (same tokens as the impression-share monitor, so the two read as one system)
AQUA, PURPLE, PINK = "#2DD4BF", "#6701e6", "#EC4899"
DARK, INK, MUTED, LINE = "#1a0340", "#0a0a0a", "#6b7280", "#ece9f2"

# rank bands — dark = top of page, light = bottom, hatched = did not appear
BAND = [(2, "#3b0a8f", "#fff"), (4, "#7c3aed", "#fff"), (99, "#ddd6fe", "#3b0a8f")]


def band(rank):
    if rank is None:
        return None
    for cap, bg, fg in BAND:
        if rank <= cap:
            return bg, fg
    return BAND[-1][1], BAND[-1][2]


def presence_word(p):
    """A band, not a number — the interval is too wide to justify a percentage."""
    if p is None:
        return "—"
    return "Always" if p >= 0.95 else "Usually" if p >= 0.6 else "Sometimes" if p >= 0.25 else "Rarely"


def cell(rank, devices, is_you=False, empty_term=False):
    if empty_term:
        return '<td class="c"><div class="void" title="no ads served on this term">–</div></td>'
    b = band(rank)
    if not b:
        return ('<td class="c"><div class="miss" title="did not appear in any sample">·</div></td>')
    bg, fg = b
    if is_you:
        bg, fg = ("#0f766e", "#fff") if rank and rank <= 2 else ("#99f6e4", "#0f766e")
    dot = '<i class="dv" title="seen on desktop and mobile"></i>' if len(devices or []) > 1 else ''
    return f'<td class="c"><div class="r" style="background:{bg};color:{fg}">{rank}{dot}</div></td>'


def matrix(c):
    terms = [t["term"] for t in c["terms_sampled"]]
    own = {t["term"]: t for t in c["terms_sampled"]}
    head = "".join(
        f'<th class="th{" empty-col" if own[t].get("no_ads_anywhere") else ""}">'
        f'<span>{t}</span>'
        + ('<em class="noads">no ads served</em>' if own[t].get("no_ads_anywhere") else '')
        + '</th>' for t in terms)
    rows = [
        '<tr class="you"><td class="who"><b>You</b><span class="sub">your ad in these auctions</span></td>'
        + "".join(cell(own[t].get("own_ad_rank_best"), own[t].get("devices"), True,
                       own[t].get("no_ads_anywhere")) for t in terms)
        + '<td class="pz"><span class="pw you-pw">'
        + f'{sum(1 for t in terms if own[t]["own_ad_present"])}/{len(terms)} terms</span></td></tr>'
    ]
    for r in c["rivals"]:
        bt = r.get("by_term") or {}
        ci = r.get("sample_presence_ci95")
        ci_txt = f'{ci[0]:.0%}–{ci[1]:.0%}' if ci else ''
        rows.append(
            f'<tr><td class="who">{r["advertiser"]}'
            + (f'<span class="sub">{", ".join(r["offers"])}</span>' if r.get("offers") else
               '<span class="sub">no offer in copy</span>')
            + "</td>"
            + "".join(cell((bt.get(t) or {}).get("rank_best"), (bt.get(t) or {}).get("devices"),
                           False, own[t].get("no_ads_anywhere"))
                      for t in terms)
            # two different questions: on how many of YOUR terms it competes (primary),
            # and how steadily it held its slot across repeats (secondary)
            + f'<td class="pz"><span class="pw">{r["terms_present_on"]}/{r["terms_sampled"]} terms</span>'
            + f'<span class="ci mono">{presence_word(r.get("sample_presence")).lower()} when present'
            + (f' · {ci_txt}' if ci_txt else '') + '</span></td></tr>')
    return (f'<table class="mx"><thead><tr><th class="th who"></th>{head}'
            f'<th class="th">competes on</th></tr></thead><tbody>{"".join(rows)}</tbody></table>')


def other_strip(c):
    """Shopping and local ads live in a different auction from search impression share.
    Shown as context, never as an explanation."""
    oi = c.get("other_inventory")
    if not oi:
        return ""
    items = "".join(f'<li><b>{o["advertiser"]}</b> <span class="mono">{o["ad_type"]} · '
                    f'rank {o["rank_best"]} · {", ".join(o["devices"])}</span></li>' for o in oi[:8])
    return (f'<div class="other"><h3>Also on these SERPs — different auction</h3>'
            f'<p class="note">These are {oi[0]["ad_type"]} ads. They compete for attention on the '
            f'page but not for the search impression share this campaign reports, so they are not '
            f'counted as rivals above.</p><ul class="lps">{items}</ul></div>')


def section(c):
    cm = c["completeness"]
    cov = f'{cm["spend_covered"]:.0%}' if cm.get("spend_covered") is not None else "—"
    roster = ("roster still moving — sample deeper" if cm.get("roster_likely_incomplete")
              else "roster stable")
    op = c.get("own_presence") or {}
    missing = op.get("of_terms_sampled", 0) - op.get("terms_where_our_ad_appeared", 0)
    rank_lost = (c.get("rank_lost") or 0)
    n_rivals = len(c.get("rivals") or [])
    VERDICTS = {
        "outranked": (f'{n_rivals} rivals compete on these terms and at least one reaches or '
                      'beats your position. Best ranks are per-term maxima, so a tie means you '
                      'alternate for the slot. This is an Ad Rank contest: bid, Quality, '
                      'extensions — and their offers below show what you are being compared to.'),
        "leading": (f'Your ad is ahead of all {n_rivals} rivals on every sampled term. The reach '
                    'this campaign loses is therefore not being taken by them here — it is in '
                    'auctions this sample did not reach, or below the Ad Rank threshold. Widen '
                    'the terms before touching bids.'),
        "not_shown": (f'Your ad is missing from {missing} of {op.get("of_terms_sampled")} terms '
                      'you pay for. That loss sits upstream of rank — check eligibility, '
                      'budget pacing and keyword status before touching bids.'),
        "unexplained": ('Your ad leads every sampled term and no rival competes for it — yet the '
                        'campaign still loses reach to rank. Impressions lost to rank do not '
                        'require a competitor: an Ad Rank below Google\'s display threshold '
                        'produces the same number. The auctions where you lose are not in this '
                        'sample — widen the terms, or look at Quality Score rather than rivals.'),
        "no_own_domain_given": ('No own domain was supplied, so your own position could not be '
                                'identified in the sample.'),
    }
    verdict = VERDICTS.get(c.get("verdict"), "")
    lps = "".join(
        f'<li><b>{r["advertiser"]}</b> <span class="mono">rank {r["rank_best"]}'
        + (f'–{r["rank_worst"]}' if r["rank_worst"] != r["rank_best"] else '') + '</span>'
        + f'<div class="lp mono">{(r.get("landing_pages") or ["—"])[0]}</div></li>'
        for r in c["rivals"][:6])
    return f"""
<section class="sec">
  <div class="sec-eyebrow">{c['trend_label']} · driver: {c['driver']}</div>
  <h2>{c['campaign']}</h2>
  <p class="lead">{verdict}</p>
  <div class="badges">
    <span class="badge">covers <b>{cov}</b> of campaign spend</span>
    <span class="badge">{cm.get('keyword_clusters_sampled')}/{cm.get('keyword_clusters_total')} keyword clusters</span>
    <span class="badge">{cm.get('term_variants_represented')} term variants</span>
    <span class="badge {'warn' if cm.get('roster_likely_incomplete') else 'ok'}">{roster}</span>
    {f'<span class="badge warn">{cm["terms_with_no_ads_at_all"]} of {len(c["terms_sampled"])} terms served no ads at all</span>' if cm.get('terms_with_no_ads_at_all') else ''}
  </div>
  {matrix(c) if c.get("rivals") else
    '<p class="empty">No competing <b>search</b> ads appeared on any sampled term.</p>'}
  {other_strip(c)}
  <div class="legend">
    <span><i class="sw" style="background:#3b0a8f"></i>rank 1–2</span>
    <span><i class="sw" style="background:#7c3aed"></i>rank 3–4</span>
    <span><i class="sw" style="background:#ddd6fe"></i>rank 5+</span>
    <span><i class="sw" style="background:#f3f4f6;border:1px solid {LINE}"></i>advertiser did not appear</span>
    <span><i class="sw" style="background:repeating-linear-gradient(45deg,#fafafc,#fafafc 3px,#f2f2f6 3px,#f2f2f6 6px)"></i>no ads served at all</span>
    <span><i class="dv" style="position:static"></i>desktop + mobile</span>
  </div>
  {"<h3>What they send people to</h3><ul class=\'lps\'>" + lps + "</ul>" if lps else ""}
</section>"""


def anonymise(doc, label):
    """Strip the account's identity. Only the account — the rivals are public."""
    account = (doc.get("meta") or {}).get("account") or ""
    tokens = [t for t in re.split(r"[^A-Za-z0-9]+", account) if len(t) > 2]
    doc.setdefault("meta", {})["account"] = label
    doc["meta"]["own_domain"] = None
    for c in doc.get("campaigns", []):
        name = c.get("campaign") or ""
        name = re.sub(r"^\s*[\[\(][^\]\)]*[\]\)]\s*", "", name)   # drop [AGENCY] prefixes
        for t in tokens:                                             # drop the account name
            name = re.sub(t, "", name, flags=re.I)
        name = re.sub(r"[\s_|-]{2,}", " – ", name).strip(" –-|_")
        c["campaign"] = name or "Campaign"
    return doc


def main(argv):
    if not argv:
        sys.exit(__doc__)
    doc = json.load(open(argv[0]))
    positional = [a for a in argv if not a.startswith("--")]
    out = positional[1] if len(positional) > 1 else "competitors.html"
    if "--anon" in argv:
        i = argv.index("--label") if "--label" in argv else -1
        doc = anonymise(doc, argv[i + 1] if i >= 0 else "Confidential account")
    meta = doc.get("meta", {})
    secs = "".join(section(c) for c in doc.get("campaigns", []))
    n = len(doc.get("campaigns", []))
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Who is taking our visibility — {meta.get('account','')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
:root{{--ink:{INK};--muted:{MUTED};--line:{LINE};--dark:{DARK};--p:{PURPLE};--aqua:{AQUA}}}
body{{font-family:'Inter',-apple-system,sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased}}
.mono{{font-family:'IBM Plex Mono',monospace}}
.hero{{background:var(--dark);color:#fff;padding:64px 40px 56px}}
.brand{{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--aqua);margin-bottom:32px}}
.hero h1{{font-size:clamp(38px,5.6vw,68px);font-weight:800;line-height:0.98;letter-spacing:-2.2px;max-width:16ch}}
.hero h1 b{{font-weight:900;color:#fbbf24}}
.hero p{{margin-top:22px;max-width:60ch;font-size:17px;line-height:1.55;color:#c4b5fd}}
.wrap{{max-width:1040px;margin:0 auto;padding:0 40px}}
.sec{{padding:56px 0;border-bottom:1px solid var(--line)}}
.sec-eyebrow{{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--p);margin-bottom:12px}}
h2{{font-size:clamp(26px,3.4vw,38px);font-weight:800;letter-spacing:-1.4px;line-height:1.02}}
h3{{font-size:15px;font-weight:700;margin:34px 0 12px;letter-spacing:-0.2px}}
.lead{{font-size:18px;font-weight:500;line-height:1.5;color:#3a3a44;max-width:70ch;margin-top:14px}}
.badges{{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 20px}}
.badge{{font-family:'IBM Plex Mono',monospace;font-size:11.5px;padding:6px 12px;border-radius:999px;border:1.5px solid var(--line);color:#3a3a44}}
.badge b{{color:var(--ink)}}
.badge.ok{{border-color:#99f6e4;background:#f0fdfa;color:#0f766e}}
.badge.warn{{border-color:#fde68a;background:#fffbeb;color:#92400e}}
.mx{{width:100%;border-collapse:separate;border-spacing:4px;margin-top:6px}}
.th{{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:500;text-align:center;vertical-align:bottom;padding-bottom:6px}}
.th span{{display:block;max-width:120px;margin:0 auto;line-height:1.25;text-transform:none;letter-spacing:0;font-size:12px}}
.th.who{{text-align:left;width:230px}}
.who{{font-size:14px;font-weight:600;padding-right:14px}}
.who .sub{{display:block;font-weight:400;font-size:11.5px;color:var(--muted);margin-top:2px}}
.c{{width:96px;text-align:center}}
.r{{border-radius:8px;padding:11px 0;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:15px;position:relative}}
.void{{border-radius:8px;padding:11px 0;background:repeating-linear-gradient(45deg,#fafafc,#fafafc 4px,#f2f2f6 4px,#f2f2f6 8px);color:#c9c9d2;font-size:15px}}
.empty-col span{{color:#b9b9c4}}
.noads{{display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-style:normal;color:#b9b9c4;margin-top:3px;letter-spacing:0.3px}}
.miss{{border-radius:8px;padding:11px 0;background:#f8f8fa;border:1px dashed var(--line);color:#c9c9d2;font-size:15px}}
.dv{{position:absolute;top:5px;right:6px;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.85);display:inline-block}}
tr.you .r{{box-shadow:0 0 0 2px #0f766e inset}}
tr.you .who b{{color:#0f766e}}
.pz{{padding-left:12px;white-space:nowrap}}
.pw{{font-size:13px;font-weight:600}} .you-pw{{color:#0f766e}}
.ci{{display:block;font-size:10.5px;color:var(--muted)}}
.legend{{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:16px;align-items:center}}
.legend .sw{{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}}
.lps{{list-style:none}} .lps li{{padding:11px 0;border-top:1px solid var(--line);font-size:14px}}
.lps .lp{{font-size:12px;color:var(--muted);margin-top:3px;word-break:break-all}}
.empty{{padding:26px 22px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:15px;background:#fbfbfd}}
.other{{margin-top:30px;padding-top:6px}}
.note{{font-size:13.5px;color:var(--muted);line-height:1.6;max-width:70ch;margin-bottom:6px}}
.foot{{padding:40px 0 70px;font-size:13.5px;color:var(--muted);line-height:1.65;max-width:76ch}}
.foot b{{color:var(--ink)}}
@media(max-width:820px){{.wrap{{padding:0 20px}}.hero{{padding:44px 20px}}.mx{{display:block;overflow-x:auto}}}}
</style></head><body>
<div class="hero"><div class="wrap">
  <div class="brand">Porter Metrics · Google Ads</div>
  <h1>We are losing visibility. <b>Here is who to.</b></h1>
  <p>{meta.get('account','')} — {n} campaign{'s' if n != 1 else ''} where the auction — not the budget — is capping reach. Each one shows the terms sampled, who else is in them, and where you sit.</p>
</div></div>
<div class="wrap">{secs}
<div class="foot">
  <b>How to read this.</b> Each cell is the best rank an advertiser held on that term across
  the samples. An empty cell means they never appeared — as informative as a filled one.
  <br><br>
  <b>What this is not.</b> {meta.get('caveat','')}
</div></div></body></html>"""
    open(out, "w").write(html)
    print(f"wrote {out}")


if __name__ == "__main__":
    main(sys.argv[1:])
