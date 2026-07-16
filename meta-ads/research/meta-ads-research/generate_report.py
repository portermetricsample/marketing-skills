#!/usr/bin/env python3
"""
generate_report.py — brand → Porter visual report (self-contained HTML)

Reads the canonical pipeline output (data/<page_id>/AUDIT.json + thumbs/) and
renders a self-contained index.html (base64 images, opens offline) styled with
the Porter design system. This is the client-facing deliverable.

Two layers:
- DATA (automatic): KPIs, hook angles, platform eligibility, top-24 creative
  grid with thumbnail + modal (hook + transcript), landings, transparency.
  All derived from AUDIT.json.
- QUALITATIVE / NARRATIVE (Claude writes): subtitle, per-creative deep-dives
  (hook type, angle, funnel stage, persona, production, actors, script
  breakdown, why-it-works) and actionable findings. Passed via an optional
  narrative.json. Without it the report still renders, minus those sections.

Report copy is ENGLISH by default.

Usage:
    python3 generate_report.py --page-id <ID> --brand "<Name>"
    python3 generate_report.py --page-id <ID> --brand "<Name>" \
        --narrative data/<ID>/narrative.json --accent "#ff6600"
"""
import argparse
import base64
import html
import json
import re
from pathlib import Path

# ── Porter design tokens (foundations/palette.css) ──────────────────────────
PORTER = {
    "purple": "#6701e6", "dark": "#1a0340", "void": "#12022f",
    "rich": "#3a0a80", "violet": "#8b5cf6", "lavender": "#c4b5fd",
    "pink": "#EC4899", "pink400": "#F472B6", "yellow": "#fbbf24",
    "aqua": "#2DD4BF", "mint": "#5EEAD4",
}

SCRIPT_DIR = Path(__file__).resolve().parent
PIPELINE_DIR = SCRIPT_DIR.parent


# ── helpers ─────────────────────────────────────────────────────────────────
def esc(s):
    return html.escape(str(s if s is not None else ""))


def img_data_uri(path: Path):
    """Read an image and return a base64 data URI, or None if missing."""
    try:
        raw = path.read_bytes()
    except (FileNotFoundError, OSError):
        return None
    ext = path.suffix.lstrip(".").lower() or "jpeg"
    if ext == "jpg":
        ext = "jpeg"
    return f"data:image/{ext};base64,{base64.b64encode(raw).decode()}"


def pct(n, d):
    return round(100 * n / d) if d else 0


def clip(s, n=140):
    s = (s or "").strip().replace("\n", " ")
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


# ── data assembly ───────────────────────────────────────────────────────────
def load_audit(page_id):
    data_dir = PIPELINE_DIR / "data" / str(page_id)
    audit_path = data_dir / "AUDIT.json"
    if not audit_path.exists():
        raise SystemExit(f"✗ Missing {audit_path}. Run the pipeline first (run_audit.py).")
    audit = json.loads(audit_path.read_text())
    return audit.get("data", audit), data_dir


