# Tools / data plan — step 2 only

The bridge needs exactly one pull the `impression-share` skill does not make: the search
terms behind the campaigns it flagged. Everything else is deterministic and local.

## The query

```jsonc
execute  tool:porter-reporting:query_data
{
  "accounts": [ <full connected account object from list_accounts> ],
  "fields": [
    "google_ads_campaign_name",              // the join key back to the diagnosis
    "google_ads_search_term",                // what the user actually typed — the unit we sample
    "google_ads_keyword_info_text",          // the keyword that triggered it — the cluster key
    "google_ads_keyword_info_match_type",    // EXACT | PHRASE | BROAD
    "google_ads_cost",                       // the priority signal
    "google_ads_impressions",                // the noise floor
    "google_ads_clicks",
    "google_ads_conversions"
  ],
  "date_range": { "date_from": "<same window as the impression-share run>", "date_to": "<today-1>" },
  "filters": [[ { "field": "google_ads_impressions", "operator": "greater_than", "value": "0" } ]],
  "limit": 5000
}
```

Filter to the flagged campaigns either in the query or by letting `select_terms.py` do it —
it ignores any row whose campaign is not triggered.

## Why the search term and not the keyword

The search term is the string a real user typed, so it is the auction that actually ran. A
broad-match keyword's text may be a phrase nobody ever searches; sampling it would return a
SERP your campaign never competes in.

The trade is volume: one keyword can spawn dozens of near-identical variants. That is what
the clustering in `select_terms.py` is for — group by `google_ads_keyword_info_text`, sample
the highest-spend representative, and carry the cluster's combined spend as its weight.

## Gotchas

- **Use the same date window as the impression-share run.** Terms from a different period
  describe a different auction than the one whose decline you are explaining.
- **PMax / Demand Gen have no usable `keyword_info_match_type`** and no Search impression
  share; those campaigns never reach this skill because `impression-share` drops them.
- **Match the geo when sampling.** The campaign's targeting decides which auction it enters;
  a SERP sampled from the wrong country is a different auction entirely. Pass it as `--loc`.
- **Cost fields on this connector are already in currency** — do not divide by 1e6.
