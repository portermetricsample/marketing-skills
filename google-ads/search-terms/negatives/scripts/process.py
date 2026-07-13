#!/usr/bin/env python3
"""
negative-keywords — DETERMINISTIC core: the account's full negative-keyword MAP + a redundancy check
so the recommending skills never suggest a negative that already exists.

Negatives are READ via the connector-action GAQL path (NOT query_data — they're config, not metrics):
  execute_connector_action -> keyword.list with a raw GAQL `query`, three resources:
    - campaign_criterion   (campaign-level negatives, negative = TRUE)
    - ad_group_criterion   (ad-group-level negatives, negative = TRUE)
    - shared_criterion     (shared negative lists) + campaign_shared_set (which campaigns use them)
All three are reachable (live-verified). See ../references/tools.md.

Match semantics (Google): a negative blocks a query by MATCH TYPE —
  EXACT  [x]   blocks only the exact query == x   (negatives have NO close variants)
  PHRASE "x"   blocks queries containing x as a contiguous phrase
  BROAD   x    blocks queries containing ALL of x's words (any order)

Usage:
  process.py <negatives_raw.json> [candidates.json]
    negatives_raw.json = { "campaign": <keyword.list body>, "ad_group": <body>,
                           "shared": <body>, "links": <campaign_shared_set body> }  (any may be omitted)
    candidates.json    = [ { "text": "...", "match_type": "BROAD|PHRASE|EXACT",
                             "campaign": "...", "ad_group": "..." } ]  (negatives a skill WANTS to add)

Emits: { inventory, summary, candidates? }. With candidates, each is annotated already_covered + by what.
"""
import sys, os, re, json
from collections import defaultdict


def norm_words(s):
    return [w for w in re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower()).split() if w]


def parse_gaql(body, scope):
    """body = a keyword.list response (list of blocks, each with .results). Yield normalized negatives."""
    out = []
    if not body:
        return out
    for block in (body if isinstance(body, list) else [body]):
        for r in (block.get("results", []) if isinstance(block, dict) else []):
            crit = r.get("campaignCriterion") or r.get("adGroupCriterion") or r.get("sharedCriterion") or {}
            kw = crit.get("keyword") or {}
            text = kw.get("text")
            if not text:
                continue
            out.append({
                "text": text, "match_type": (kw.get("matchType") or "").upper(), "scope": scope,
                "campaign": (r.get("campaign") or {}).get("name"),
                "ad_group": (r.get("adGroup") or {}).get("name"),
                "shared_set": (r.get("sharedSet") or {}).get("name"),
                "status": crit.get("status"),
            })
    return out


def parse_links(body):
    """campaign_shared_set -> { campaign_name: set(shared_set_name) }."""
    links = defaultdict(set)
    if not body:
        return links
    for block in (body if isinstance(body, list) else [body]):
        for r in (block.get("results", []) if isinstance(block, dict) else []):
            c = (r.get("campaign") or {}).get("name")
            s = (r.get("sharedSet") or {}).get("name")
            if c and s:
                links[c].add(s)
    return links


def blocks(neg, term_words):
    """Does this negative block the query (list of words)? Google negative match semantics."""
    nw = norm_words(neg["text"])
    if not nw:
        return False
    mt = neg["match_type"]
    if mt == "EXACT":
        return term_words == nw
    if mt == "PHRASE":
        n = len(nw)
        return any(term_words[i:i + n] == nw for i in range(len(term_words) - n + 1))
    # BROAD (and unspecified) = all words present, any order
    tw = set(term_words)
    return all(w in tw for w in nw)


def applicable(neg, campaign, ad_group, links):
    """Does this negative apply to a candidate in (campaign, ad_group)? If the candidate gives no
    scope, every negative is considered (account-wide 'is it negatived anywhere')."""
    if campaign is None and ad_group is None:
        return True
    if neg["scope"] == "campaign":
        return neg["campaign"] == campaign
    if neg["scope"] == "ad_group":
        return neg["ad_group"] == ad_group
    if neg["scope"] == "shared":
        return campaign is not None and neg["shared_set"] in links.get(campaign, set())
    return False


def covered_by(text, campaign, ad_group, negs, links):
    """Return the FIRST applicable existing negative that blocks `text`, else None."""
    tw = norm_words(text)
    for n in negs:
        if applicable(n, campaign, ad_group, links) and blocks(n, tw):
            return n
    return None


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: process.py <negatives_raw.json> [candidates.json]")
    raw = json.load(open(sys.argv[1]))
    negs = (parse_gaql(raw.get("campaign"), "campaign")
            + parse_gaql(raw.get("ad_group"), "ad_group")
            + parse_gaql(raw.get("shared"), "shared"))
    links = parse_links(raw.get("links"))

    by_scope = defaultdict(int)
    by_match = defaultdict(int)
    for n in negs:
        by_scope[n["scope"]] += 1
        by_match[n["match_type"] or "UNSPECIFIED"] += 1

    out = {
        "summary": {
            "total_negatives": len(negs),
            "by_scope": dict(by_scope),
            "by_match_type": dict(by_match),
            "shared_lists": sorted({n["shared_set"] for n in negs if n["scope"] == "shared" and n["shared_set"]}),
            "campaigns_with_negatives": sorted({n["campaign"] for n in negs if n["campaign"]}),
        },
        "inventory": negs,
    }

    # redundancy check: annotate each candidate negative the recommending skills want to add
    if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
        cands = json.load(open(sys.argv[2]))
        annotated, already = [], 0
        for c in cands:
            hit = covered_by(c.get("text", ""), c.get("campaign"), c.get("ad_group"), negs, links)
            if hit:
                already += 1
            annotated.append({**c, "already_covered": bool(hit),
                              "covered_by": ({"text": hit["text"], "match_type": hit["match_type"],
                                              "scope": hit["scope"], "campaign": hit["campaign"]} if hit else None)})
        out["candidates"] = annotated
        out["candidates_summary"] = {"checked": len(cands), "already_covered": already,
                                     "net_new": len(cands) - already}

    # CONFLICT AUDIT: an existing negative that blocks one of your own ACTIVE positive keywords —
    # i.e. a keyword you're paying to run can never serve its own term. From negatives_raw.positive_keywords
    # (the same keyword.list GAQL, WHERE negative = FALSE).
    positives = parse_gaql(raw.get("positive_keywords"), "positive_keyword")
    if positives:
        conflicts = []
        for pk in positives:
            hit = covered_by(pk["text"], pk["campaign"], pk["ad_group"], negs, links)
            if hit:
                conflicts.append({
                    "keyword": pk["text"], "keyword_match": pk["match_type"],
                    "campaign": pk["campaign"], "ad_group": pk["ad_group"],
                    "blocked_by": {"text": hit["text"], "match_type": hit["match_type"],
                                   "scope": hit["scope"], "campaign": hit["campaign"]},
                })
        out["conflicts"] = conflicts
        out["conflicts_summary"] = {"active_keywords_checked": len(positives), "blocked": len(conflicts)}

    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