def build_ctx(d, data_dir):
    meta = d.get("metadata", {})
    raw_by_type = meta.get("raw_ads_by_type", {})
    brand = d.get("brand", {})

    # thumb (hook frame) + full frame set, keyed by fingerprint (enriched only)
    thumb_by_fp = {}
    frames_by_fp = {}
    for m in d.get("media", []):
        fp = m.get("fingerprint")
        thumbs = m.get("thumbs") or {}
        hook = thumbs.get("hook") or {}
        if fp and hook.get("path"):
            thumb_by_fp[fp] = (data_dir / hook["path"])
        if fp:
            frames_by_fp[fp] = {
                stage: img_data_uri(data_dir / (thumbs.get(stage) or {}).get("path", ""))
                for stage in ("hook", "mid", "end")
                if (thumbs.get(stage) or {}).get("path")
            }

    hook_by_fp = {h["fingerprint"]: h for h in d.get("hooks", []) if h.get("fingerprint")}
    script_by_fp = {s["fingerprint"]: s for s in d.get("scripts", []) if s.get("fingerprint")}

    # angle distribution (from hooks)
    angles = {}
    for h in d.get("hooks", []):
        a = (h.get("angle") or "uncategorized").strip()
        angles[a] = angles.get(a, 0) + 1
    angles = sorted(angles.items(), key=lambda kv: -kv[1])

    # platform eligibility
    plat = d.get("distribution", {}).get("platforms_eligibility", {})
    platforms = []
    for k, v in plat.items():
        if k.startswith("_"):
            continue
        if isinstance(v, dict):
            platforms.append((k, v.get("count", 0), v.get("share", 0)))
    platforms.sort(key=lambda x: -x[1])

    # creatives sorted by variant count, enriched (with thumb) first
    creatives = []
    for c in d.get("creatives", []):
        fp = c.get("fingerprint")
        thumb_path = thumb_by_fp.get(fp)
        creatives.append({
            "fp": fp,
            "type": c.get("creative_type", "unknown"),
            "variants": c.get("variants_total", 1),
            "days_active": c.get("days_active"),
            "title": c.get("title") or c.get("body_text") or "",
            "cta": c.get("cta_type") or "",
            "thumb": img_data_uri(thumb_path) if thumb_path else None,
            "hook": (hook_by_fp.get(fp) or {}).get("hook_text", ""),
            "angle": (hook_by_fp.get(fp) or {}).get("angle", ""),
            "transcript": (script_by_fp.get(fp) or {}).get("transcript", ""),
            "duration": (script_by_fp.get(fp) or {}).get("duration_seconds"),
            "ad_url": (hook_by_fp.get(fp) or {}).get("ad_library_url")
            or (script_by_fp.get(fp) or {}).get("ad_library_url"),
        })
    creatives.sort(key=lambda x: (x["thumb"] is None, -x["variants"]))

    return {
        "brand_name": brand.get("page_name", "—"),
        "ad_library_url": brand.get("ad_library_url", "#"),
        "raw_ads": meta.get("raw_ad_count", 0),
        "unique": meta.get("unique_creative_count", 0),
        "videos": meta.get("video_unique_count", 0),
        "images": meta.get("image_unique_count", 0),
        "dedup_ratio": meta.get("dedup_ratio", 0),
        "enriched": meta.get("enriched_count", 0),
        "enrichment_coverage": meta.get("enrichment_coverage", 0),
        "angles": angles,
        "platforms": platforms,
        "creatives": creatives,
        "frames_by_fp": frames_by_fp,
        "landings": d.get("landings", []),
        "limitations": d.get("limitations", []),
    }


# ── HTML rendering ──────────────────────────────────────────────────────────
def bar_rows(items, accent, alt=None):
    if not items:
        return '<p class="desc">No data.</p>'
    mx = max(v for _, v in items) or 1
    grad = f"linear-gradient(90deg,{alt or accent},{PORTER['pink']})"
    rows = []
    for label, v in items:
        w = pct(v, mx)
        rows.append(
            f'<div class="bar-row"><div class="name">{esc(label)}</div>'
            f'<div class="bar-bg"><div class="bar-fill" style="width:{w}%;background:{grad}"></div></div>'
            f'<div class="count">{v}</div></div>'
        )
    return "\n".join(rows)


def _pace(transcript, duration):
    """Words per second, deterministic — a proxy for delivery speed."""
    if not transcript or not duration:
        return None
    words = len(re.findall(r"\S+", transcript))
    return round(words / duration, 1) if duration else None


def _chip(label, value):
    return (f'<span class="dd-chip"><b>{esc(label)}</b> {esc(value)}</span>') if value else ""


