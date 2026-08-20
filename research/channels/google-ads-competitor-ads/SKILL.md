---
name: google-ads-competitor-ads
description: Reads a COMPETITOR's public ads from the Google Ads Transparency Center — never the user's own account, and it contains no spend, clicks or keywords. Give it only a brand name; it resolves the brand to its legal advertiser accounts, verifies the advertiser is really the brand (not an affiliate), then filters by channel (Search/YouTube/Shopping/Maps/Play), format, market and date range and extracts structured ad copy (headline, description, display URL, sitelinks, seller rating) out of Google's rendered creative images into a fixed-shape JSON dataset. Extraction only — no analysis. Trigger on "what ads is X running on Google", "scrape X's Google ads", "Google Ads competitor research on Y", "what is X's Google ad copy", "which markets does X advertise in", or a pasted adstransparency.google.com URL.
---

# Google Ads Competitor Ads

Extraction of a **competitor's public** Google Ads creatives from the **Google Ads Transparency Center** → a fixed-shape ad-copy dataset.

🚨 **Source disambiguation.** The name does not carry it, so state it here: this reads the **public Transparency Center**, not a connected Google Ads account. It has no spend, no clicks, no conversions, no keywords, and it works for brands the user has no access to. If the question is about the user's own account, this is the wrong skill.

**This skill extracts and structures. It does not analyse.** Emit the dataset defined below and stop. Ranking, clustering and interpretation are Step 3, which is not yet specified.

**Runs on the Porter Metrics MCP.** No connected Google Ads account, no API keys. The Transparency Center is public — no login, no cookie wall (verified).

## ⚠️ Authoring rule for this file

**Never write a dollar sign followed by a digit anywhere in this document.** The skill loader substitutes those tokens with the skill's invocation arguments, which silently corrupts both prose and shell snippets. Write costs as `USD 0.002`. In shell snippets, never use `awk` field variables or positional parameters — use the dollar-free idioms given below. Command substitution with parentheses is safe.

## When to trigger

- "what ads is {brand} running on Google" / "scrape {brand}'s Google ads"
- "Google Ads competitor research on {brand}" / "audit {brand} on Search"
- a pasted `adstransparency.google.com` URL — read its params and map them per the input contract

**Wrong skill if it's the user's OWN account.** "How are my Google Ads doing", search terms, wasted spend, change history → the connected-account skills (`google-ads-changelog`, `plateau-ppc-google-ads-analyst`, the audit skills). This reads *someone else's public ads* and has **no metrics at all**.

**This is not a keyword tool.** The Transparency Center shows competitor *ad copy*, never the *search terms* that triggered it. For competitor keywords use Ahrefs paid-keywords or DataForSEO.

---

# PREFLIGHT

**Use the authenticated Porter MCP server.** This machine may expose two Porter MCPs; `plugin:porter-metrics:porter` requires interactive OAuth and is unusable in a non-interactive session. Confirm with `whoami` before the first pull — if it returns a user and company, you have the right server.

Exact actions used by this skill:

| Purpose | Action |
|---|---|
| Run the scraper | `web_scraping.call_actor` |
| Page the results | `web_scraping.get_dataset_items` |

`<scratch>` below means the session scratchpad directory named in your environment. Create a per-run subfolder inside it.

---

# STEP 0 — RESOLVE THE BRAND (run this first, always)

**The user should only have to type a brand name.** Resolve it to advertiser IDs before pulling anything. This step is cheap and it prevents the two worst failure modes: researching the wrong company, and researching an affiliate instead of the brand.

```
execute_action(action="web_scraping.call_actor", params={
  "actor": "scrapesage/google-ads-transparency-scraper",
  "waitSecs": 45,
  "input": {
    "queries": ["<brand name>"],
    "resultType": "advertisers",
    "region": "anywhere",
    "maxAdvertisersPerQuery": 10
  }
})
```

Returns one row per advertiser: `advertiserId` · `name` · `countryCode` · **`approxAdCountLow`** · **`approxAdCountHigh`** · `matchedQuery` · `advertiserUrl`.

