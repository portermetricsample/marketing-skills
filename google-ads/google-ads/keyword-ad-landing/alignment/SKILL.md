---
name: keyword-ad-landing-alignment
description: >
  Audits the relevance of a paid Google Ads journey end to end: search term → keyword →
  ad copy → landing page. It pulls the data live from the Porter Metrics MCP, scrapes the
  real landing with Porter's scrape tool, and the AI judges, per ad group, whether the
  page delivers what the ad promised and what the search asked for (the "scent"). The
  landing check reads the WHOLE page and weighs the H1 and hero most (the first thing the
  visitor sees). It returns, per journey, a three-state verdict (PASS / REVIEW / FAIL —
  no numeric score), where the chain breaks, the single highest-leverage fix, and a
  roll-up of how much spend flows through broken journeys. Use it when the user asks to
  check alignment of search terms with keywords and landing pages, "message match",
  ad↔page coherence, or why a Google Ads account converts poorly despite good traffic.
  Vertical-agnostic (e-commerce, lead-gen, SaaS, local services). One account at a time,
  focused on the highest-spend journeys.
---

# Search-term ↔ keyword ↔ ad ↔ landing alignment

Follow one paid click all the way through and check that the four pieces tell the same
story: **what the person searched → the keyword that caught it → the ad they saw → the
page they landed on.** Where the story breaks, money leaks.

This is purely a **relevance** skill. The one question is: do the search term/keyword, the
ad copy, and the landing page all talk about the same thing? It does NOT do competitor
analysis, account-structure auditing, or keyword expansion — those are different jobs.

The judgment is the AI's, not a Python formula: "does the page deliver what the ad
promised?" needs reading comprehension, not arithmetic. A small script just assembles the
facts (the MCP pulls + the scraped page) into one compact packet per ad group so the AI
can read and judge them.

## When to use it
- "Check the alignment of search terms / keywords / landing pages for this account."
- "Is the message match right? Do the pages deliver what the ads promise?"
- "This account gets traffic but converts poorly — where does the journey break?"
- The intent-and-destination-coherence section of a PPC audit.

## Scope: only SEARCH campaigns (confirmed against the Porter catalog)
The skill needs the full **keyword ↔ search-term pair** to judge a journey. In the Porter
catalog, `search_term` lives in `search_term_view` and `keyword` in `keyword_view`, and
**both views exist only for `SEARCH` campaigns**:

| Campaign type (`campaign_advertising_channel_type`) | search term | keyword | Covered |
|---|---|---|---|
| `SEARCH` (incl. DSA) | ✅ `search_term_view` | ✅ `keyword_view` (DSA = dynamic target, empty keyword) | **YES — the skill's only mode** |
| `SHOPPING` | ❌ (Porter models it in `shopping_performance_view`, product-level — no `search_term_view`) | ❌ (no keywords) | NO — no pair |
| `PERFORMANCE_MAX` | ❌ (only aggregated search themes; no `search_term_view` rows) | ❌ | NO |
| `DEMAND_GEN` | ❌ (no exact search query) | ❌ | NO |
| `DISPLAY` / `VIDEO` / `APP` / `LOCAL` / `SMART` | ❌ | ❌ | NO |

**`SEARCH` is the only type that exposes keyword + search term in Porter, so it's the only
one covered.** This is a catalog fact, not a skill limitation: PMax/DG/Display have no
`search_term_view`, and Shopping goes through `shopping_performance_view` (product, no
keyword), so it doesn't carry the pair this skill compares. **Every term query therefore
filters `channel_type = SEARCH`**, and the coverage map (step 0) always runs first to
report how much spend sits outside Search (PMax/DG are often a large slice).

## The Porter MCP tool (single declaration — used by steps 0-2)
Data pulls use **`execute`** with `tool:porter-reporting:query_data`. Shape:
```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<full AccountItem from the discovery step>],
  "fields":   ["google_ads_<field>", ...],          # ALWAYS the google_ads_ prefix
  "date_range": {"date_from":"YYYY-MM-DD","date_to":"YYYY-MM-DD"},
  "filters":  [[{ "field":"google_ads_<field>", "operator":"equals", "value":"..." }]],
  "sort":     [{ "field":"google_ads_cost_micros", "direction":"desc" }],
  "limit":    5000
})
```
Non-negotiable MCP rules (verified live against the catalog):
- **`query_data` goes via `execute`, NOT `fetch`.** Porter marks it `not_read_only`, so
  `fetch` rejects it with `{"error":"not_read_only"}` and tells you to retry via `execute`.
  (Account discovery `list_accounts` and the landing `scrape` ARE read-only → those two go
  via `fetch`. Only `query_data` is `execute`.)
