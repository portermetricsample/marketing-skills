# charts/contribution-sankey/google-ads — Account contribution

A Google Ads account drawn as a **contribution sankey** — the reusable, account-agnostic version
of "where does my spend / conversions / value actually go":

```
Campaign type ─ Campaign ─ Ad group ─ Keyword ─ Search term
```

- **Flow by** — `Spend` · `Conversions` · `Conv. value` (the ribbon width).
- **Depth** — stop at `Keyword` (4 levels) or extend to `Search term` (5 levels).
- **Hover** — lights a node's whole path (campaign → ad group → keyword → search term) and shows
  its card: Ad spend · Conversions · Conv. value · **CPA** (derived).

This is a **use case** on top of [`../contribution-sankey.js`](../contribution-sankey.js): it owns
the Google Ads knowledge and turns three raw `query_data` tables into the engine's generic
`{ nodes, links }`. The flow mechanics live in the engine.

## The three input tables (raw `query_data` rows — the use case never fetches)

Pull these live from the Porter MCP (`google-ads` connector), then hand the rows in. The joins
that make the chain reconcile are the reason it's three pulls (keyword-view and search-term-view
can't be combined in one query):

| `opts` key | One Porter `query_data` call | Fields used |
|---|---|---|
| `adGroups` | ad-group totals (FULL spend) | `campaign_name`, `ad_group_name`, `cost_micros`, `conversions`, `conversions_value` |
| `keywords` | `keyword_view` | + `keyword_info_text`, `keyword_info_match_type` |
| `searchTerms` | `search_term_view` | `keyword_info_text` (the matched keyword — this is the join), `search_term`, the metrics |

> **Why `keyword_info_text` on the search-term query is essential:** it's the real keyword↔search-term
> join. `search_term + keyword` is rejected by the catalog, but `search_term + keyword_info_text`
> works — that's what lets level 4 attach to the right level-3 keyword. Without it, search terms
> would only roll up to the ad group, not the keyword.

## The honest remainder buckets (why every column reconciles)

Real Google Ads data under-reports, so the use case adds neutral-grey `"__other__"` nodes to keep
each split adding up:

- **"other keywords"** = ad-group spend Google didn't attribute to any keyword (`ad-group total −
  Σ keywords`).
- **"other / unreported searches"** = the keyword spend whose exact queries Google hides for
  privacy, plus the long tail past the top-N shown (`keyword total − Σ shown search terms`).

**Spend reconciles exactly; conversions / value carry attribution slack**, so the remainder
matters more on those metrics. Branch colour = one per **campaign**.

## Use

```js
const ac = require("./account-contribution");   // browser: window.PorterReporting.accountContribution

ac.mount("#host", {
  account:    { name: "Search campaigns" },
  adGroups, keywords, searchTerms,   // the three raw row sets above
  metric: "cost",                    // initial Flow-by (default: first metric)
  depth: 4,                          // 4 = stop at Keyword · 5 = to Search term
  topTerms: 6,                       // top search terms per keyword (rest → "other / unreported")
  fields: { /* override the google_ads_* field names if your pull renamed them */ },
  height: 560
});
```

`buildData(opts)` returns just the generic `{ columns, metrics, nodes, links }` if you want to wire
the engine yourself (e.g. inside a live Porter report page) instead of using the bundled control bar.

## Caveats

- **Search-only flows end-to-end.** Performance Max / Shopping / Display campaigns have no
  keywords or search terms — their branches dead-end at the campaign/ad-group level (honest, not a
  bug). Fingerprint the account first; if it isn't Search-heavy, say so.
- **`conversions` vs `all_conversions`** and **ROAS** follow the same rules as everywhere — see
  `porter-analysis` google-ads query planning. The tooltip's CPA is `cost / conversions`.
- **No real data:** the demo uses only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.

## Files

| File | What |
|---|---|
| [`account-contribution.js`](account-contribution.js) | The use case — joins the 3 tables → generic nodes/links + remainder buckets, owns the Flow-by + Depth bar. |
| [`example.data.js`](example.data.js) | Fictional Acme rows in the raw `query_data` shape (three tables). |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. |