def render_deep_dive(dd, ctx, accent):
    """One creative, broken into Audio / Visual / Strategy layers (Bancolombia-style)."""
    P = PORTER
    fp = dd.get("fingerprint", "")
    frames = ctx["frames_by_fp"].get(fp, {})
    notes = dd.get("frame_notes", {}) or {}

    # header meta chips
    dur = dd.get("duration") or (f'{round(dd["_duration"])}s' if dd.get("_duration") else "")
    pace = _pace(dd.get("_transcript"), dd.get("_duration"))
    head_chips = "".join([
        _chip("Duration", dur),
        _chip("Aspect", dd.get("aspect", "vertical 9:16")),
        _chip("Format", dd.get("format")),
        _chip("Hook", dd.get("hook_type")),
        _chip("Funnel", dd.get("funnel_stage")),
    ])

    # AUDIO layer
    stages = dd.get("script_stages", [])
    stage_rows = "".join(
        f'<div class="dd-stage"><span class="dd-stage-tag">{esc(s.get("stage",""))}</span>'
        f'<span class="dd-stage-time">{esc(s.get("time",""))}</span>'
        f'<div class="dd-stage-text">&ldquo;{esc(s.get("text",""))}&rdquo;</div></div>'
        for s in stages
    )
    delivery = dd.get("delivery", {}) or {}
    deliv_chips = "".join([
        _chip("Pace", f"{pace} w/s" if pace else delivery.get("pace")),
        _chip("Voice", delivery.get("voice", "Yes")),
        _chip("Music", delivery.get("music")),
    ])
    audio_html = (
        f'<div class="dd-layer"><div class="dd-layer-head">🎙 Audio <span class="dd-tag">Deepgram</span></div>'
        + (f'<div class="dd-quote">&ldquo;{esc(dd.get("hook",""))}&rdquo;</div>' if dd.get("hook") else "")
        + (f'<div class="dd-sub">Script breakdown</div>{stage_rows}' if stage_rows else "")
        + (f'<div class="dd-meta-row">{deliv_chips}</div>' if deliv_chips.strip() else "")
        + '</div>'
    )

    # VISUAL layer — 3 frames, each with a scene description
    fcells = []
    for stage in ("hook", "mid", "end"):
        if frames.get(stage):
            fcells.append(
                f'<div class="dd-frame"><img src="{frames[stage]}" alt="{stage}"/>'
                f'<span class="dd-frame-cap">{stage}</span>'
                + (f'<div class="dd-frame-desc">{esc(notes.get(stage,""))}</div>' if notes.get(stage) else "")
                + '</div>'
            )
    visual_html = (
        f'<div class="dd-layer"><div class="dd-layer-head">🎬 Visual <span class="dd-tag">Frames</span></div>'
        f'<div class="dd-frames">{"".join(fcells)}</div></div>'
    ) if fcells else ""

    # STRATEGY layer
    strat_attrs = "".join(
        f'<div class="dd-attr"><span class="dd-attr-k">{lab}</span><span class="dd-attr-v">{esc(dd[key])}</span></div>'
        for lab, key in [("Angle", "angle"), ("Persona", "persona"), ("Actors", "actors"), ("Production", "production")]
        if dd.get(key)
    )
    levers = dd.get("copy_levers") or []
    lever_html = ("".join(f'<span class="dd-lever">{esc(x)}</span>' for x in levers))
    why = f'<div class="dd-why"><strong>Why it works</strong> {esc(dd.get("why_it_works",""))}</div>' if dd.get("why_it_works") else ""
    strat_html = (
        f'<div class="dd-layer"><div class="dd-layer-head">🧠 Strategy <span class="dd-tag">Analysis</span></div>'
        + (f'<div class="dd-attrs">{strat_attrs}</div>' if strat_attrs else "")
        + (f'<div class="dd-levers"><span class="dd-sub">Copy levers</span>{lever_html}</div>' if lever_html else "")
        + why + '</div>'
    )

    link = (f'<a class="dd-link" href="{esc(dd.get("ad_url") or "")}" target="_blank" rel="noopener">'
            f'🔗 Verify on Meta Ad Library →</a>') if dd.get("ad_url") else ""
    variants = dd.get("variants")
    vbadge = f'<span class="dd-variants">×{variants} variants</span>' if variants else ""

    return (
        f'<div class="dd-card"><div class="dd-head"><h3>{esc(dd.get("title",""))}</h3>{vbadge}</div>'
        f'<div class="dd-meta-row dd-head-chips">{head_chips}</div>'
        f'<div class="dd-grid">{audio_html}{visual_html}</div>'
        f'{strat_html}{link}</div>'
    )