🚨 **This is Google's own name→advertiser mapping. Always try it before any web search.** A general web lookup (Perplexity, search) is the *fallback* for when this returns nothing or the names are unrecognisable — never the first move. Resolving a brand against a source other than the one you're about to query is how you end up confidently pulling the wrong advertiser.

## `approxAdCount` replaces the browser scrape

`approxAdCountLow`/`approxAdCountHigh` give the library size **for free, in the same call**. Use them for `counts.libraryTotalReported` and `sampleFraction`. The JS-page browser scrape described later is now only a fallback for domain-first runs.

Use the count to choose `maxAds` before spending: measured spread is enormous — Supermetrics 400–500, windsor.ai ~500, funnel.io 23, gumloop.com 4. A fixed cap is wrong for most brands.

## 🚨 Zero results is COMMON — follow this fallback chain, do not give up

Advertiser search matches the **verified legal advertiser name on the ad**, which is frequently NOT the consumer brand. Measured: `"BodyCandy"` returns **0 advertisers**, because the account is registered as `Cybercartel International, Inc`.

Run the chain in order:

1. **Brand name** → `queries: ["<brand>"]`, `resultType: "advertisers"`.
2. **Zero results → pull by domain** with a small `maxAds` (say 20) and read `advertiserName` off the rows. That reveals the legal entity.
3. **Re-resolve using the legal name** → `queries: ["<legal entity>"]`. This is what gives you the advertiser IDs and `approxAdCount`. Measured: `"Cybercartel International"` returns two accounts, **1,000–2,000 ads** and 22 ads — where the brand-name query returned nothing.
4. **Verify the entity actually owns the brand** with a web search before reporting. `Cybercartel International, Inc` is BodyCandy's genuine parent company; `Xun Meng International Limited` on gumloop.com is an affiliate. **The shapes are identical in the data — only an external check tells them apart.** Never skip this step, and never assume either way.
5. Only if all of the above fail, ask the user to confirm the domain.

⚠️ A domain pull that returns ads while the brand query returns zero is the *normal* case for consumer brands, not an error.

## Ambiguity — when to ask the user

Ask for confirmation, showing `name`, `countryCode`, `approxAdCount` and `advertiserUrl` for each candidate, when any of these hold:

- more than one advertiser with **materially different names**
- the top name does not obviously correspond to the brand
- more than one `countryCode` for the same name
- zero results

Do **not** ask when several rows share one clear corporate name — that's the multi-account case below, and you handle it, not the user.

## 🚨 Multi-account brands are normal — never silently pick one

Measured: `Supermetrics` returns **two** advertiser IDs, both `Supermetrics Oy` (FI) — one with 400–500 ads, one with 1.

- Pull **all** matching advertiser IDs and keep `advertiserId` on every row.
- Report the account breakdown in `counts`.
- Never blend accounts into a single "the brand does X" claim without saying how many accounts you merged.

## 🚨 Verify the advertiser IS the brand — affiliates masquerade as it

**A domain-first pull returns whoever points ads at that domain, which is not necessarily the brand.**

Measured: `gumloop.com` returns 4 ads whose copy is fully Gumloop-branded ("Gumloop — Build AI workflows fast with no code") — but the advertiser is **`Xun Meng International Limited`**, and one creative carries `20% off - code :COLE`. That is an **affiliate**, not Gumloop. A report titled "Gumloop's Google Ads strategy" built on this would be describing a third party's arbitrage campaign.

Rules:
1. Compare `advertiserName` to the brand. If it doesn't plausibly match (corporate suffixes like `Oy`, `AB`, `GmbH`, `Inc` are fine — unrelated names are not), **flag it**.
2. Treat discount codes, coupon language, and `Nx% off - code :XXXX` as strong affiliate signals.
3. Emit `advertiserVerified: true|false|unknown` per row, and add a limitation naming the mismatched advertiser.
4. Prefer resolving by brand (Step 0) over domain when the goal is "what is *this company* doing". Use the domain path to discover the affiliate ecosystem — a legitimate question, but a different one.

---

# INPUT CONTRACT

