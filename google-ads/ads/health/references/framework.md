# Framework — Creative Health (the brain)

Flag ONLY money-losers. The whole point of this skill is signal density: two findings, both with
real, attributable cost. Everything else was deliberately cut (see [`../metric-levers.md`](../metric-levers.md)
"Scope decision").

## What counts

**Broken landing URL** — an enabled ad's `final_url` returns HTTP `0` (no response / dead domain)
or `>= 400` (4xx/5xx).
- *Why it's real:* every click on a serving broken ad is wasted spend; a broken URL on an
  enabled-but-unserved ad is a landmine that fires when the ad serves.
- *Urgency:* `urgent` if the ad has spend/impressions in the window (actively wasting); `latent`
  otherwise (fix before it serves). Urgency needs the optional cost pull; without it, mark `unknown`.

**Disapproved / limited ad** — `policy_summary.approval_status` is `DISAPPROVED` (rejected, not
serving) or `APPROVED_LIMITED` (serves with restrictions).
- *Why it's real:* a disapproved ad isn't running at all — lost reach; a limited one is throttled.
- `UNKNOWN` and `APPROVED` are NOT findings.

## What is deliberately NOT here
Headline/description counts, character usage, pinning, callouts, DKI, duplication, Low-label,
not-serving assets. They move Ad Strength, a weak performance predictor. Re-add only with evidence.
Message/intent match lives in `keyword-ad-landing/alignment`.

## Prioritization (how to order the fixes)
1. **Broken + spending** (urgent) — stop the bleed first.
2. **Disapproved** — lost reach; resubmit/fix wording or replace.
3. **Broken + latent** — fix before it serves.
`APPROVED_LIMITED` ranks below `DISAPPROVED`.

## Synthesis (the only judgment)
Three strings:
- `headline` — accounts scanned, how many have issues, and the single biggest one.
- `diagnosis` — counts: N broken URLs across M accounts, K disapproved ads.
- `action` — the first fix to make (usually the broken URL on a spending ad), then disapprovals.

## Caveats
- **Ad-level only.** A whole rejected ad is the big loss; per-asset disapprovals are an optional
  extension (read them from the creative arrays' `policySummaryInfo`).
- **Latent vs urgent needs the cost pull.** Without it, broken URLs are still flagged, just not
  ranked by spend.
- **PMax / Shopping** aren't in `ad_group_ad` — out of scope for this scan.