def render(ctx, narrative, accent):
    nb = narrative or {}
    P = PORTER
    brand = esc(ctx["brand_name"])

    vid_pct = pct(ctx["videos"], ctx["unique"])
    kpis = [
        ("Active ads", f'{ctx["raw_ads"]}', "in Meta Ad Library"),
        ("Unique creatives", f'{ctx["unique"]}', f'after dedup ({int(ctx["dedup_ratio"]*100)}% duplicated)'),
        ("Video / Image", f'<span class="hl">{ctx["videos"]}</span> / {ctx["images"]}',
         f'{vid_pct}% video, {100-vid_pct}% image'),
        ("Enriched", f'{ctx["enriched"]}', f'{int(ctx["enrichment_coverage"]*100)}% with transcript/frames'),
    ]
    kpi_html = "\n".join(
        f'<div class="kpi"><div class="label">{esc(l)}</div>'
        f'<div class="value">{v}</div><div class="sub">{esc(s)}</div></div>'
        for l, v, s in kpis
    )

    angles_html = bar_rows([(a.replace("_", " "), v) for a, v in ctx["angles"][:8]], accent)
    plat_html = bar_rows([(p, c) for p, c, _ in ctx["platforms"]], accent, alt=P["aqua"])

    # creative grid
    cards = []
    for c in ctx["creatives"][:24]:
        badge_type = "video" if c["type"] == "video" else "image"
        thumb = (
            f'<img src="{c["thumb"]}" alt="" loading="lazy"/>'
            if c["thumb"]
            else '<div class="no-thumb">No frame<br><span>(not enriched)</span></div>'
        )
        angle_chip = f'<span class="chip">{esc(c["angle"].replace("_"," "))}</span>' if c["angle"] else ""
        cards.append(
            f'<button class="card" onclick="openModal(this)"'
            f' data-hook="{esc(c["hook"])}" data-transcript="{esc(c["transcript"])}"'
            f' data-title="{esc(clip(c["title"],90))}" data-url="{esc(c["ad_url"] or "")}"'
            f' data-angle="{esc(c["angle"].replace("_"," "))}" data-type="{badge_type}" data-variants="{c["variants"]}">'
            f'<div class="thumb-wrap">{thumb}'
            f'<span class="badge variants">×{c["variants"]}</span>'
            f'<span class="badge type type-{badge_type}">{badge_type}</span></div>'
            f'<div class="meta"><div class="product">{esc(clip(c["title"],70)) or "—"}</div>'
            f'<div class="row">{angle_chip}<span class="cta">{esc(c["cta"])}</span></div></div>'
            f'</button>'
        )
    grid_html = "\n".join(cards)

    # landings — show host + full path so distinct pages are visible
    land_total = sum(l.get("count", 0) for l in ctx["landings"]) or 1
    top_land = (ctx["landings"][0].get("count", 1) if ctx["landings"] else 1)
    land_rows = []
    for l in ctx["landings"][:12]:
        url = l.get("url", "")
        clean = re.sub(r"^https?://", "", url).rstrip("/")
        host = clean.split("/")[0]
        path = "/" + "/".join(clean.split("/")[1:]) if "/" in clean else "/"
        ctas = ", ".join(k for k in (l.get("ctas") or {}).keys())
        cnt = l.get("count", 0)
        land_rows.append(
            f'<div class="land-row"><div class="land-path"><span class="land-host">{esc(host)}</span>'
            f'<span class="land-slug">{esc(path)}</span>{f"<span class=chip>{esc(ctas)}</span>" if ctas else ""}</div>'
            f'<div class="bar-bg"><div class="bar-fill" style="width:{pct(cnt, top_land)}%;'
            f'background:linear-gradient(90deg,{P["aqua"]},{accent})"></div></div>'
            f'<div class="count">{cnt}<span class="land-pct">{pct(cnt, land_total)}%</span></div></div>'
        )
    land_note = ""
    if ctx["landings"]:
        n = len([l for l in ctx["landings"] if l.get("count")])
        land_note = (f'<p class="desc">Only <strong>{n}</strong> distinct destination'
                     f'{"s" if n != 1 else ""} across {ctx["raw_ads"]} ads — '
                     f'the funnel is narrow and quote-driven.</p>')
    land_html = "\n".join(land_rows) or '<p class="desc">No landing pages detected.</p>'

    # narrative: per-creative deep dives (rich)
    deep = nb.get("deep_dives", [])
    # attach data from ctx by fingerprint (ad_url, variants, transcript, duration, hook)
    cby = {c["fp"]: c for c in ctx["creatives"]}
    for dd in deep:
        src = cby.get(dd.get("fingerprint"), {})
        dd.setdefault("ad_url", src.get("ad_url"))
        dd.setdefault("variants", src.get("variants"))
        dd.setdefault("hook", src.get("hook"))
        dd["_transcript"] = src.get("transcript")
        dd["_duration"] = src.get("duration")

    # patterns across the library (synthesis)
    patterns = nb.get("patterns", [])
    patterns_html = ""
    if patterns:
        cells = "".join(
            f'<div class="pattern"><div class="pattern-t">{esc(p.get("title",""))}</div>'
            f'<div class="pattern-b">{esc(p.get("body",""))}</div></div>'
            for p in patterns
        )
        patterns_html = (f'<div class="patterns"><div class="dd-sub">Patterns across the library</div>'
                         f'<div class="pattern-grid">{cells}</div></div>')

    deep_html = ""
    if deep or patterns:
        cards_dd = "".join(render_deep_dive(dd, ctx, accent) for dd in deep)
        deep_html = (f'<section><h2>Creative deep-dive</h2>'
                     f'<p class="desc">First the patterns that repeat across every ad, then the most-scaled '
                     f'creatives broken down layer by layer — audio (script + delivery), visual (frame-by-frame) '
                     f'and strategy (angle, persona, cast, copy levers).</p>'
                     f'{patterns_html}{cards_dd}</section>')

    # narrative: findings
    findings = nb.get("findings", [])
    findings_html = ""
    if findings:
        items = "\n".join(
            f'<div class="callout"><strong>{esc(f.get("title",""))}</strong><p>{esc(f.get("body",""))}</p></div>'
            for f in findings
        )
        findings_html = (f'<section><h2>Actionable findings</h2>'
                         f'<p class="desc">What a competitor of {brand} should take away.</p>{items}</section>')

    lim_html = "\n".join(f'<li>{esc(l)}</li>' for l in ctx["limitations"])

    subtitle = nb.get("subtitle") or (
        f'<strong>{ctx["raw_ads"]} active ads</strong> · {ctx["unique"]} unique creatives · '
        f'{ctx["enriched"]} with audio + frame analysis.'
    )

    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{brand} · Meta Ads Audit — Porter Metrics</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