**Only `target` is required. Every other parameter has a default and EVERY one is user-overridable.** The defaults describe the common case (a competitor's Search text ads this week) — they are not the skill's scope. If the user names a channel, a market, a date range or a depth, honour it.

Echo all resolved values into `output.query` verbatim, including defaults that were not explicitly set, so any output file explains itself.

### What to look at

| Parameter | Type | Default | Allowed values |
|---|---|---|---|
| `target` | string | *required* | a domain, brand name, or advertiser id |
| `targetType` | enum | `domain` | `domain` · `brand` · `advertiserId` |

### Filters — these change WHICH ads come back (all free)

| Parameter | Type | Default | Allowed values | Notes |
|---|---|---|---|---|
| `platform` | enum | `SEARCH` | `SEARCH` · `YOUTUBE` · `SHOPPING` · `MAPS` · `PLAY` · `DISPLAY` | **The channel filter.** One per run. Default is Search because that's the common case, NOT a restriction — run YouTube or Shopping whenever asked |
| `format` | enum | `TEXT` | `TEXT` · `IMAGE` · `VIDEO` | Pair sensibly with `platform`: YouTube → `VIDEO`, Shopping/Display → `IMAGE` |
| `region` | string | `anywhere` | `anywhere` or a region code (237 supported) | **The geo filter.** `"DE"` returns only ads that ran in Germany. Use it whenever the user names a market |
| `startDate` | date | today − 7 | `YYYY-MM-DD` | **Never omit** |
| `endDate` | date | today | `YYYY-MM-DD` | |

### Depth and enrichment — these change HOW MUCH you get (these cost money)

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `maxAds` | int | `200` | The cost cap. Ask before raising past 500 |
| `includeRegions` | bool | `false` | Adds `regionsShown` and `variationCount` to every row. **+USD 0.003/ad — roughly doubles cost.** Default off; turn on when market coverage is the question |

🚨 **`region` and `includeRegions` are NOT the same control — do not conflate them.**

| | `region` | `includeRegions` |
|---|---|---|
| What it does | **Filters** the pull to one market | **Adds** per-country detail to each row |
| Effect on results | Fewer, more targeted ads | Same ads, richer rows |
| Cost | Free | +USD 0.003/ad |
| Default | `anywhere` (no geo filter) | `false` (off) |

"Show me their German ads" → `region: "DE"`. "Which countries are they running in?" → `includeRegions: true`. Both → set both.

### Contract name → actor input name

🚨 **These differ. Passing a contract name to the actor causes a silent all-time fallback, not an error.**

| Contract | Actor input | Note |
|---|---|---|
| `target` + `targetType: domain` | `domains: [target]` | |
| `target` + `targetType: brand` | `queries: [target]` | |
| `target` + `targetType: advertiserId` | `advertiserIds: [target]` | |
| `platform` | `platforms: [platform]` | array, not scalar |
| `format` | `adFormat` | scalar |
| `region` | `region` | |
| `startDate` / `endDate` | `startDate` / `endDate` | |
| `maxAds` | **`maxAdsPerSearch`** | |
| `includeRegions` | **`includeDetails`** | |

### Date range semantics — state this in every output

🚨 **The range selects ads LIVE during the window, not ads LAUNCHED in it.** For an always-on advertiser, "last 7 days" returns most of their library. Verified: a Jan-2025 window returned a different, older cohort (nothing first-shown after 2025-01-03), while a last-7-days window returned ads first shown back in 2024.

🚨 **Never leave the range unset** — the actor silently falls back to all-time.

⚠️ At default settings `isNew` is `false` on essentially every row, because almost nothing launches inside a 7-day window. That is correct behaviour, not a bug — but it means **the default run cannot answer "what did they launch recently."** To answer that, widen the window (30–90 days) so recent launches fall inside it.

---

# OUTPUT CONTRACT

One JSON file, always this shape, every key always present. Write to `<scratch>/<run>/gads-<target>-<platform>-<endDate>.json`.

```json
{
  "query":       { /* verbatim echo of the input contract */ },
  "source":      { "actor": "...", "runId": "...", "datasetId": "...", "fetchedAt": "..." },
  "counts":      { /* see below */ },
  "ads":         [ /* one record per creative */ ],
  "limitations": [ /* array of strings, never empty */ ]
}
```

`source.fetchedAt` = the actor run's `finishedAt`, ISO 8601.

## `counts` — provenance of the sample

All integers unless stated. **Denominator rule: `returned` counts every row; every other count is over rows where `extractable` is true.** Unextractable rows are never silently absorbed into a "unique" figure.

| Field | Type | Meaning |
|---|---|---|
| `libraryTotalReported` | int \| null | Google's own `~N ads` figure. `null` if not fetched — see the method below, it is not guaranteed |
| `returned` | int | Rows the actor returned (`totalItemCount`) |
| `hitCap` | bool | `returned == maxAds` → a sample, not the library |
| `sampleFraction` | float \| null | `returned / libraryTotalReported`; `null` when the denominator is null |
| `unextractable` | int | Rows with no usable creative (null `imageUrl` or `previewType: "iframe"`) |
| `uniqueByBytes` | int | Distinct `imageMd5` among extractable rows |
| `uniqueByText` | int | Distinct `copyKey` among extractable rows |

## `ads[]` — one record per creative

Fields are grouped by **where the value came from**. This grouping is the point: a reader must be able to tell a fact Google reported from a number the skill computed from a string a vision model read off a picture.

### A. Reported by Google (verbatim from the actor)

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `creativeId` | string | no | `CR…` — the join key |
| `advertiserId` | string | no | `AR…` |
| `advertiserName` | string | no | **Billing entity, often a person's name.** Report `domain` as the brand |
| `domain` | string | no | |
| `format` | enum | no | `TEXT` / `IMAGE` / `VIDEO` |
| `firstShown` | ISO datetime | no | Full timestamp, not a bare date |
| `lastShown` | ISO datetime | no | Full timestamp |
| `shownForDays` | int | no | **Lifetime, not in-window.** The only performance proxy that exists |
| `previewType` | enum | no | `image` or **`iframe`**. Iframe rows carry no fetchable creative |
| `imageUrl` | string | **yes** | `null` on iframe rows. **Rate varies hugely by brand** — measured 6% (windsor.ai) vs **35%** (funnel.io, 8 of 23). Never quote a fixed expectation |
| `adUrl` | string | no | Transparency Center permalink, **not** the advertiser's landing page |
| `variationCount` | int \| null | yes | **Only returned when `includeRegions: true`.** `null` otherwise — do NOT hardcode a value |
| `regionsShown` | array \| null | yes | `[{region, lastShownDate}]`. **Only when `includeRegions: true`.** The actor's plain `region` field is a different, usually-null field — ignore it |

🚨 **Never invent a value for a field the actor did not return.** If `includeRegions` is false, `variationCount` and `regionsShown` are `null`. Writing `1` because a note says it's usually 1 turns an assumption into an apparent fact.

**Intentionally dropped** (returned by the actor, deliberately not in this contract): `previewUrl`, `width`, `height`, `googleCreativeId`, `googleCustomerId`, `adGroupId`, `versionId`. Drop them; the shape is fixed.

### B. Derived by the skill (deterministic, reproducible)

| Field | Type | Rule |
|---|---|---|
| `isNew` | bool | Compare **dates only**: first 10 characters of `firstShown` >= `query.startDate` |
| `imageMd5` | string \| null | MD5 of the downloaded creative bytes; `null` when unextractable |
| `isDuplicateOf` | string \| null | `creativeId` of the first row sharing this `imageMd5` |
| `copyKey` | string \| null | `lowercase(collapse_whitespace(trim(headline))) + "\|" + lowercase(collapse_whitespace(trim(description)))`. `null` when either side is null |
| `extractable` | bool | `false` when `imageUrl` is null, `previewType` is `iframe`, or the download failed |
| `advertiserVerified` | bool \| null | `true` when `advertiserName` plausibly matches the resolved brand, `false` on a clear mismatch (affiliate/third party), `null` when undetermined. See Step 0 |

### C. Read from the creative image (vision)

Every field here is a model reading pixels. **All are nullable** — when `extractable` is false there are no pixels, and every one of these must be `null`, never a default.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `sponsoredLabel` | bool \| null | yes | Whether the rendered ad carries the "Sponsored" chip. `null` ≠ `false` |
| `brandName` | string | yes | Legitimately `null` when the ad renders only a favicon and URL |
| `displayUrl` | string | yes | Often just the root (`www.windsor.ai/`), but **frequently carries a path** — measured `supermetrics.com/ga`, `/linkedin`, `/excel/connector`, `/data-activation/book-a-demo`, `/funnel/alternative`. Capture it verbatim: paths reveal landing-page structure and campaign segmentation. Still **not** the full final URL |
| `headline` | string | yes | **ONE served RSA permutation** — never "their headlines" |
| `description` | string | yes | |
| `sitelinks` | array \| null | yes | Sitelink labels rendered under the ad, e.g. `["Start Free Trial","Pricing"]`. `null` when none are rendered — which does NOT mean the advertiser has none |
| `sellerRating` | object \| null | yes | `{value, count}` from the seller-ratings annotation, e.g. `{"value": 4.4, "count": 19559}`. Common on e-commerce advertisers, absent on B2B |
| `returnPolicy` | string \| null | yes | Return-policy annotation verbatim, e.g. `"Most items 30+ days"` |
| `promotion` | string \| null | yes | Promotion extension verbatim, e.g. `"20% off code : COLE"` |
| `copyLanguage` | string \| null | yes | ISO code of the language the copy is written in (`en`, `de`, `ja`…). Read from the copy itself, never assumed from `region` |

⚠️ **Normalise HTML entities in extracted copy.** Rendered creatives can contain raw entities — measured `Don&#39;t let your marketing data go to waste`. Decode to the real character before writing the field.

⚠️ **`advertiserName` is not stable within one account.** The same Supermetrics advertiser renders variously as `Supermetrics`, `Supermetrics Oy` and `supermetrics.com`. Match on `advertiserId`, never on the display name.

⚠️ **`domain` is `null` when you query by `advertiserIds`.** It is only populated on domain-first pulls. Do not treat a null domain as missing data.

🚨 **Never infer `copyLanguage` from the market.** An advertiser serving Japan may run English copy. Measured on windsor.ai: creatives served in FR, DE, ES, IT, PL, JP, BR and TH were **all English**, and the same `creativeId` appeared across several markets. Language is an observation about the pixels, not a property of the geo.

🚨 **No `cta` field.** Google Search ads have no CTA button — that's a Display/YouTube element.

🚨 **No `template`, `cluster` or `destination` field.** Those are inferences, and inference is Step 3.

## `limitations[]` — always populated

Emit every applicable line, verbatim:

- `"Each headline is ONE served RSA permutation, not the advertiser's asset pool."`
- `"shownForDays and lastShown are lifetime values, not in-window values."`
- `"No spend, impressions, CTR or conversions exist in this source."`
- `"No landing page URL exists in this source — displayUrl is truncated."`
- `"Hit the maxAds cap of {n} — this is a sample, not the full library."` *(when `hitCap`)*
- `"{n} creative(s) could not be extracted (no image or iframe preview)."` *(when `unextractable` > 0)*
- `"Library size could not be read; sampleFraction is unavailable."` *(when `libraryTotalReported` is null)*

---

# PIPELINE

## Step 1 — Pull

```
execute_action(action="web_scraping.call_actor", params={
  "actor": "scrapesage/google-ads-transparency-scraper",
  "waitSecs": 45,
  "input": {
    "domains": ["<target>"],
    "region": "<region>",
    "platforms": ["<platform>"],
    "adFormat": "<format>",
    "startDate": "<startDate>",
    "endDate": "<endDate>",
    "maxAdsPerSearch": <maxAds>,
    "includeDetails": <includeRegions>
  }
})
```

🚨 `waitSecs` is capped at **45** — higher is rejected outright. Runs are fast (50 ads ≈ 6.5s). If one exceeds the window, use the returned `runId` → `get_dataset_items(datasetId=…)`.

🚨 **The MCP call itself can time out, separately from `waitSecs`.** Measured once on a 50-ad domain pull. A timeout means "no answer", **not** "no run" — the actor may have completed and billed server-side. Do **not** blindly re-run the identical call. Instead re-issue with a smaller `maxAds`, or switch to the Step 0 brand path which is lighter. Advertiser-resolution calls are slower than creative pulls (measured 41s, close to the 45s ceiling) — expect them to be the most timeout-prone step.

⚠️ **The run summary's `itemCount` can be stale.** One 50-ad run reported `itemCount: 40` while the dataset held 50; another reported it correctly. Always read `totalItemCount` from the first `get_dataset_items` call and page to it with `offset`.

### Library size (optional, best-effort)

`libraryTotalReported` comes from the `~N ads` string on the Transparency Center page. **It is JavaScript-rendered**, so `WebFetch` and `curl` both fail — curl returns a 2.4MB app shell with an empty title and no match.

Fetch it only with a **JS-capable browser tool** (the Browser pane: `preview_start` with the URL, then `get_page_text`), at:

```
https://adstransparency.google.com/?region=<region>&platform=<platform>&format=<format>&domain=<target>
```

If no browser tool is available, set `libraryTotalReported` and `sampleFraction` to `null` and emit the corresponding limitation. **Do not fail the run over it, and do not estimate it from the capped result.**

## Step 2 — Download

Not optional, and not implied — do this explicitly.

Fetch every row with a non-null `imageUrl` to disk, naming each file so **the join key is inside the filename**:

```
<datasetIndex zero-padded>_<creativeId>.png
```

Then build `keep.txt` as the first occurrence of each MD5, in dataset order, one path per line.

🚨 **The filename IS the manifest.** Because `montage` consumes `keep.txt` in order and each filename already carries its `creativeId`, there is no second list that can drift out of sync. Do not maintain a separate index→id mapping.

## Step 3 — Extract

🚨 **Google does not return search ad text as text.** Even with `adFormat: "TEXT"`, every row is `previewType: "image"` and a `tpc.googlesyndication.com/archive/simgad/...` PNG. Vision extraction is mandatory, not an optimisation.

```bash
magick montage $(cat keep.txt | tr '\n' ' ') \
  -tile 1x6 -geometry '820x+10+10' \
  -background '#d0d0d0' -bordercolor '#666' -border 2 sheet.png
```

Verify the sheet grouping before reading — this idiom is dollar-free and safe in this file:

```bash
paste -d' ' - - - - - - < keep.txt | nl -v0 -ba
```

Each output line is one sheet: `0` → `sheet-0.png`, `1` → `sheet-1.png`, and so on.

- `montage` paginates by itself — do NOT hand-roll a batching loop.
- Read each sheet **top to bottom in order** against that listing. Never infer identity from content.
🚨 **Tile height varies by 3× between advertisers — check it before choosing the sheet size.** Compact text ads (windsor.ai) make a 6-up sheet ~2,388px tall. Ads carrying thumbnails and stacked sitelinks (Supermetrics) make the same 6-up sheet **6,654px**, which downscales hard and starts clipping the description line.

🚨 **`montage` sizes every cell to the TALLEST tile.** One outlier inflates the entire sheet, so a median is useless — measure the **max**, and quarantine outliers into their own read.

```bash
# scaled height of every creative at 820px wide, tallest first
for f in $(cat keep.txt); do
  magick identify -format "%w %h $f\n" $f | awk '{printf "%5.0f  %s\n", 820*$2/$1, $3}'
done | sort -rn
```

1. Drop any creative more than ~2× the next tallest into its own single-tile sheet.
2. Choose the tile count from the **max remaining** height:
   - under ~350px → **6 per sheet**
   - 350–800px → **4 per sheet**
   - over ~800px → **2 per sheet**

Measured: BodyCandy's set looked fine at a 578px median, but one 1,429px creative pushed a 4-up sheet to 5,812px. Quarantining it brought the same 4-up sheet to 3,176px and full legibility.

A too-tall sheet fails **silently** — the text is still there, just small enough to be misread rather than flagged.
- Local ImageMagick lacks Freetype/ghostscript, so `-label` prints `gs: command not found`. **Ignore it** — the montage still writes correctly.
- Measured: 12 ads in 2 vision calls instead of 12; ~500 ads ≈ 84 calls instead of 500.
- Rows sharing an `imageMd5` inherit the extracted copy from their twin — identical bytes means identical pixels. Set `isDuplicateOf` and confirm with a hash, not by eye.

**Then dedupe again on text.** Byte-dedupe is necessary but not sufficient: creatives can be byte-distinct yet textually identical (different logo variant). Two measured runs gave 49→44→39 and 47→45→35. Set `copyKey`; keep every row.

Do **not** collapse rows that share a headline but differ in description — those are RSA permutations and they are the most interesting thing in the dataset.

⚠️ All measured figures in this file come from single runs against one domain. Treat them as order-of-magnitude, not as guarantees.

---

# MODE: market coverage probe

Answers "which markets is this advertiser in, and which are they **absent** from" — a different question from the main pipeline, with a different method.

🚨 **`includeRegions` cannot answer the absence question.** It reports the markets of the ads *you happened to sample*. When `hitCap` is true you sampled a fraction of the library, so a missing country proves nothing. **Only a region-filtered run returning zero is evidence of absence.**

## Method

Run one probe per market, **in parallel**, with `maxAds: 2` and identical filters. No download, no vision — you only need the count.

```
region: "DE" → 2 ads → PRESENT
region: "JP" → 0 ads → ABSENT (candidate)
region: "BR" → 2 ads → PRESENT
region: "US" → 2 ads → PRESENT
```

## 🚨 Every negative needs a control run

The actor's own zero-result message names the trap: *"the advertiser is not currently running ads in that region, **or the filters excluded everything** (date range, platforms, ad format)."*

Before reporting any market as absent, run the identical query with `region: "anywhere"`. If the control also returns zero, your filters are the cause and **every negative is void**. Only when the control returns ads does zero-in-a-market mean absence.

State the finding at the precision the filters allow. With the defaults, a zero result means:

> "No **Search text** ads ran in Japan in the **last 7 days**."

It does **not** mean "Windsor doesn't advertise in Japan." They may run Shopping, YouTube, image ads, or have paused a live campaign last week.

## 🚨 Short windows manufacture false negatives — use 90 days

**Measured:** windsor.ai in Japan returned **0 ads on a 7-day window and 2 ads on a 90-day window.** Same target, same platform, same format. The 7-day answer was simply wrong for the question "do they advertise in Japan."

**The default 7-day window is for the copy pipeline, not for coverage probing.** For any absence claim, override `startDate` to 90+ days. A market is only worth calling untouched if it is empty across a long window.

## 🚨 Classify every absence: structural vs strategic

Some markets are empty because **Google does not sell Search ads there** — nobody advertises, so absence says nothing about the advertiser.

| Class | Meaning | Examples measured |
|---|---|---|
| `structural` | Platform-side. Google Ads does not operate, or is suspended | **CN** (mainland China), **RU** (suspended) |
| `strategic` | No platform block — a genuine gap for this advertiser | SG, SA, NG, EG |

**Never report a structural absence as a market opportunity.** "Windsor isn't advertising in China" is true and worthless — no one is. Tag the class on every absent row and exclude `structural` from any gap list.

Keep a maintained list of structural markets (at minimum CN and RU) and check it before labelling anything a gap. When unsure, mark the row `unknown` rather than guessing.

## Thin presence is a signal, not noise

A market returning **fewer ads than `maxAds`** has fewer creatives available than the cap — measured: Taiwan returned 1 against a cap of 2 while 48 other markets filled it. Record `returned` as an integer, never collapse it to a boolean, so partial fills stay visible.

## Cost — probes are nearly free

**A zero result bills nothing** (confirmed: the actor returns `Nothing was billed`). You only pay for markets where the advertiser IS present, at 2 ads each.

A 50-market sweep costs `2 × USD 0.002 × (markets with ads)` — under USD 0.20 even if they're everywhere, and each probe takes ~4s. Run them concurrently.

## Output

```json
{
  "query":   { /* shared filters + the probed market list */ },
  "control": { "region": "anywhere", "returned": 50, "valid": true },
  "markets": [
    { "region": "DE", "returned": 2, "status": "present" },
    { "region": "JP", "returned": 0, "status": "absent",  "billed": false },
    { "region": "BR", "returned": 2, "status": "present" }
  ],
  "limitations": [
    "Absence is scoped to the active filters (platform, format, date range) — not to all Google advertising.",
    "A market is only 'absent' because the control run returned ads; otherwise all negatives are void."
  ]
}
```

`status` is `present` · `absent` · `void` (when the control failed). Never emit `absent` without a passing control.

---

# HARD LIMITS — what this source cannot give you

Verified by inspecting the richest available payload (`includeRawData: true` → `raw` + `rawDetail`). No parameter, actor or scraping trick adds these.

| Not available | Consequence |
|---|---|
| **The RSA asset pool** | Served permutations only |
| **Landing page / final URL** | Truncated display URL only. Cannot map an ad to its destination page |
| **Any performance metric** | No spend, impressions, CTR, conversions |
| **Keywords / search terms** | Absent entirely — use Ahrefs or DataForSEO |
| **Sitelinks, callouts, extensions** | Not rendered in the archive |
| **Ad copy as text** | Pixels only |
| **Iframe-preview creatives** | No fetchable image exists; the copy is unrecoverable |

⚠️ **Extensions ARE often rendered** — an earlier version of this file wrongly listed them as never available. Measured: a windsor.ai Japan creative rendered `Start Free Trial · Connect Data in 2 Minutes · Pricing`; a gumloop.com creative rendered four full sitelinks *with their own descriptions* (`MCP Server for AI Agents`, `Autonomous Web Research Agent`, …) **plus a promotion extension** (`20% off code : COLE`).

Capture them when present. Their absence on a creative never means the advertiser has none — only that this rendering didn't include them.

⚠️ **Two ad layouts exist.** Most creatives are the compact form (brand · display URL · headline · description). Some render an **expanded** form: a longer hyphenated headline, a truncated description ending in `...`, and stacked sitelinks with sub-descriptions. Extract both; do not assume the compact shape.

`rawDetail` carries undecoded fields — `13` (boolean flag groups, possibly targeting dimensions) and `17` (per-region criteria IDs with first/last/expiry dates). **Do not interpret these without decoding them first**; guessing at obfuscated protobuf semantics produces confident nonsense.

# CAPPED RUNS ARE NOT REPRODUCIBLE SAMPLES

Two runs with the same query returned **different creatives**: a 6-ad run surfaced three IDs absent from a 50-ad run of the same domain, window and filters. The actor does not return a stable "top N".

- Never diff two capped runs to detect new ads — the delta is mostly sampling noise.
- For monitoring over time, pull with `maxAds` above the library size and diff on `creativeId`, or don't claim change detection.
- When `hitCap` is true, say so in the first sentence of any summary, and offer the uncapped pull with its cost.

---

# COST

Pay-per-result: **USD 0.002/ad**, plus USD 0.003/ad when `includeRegions: true`.

Measured: 12 ads with regions ≈ USD 0.06 · 50 ads ≈ USD 0.10 · a ~500-ad library ≈ USD 1.00.

Start the pull. Don't ask permission first — naming the brand implies the deliverable. Ask only before raising `maxAds` past 500.

---

# FALLBACK: the raw RPC

If the actor is deprecated or returns nothing, the page's own endpoint works and is free:

```
POST https://adstransparency.google.com/anji/_/rpc/SearchService/SearchCreatives
```

| Key | Meaning |
|---|---|
| `1` | advertiser id (`AR…`) |
| `2` | creative id (`CR…`) |
| `3.3.2` | creative `<img>` tag |
| `4` | format enum (`1` = text) |
| `6` / `7` | first shown / last shown (unix) |
| `12` | advertiser name |
| `13` | days active |
| `14` | domain |

🚨 Fallback only. These numeric keys are undocumented internals — when Google reshuffles them this returns *wrong data rather than an error*. Validate `14` matches the requested domain before trusting a response.

---

# NEXT — Analysis layer

**Not specified.** Stop after writing the dataset and hand it over.

Signals available when it is designed: `shownForDays` (longevity proxy), `isNew`, `copyKey` grouping, `regionsShown` (market coverage), and same-headline/different-description pairs (live RSA tests).
