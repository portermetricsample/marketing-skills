---
name: seo-lever-finder
description: "SEO Lever Finder. Give it a website (or brand) and it breaks the business into the four content levers — Product, Audience, Use case, Competitor — lists the real variations of each, combines them, and returns a prioritized topic/page plan for SEO. Use this whenever the user drops a URL or brand and wants content ideas, a content plan, topic clusters, 'what should I write about', 'how do I scale SEO', a topic matrix, or the angles/levers to attack a market. It's the IDEATION step that sits upstream of /programmatic-seo-planner: this decides WHAT topics exist, the planner sizes the keyword variants. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# SEO Lever Finder

Turn a website into a **topic plan** by pulling on four levers.

Most content planning fails because people brainstorm a flat list of keywords. This skill instead reads the
business, finds the **dimensions it can vary** (the levers), and treats topics as **combinations** of those
dimensions — which is what makes the plan both broad (covers the market) and non-random (every page has a reason).

**Before you start:** apply the data-cleaning rules + Output Contract in `seo-base-rules`.

**This skill decides _what to write_. To size the keyword variants of a chosen pattern, hand off to
`/programmatic-seo-planner`.** Don't re-mine volumes here — keep this skill about strategy and angles.

---

## The four levers

A lever is a dimension you can hold the brand fixed and slide along. Same brand, different lever → a totally
different set of pages.

| Lever | The question it answers | Airbnb example | Porter example |
|---|---|---|---|
| **Product** | What do they offer? (or: what surface/format?) | Entire homes · Private rooms · Hotel rooms · Experiences | Looker Studio · Sheets · Slack · ChatGPT · Gemini · Claude |
| **Audience** | Who is it for? | by country/city: Canada · US · Colombia | by marketer type: Social · Paid · SEO |
| **Use case** | What job are they hiring it for? | Conference travel · Friends trips · Romantic · Family | SEO dashboards · Competitor monitoring · Keyword research |
| **Competitor** | Who do buyers compare it to? | vs Vrbo · vs Booking.com · vs Hotels | vs Windsor · vs Supermetrics · vs Funnel |

### Two things that make the model work (don't skip these)

1. **Topics are a GRID, not a list.** The strongest pages combine two levers — `Audience × Product`
   ("SEO with Claude"), `Product × Competitor` ("Looker Studio vs Power BI"). One lever = the hub pages;
   two levers = the long tail. Always show both single-lever and combined topics.
2. **Never ship the full grid.** Product × Audience × Use case explodes into thousands of cells, and most have
   no real demand → thin, duplicate, cannibalizing pages that AI engines ignore too. **Qualify every topic** on
   (a) is there real search/AI demand, and (b) can we give it a genuine angle (different proof, screenshots,
   data — not just a swapped word). Prune the rest, and say what you pruned.

---

## Flow

### 1. Read the website
Scrape the site through the **Porter Metrics MCP** (`get_tool_schema` first, then call). Two options:
- **A few key pages** — `porter-tools.scrape` on the homepage + the main nav pages (product, pricing, use-cases,
  customers, blog, comparison pages). Ask for clean markdown so the levers read straight off the copy.
- **The whole site** — `porter-tools.crawl` to enumerate every URL, then poll `porter-tools.check_crawl_status`
  until it finishes. Use this when the nav is thin but the site is wide (lots of integration/landing pages),
  since the URL slugs themselves often spell out the Product and Use-case levers.

You're extracting four things:
- **Product** — what they sell, and the surfaces/formats/integrations it ships in.
- **Audience** — who they name on the site (industries, roles, company sizes, regions).
- **Use cases** — the jobs-to-be-done / outcomes they promise.
- **Competitors** — anyone named on "vs" or "alternatives" pages; if none, infer the obvious category rivals.

If the user already told you the brand/levers (like in a planning conversation), use that and only crawl to fill gaps.

### 2. Enumerate variations per lever
For each lever list the **real** values (5–10 each). Be accurate to the business — wrong variations
(e.g. "hostels" for Airbnb) destroy credibility. When unsure, prefer values the site itself uses.
To go beyond the site, use the Porter MCP keyword tools — `porter-tools.google_keyword_suggestions` (terms
containing the seed) and `porter-tools.google_keyword_ideas` (semantically adjacent ideas) — to surface real
query variations per lever instead of guessing.

### 3. Pick the hub axis
Decide which lever is the **primary cluster** — the hub that internal links and site structure organize around
(usually the one with the most demand or commercial value). State it; it drives the architecture.

### 4. Combine into topics
Build the topic set:
- **Hub topics** = one lever (e.g. "Looker Studio dashboards", "SEO reporting").
- **Combination topics** = two levers (e.g. "SEO dashboards in Claude", "Meta Ads → Power BI").
Express combos as a template with slots so they're ready for `/programmatic-seo-planner`:
`Connect {product} to {destination}`, `{use_case} for {audience}`.

### 5. Attach demand, then prioritize
Pull real numbers and attach them to each topic, all from the Porter MCP keyword tools:
- **Search volume / CPC** — `porter-tools.get_keyword_data`.
- **Difficulty** — `porter-tools.bulk_keyword_difficulty`.
- **Trend / rising** — rate of change on a term, useful for catching low-volume topics that are climbing.
  > ⏳ Backlog (Porter MCP): keyword & SERP metrics tool (external search volume, difficulty, trend/rising).
  Until it lands, lean on the volume + difficulty above and mark trend *estimated*.

Then give each topic a **priority** (High / Med / Low) from: demand, intent clarity, product fit, and whether a real
angle exists. If no tool is connected, mark demand *estimated* and recommend `/programmatic-seo-planner` to confirm —
don't block the plan on missing data. **Output:** a topic map = `topic · lever(s) · volume · trend · priority`.

---

## Output

Lead with a one-line read of the business, then the levers, then the plan. **Keep these columns, drop the rest:**

`topic · lever(s) · template · intent · angle · priority`

Use this structure:

```
## <Brand> — topic plan

**Read:** <1–2 sentences: what they sell, who for, the obvious levers>
**Hub axis:** <chosen primary lever + why>

### Levers
- **Product:** v1 · v2 · v3 …
- **Audience:** v1 · v2 · v3 …
- **Use case:** v1 · v2 · v3 …
- **Competitor:** v1 · v2 · v3 …

### Topic plan
| topic | lever(s) | template | intent | angle | priority |
|---|---|---|---|---|---|
| Looker Studio dashboards | Product | {product} dashboards | commercial | live template + 1-click connect | High |
| SEO reporting in Claude | Audience × Product | {use_case} in {product} | commercial | MCP demo, no SQL | High |
| Porter vs Supermetrics | Competitor | porter vs {competitor} | commercial | side-by-side pricing + features | Med |
| … | | | | | |

**Pruned (why):** <combos with no demand or no angle — name them so the cut is explicit>
**Next:** run `/programmatic-seo-planner` on the High-priority templates to size the keyword variants.
```

Keep the synthesis to ≤5 sentences. The table is the deliverable.

---

## Guardrails
- **Accuracy over volume.** Variations must be true to the business; a credible 5 beats a sloppy 20.
- **Every topic needs an angle.** If you can't say why a page would be different and worth ranking, cut it.
- **Don't hallucinate demand.** If you didn't pull real numbers, say "estimated" — never invent volumes.
- **One brand at a time.** The levers only make sense anchored to a single subject.
