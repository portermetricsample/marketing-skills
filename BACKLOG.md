# Porter MCP — tool backlog

Some skills here are written **as if** the Porter MCP already exposes a capability it doesn't yet.
They are account-agnostic and key-free, but they won't *run end-to-end* until these tools ship.
Each spot is marked inline in the skill as `⏳ Backlog (Porter MCP): …`.

> **Held back:** `upriver` and `persona-research` are staged locally (not in this repo yet) and will be added once their tools below ship.

## Already exposed — skills call these directly (no work needed)

- **Web scraping** — `porter-tools.scrape` (one page) / `porter-tools.crawl` (whole site, async → `check_crawl_status`)
- **Pre-built platform scrapers** (Apify marketplace) — `search_web_scrapers` → `get_web_scraper_details` → `run_web_scraper` → `get_scraper_run` → `get_scraper_results`
- **Marketing data** — `query_data` / `list_fields` / `list_accounts`
- **SEO keyword data** — `ke_get_keyword_data`, `bulk_keyword_difficulty`, `keyword_overview`, `google_keyword_suggestions` / `google_keyword_ideas` (used by the SEO suite and `research/channels/website-changes-monitor`)

## To expose

| Tool to add | What it should return | Skills it unblocks |
|---|---|---|
| **Brand & audience intelligence** | Brand profile, audiences/personas with citations, products & competitors, sponsorships, creator/influencer intel, TikTok trends, breakout topics | `upriver` *(held)* |
| **Keyword & SERP metrics (external)** | External search volume, keyword difficulty, SERP overview, trend/rising demand | `upriver` *(held)*, `persona-research` *(held)*, `research/seo/seo-lever-finder` *(trend/rising only)* |
| **Ad-creative transcription** | Transcribe video-ad audio → text | `research/channels/meta-ads-research` |
| **Meta Ad Library scraper** *(verify first)* | A pre-built scraper for the Meta Ad Library, if one isn't already in the marketplace | `research/channels/meta-ads-research` |

> Until a row ships, the matching skill falls back gracefully (e.g. `meta-ads-research` leaves the
> transcript empty and declares it in `limitations[]`) — it never invents data.
