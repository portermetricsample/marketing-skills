---
name: impression-share-competitors
description: Bridge skill. Pairs with `google-ads-serp-teardown`, which does the SERP extraction. Takes an impression-share diagnosis, isolates the campaigns losing visibility to RANK (not budget), pulls their search terms, clusters and prioritizes them by spend, samples the live SERP for the ones that matter, and reports who is actually in those auctions — advertiser, rank, landing page and offer — plus whether your own ad showed at all. Use when the user asks who is taking their impression share, who is outranking them, who is bidding on their brand, "we're losing visibility, against whom", or wants competitor context on a visibility decline. Consumes the output of `impression-share`; samples via the `google-ads-serp-teardown` skill.
---

# Impression Share → Competitors

`impression-share` answers **are we losing visibility, and is it money or the auction**.
It cannot answer **against whom**, because the account's own data has no competitor
dimension and Auction Insights is unavailable on the connector.

This skill closes that gap for the one case where the answer changes a decision: a
**rank-driven** decline. It selects what to look at, samples the live SERP, and joins the
result back onto the campaigns.

## Read this before promising anything

The competitor side is **live and point-in-time**. It shows who is in these auctions
*now* — not who was there when impression share fell. Retroactive attribution is
impossible: no provider sells a historical SERP for a search you never ran. Two honest
consequences:

- Use this to decide **what to do next**, not to prove what caused a past drop.
- A point-in-time read is the deliverable. Treat it as the competitive context around a
  decline, not as a time series.

Also: `presence` here is a sample rate across sampled terms, not Google's
impression-weighted overlap rate. A rival on 3/3 sampled terms may still sit in a small
fraction of the auctions your campaign enters.

A sample is fine — an *unmeasured* sample is not. Every output states how complete it is
(see **Completeness** below), so a reader can weigh it instead of guessing.

## Two triggers, not one

Real accounts taught this the hard way. A campaign can sit at **`Healthy`** for 90 days while
handing half its impressions to the auction every single day — flat, not declining, and
invisible to a trend-based trigger. So a campaign qualifies if either is true:

- `losing_to_rank` — declining, with driver `rank` or `mixed`.
- `rank_capped` — `current.verdict == "rank_limited"`, or ≥25% of impressions currently
  lost to rank, whatever the trend does.

## Rank lost does not mean "a competitor beat you"

The single most important thing to know before reading the output. Impressions lost to rank
means **your Ad Rank was not high enough** — which happens with zero competitors when Ad Rank
falls below Google's display threshold. A campaign can be rank-limited at 55% while owning
position 1 and facing nobody. The verdict field encodes exactly that case rather than
inventing a rival to explain it.

## Search impression share is the text-ad auction

Shopping and local ads are collected but never counted as rivals: they compete for attention
on the page, not for the search impression share the campaign reports. They appear under
`other_inventory` as context. Counting them would be a category error — and on a real brand
campaign it was the difference between "six rivals are taking your brand" and the truth,
which was "nobody is bidding against you at all".

## Scope

- ✅ Rank-driven declines (`Losing` / `Crashing` / `Crashed` with driver `rank` or `mixed`).
- ✅ Rank-capped campaigns whatever their trend.
- ✅ Brand terms — never dropped by a spend rule when they are a minority of the campaign.
  In a campaign that is *mostly* brand the exemption is switched off automatically, or it
  would bypass coverage and sample the entire tail.
- ❌ Budget-driven declines. The fix is money; competitor data would not change it, so no
  credits are spent there.
- ❌ Healthy or Winning campaigns. Add them deliberately if you are defending a position.
- ❌ Any claim about *when* a competitor entered.

## The pair

Two skills, one job each:

| | Starts from | Produces |
|---|---|---|
| [`google-ads-serp-teardown`](../../../research/channels/google-ads-serp-teardown/) | search terms | who advertises on them, rank, landing pages, tracking — pure extraction |
| **this skill** | your impression-share diagnosis | which terms are worth looking at, and what the SERP means for the campaign |

The teardown is useful on its own for any keyword in any market. This skill is what
connects it to your own account data.

## Operate

**1 — Diagnose.** Run [`../impression-share`](../impression-share/) and keep its JSON.

**2 — Pull search terms** for the triggered campaigns, using the query in
[`references/tools.md`](references/tools.md). Save the rows as JSON.

**3 — Select (free, no credits).**

```bash
python3 scripts/select_terms.py <impression_share.json> <search_terms.json> \
        --brand "<brand token>" --out plan.json
```

