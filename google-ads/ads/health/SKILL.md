---
name: google-ads-creative-health
description: Scan Google Ads accounts for the TWO creative problems that actually waste money — ads pointing to broken/dead landing pages, and disapproved (rejected) ads/assets that run handicapped. Runs across one account or many and returns a prioritized list of what to fix. Use this whenever the user asks to check ad/landing health, find broken links or 404s in ads, find disapproved/rejected ads, audit creative for wasted spend, or "what's broken in my Google Ads". Deliberately ignores Ad-Strength hygiene (headline counts, char usage, pinning) — those don't reliably move performance (see metric-levers.md). One account at a time; built to loop across an account list.
---

# Google Ads — Creative Health (the needle-mover scan)

## Goal (job-to-be-done)
Find the only two creative problems with real, attributable cost, across an account (or a whole
portfolio):
1. **Broken / dead landing URLs** — an enabled ad sends clicks to a 404 / unreachable page = pure
   wasted spend (and a latent one fires the moment a paused-by-rank ad serves).
2. **Disapproved / limited ads** — Google rejected the ad/asset, so it doesn't serve (or serves
   handicapped) = lost reach.

Return a prioritized "what to fix" list. This is the kept scope from the creative
[`metric-levers.md`](../metric-levers.md) "act on" set; the third needle-mover (message/intent
match) is owned by [`../../keyword-ad-landing/alignment`](../../keyword-ad-landing/), not here.

- **Who:** any media buyer / agency / in-house marketer. **When:** recurring hygiene, before
  acting, onboarding a neglected account.
- **Decision it drives:** fix this URL · resubmit/replace this rejected ad. Concrete, not cosmetic.
- **The differentiator:** it flags ONLY money-losers. No Ad-Strength vanity, no "write more
  headlines". Honest, small, high-signal.

## Scope
- ✅ **Broken landing URLs** (enabled ads — incl. latent ones not currently serving).
- ✅ **Disapproved / APPROVED_LIMITED** ads.
- ✅ **Portfolio roll-up** across many accounts (run per account, aggregate).
- ❌ Ad-Strength hygiene (counts / char / pinning / callouts / DKI / variety) — descoped, doesn't
  reliably move performance.
- ❌ Message/intent match → `keyword-ad-landing/alignment`. ❌ Asset-level disapprovals → optional
  extension (this scan is ad-level: a whole rejected ad is the bigger loss).

## Components
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one GAQL pull + the live
  URL check + the multi-account loop.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — what counts as
  broken / disapproved, urgency, and the caveats.
- **Output:** [`references/output.md`](references/output.md) — the findings JSON (+ portfolio roll-up).
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) +
  [`scripts/query.json`](scripts/query.json).

## Operate
**Input (per account):** the GAQL pull of every ENABLED ad (final URLs + `policy_summary.approval_status`),
and a `url_health.json` (HTTP status per unique final URL, from the live check). Loop the pull over
the user's accounts (`list_accounts` → per account).

**Process:** `process.py manifest.json` — joins each ad's final URL to its HTTP status (broken =
4xx/5xx/no-response) and reads `approval_status` (disapproved / limited), then aggregates per
account and rolls up the portfolio. Deterministic; the model only writes the synthesis.

**Emit** [`references/output.md`](references/output.md): per-account `broken_urls` + `disapproved_ads`,
and a `portfolio` roll-up. **Pure data — no emojis/tables/colors.** Lead the synthesis with the
highest-leverage fix (broken URL on a spending ad).

> Foreground only: the GAQL pulls (Porter MCP) and the URL curl must run in the foreground — Porter
> and Bash are denied to background agents.

## Example (illustrative — fictional Acme Insurance)
- **Disapproved:** old legacy text ads in a retired "Acme_Brand_2019" campaign come back
  `approval_status = DISAPPROVED` → rejected, not serving → recommend pause/remove.
- **Broken:** their final URLs point at a retired microsite (`promo.acme-insurance.example/…`) that
  returns no response (dead domain) → broken.
- A newer ad pointing at `/term-life-2023-promo/` returns **404** while enabled → latent waste; fix
  the URL before it serves.
