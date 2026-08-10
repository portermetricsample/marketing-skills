---
name: meta-ads-research
description: Full competitor teardown on Meta Ads from just a brand name. Pulls a brand's active ads from the Meta Ad Library (videos AND images), dedupes by SHA256, transcribes audio (Deepgram), extracts frames (ffmpeg), reads on-screen text (OCR), and builds a self-contained Porter visual report. Trigger on "scrape X's Meta ads", "creative research on Y", "audit Z on Meta", "analyze competitor X", or a Meta Ad Library URL. Output: canonical JSON + Porter HTML report.
---

# Meta Ads Research

Clean, deduplicated extraction of a brand's active Meta Ad Library creatives → structured JSON → a Porter visual report. The job is to hand the analyst every structured variable and let them judge — we extract and classify, we don't opine.

## When to trigger

- "scrape {brand}'s Meta ads" / "what ads is {brand} running"
- "creative research on {brand}" / "audit {brand} on Meta"
- "analyze competitor {brand}" / "compare {brand A} vs {brand B}"
- a pasted Meta Ad Library URL (the `page_id` is in `view_all_page_id=`)

## Credentials

Real tokens live in a gitignored `.env` in the pipeline scripts folder — never committed. Load it before running:

```bash
cd /Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts
set -a; source ./.env; set +a
```

`.env` defines `APIFY_TOKEN` and `DEEPGRAM_TOKEN`. If it's missing (clean checkout), create it from Porter's tokens before running.

## Pipeline

Scripts: `/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts/`

```bash
# run_audit orchestrates identify → scrape → dedup → enrich → audit in ONE call.
# Do NOT run 02/03/04 separately as well — run_audit re-runs them, which double-scrapes and burns Apify quota.
python3 run_audit.py --page-id <ID> --auto-confirm --formats all --top-n 40 --max-items 500
python3 parse_utm.py         --page-id <ID>   # → utm_intel.json  (campaign intel from link_url)
python3 funnel_classifier.py --page-id <ID>   # → funnel_intel.json (inferred Meta ODAX objective)
python3 ocr_creatives.py     --page-id <ID>   # → ocr_intel.json  (on-screen text, Apple Vision)
python3 generate_report.py   --page-id <ID> --brand "<Name>" --narrative data/<ID>/narrative.json
```

- `--top-n` caps enrichment (Deepgram) spend; omit for full coverage. `--max-items` caps the scrape.
- On a fresh/clean run, delete any prior `data/<ID>/` outputs first — re-scraping over old files leaves mixed-vintage state.
- Output: `data/<page_id>/AUDIT.json` (canonical) + the `*_intel.json` layers + `dist/<slug>/index.html`. End-to-end 1–5 min by size.

### Verified gotchas

- `--formats all` is mandatory on run_audit. Without it AUDIT.json is `summary`-only → the report renders empty.
- `--brand "<Name>"` is mandatory on generate_report when entering by `--page-id` (page_name resolves null → header shows "—").
- run_audit does NOT run generate_brief; they're separate steps.
- Angle classifier (`generate_brief.py → ANGLE_RULES`) is rule-based EN+ES. If a new brand lands mostly in `uncategorized`, extend `ANGLE_RULES` with its patterns. Real DCO with no copy → tag `DCO — no copy`, not uncategorized.
- Warn the user before any run projected to cost > $5 backend.

## The report

`generate_report.py` turns AUDIT.json + the intel layers into a self-contained `index.html` (base64 images, opens offline) in the Porter design system. English by default.

Two layers:
- **Data (automatic, from JSON):** counts, media/format, inferred objective, campaign intel, launch timeline, longevity×variants segmentation, hook angles, platform eligibility, creative grid, landings.
- **Narrative (the AI writes):** subtitle, cross-library patterns, per-creative deep-dives, actionable findings — via `narrative.json`.

**A complete analysis ALWAYS includes the narrative deep-dives.** The data-only report (no `narrative.json`) is a partial — never the deliverable. Only stop at data-only when the user explicitly asks for a quick data pull. If you ran the pipeline but didn't write the narrative, the analysis is not done.

