---
name: meta-ads-research
description: Full competitor teardown on Meta Ads from just a brand name — runs entirely on the Porter Metrics MCP (no account, no API keys). Pulls a brand's active ads from the public Meta Ad Library (videos AND images), dedupes by media bytes, transcribes audio, samples frames, reads on-screen text, and publishes a hosted Porter report. Trigger on "scrape X's Meta ads", "creative research on Y", "audit Z on Meta", "analyze competitor X", or a Meta Ad Library URL. Output: a hosted report URL.
---

# Meta Ads Research

Clean, deduplicated extraction of a brand's active Meta Ad Library creatives → structured audit → a hosted Porter report. The job is to hand the analyst every structured variable and let them judge — we extract and classify, we don't opine.

**Runs 100% on the Porter Metrics MCP.** No connected account, no API keys, nothing to install. The Ad Library is public; Porter does the scraping, transcription, framing and hosting server-side. There are no tokens to expose.

## When to trigger

- "scrape {brand}'s Meta ads" / "what ads is {brand} running"
- "creative research on {brand}" / "audit {brand} on Meta"
- "analyze competitor {brand}" / "compare {brand A} vs {brand B}"
- a pasted Meta Ad Library URL (pass the whole link; the action reads the id)

**Wrong skill if it's the user's OWN ads.** "How are my Meta campaigns doing" is a performance report off their connected account (real spend/results) — a different recipe. This reads someone else's *public* ads and has **no metrics at all**.

## The four MCP actions — call these refs verbatim

| Step | Action |
|---|---|
| Pull + structure the library | `meta_ads_research.run_audit` |
| Transcribe + frame a batch | `meta_ads_research.enrich_creatives` |
| Look at one creative | `meta_ads_research.view_creative` |
| Build + publish the report | `meta_ads_research.publish_report` |

🚨 **Call these exact refs. Do NOT use `list_actions` to pick the action** — its ranking is lexical, so "scrape"/"web scraper" returns the GENERIC page scrapers, and a generic scraper pointed at the Ad Library (JavaScript + anti-bot) returns nothing. Use `list_actions` only to read a `params_schema`. If a ref genuinely returns `action_not_found`, say so and stop — don't improvise a replacement.

## Cost: the defaults ARE the budget guard — don't stop to ask

**Start the audit. Do not ask permission first.** Naming the brand implies the deliverable; a scoping question delivers nothing. `max_items` caps ads collected and `top_n` caps how many get transcribed — both bill per unit, and their defaults are what protect the spend (measured: **51 ads, 19 transcribed ≈ $2.12**). Ask before *raising* the caps, never before using them. Stop for exactly two things, both coming from the action, not you: **no page resolved**, or a scope above the caps.

`run_audit` returns `confirm_page` on a weak name match — surface it before any finding, so a wrong brand is caught in the first sentence.

### 🚨 A dropped call has ALREADY been paid for — do NOT retry the same call

A drop surfaces as `Session terminated` / `MCP server connection lost`: "no answer", not "no data". The scrape completed and billed server-side whether or not the answer reached you. Retrying re-bills the whole thing (measured once this was wrong: 32 retries, $30.50, quota exhausted platform-wide). It means the audit didn't fit the response window → ask for **less per call**: re-run with a lower `max_items` and a `top_n` covering only the videos you'll write up, and pass `page_id` from then on. If discovery drops twice, say it couldn't complete and stop. A missing fingerprint is different — no retry fixes a typo; copy fingerprints verbatim.

## Pipeline, in order

### 1. Pull the library

```
execute_action(action="meta_ads_research.run_audit", params={"brand": "<name, website or page/Ad-Library URL>"})
```