- **`google_ads_` prefix on every `fields`/`filters` entry.** Bare `cost_micros` fails; use `google_ads_cost_micros`. Cost is already converted to the account currency (despite the `_micros` name).
- **`date_range`**: object `{"date_from","date_to"}` OR `{"preset": ...}`. Valid presets (these 7 only): `today, yesterday, last_7_days, last_30_days, last_month, this_month, this_year`. No `last_90_days` / `last_quarter` → use explicit dates.
- **`filters`** = list of lists: outer list = AND, inner list = OR.
- **`cost_micros > 0` footgun**: if `google_ads_cost_micros` is in `fields`, the MCP drops zero-spend rows (fine for this skill, which goes by spend — just know it).

## Account-discovery step — NEVER invent the id
```
fetch(tool_id="tool:porter-accounts:list_accounts", args={"component_name":"google-ads"})
# or, if the user named the account:
fetch(tool_id="tool:porter-accounts:list_accounts", args={"query":"<name or id>", "component_name":"google-ads"})
```
`list_accounts` is read-only → `fetch`. Pass the **full** `AccountItem` (id, name,
component_name, source_user_id, company_id) into `accounts`; a bare id renders empty. If
several match and the brief is generic, ask which.

## Flow (6 steps)

### 0) Coverage map — ALWAYS first
Measure spend by campaign type to know what the skill covers and **what's out** (PMax/DG):
```
fields: ["google_ads_campaign_name", "google_ads_campaign_advertising_channel_type",
         "google_ads_cost_micros"]
```
Report to the user: "$X in SEARCH (covered) · $Y in PMax/Demand Gen (not covered by this skill)".
Never skip it: staying silent on uncovered spend reads as "I audited everything".

### 1) Pick the journeys (SEARCH only)
Pull spend by ad group **filtered to Search**, rank it, keep the highest-spend ones.
```
fields:  ["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_cost_micros"]
filters: [[{ "field":"google_ads_campaign_advertising_channel_type", "operator":"equals", "value":"SEARCH" }]]
sort:    [{ "field":"google_ads_cost_micros", "direction":"desc" }]
```

### 2) Pull the detail for those ad groups → `data/raw/` files
**Two** `execute` queries, both **filtered to Search + the chosen ad groups**
(`filters: [[{ad_group_name in [...]}], [{channel_type equals "SEARCH"}]]`), **sorted by
`google_ads_cost_micros desc`** with a high `limit`. The search-term level overflows the
context → the MCP writes it to file; copy it to `data/raw/`. Pull only the fields the skill
uses — cost (to prioritize), the text, and the ad copy/URL. No conversions, no Quality Score:
those are performance / Google's own grade, not relevance.

- **2a · Intent** (`intent.json`) — the search term **and the keyword that caught it, in ONE
  query** (verified live: `search_term` + `keyword_info_text` DO combine in `search_term_view`):
  `["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_search_term", "google_ads_keyword_info_text", "google_ads_keyword_info_match_type", "google_ads_cost_micros"]`
  → this is exactly the shape `assemble.py --intent` expects; **no join step needed**.
- **2b · Ads** (`ads.json`, **ad level**):
  `["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_ad_group_ad_ad_id", "google_ads_ad_group_ad_ad_responsive_search_ad_headlines", "google_ads_ad_group_ad_ad_responsive_search_ad_descriptions", "google_ads_ad_group_ad_ad_final_urls", "google_ads_cost_micros"]` — the `ad_id` matters: each ad is judged with ITS copy and ITS landing, not a group average.

⚠️ **Never use a low `limit` without `sort`**: it truncates and eats the highest-spend search
terms (giving journeys with fake spend). Always `sort` by cost + `limit` ≥ expected total rows.

