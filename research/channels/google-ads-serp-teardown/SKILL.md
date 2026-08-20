---
name: google-ads-serp-teardown
description: "Extracts the Google Search ads a real searcher sees for any keyword, in any country or city, on desktop and mobile, and returns them as clean structured JSON. Decodes each ad's real destination URL out of Google's click wrapper, parses the advertiser's own tracking parameters into campaign name, campaign ID, ad group, match type and device, breaks the landing URL into its structure, and pairs every CTA with the page it links to. Data extraction only — no analysis. Use when the user asks who is bidding on a keyword, what ads show in a country, a competitor's Google Ads campaign structure, ad copy or CTAs on the SERP, or landing pages behind paid search. Works on any topic or market. Runs on SerpApi (engine=google_ads)."
user_invocable: true
---

# Google Ads SERP Teardown

> **Data source:** the Porter Metrics MCP. The MCP action for live SERP ads is on the
> roadmap; until it ships, the `fetch()` function in `scripts/ads_pipeline.py` is a
> temporary transport over SerpApi (free tier: 250 searches/month, key read from
> `$SERPAPI_KEY` or `~/.serpapi_key` — no key is stored in this repo). Everything
> after `fetch()` — decoding, normalising, structuring — stays the same when the
> Porter action lands. Swapping transports is a one-function change.

**In:** search terms. **Out:** one clean JSON record per ad. No analysis, no summary — the JSON is the deliverable.

```bash
python3 scripts/ads_pipeline.py "<keyword>" ["<keyword>" ...] [options]
```

| Option | Default | |
|---|---|---|
| `--loc` | United States | country or city the search runs from |
| `--gl` / `--hl` | us / en | country code / language code |
| `--device` | both | `desktop`, `mobile`, `tablet`, `both`, or a comma list |
| `--repeat` | 1 | sample each keyword N times and merge; implies `--fresh` |
| `--fresh` | off | bypass the 1h cache and force a live auction |
| `--out` | ./ads_out | output directory |
| `--csv` | off | also write a flat one-row-per-ad file |
| `--raw` | off | also keep the untouched API responses |
| `--schema` | — | print the output contract and exit |

**Cost: 1 credit per keyword, per device, per repeat.** Default `--device both` = 2 per keyword. Key from `$SERPAPI_KEY` or `~/.serpapi_key`. Balance, free: `curl -s "https://serpapi.com/account?api_key=KEY"`

## Output contract

Run `--schema`. It prints the field list straight from the constant the code writes against, so it cannot drift from reality.

```
request
└─ searches[]                one per keyword PER DEVICE
   └─ ads[]                  ranked as the page shows them
      ├─ copy{}              headline, body, display_url, extensions, price…
      ├─ destination{}       url · tracked_url · params{} · structure{}
      ├─ campaign{}          normalised ids + naming{} token breakdown
      ├─ sitelinks[]         each with its own destination{}
      ├─ cta{}               derived from copy + sitelinks
      └─ observations{}      how consistently it appeared across samples
```

`destination` is one reusable object used at **both** ad and sitelink level: `url` is the param-free identity to group on, `params` sit inside it because they describe that URL rather than the ad, and `structure` decomposes the path. Sitelinks are data at ad level; `cta` is a derived summary over them, not their container.

Empty values are pruned — a field absent from a record simply did not apply. Per-impression click ids (`gclid`, `gbraid`, …) are stripped from `params` since they change on every call and would make two samples of one ad look different; the untouched string stays in `tracked_url`.

## Three things that decide whether you get data

**1. `engine=google_ads`.** The standard `engine=google` returns zero ads on the same query, same location, same minute. Hardcoded — don't "simplify" it.

**2. `--loc` is the auction.** Ads are geo-targeted; the location decides which advertisers exist, not just the language. City names: `https://serpapi.com/locations.json?q=<country>`

**3. Device changes the advertiser set, not just the layout.** Desktop and mobile are separate auctions and routinely return different advertisers, ranks and landing pages. Group by `device` before comparing anything. Mobile returns fewer ads and is more fragile — a city-level `--loc` can suppress mobile ads entirely, so prefer country-level on mobile and never read an empty mobile result as "nobody advertises here".

## Expect most ads NOT to expose tracking parameters

Two click mechanisms exist: the destination sits in the markup, or it's resolved at click time from a tracking template. In the second case the parameters **do not exist in the page** — verified against Google's raw HTML, not a parser limit. There is no non-click way to get them, and clicking charges the advertiser. Those ads still return landing URL, copy, CTAs, rank and slot. `tracking_exposed` flags which is which.

How often it happens depends heavily on the vertical, and the optimistic number is the wrong
one to plan with. Across mixed consumer keywords it ran near one in three. Across two real
accounts — B2B SaaS and sporting goods — it was **2 of 22 ads (9%)**: those advertisers use
click-time tracking templates almost universally. Assume the landing URL is what you get, and
treat exposed parameters as a bonus.

## Reading a zero

`ad_count: 0` is ambiguous by nature, so every search carries `other_blocks` listing the non-ad blocks the page did contain. A populated `other_blocks` with zero ads means the page loaded and Google served no ads; an `error` field means the call failed after a retry. Product-heavy queries often return product blocks and no text ads at all.

## Live data only, and it rotates fast

Every call runs a real search at that moment. There is no historical mode: you cannot ask what ads ran last month, only what is running now. Two consequences:

- **Ads rotate between calls.** The same keyword, same device, same location, seconds apart, returns different advertisers. A single call is one sample, never the market.
- **Results are cached for 1 hour.** Repeating a keyword inside that window returns the *identical* cached response — same timestamp, same ads. `--fresh` forces a live auction; `--repeat` sets it automatically.

`--repeat N` runs N live samples and merges them on advertiser + param-free landing page. Every ad then carries `observations`: `times_seen` out of `of_samples`, `placements` (an advertiser can hold two slots at once), `rank_best`/`rank_worst`, and the slots seen. `rank` becomes the best rank observed, and each sample's timestamp and id are listed under `sampled_at`.

That turns "who competes here" from a guess into something with a denominator: an advertiser seen 3/3 at ranks 3–6 across five placements is a different competitor from one seen 1/3 at rank 6.

Each search records a `search_id`; SerpApi keeps the response retrievable from their archive for 31 days, so a run can be re-pulled without re-billing. Building your own history means storing every run — the archive only covers searches you already made.

## Failure behaviour

Never raises. Status is checked inside the response body, one retry after 3s, failures recorded per search with an `error` field, and `ads.json` is rewritten after every search — a run that dies partway keeps everything already paid for. Failed queries are listed at the end.

## Related

`impression-share-competitors` — the companion that drives this skill from your own account:
it reads an impression-share diagnosis, decides which of your search terms are worth sampling,
and joins the result back onto the campaigns. Use this skill alone for any keyword in any
market; use the pair when the question starts from your own lost visibility.

`google-ads-competitor-ads` — the inverse: every creative for one advertiser from the Transparency Center, with run dates, but no destination URL.