**Definition of done — every step, in order, none skipped:**
1. scrape → dedup → enrich → run_audit (`--formats all`)
2. parse_utm · funnel_classifier · ocr_creatives (all three intel layers)
3. **narrative.json** — 6–8 per-creative deep-dives (stratified), 3–6 patterns, 3–5 findings, subtitle
4. generate_report `--brand --narrative` → confirm the deep-dives rendered
5. deliver + state the sample size

Conventions:
- **Section titles are the question they answer**, in plain language — "What kind of ads do they run?", not "Media & format". Technical terms (ODAX, funnel_stage) go in the body, never the title.
- **Compact density** — 2-col grids, proportion bars, stat tiles. The audit must not need infinite scroll.
- **Colors** — full Porter palette by default; `--accent "#hex"` tints only the accent to the competitor's color.
- **Why HTML, not a report.portermetrics.com dashboard** — those run on Porter connectors (the client's own account). This data is the public Ad Library via Apify, not a connector.

## Analysis contract

Meta hides all performance (CTR, spend, impressions, ROAS) for a competitor. Every "what works" read is **inference from public signals** — never a measured fact. The whole contract follows from that.

**Extract and classify — never judge, never invent.**
- We hand the analyst the structured variables (angle, hook, concept, insight, format, objective, timing…) and let *them* decide what's good. We do not ship quality verdicts ("why it works", "winning ad").
- Descriptive attributes are **classified against a bank** (angles, hooks, triggers…), citing the entry or flagging the gap. A variable with no bank to draw from is a gap to note, not something to invent (this is why `copy_levers`/`why_it_works` are out).

**Fact/judgment boundary — one source of numbers.**
- Numbers and facts always come from `AUDIT.json` (counts, `days_active`, `variants_total`, dates, platforms, CTA, `link_url`). The report **injects** them; the AI never types a figure. The per-brand header is templated and identical for every brand: `N active · M unique · K enriched (X%)`.
- The AI writes only descriptive attributes in `narrative.json` — no digits, no URLs. (This kills the "149 vs 337" bug: the 149 was a hand-typed count in prose.)

**Every proxy variable carries 4 things** (`days_active`, `variants_total`, …):
1. A hypothesis label, not a verdict — "Candidate winner, worth investigating", never "Winner".
2. An inline disclaimer next to the signal — longevity/variants proxy the advertiser's investment, not proven performance.
3. The raw number visible (`147d · 13 var · still active`) so the reader can overrule the read.
4. Observation separated from inference — correlation ≠ causation, stated. The reader concludes.

**Vocabulary — describe observable behavior, not measured performance.**
- Use for a competitor: Evergreen · Always-on vs Burst/Pulsing · Testing · Scaling · Iteration vs Concept · Time-in-market · Spend-proxy (ad density) · Survivorship bias · Hero/Hub/Hygiene.
- Never for a competitor: Unicorn / Winning / Steady / Fatiguing / Losing — those are the `creative_performance` (Motion) bands and need metrics we only have for our OWN account.
- Decompose a creative on the `content-stack` axis: Concept → Angle → Format → Hook.

**Segmentation 2×2** (longevity × variants, median split): Evergreen/Always-on (long, few) · Scaled & heavily-iterated (long, many) · New concept testing at volume (recent, many) · Early testers (recent, few). Alt cuts: by product line, declared format, theme (UTM), `funnel_stage`.

**Launch timeline** by `first_seen_date`. With `active_only=true` it is survivorship-biased (recent months inflated, old months show only survivors). For real cadence/kill-rate, scrape `active_status=all`.

**UTM intel** (`parse_utm.py`). From `link_url`, deterministic, zero AI cost: `declared_format`, `campaign_theme`, `launch_month`, `objective`, `product_area`, `landing_host`. Product/theme codes are brand-specific → keep the raw token + optional `--product-map`. Always report coverage (e.g. 69/71); empty if the brand doesn't tag.

**Objective classifier** (`funnel_classifier.py`) — taxonomy = the 6 Meta ODAX objectives (Awareness · Traffic · Engagement · Leads · App promotion · Sales). Meta hides the real objective, so it's inferred in layers: `utm_objective` (advertiser-declared, highest) > `cta_type` > `landing_host`. Output per creative: `inferred_objective` + `confidence` + `driving_signal` + all raw `signals` + `conflict`. **Transparency rule: the report shows every raw signal, then the inference — never the verdict alone.** A signal conflict is itself an insight (e.g. Sales objective under a soft `WATCH_MORE` CTA = "conversion goal, soft creative"). Message-level intent overlay = Schwartz's 5 awareness stages (Unaware→Most-aware). Do not confuse with `ad-diagnostic`'s creative funnel (capture→keep→click→convert), a different axis.

## Media classification (the branch key)

`run_audit.py` derives two canonical per-creative fields that route everything downstream:
- `media_kind` ∈ `static_image | voiced_video | silent_video` — keyed off transcript presence, not `is_enriched`.
- `audio` ∈ `speech | music_only | none | n/a` — the `music_only`/`none` split comes from `04_enrich`'s ffprobe audio-stream check.

Branch by it: `voiced_video` → Deepgram transcript; `silent_video` / `static_image` → OCR/visual (never spend Deepgram on them). Creative selection for enrichment is **stratified** across the 2×2 (proven bets + fresh experiments + product coverage), not a single top-variants ranking — `days_active` alone buries new experiments.

## Writing the narrative (deep-dive)

1. Read `data/<ID>/brand_brief.md`, the transcripts in `AUDIT.json → scripts[]`, and `data/<ID>/ocr_intel.json`. Route by `media_kind`: **voiced_video** → transcript (HOOK/BODY/CTA script); **silent_video / image** → no audio, use the OCR `on_screen_text` as the message, with `delivery: {"voice":"No"}`. OCR carries typography misreads ("tanjeta"→"tarjeta") — correct them by context, never copy literally.
2. For each deep-dive creative, open its 3 frames with Read (`thumbs/<fp>_{hook,mid,end}.jpg`) and describe actors, setting, and what each frame shows — only from what is visible, never invented.
3. Write `data/<ID>/narrative.json`:

```json
{
  "subtitle": "One-line QUALITATIVE thesis. No numbers — the report injects those from AUDIT.json.",
  "patterns": [{"title": "3-6 word pattern", "body": "1-2 sentences on what repeats across ads."}],
  "deep_dives": [{
    "fingerprint": "<full fingerprint from AUDIT>",
    "title": "short creative name",
    "concept": "the big creative vehicle (sketch, mockumentary, day-in-the-life, before/after)",
    "insight": "the human truth / tension the copy leverages",
    "format": "e.g. UGC selfie + product screen",
    "hook_type": "e.g. question that names the objection",
    "angle": "e.g. price anchor",
    "funnel_stage": "TOF | MOF | BOF (+ short label)",
    "persona": "who it targets",
    "actors": "who appears, grounded on the frames",
    "delivery": {"voice": "Yes", "music": "optional"},
    "script_stages": [{"stage": "HOOK", "time": "0-3s", "text": "…"}],
    "on_screen_text": "silent/image ONLY: the OCR message, misreads corrected. Renders a '📝 On-screen text (OCR)' panel instead of Audio. Omit for voiced_video.",
    "frame_notes": {"hook": "what's on screen", "mid": "…", "end": "…"}
  }],
  "findings": [{"title": "Actionable finding", "body": "Implication for a competitor of this brand."}]
}
```

- `duration` and `pace` (w/s) are computed by the generator from `scripts[]` — don't write them.
- Default 6–8 deep-dives (stratified, not just top-variants). 3–6 patterns, 3–5 findings.
- Only assert what brief/AUDIT/frames/OCR support.

## Rules

- **State the sample size.** Always report `enriched N of M unique`; never imply exhaustive coverage.
- **Don't auto-pick an ambiguous page_id.** If 01 returns multiple candidates, ask the user.
- **Don't invent missing data.** No transcript and no OCR → the analysis is null, not deduced.
- **Report caps.** If `--max-items` filled, the brand has more → note it in `limitations[]`.
- **One audience, one message per creative** in the read; don't blend.
- **Suggest slicing for big brands** (>50 unique) to keep the brief small.

## Roadmap & references

Open gaps, dev-team handoff, pricing and acceptance tests live in the docs — not inlined here:
- Pipeline: `/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/`
- `docs/HANDOFF.md` (architecture, costs, roadmap, QA brands) · `docs/SCHEMA.md` · `docs/ITERATION_LOG.md`
- Building a banked text/video/audio analysis framework (see `porter-marketing` → `content/skills/content-framework`) is the next major step.