:root{{--bg:{P['void']};--surface:{P['dark']};--surface-2:{P['rich']};--border:#2a1a55;
--text:#f3effc;--muted:#a99bd0;--accent:{accent};--accent-2:{P['aqua']};--pink:{P['pink']};
--yellow:{P['yellow']};--purple:{P['violet']};--lavender:{P['lavender']};--radius:16px;
--font:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;}}
*{{box-sizing:border-box;}}body{{margin:0;font-family:var(--font);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;line-height:1.5;}}
.wrap{{max-width:1240px;margin:0 auto;padding:56px 32px 96px;}}
header{{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:24px;margin-bottom:44px;}}
.eyebrow{{font-family:var(--mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;}}
h1{{font-size:52px;margin:0 0 10px;font-weight:900;letter-spacing:-.03em;line-height:.95;}}
h1 .live{{display:inline-block;font-size:13px;vertical-align:middle;padding:5px 11px;background:var(--accent-2);color:#022;border-radius:999px;margin-left:14px;font-weight:700;font-family:var(--mono);}}
.sub{{color:var(--muted);font-size:17px;max-width:660px;}}.sub strong{{color:var(--text);}}
.porter-tag{{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--surface);border:1px solid var(--border);border-radius:999px;font-size:13px;color:var(--muted);font-family:var(--mono);}}
.porter-tag strong{{color:var(--text);}}.porter-tag .dot{{width:8px;height:8px;background:var(--accent-2);border-radius:50%;}}
.kpi-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:60px;}}
.kpi{{padding:26px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);}}
.kpi .label{{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:10px;}}
.kpi .value{{font-size:40px;font-weight:800;letter-spacing:-.02em;}}.kpi .value .hl{{color:var(--accent);}}.kpi .sub{{font-size:13px;color:var(--muted);margin-top:6px;}}
section{{margin-bottom:60px;}}section h2{{font-size:26px;margin:0 0 8px;font-weight:800;letter-spacing:-.02em;}}
section .desc{{color:var(--muted);margin:0 0 24px;font-size:15px;max-width:760px;}}
.two-col{{display:grid;grid-template-columns:1fr 1fr;gap:24px;}}
@media(max-width:820px){{.two-col{{grid-template-columns:1fr;}}h1{{font-size:38px;}}}}
.chart{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;}}
.chart h3{{font-size:15px;margin:0 0 18px;font-weight:600;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:.1em;}}
.bar-row{{display:grid;grid-template-columns:190px 1fr 48px;align-items:center;gap:14px;padding:9px 0;border-bottom:1px solid var(--border);}}
.bar-row:last-child{{border-bottom:none;}}.bar-row .name{{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}}
.bar-row .bar-bg{{background:var(--surface-2);height:20px;border-radius:6px;overflow:hidden;}}.bar-row .bar-fill{{height:100%;border-radius:6px;}}
.bar-row .count{{font-size:13px;font-weight:700;text-align:right;color:var(--muted);}}
/* deep-dive */
.dd-card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px;margin-bottom:20px;}}
.dd-head{{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}}.dd-head h3{{margin:0;font-size:19px;font-weight:700;}}
.dd-variants{{font-family:var(--mono);font-size:12px;color:var(--yellow);border:1px solid rgba(251,191,36,.35);padding:4px 10px;border-radius:999px;white-space:nowrap;}}
.dd-frames{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;}}
.dd-frame{{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:var(--surface-2);}}.dd-frame img{{width:100%;height:100%;object-fit:cover;}}
.dd-frame-cap{{position:absolute;bottom:8px;left:8px;font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;background:rgba(0,0,0,.6);padding:3px 7px;border-radius:5px;backdrop-filter:blur(6px);}}
.dd-attrs{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:18px;}}
.dd-attr{{background:var(--surface-2);border-radius:9px;padding:11px 14px;}}
.dd-attr-k{{display:block;font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent-2);margin-bottom:4px;}}.dd-attr-v{{font-size:13.5px;color:var(--text);}}
.dd-script{{border-top:1px solid var(--border);padding-top:16px;margin-bottom:16px;}}.dd-sub{{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:12px;}}
.dd-stage{{display:grid;grid-template-columns:80px 60px 1fr;gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid rgba(42,26,85,.5);}}.dd-stage:last-child{{border-bottom:none;}}
.dd-stage-tag{{font-family:var(--mono);font-size:10px;font-weight:600;color:var(--purple);letter-spacing:.06em;}}.dd-stage-time{{font-family:var(--mono);font-size:11px;color:var(--muted);}}.dd-stage-text{{font-size:13.5px;color:var(--lavender);}}
.dd-why{{background:var(--surface-2);border-left:3px solid var(--accent);padding:14px 16px;border-radius:9px;font-size:14px;color:var(--muted);margin-bottom:14px;}}.dd-why strong{{color:var(--accent);display:block;margin-bottom:4px;}}
.dd-link{{display:inline-block;font-family:var(--mono);font-size:12.5px;color:var(--yellow);text-decoration:none;border:1px solid var(--border);padding:8px 14px;border-radius:8px;}}
.dd-head-chips{{margin-bottom:18px;}}
.dd-meta-row{{display:flex;flex-wrap:wrap;gap:8px;}}
.dd-chip{{font-family:var(--mono);font-size:11px;color:var(--muted);background:var(--surface-2);padding:5px 10px;border-radius:6px;}}.dd-chip b{{color:var(--text);font-weight:600;}}
.dd-grid{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;}}
@media(max-width:820px){{.dd-grid{{grid-template-columns:1fr;}}}}
.dd-layer{{background:var(--surface-2);border-radius:12px;padding:18px;}}
.dd-layer-head{{font-size:13px;font-weight:700;margin-bottom:12px;}}.dd-tag{{font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--accent-2);border:1px solid var(--border);padding:2px 6px;border-radius:5px;margin-left:6px;vertical-align:middle;}}
.dd-quote{{font-family:var(--mono);font-size:13px;color:var(--lavender);border-left:2px solid var(--purple);padding-left:12px;margin-bottom:14px;}}
.dd-frames{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}}
.dd-frame-desc{{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.35;}}
.dd-levers{{margin-top:6px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;}}.dd-lever{{font-family:var(--mono);font-size:11px;color:var(--yellow);border:1px solid rgba(251,191,36,.3);padding:4px 9px;border-radius:999px;}}
.patterns{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px;}}
.pattern-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:6px;}}
.pattern-t{{font-size:14px;font-weight:700;color:var(--accent);margin-bottom:6px;}}.pattern-b{{font-size:13px;color:var(--muted);line-height:1.45;}}
.land-row{{display:grid;grid-template-columns:1fr 220px 64px;align-items:center;gap:16px;padding:11px 0;border-bottom:1px solid var(--border);}}.land-row:last-child{{border-bottom:none;}}
.land-path{{display:flex;align-items:baseline;gap:2px;flex-wrap:wrap;}}.land-host{{color:var(--muted);font-size:13px;}}.land-slug{{color:var(--text);font-size:14px;font-weight:600;}}.land-path .chip{{margin-left:8px;}}
.land-pct{{font-family:var(--mono);font-size:11px;color:var(--accent-2);margin-left:6px;}}
@media(max-width:820px){{.land-row{{grid-template-columns:1fr 90px;}}.land-row .bar-bg{{display:none;}}}}
/* grid */
.creative-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px;}}
.card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;color:inherit;transition:transform .2s,border-color .2s;display:flex;flex-direction:column;padding:0;font-family:inherit;text-align:left;cursor:pointer;}}
.card:hover{{transform:translateY(-3px);border-color:var(--accent);}}
.thumb-wrap{{position:relative;aspect-ratio:1;background:var(--surface-2);overflow:hidden;}}.thumb-wrap img{{width:100%;height:100%;object-fit:cover;}}
.no-thumb{{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);font-size:13px;text-align:center;font-family:var(--mono);}}.no-thumb span{{font-size:11px;opacity:.6;}}
.badge{{position:absolute;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;font-family:var(--mono);backdrop-filter:blur(8px);background:rgba(0,0,0,.55);}}
.badge.variants{{top:10px;left:10px;color:var(--yellow);}}.badge.type{{top:10px;right:10px;}}.badge.type-video{{color:var(--pink);}}.badge.type-image{{color:var(--accent-2);}}
.meta{{padding:14px 16px;}}.product{{font-size:13px;font-weight:600;margin-bottom:10px;line-height:1.35;}}
.row{{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}}.chip{{font-size:11px;padding:3px 8px;background:var(--surface-2);border-radius:5px;color:var(--muted);font-family:var(--mono);}}
.cta{{margin-left:auto;font-size:11px;color:var(--accent);font-weight:600;font-family:var(--mono);}}
.callout{{background:var(--surface);border-left:3px solid var(--accent);padding:20px 24px;border-radius:10px;margin:14px 0;}}.callout strong{{color:var(--accent);display:block;margin-bottom:6px;font-size:16px;}}.callout p{{margin:0;color:var(--muted);font-size:15px;}}
.limitations{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;}}.limitations ul{{margin:0;padding-left:20px;color:var(--muted);}}.limitations li{{margin-bottom:10px;font-size:14px;}}
footer{{margin-top:64px;padding-top:32px;border-top:1px solid var(--border);color:var(--muted);font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;font-family:var(--mono);}}footer a{{color:var(--accent);text-decoration:none;}}
.modal-overlay{{position:fixed;inset:0;background:rgba(5,0,20,.9);backdrop-filter:blur(10px);z-index:100;display:none;align-items:center;justify-content:center;padding:24px;}}.modal-overlay.open{{display:flex;}}
.modal{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);max-width:560px;width:100%;padding:32px;max-height:85vh;overflow-y:auto;}}
.modal h3{{margin:0 0 6px;font-size:20px;padding-right:30px;}}.modal .m-angle{{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent-2);margin-bottom:14px;}}
.modal .m-hook{{color:var(--accent);font-weight:600;margin:14px 0 6px;}}.modal .m-body{{color:var(--muted);font-size:14px;white-space:pre-wrap;}}
.modal .m-close{{float:right;cursor:pointer;color:var(--muted);font-size:22px;line-height:1;background:none;border:none;}}
.modal a.m-link{{display:inline-block;margin-top:20px;color:var(--yellow);font-family:var(--mono);font-size:13px;text-decoration:none;border:1px solid var(--border);padding:8px 14px;border-radius:8px;}}
</style></head>
<body><div class="wrap">
<header>
<div class="brand-block"><div class="eyebrow">Meta Ads Live Audit · Powered by Porter Metrics</div>
<h1>{brand} <span class="live">● LIVE</span></h1>
<div class="sub">{subtitle}</div></div>
<div class="porter-tag"><span class="dot"></span><span>Powered by <strong>Porter Metrics</strong> · Meta Ads Monitor</span></div>
</header>

