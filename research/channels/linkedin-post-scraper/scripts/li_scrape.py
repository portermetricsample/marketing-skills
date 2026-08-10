#!/usr/bin/env python3
"""
li_scrape.py — scrape specific LinkedIn POSTS by URL → canonical posts.json

Standalone, decoupled scraper. Give it one or more LinkedIn post URLs (the ones
you want to tear down); it runs the Apify actor `apimaestro/linkedin-post-detail`
(no cookies needed), then normalizes every record into a stable schema the
analysis + report steps consume.

Actor input:  {"post_urls": [ ... ]}
Actor output: one record per URL → {post, author, job, media, stats, is_reshared, reshared_post, input}

Usage:
    python3 li_scrape.py --out data/run1 URL1 URL2 ...
    python3 li_scrape.py --out data/run1 --urls urls.txt   # one URL per line

Output:
    <out>/raw.json     the raw Apify dataset (audit trail)
    <out>/posts.json   the canonical normalized posts (the contract)

Credentials: APIFY_TOKEN from the environment, or falls back to the meta-ads
pipeline .env (same token the meta/tiktok research skills use).
"""
import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

ACTOR = "apimaestro~linkedin-post-detail"
BASE = "https://api.apify.com/v2"
META_ENV = "/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts/.env"


# ── credentials ──────────────────────────────────────────────────────────────
def get_token() -> str:
    tok = os.environ.get("APIFY_TOKEN", "").strip()
    if tok:
        return tok
    # fall back to the shared meta pipeline .env
    p = Path(META_ENV)
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line.startswith("export "):
                line = line[len("export "):].strip()
            if line.startswith("APIFY_TOKEN"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ERROR: APIFY_TOKEN not found (env or meta pipeline .env).")


# ── http helpers ─────────────────────────────────────────────────────────────
def _post(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urlrequest.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urlrequest.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode())


def _get(url: str) -> list | dict:
    req = urlrequest.Request(url, method="GET")
    with urlrequest.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


# ── scrape ───────────────────────────────────────────────────────────────────
def scrape(urls: list[str], token: str) -> list:
    """Start an async run, poll to completion, return the dataset items."""
    print(f"→ scraping {len(urls)} post URL(s) via {ACTOR}")
    run = _post(f"{BASE}/acts/{ACTOR}/runs?token={token}", {"post_urls": urls})
    rid = run["data"]["id"]
    for _ in range(90):  # up to ~7.5 min
        time.sleep(5)
        st = _get(f"{BASE}/actor-runs/{rid}?token={token}")["data"]["status"]
        if st in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            print(f"  run {rid}: {st}")
            break
    else:
        print("  run still going, fetching whatever landed so far")
    items = _get(f"{BASE}/actor-runs/{rid}/dataset/items?token={token}&limit=1000")
    print(f"  ← {len(items)} record(s)")
    return items


# ── normalize ────────────────────────────────────────────────────────────────
def _num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def first_line(text: str) -> str:
    for ln in (text or "").splitlines():
        if ln.strip():
            return ln.strip()
    return ""


def post_id_from_url(url: str) -> str:
    m = re.findall(r"(\d{18,19})", url or "")
    return m[-1] if m else ""


def normalize(items: list, requested: list[str]) -> list:
    """One clean record per requested URL. Empty/blocked posts flagged ok=False."""
    # index actor records by the input url and by numeric id
    by_input, by_id = {}, {}
    for it in items:
        inp = it.get("input") or ""
        if inp:
            by_input[inp] = it
        pid = (it.get("post") or {}).get("id")
        if pid:
            by_id[str(pid)] = it

    out = []
    for url in requested:
        it = by_input.get(url) or by_id.get(post_id_from_url(url)) or {}
        post = it.get("post") or {}
        author = it.get("author") or {}
        stats = it.get("stats") or {}
        media = it.get("media") or []
        text = post.get("text")
        job = it.get("job") or {}
        blocked = (job.get("job_title") == "This post cannot be displayed")
        ok = bool(text) and not blocked

        reshared = it.get("reshared_post") or {}
        reshared_norm = None
        if it.get("is_reshared") and reshared:
            rp, ra = reshared.get("post", reshared), reshared.get("author", {})
            reshared_norm = {
                "text": (rp.get("text") if isinstance(rp, dict) else None),
                "author": ra.get("name") if isinstance(ra, dict) else None,
            }

        created = post.get("created_at") or {}
        out.append({
            "url": url,
            "id": str(post.get("id") or post_id_from_url(url)),
            "ok": ok,
            "error": None if ok else ("blocked / not displayable (carousel, document, or restricted)" if blocked else "no text returned"),
            "type": post.get("type"),
            "created_at": created.get("date") if isinstance(created, dict) else created,
            "text": text or "",
            "hook": first_line(text or ""),
            "char_count": len(text or ""),
            "author": {
                "name": author.get("name"),
                "headline": author.get("headline"),
                "followers": author.get("followers"),
                "profile_url": author.get("profile_url"),
            },
            "stats": {
                "reactions": _num(stats.get("total_reactions")),
                "comments": _num(stats.get("comments")),
                "shares": _num(stats.get("shares")),
                "reaction_breakdown": stats.get("reactions") or {},
            },
            "media": [
                {"type": m.get("type"), "url": m.get("url") or m.get("image") or m.get("video_url")}
                for m in media if isinstance(m, dict)
            ],
            "is_reshared": bool(it.get("is_reshared")),
            "reshared": reshared_norm,
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="*", help="LinkedIn post URLs")
    ap.add_argument("--urls", dest="urls_file", help="file with one URL per line")
    ap.add_argument("--out", required=True, help="output dir")
    args = ap.parse_args()

    urls = list(args.urls)
    if args.urls_file:
        urls += [l.strip() for l in Path(args.urls_file).read_text().splitlines() if l.strip()]
    # de-dup, keep order
    seen, clean = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            clean.append(u)
    if not clean:
        sys.exit("ERROR: no URLs given.")

    token = get_token()
    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)

    items = scrape(clean, token)
    (outdir / "raw.json").write_text(json.dumps(items, indent=2, ensure_ascii=False))
    posts = normalize(items, clean)
    (outdir / "posts.json").write_text(json.dumps(posts, indent=2, ensure_ascii=False))

    ok = sum(1 for p in posts if p["ok"])
    print(f"\n✓ posts.json written: {ok}/{len(posts)} readable")
    for p in posts:
        flag = "ok " if p["ok"] else "SKIP"
        who = (p["author"]["name"] or "?")[:24]
        print(f"  [{flag}] {who:24} r={p['stats']['reactions']:<5} c={p['stats']['comments']:<4} {p['url'][:60]}")
    if ok < len(posts):
        print("\nNote: blocked posts are usually carousels/documents or restricted — no-cookie scraping can't read those.")


if __name__ == "__main__":
    main()
