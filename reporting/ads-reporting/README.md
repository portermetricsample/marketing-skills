# ads-reporting

Build your **paid-ads report** end-to-end — one multi-channel report across Meta Ads,
Google Ads, TikTok, LinkedIn and Shopify — using the **SUMAS** framework on the
**Porter Metrics MCP**. The installable companion to Porter's *"How I build my ads
report"* class.

It gives you three outputs from one method: a fast **chat answer**, a live **hosted
dashboard** URL, or a written **executive summary** — always structured with SUMAS
(fewer metrics, every number compared) and delivered with clear dashboard design.

> It **reports and analyzes** paid performance. It does not create, edit or pause
> campaigns.

## What's inside

| File | What it is |
|---|---|
| `SKILL.md` | The method: prerequisite, the SUMAS-for-paid flow, the tool plan, scope |
| `references/framework.md` | The brain — paid funnel spine per channel, the rates, connector traps |
| `references/design.md` | The five dashboard design principles |

## Requirements

- The **Porter Metrics MCP** connected in your Claude, with at least one paid channel
  connected. New to it? Start with [`core/porter-setup`](../../core/porter-setup/) or
  `mcp.portermetrics.com/install`. No API keys needed.

## Install (for your Claude)

Copy this folder into your Claude skills directory:

```bash
git clone https://github.com/portermetricsample/marketing-skills.git
cp -R marketing-skills/reporting/ads-reporting ~/.claude/skills/ads-reporting
```

Then, in Claude, just ask: **"build my ads report"** (with the Porter MCP connected).

## Notes

- Examples use fictional **Acme Insurance** — no real client data lives in this repo.
- Data is the **Porter Metrics MCP** (Meta, Google, TikTok, LinkedIn, Shopify + 25 more).