<div class="kpi-grid">{kpi_html}</div>

{deep_html}

<section><h2>Creative strategy</h2><p class="desc">Hook angles detected across the library and the platforms each creative is eligible on.</p>
<div class="two-col">
<div class="chart"><h3>Hook angles</h3>{angles_html}</div>
<div class="chart"><h3>Platform eligibility</h3>{plat_html}</div>
</div></section>

<section><h2>Top creatives by variant count</h2><p class="desc">The creatives with the most active variants = where {brand} is spending most. Click any card for its hook and full transcript.</p>
<div class="creative-grid">{grid_html}</div></section>

<section><h2>Where the traffic goes</h2>{land_note}
<div class="chart">{land_html}</div></section>

{findings_html}

<section><h2>What can't be measured (transparency)</h2>
<div class="limitations"><ul>{lim_html}</ul></div></section>

<footer><span>Generated by the Porter Meta Ads Monitor pipeline · data from Meta's public Ad Library</span>
<a href="{esc(ctx['ad_library_url'])}" target="_blank" rel="noopener">Open in Meta Ad Library →</a></footer>
</div>

<div class="modal-overlay" id="modal" onclick="if(event.target===this)closeModal()">
<div class="modal"><button class="m-close" onclick="closeModal()">×</button>
<h3 id="m-title"></h3><div class="m-angle" id="m-angle"></div>
<div class="m-hook" id="m-hook"></div><div class="m-body" id="m-body"></div>
<a class="m-link" id="m-link" target="_blank" rel="noopener">🔗 Verify on Meta Ad Library →</a></div></div>