One call resolves the advertiser, collects live ads, **collapses duplicates by hashing the media BYTES** (the same file runs under many signed links — counting ads overstated one library by 150%), transcribes the ones with speech, and samples frames from every video. It also runs the free deterministic layers (campaign intel from the advertiser's tags, inferred objective per creative) — don't run those separately.

- Report `unique_creative_count`, **never** the ad count. `raw_ad_count` is the library's real size — if you capped below it, note it in the report's `limitations`.
- `metrics_available` is `false` and always will be — no spend, CTR or impressions anywhere in this flow.
- `audio: "silent_unknown"` = never probed (outside `top_n`) → a gap in your sample, not a fact. `"none"` = a real silent video.

**Big library? Split discovery from enrichment.** Transcription is the slow half, so run `run_audit(page_id=…, top_n=0)` for cheap discovery, then `enrich_creatives(page_id=…, fingerprints=[…])` two or three at a time. Each batch folds into the snapshot (`audit_refreshed: true`); batches accumulate, nothing already earned is re-billed. 🚨 `transcript: null` after `enrich_creatives` means the fold-in failed (`audit_refresh_warning`), NOT that you must buy it again — do not re-enrich those fingerprints.

### 2. Look at the creatives

```
execute_action(action="meta_ads_research.view_creative", params={"page_id": "<id>", "fingerprint": "<fp>"})
```

Returns that creative's frames **as pixels** plus its transcript. Look at the images; describe the setting, who appears, and what each moment shows — only from what is visible, never invented (the bar: "one man in a beanie seated at a desk gesturing at translucent purple holograms"). Call it for the **6–8 creatives you write up**, picked across the range (long-running AND recent), not the whole library. Statics have their own `image_creatives` key — call `view_creative` on them too, for the picture. A still or an un-enriched creative has no frames and the reply says so → then say the visual read is missing, never infer one.

### 3. Classify, then write the narrative

Keep the analysis contract below. Write the narrative as an object with **five** keys:

| key | what it is |
|---|---|
| `subtitle` | one qualitative line. **No numbers** — the report injects every figure. Quoting an offer the ad makes ("$0 credit study") is fine. |
| `patterns` | 3–6 `{title, body}` — what repeats ACROSS the library, not a summary of one ad |
| `deep_dives` | 6–8 creatives (schema below) |
| `image_creatives` | the static ads: `{fingerprint, on_image_text, angle, visual}` — **not optional**; it draws the whole "What do their image ads say?" section |
| `findings` | 3–5 `{title, body}` — what a competitor should DO about it |

Write in **English** — transcription returns the ad's own language and nothing downstream translates it, so **you are the translation step**: render faithfully (keep register, filler, repetition; leave brand names and figures as-is). `hook` is the headline quote; omit it and the report falls back to the raw first sentence in the ad's language.

```json
{
  "fingerprint": "<full fingerprint from the audit>",
  "title": "short creative name",
  "concept": "the creative vehicle (sketch, mockumentary, day-in-the-life, before/after, demo)",
  "insight": "the human tension the copy leans on",
  "format": "how it's made — UGC selfie, studio product, screen recording, talking head",
  "hook_type": "what the opening does — question naming an objection, price anchor, pattern break",
  "angle": "the argument — cost, speed, trust, status, FOMO",
  "funnel_stage": "TOF | MOF | BOF (+ short reason)",
  "persona": "who it targets, grounded on the frames",
  "actors": "who actually appears",
  "hook": "the headline quote — the opening line, in English",
  "delivery":      {"voice": "Yes", "music": "Yes"},
  "frame_notes":   {"hook": "what the first frame shows", "mid": "…", "end": "…"},
  "script_stages": [{"stage": "HOOK", "time": "0-6s", "text": "…"}],
  "on_screen_text": "silent/image ONLY: the message read off the image, misreads corrected"
}
```

`delivery`, `frame_notes` and `script_stages` are **objects/arrays** — passing a string crashes the render. `duration`/`pace` are measured by the generator — don't write them. Optical readings of stylised type carry errors ("tanjeta"→"tarjeta") — correct by context, never quote a misread literally. Every `fingerprint` must come from the audit; one that matches nothing is dropped silently.

### 4. Publish — one call, and it IS the deliverable

**The deliverable is a published report URL, every time** — not a summary in the chat. Lead your answer with which page was audited, the sample size and the cost.

```
create_report(name="<Brand> · Meta Ads teardown", connectors_used=[], accounts_used=[])
edit_report(report_id, operations=[{"action":"add_page","page_id":"index","title":"Teardown"}])
execute_action(action="meta_ads_research.publish_report", params={
  "page_id": "<id>", "brand": "<Name>", "upload_url": "<from edit_report>",
  "narrative": { ...what you wrote in step 3... }, "accent": "#hex (optional, tint to the competitor's color)"
})                                                    → report_url
```

The **allowlists are empty on purpose** — the data is frozen into the page, nothing is queried when a reader opens it, and the analysed brand has no account here. `publish_report` renders, packages and uploads in one step and returns `report_url`; the upload is audited first, so a report that doesn't hold up comes back rejected with the reason — fix what it names and call again. **Ignore the design advisory when it asks for metrics** ("no date range", "no CTR/CPC/ROAS"): none of those can exist here (the Ad Library publishes no performance data), and acting on it means inventing the exact numbers the contract forbids. Its layout notes are worth reading; its metric notes are not.

> Canonical flow + the sub-skills (classification, narrative, analysis contract) also live in Porter's built-in knowledge: `get_knowledge(queries=["meta ads research full flow", …])`.

## Analysis contract

Meta hides all performance (CTR, spend, impressions, ROAS) for a competitor. Every "what works" read is **inference from public signals** — never a measured fact. The whole contract follows from that.

**Extract and classify — never judge, never invent.**
- We hand the analyst the structured variables (angle, hook, concept, insight, format, objective, timing…) and let *them* decide what's good. We do not ship quality verdicts ("why it works", "winning ad").
- Descriptive attributes are **classified against a bank** (angles, hooks, triggers…), citing the entry or flagging the gap. A variable with no bank to draw from is a gap to note, not something to invent.

**Fact/judgment boundary — one source of numbers.**
- Numbers and facts always come from the audit (counts, `days_active`, `variants_total`, dates, platforms, CTA, `link_url`). The report **injects** them; the AI never types a figure. The per-brand header is templated: `N active · M unique · K enriched (X%)`.
- The AI writes only descriptive attributes in the narrative — no digits, no URLs.

**Every proxy variable carries 4 things** (`days_active`, `variants_total`, …):
1. A hypothesis label, not a verdict — "Candidate winner, worth investigating", never "Winner".
2. An inline disclaimer next to the signal — longevity/variants proxy the advertiser's investment, not proven performance.
3. The raw number visible (`147d · 13 var · still active`) so the reader can overrule the read.
4. Observation separated from inference — correlation ≠ causation, stated.

**Vocabulary — describe observable behavior, not measured performance.**
- Use for a competitor: Evergreen · Always-on vs Burst/Pulsing · Testing · Scaling · Iteration vs Concept · Time-in-market · Spend-proxy (ad density) · Survivorship bias · Hero/Hub/Hygiene.
- Never for a competitor: Unicorn / Winning / Steady / Fatiguing / Losing — those are the `creative_performance` bands and need metrics we only have for our OWN account.
- Decompose a creative on the `content-stack` axis: Concept → Angle → Format → Hook.

**Segmentation 2×2** (longevity × variants, median split): Evergreen/Always-on (long, few) · Scaled & heavily-iterated (long, many) · New concept testing at volume (recent, many) · Early testers (recent, few). Alt cuts: by product line, declared format, theme (UTM), `funnel_stage`.

**Launch timeline** by `first_seen_date`. Active-only is survivorship-biased (recent months inflated, old months show only survivors) — state it.

**UTM intel** (deterministic, from `link_url`, zero AI cost, produced by `run_audit`): `declared_format`, `campaign_theme`, `launch_month`, `objective`, `product_area`, `landing_host`. Codes are brand-specific → keep the raw token. Always report coverage (e.g. 69/71); empty if the brand doesn't tag.

**Objective classifier** (from `run_audit`) — taxonomy = the 6 Meta ODAX objectives (Awareness · Traffic · Engagement · Leads · App promotion · Sales). Meta hides the real objective, so it's inferred in layers: `utm_objective` (advertiser-declared) > `cta_type` > `landing_host`. Per creative: `inferred_objective` + `confidence` + `driving_signal` + raw `signals` + `conflict`. **Transparency rule: the report shows every raw signal, then the inference — never the verdict alone.** A signal conflict is itself an insight (Sales objective under a soft `WATCH_MORE` CTA = "conversion goal, soft creative"). Message-level intent overlay = Schwartz's 5 awareness stages. Don't confuse with `ad-diagnostic`'s creative funnel (capture→keep→click→convert), a different axis.

## Media classification (the branch key)

`run_audit` derives two canonical per-creative fields that route everything downstream:
- `media_kind` ∈ `static_image | voiced_video | silent_video` — keyed off transcript presence.
- `audio` ∈ `speech | music_only | none | silent_unknown` — `none` = real silent video; `silent_unknown` = outside `top_n`, never probed.

Branch by it: `voiced_video` → transcript; `silent_video` / `static_image` → the visual read off `view_creative`'s frames/picture (the on-image copy lives in the typography, in no text field — you read it). Creative selection for enrichment is **stratified** across the 2×2 (proven bets + fresh experiments + product coverage), not a single top-variants ranking — `days_active` alone buries new experiments.

## Rules

- **State the sample size.** Always report `enriched N of M unique`; never imply exhaustive coverage.
- **Don't auto-pick an ambiguous page.** If `run_audit` returns `confirm_page`, surface it before any finding.
- **Don't invent missing data.** No transcript and no legible on-screen text → the creative's message is null, not deduced from the brand's other ads.
- **Report caps.** If `max_items` filled, the brand has more → note it in `limitations`.
- **One audience, one message per creative** in the read; don't blend.
- **Suggest slicing for big brands** (>50 unique) to keep the write-up focused.

## Definition of done

A teardown that stops before the deep dives is a data pull, not an analysis. Deliver only when all of it holds:
1. Scraped, every media fingerprinted so the unique count is byte-true.
2. Videos with audio transcribed; frames pulled for the ones you analyze.
3. Objective, UTM intel and angles classified across the library.
4. 6–8 deep dives across the range — long-running AND recent, video AND static.
5. **Published**, with the sample stated: "N active · M unique · K analyzed".
