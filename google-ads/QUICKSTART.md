# Google Ads Account Audit — Quick Start

Run a full best-practice health check on any Google Ads account in one step.

## What you need

1. **Claude** (desktop or web) with the **Porter Metrics MCP** connected.
   → [Porter MCP setup guide](https://portermetrics.com/en/docs/mcp-setup)
2. **Your Google Ads account linked** in your Porter workspace.
3. **This repo open in your Claude context** (the skill reads its recipes from these files).

That's it. No API keys. No scripts to run. No extra tools.

## Run the audit

Open Claude and say:

> **"Run the google-ads-account-audit skill on [your account name]"**

Claude will:
1. Find your account via Porter MCP
2. Pull live data across 11 health checks
3. Scrape your top landing pages natively (Porter's own tool, no API key)
4. Write a self-contained HTML audit file to a local folder
5. Deploy it as a private hosted Porter report
6. Return the file path + the report URL

## What the audit checks

| Section | Question it answers |
|---|---|
| Conversion tracking | Is bidding optimizing toward down-funnel events with values? |
| Bid strategy | Do tROAS / tCPA targets match actual 30-day results? |
| Quality Score | Which keywords have weak Ad Relevance, Expected CTR, or Landing Page Experience? |
| Spend allocation | Which campaigns are budget-capped vs rank-limited? |
| Search terms & negatives | What is the search term waste? What negatives should be added? |
| Landing CRO | Do the top landing pages have a clear value prop, CTA, and proof? |
| Device & dayparting | Does device or day-of-week show bid-adjustment opportunities? |
| Geography | Where is spend leaking to inefficient markets or wrong locations? |
| Audience & demographics | Which age / gender segments over- or under-perform? |
| Ad assets | Are sitelinks, callouts, and structured snippets present? |
| Campaign settings | Location set to Presence? Search Partners / Display Network off? |

Every finding ends with a plain-language **Where · What · Why** fix ranked by money at stake.

## Where the output goes

All run outputs (the HTML, raw data pulls, scrape files) are written to a folder **outside this
repo** — e.g. `~/<your-client>-gads-audit/`. The `.gitignore` enforces this.

**This repo never stores real account data.** The only committed example is the synthetic
"Acme Insurance" sample in
[`google-ads/account-audit/_assembled-template/audit-template.html`](google-ads/account-audit/_assembled-template/audit-template.html).

## Repo structure (for contributors)

```
_framework/           Shared rules: MCP calls, writing voice, brand-vs-nonbrand, metric relationships
_orchestrator/        How the 11 checks compose into one report
google-ads/
  account-audit/
    SKILL.md          ← the assembled, runnable skill (start here)
    references/
      tools.md        Ordered MCP call pipeline for the full audit
      framework.md    Orchestration logic: which checks, which order, severity ranking
      output.md       Canonical JSON output object
      render-rules.md The locked HTML/CSS design contract
      design/
        audit.css     Complete stylesheet (Porter brand, scoped under #audit)
        skeleton.html HTML shell with <!-- SLOT:… --> placeholders
    _assembled-template/
      audit-template.html  Synthetic "Acme Insurance" gold-standard example
    <check>/          11 atomic sub-skills (conversion-tracking, bid-strategy, …)
  keyword-ad-landing/ Message-match + QS metric checks (reused by the audit)
  search-terms/       Search term relevance + routing checks (reused by the audit)
  segmentation/       Device, time, geography, demographics checks (reused by the audit)
```