<script>
function openModal(el){{
  document.getElementById('m-title').textContent=el.dataset.title||'Creative';
  var ang=el.dataset.angle; document.getElementById('m-angle').textContent=ang?(ang+' · ×'+el.dataset.variants+' variants'):'';
  var h=el.dataset.hook; document.getElementById('m-hook').textContent=h?('Hook: '+h):'';
  document.getElementById('m-body').textContent=el.dataset.transcript||'(No transcript — creative not enriched or has no audio)';
  var link=document.getElementById('m-link'); if(el.dataset.url){{link.href=el.dataset.url;link.style.display='inline-block';}}else{{link.style.display='none';}}
  document.getElementById('modal').classList.add('open');
}}
function closeModal(){{document.getElementById('modal').classList.remove('open');}}
document.addEventListener('keydown',function(e){{if(e.key==='Escape')closeModal();}});
</script>
</body></html>"""


# ── main ────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="brand → Porter visual report (HTML)")
    ap.add_argument("--page-id", required=True)
    ap.add_argument("--brand", default=None, help="Name override (default: page_name from AUDIT)")
    ap.add_argument("--narrative", default=None, help="Path to narrative.json (findings/deep_dives/subtitle)")
    ap.add_argument("--accent", default=PORTER["purple"], help="Accent color (default Porter purple)")
    ap.add_argument("--out", default=None, help="Output path (default: dist/<slug>/index.html)")
    args = ap.parse_args()

    d, data_dir = load_audit(args.page_id)
    ctx = build_ctx(d, data_dir)
    if args.brand:
        ctx["brand_name"] = args.brand

    narrative = None
    if args.narrative and Path(args.narrative).exists():
        narrative = json.loads(Path(args.narrative).read_text())

    html_out = render(ctx, narrative, args.accent)

    slug = re.sub(r"[^a-z0-9]+", "-", ctx["brand_name"].lower()).strip("-") or str(args.page_id)
    out = Path(args.out) if args.out else (PIPELINE_DIR / "dist" / slug / "index.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html_out, encoding="utf-8")

    size_mb = out.stat().st_size / 1e6
    with_thumb = sum(1 for c in ctx["creatives"][:24] if c["thumb"])
    n_deep = len((narrative or {}).get("deep_dives", []))
    print(f"✓ Report generated: {out}")
    print(f"  {ctx['brand_name']} · {ctx['raw_ads']} ads · {ctx['unique']} unique · "
          f"{with_thumb}/24 cards with image · {n_deep} deep-dives · {size_mb:.1f} MB")
    if not narrative:
        print("  ⚠ No narrative.json → no 'Creative deep-dive' or 'Actionable findings'. "
              "Claude can write it and re-generate.")


if __name__ == "__main__":
    main()
