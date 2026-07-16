---
name: meta-ads-clone-winner
description: Duplicate the best-performing Meta (Facebook/Instagram) campaign / ad set / ad. Meta has NO native "duplicate" via the Porter MCP, so this reads the winner's full structure and RECREATES it PAUSED using the *_create actions. Use when the user wants to clone or scale a proven winner, duplicate a campaign/ad set, replicate a top performer into a new audience or budget, or A/B a variant. The winner = best by PERFORMANCE (CPA/ROAS with enough volume), NOT the one that spent the most.
---

# Meta Ads — Clone Winner

Scale what already works: find the **proven winner** and recreate it. There is **no `duplicate` action**
in the MCP, so cloning = **read the winner's full structure → recreate it PAUSED** with the setup skills.
Account-agnostic.

## Pick the winner correctly (the #1 mistake)
"Most active / most spend" ≠ best. Rank by **performance with enough signal**:
- Lead/Sales → lowest **CPA** (or highest **ROAS**), with a **minimum conversion volume** (≥ ~50 in the
  window) so it isn't noise, over a **recent window** (30–90 days — old winners fatigue).
- Use `meta-ads-insights-reporting` to rank; never clone on spend alone. (Survivorship caveat: cloning
  only chases known winners — great for scaling, not for finding new ones.)

## Flow
1. **Rank** candidates (`insights_get`, `level=campaign`/`adset`/`ad`) → pick the winner id.
2. **Read the full structure** with `object_read` at each level:
   - Campaign: `objective, special_ad_categories, bid_strategy, is_campaign_budget_optimization, daily_budget`.
   - Ad set: `optimization_goal, billing_event, destination_type, targeting, promoted_object, is_dynamic_creative, daily_budget, bid_strategy`.
   - Ad: `creative` (image_hash / video_id / object_story / child_attachments), copy, link, cta.
3. **Recreate PAUSED**, reusing the executor skills: `campaign-setup` → `adset-setup` → `asset-upload`
   (re-upload the creative if needed) → `ad-setup`. Give it a new name (`[CLONE] …`).
4. **Change only what the user wants** (new audience, new budget, new geo) — keep the rest identical.
5. **Verify** with `object_read`; report the new ids. Everything PAUSED until the user turns it on.

## What to clone vs. what to refresh
- **Clone as-is:** objective, optimization, targeting/audience, budget model, bid strategy, creative structure.
- **Must refresh / re-supply:** the **creative asset** (re-upload → new `image_hash`/`video_id`; hashes
  are per-account), **dates** (start/end), and often the **audience** if scaling into a new segment.
- **Frozen fields** (objective, buying_type at campaign; optimization_goal, billing_event at ad set) are
  set at create — the clone just sets them fresh; you can't "copy" them onto an existing object.

## Gotchas
- **No `duplicate` action** — this is read+recreate; there's no one-call clone (feedback roadmap item).
- **Budget = MINOR units** at both levels (×offset; [`../_budget/budget.md`](../_budget/budget.md)).
- **`is_dynamic_creative`** must match the source (structural, create-time) or the recreated ad won't attach.
- **Rate limits:** recreating a full campaign is several writes — batch, don't burst (account-safety).
- New ad → `effective_status: IN_PROCESS` (normal Meta review).

## Scope
- ✅ Rank winners + recreate a proven campaign/ad set/ad PAUSED (with optional tweaks).
- ❌ The one-shot native duplicate (not exposed). ❌ Deciding what to pause (that's `rules-optimizer`).