### 3) Scrape the landing pages (Porter's native scrape tool)
Take the unique *final URLs* from step 2b and scrape them with Porter's `tool:porter-tools:scrape`
(via `fetch`, read-only). Ask for **two formats in one call**: `markdown` (the whole page, to
judge the coherence of ALL the copy) and `json` (the structured H1/hero, the highest-weight
signal). One call per URL → save to `data/landings/<slug>.json`.
```
fetch(tool_id="tool:porter-tools:scrape", args={
  "url": "<final_url>",
  "formats": ["markdown", "json"],
  "onlyMainContent": true,
  "waitFor": 3500,                       # let JS render; SPA sites return empty without this
  "proxy": "auto",                       # bump to "stealth" if the site blocks bots
  "jsonOptions": { "schema": {
    "h1":               "string",        # the literal H1 — the single most important signal
    "hero_headline":    "string",        # the largest hero headline (may equal the H1)
    "hero_subheadline": "string",
    "primary_offer":    "string",
    "primary_cta":      "string",
    "product_named":    "string",        # what the page sells, in its own words (vertical-agnostic)
    "form_summary":     "string",        # what the form asks, if any (vertical-agnostic)
    "proof_points":     ["string"]
  }}
})
```
The `json` gives the hero fields (main focus); the `markdown` gives the rest of the page so
the AI can judge whole-page coherence. If both come back empty, retry with `"proxy":
"stealth"`; if still empty, mark that landing as not-scraped (L3/L4 = REVIEW, don't guess).

> **Degrade gracefully:** if a page returns empty even after `proxy:"stealth"`, mark that landing
> not-scraped → L3/L4 = REVIEW for that journey (report the keyword↔ad half honestly; never guess page
> content, never swap in an external scraper — `tool:porter-tools:scrape` is the landing source).

> **Focus:** the H1/hero carries the most weight (it's the first thing the visitor sees),
> **but evaluate the whole page and all the copy** — coherence has to hold top to bottom,
> not just above the fold.

### 4) Assemble the packets (Python — pure function)
```bash
cd scripts
python3 assemble.py \
  --intent ../data/raw/intent.json \
  --ads ../data/raw/ads.json \
  --landings ../data/landings \
  --account "<account>" \
  --out ../data/packets.json
```
`intent.json` comes straight from query 2a (the single combined query), which is exactly the
`(campaign, ad_group, search_term, keyword, match_type, cost)` shape `--intent` expects — so
no pre-join is needed; `assemble.py` rolls it up itself.

Produces `data/packets.json`: one journey per ad group with its `cost` (for ranking), intent
(top keywords → top search terms), and **`ads[]` at ad level** — each ad with its
headlines/descriptions, its `final_url`, and its scraped `landing` (the hero `json` fields +
the full-page `markdown`). Compact, ready to judge (it does not dump thousands of rows into context).

### 5) Judge & present (AI, against `references/framework.md`)
Read `data/packets.json` and apply the rubric. **One finding per ad group**, with the
**keyword breakdown inside its Intent block** (never an invented word like "journey"). Grade
the relevance links (search-term↔keyword, keyword↔ad, ad↔landing **reading the H1/hero and the
whole page**) and give the **three-state verdict** shown as **Aligned / Needs review / Broken**
(no 0–10 score).

Emit each finding using the **output contract** in the framework ("Output contract — what each
finding must CONTAIN"): Identity · Verdict · **Intent** (keywords→search terms) · **Message**
(ad) · **Destination** (the literal URL + a plain summary of the page) · **Recommendation**
(break type + plain problem + concrete action). This is **content only — visuals/layout are
handled by the design/reporting skills**, not here.

Close with the roll-up: **$ on Broken keywords** (+ $ on Needs-review), the breaks **grouped into
named systemic patterns with summed spend** (e.g. "Dental keywords → a 'Health' page · $9.2K"),
and top fixes by money recovered.

## Files
- `scripts/assemble.py` — deterministic assembler (MCP pulls + landings → `packets.json`). The data deliverable. Judges nothing; just collapses the huge search-term dump to one packet per ad group.
- `references/framework.md` — **the judgment rubric** (relevance links, three states, four break types). The IP.
- The landing scrape uses `tool:porter-tools:scrape` from the Porter MCP (step 3).
- `data/raw/*.json`, `data/landings/*.json`, `data/packets.json` — sample data from a real account (anonymize before sharing).

## Notes / gotchas
- **Partial search-term coverage**: Google hides low-volume search terms, so a journey's summed
  search-term cost is LESS than its real ad-group spend. Use search terms for *mix/intent*; the
  real spend is the journey's `cost` (from step 1).
- **Same-named ad groups**: the same ad-group name lives in several campaigns — the packet is keyed
  by `(campaign, ad group)`, not by name alone.
- **The verdict is the AI's and it's a STATE, not a number**: each journey is PASS / REVIEW / FAIL
  (see the framework). When the landing content is missing (empty scrape), L3/L4 = unknown and the
  journey is REVIEW — don't guess.

## Requirements
Python 3 (stdlib). Access to the Porter Metrics MCP with Google Ads connected. Scraping uses
`tool:porter-tools:scrape` from the same MCP — no external API key needed.