It filters to rank-driven campaigns, collapses long-tail variants onto the keyword that
triggered them, ranks clusters by spend, and walks down the curve until `--coverage`
(default **85%** of the campaign's qualifying search spend) is met or the next term adds
less than `--marginal` (default 1%). Top 3 per campaign plus every brand term are sampled
across both devices; everything else desktop — but **nothing is sampled only once**, because
a single sample misses roughly a third of the advertisers.

**It prints the credit estimate and the coverage before anything is spent**, and every
excluded term is listed in `plan.json` with its reason — never a silent cap.
`--max-credits` exists if you want a hard ceiling; it is off by default, since efficiency
comes from the coverage rule rather than an arbitrary number.

**4 — Sample.** Run [`google-ads-serp-teardown`](../../../research/channels/google-ads-serp-teardown/)
once per tier, matching `--loc` to the campaign's geo targeting:

```bash
# tier 1 — deep
python3 .../ads_pipeline.py <tier1 terms…> --device both --repeat 2 --loc "<campaign geo>" --out serp_t1
# tier 2 — desktop only, still repeated
python3 .../ads_pipeline.py <tier2 terms…> --device desktop --repeat 2 --loc "<campaign geo>" --out serp_t2
```

**5 — Join (free).**

```bash
python3 scripts/join.py <impression_share.json> plan.json serp_t1/ads.json serp_t2/ads.json \
        --own-domain <your domain> --out competitors.json
```

## `sample_presence` is not impression share

Every rival carries `sample_presence` (share of samples it appeared in) with a 95%
confidence interval. Two rules for reading it:

- **Never use it for your own campaigns.** The account already reports exact,
  impression-weighted impression share. Sampling to estimate a number you own precisely
  is strictly worse and costs credits.
- **For rivals it is a coarse visibility proxy**, and the resolution is low. At 10 samples
  a 60% presence carries a CI of roughly 31–83%. It separates *always there* from *rarely
  there*; it cannot separate 40% from 60%. Halving the interval costs four times the
  samples.

It also cannot see what actually drives impression share down — dayparting and budget
exhaustion — because every sample comes from one location, one device and one short
window. `rank_best`/`rank_worst` is often the more useful signal: consistently sitting
above you matters more than how often a rival appears.

## Completeness

Both halves of the sample are measured and reported.

**Selection side** (`plan.json` → `coverage`, echoed per campaign in the output):
`spend_covered` and `impressions_covered` — what share of the campaign's qualifying search
spend and impressions the sampled terms represent; `keyword_clusters_sampled` of
`clusters_total`; and `term_variants_represented`, since one sampled term stands in for its
whole cluster of long-tail variants.

**SERP side** (`competitors.json` → `completeness`): every rival is tagged `consistent` or
`intermittent` from its `times_seen`/`of_samples` across repeats. When more than 30% of
rivals are intermittent, `roster_likely_incomplete` flips true — the field was still
rotating when sampling stopped, and the rival list should not be read as exhaustive.
Raising `--repeat` is the fix.

## The verdict

Computed from the data, not written by the model:

| `verdict` | Meaning | Where to look |
|---|---|---|
| `not_shown` | your ad missing from terms you pay for | eligibility, pacing, keyword status — not bids |
| `outranked` | you show, rivals sit above you | Ad Rank: bid, Quality, extensions |
| `unexplained` | you lead, nobody competes, reach still lost | Ad Rank threshold or auctions outside the sample |

## Output

Per triggered campaign: the verdict from your own data (`trend_label`, `driver`), the
terms sampled with the devices used, `own_presence` (on how many sampled terms your ad
actually appeared — a live check the account data cannot give at keyword grain), and
`rivals` ranked by how many of your terms they show on, each with `presence`, `rank_best`,
`rank_worst`, `landing_pages` and `offers`.

`synthesis` is left blank for the model to write, following the same output contract as
the other skills in this folder. The point-in-time caveat travels inside `meta.caveat` so
a downstream reader cannot lose it.

Run `scripts/example/` end to end on the bundled fictional Acme dataset to see the shape
without spending anything.

## Reading it

The useful comparison is **your `own_presence` against the rivals' `presence`**. If your
ad appears on every sampled term and rivals simply rank above you, that is an Ad Rank
problem — bid, Quality, extensions — and the rivals' offers and landing pages tell you
what you are being compared against. If your ad is missing from terms you are paying for,
the loss is upstream of rank.
