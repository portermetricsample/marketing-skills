# Meta Marketing API rate limits — the points system + backoff

Automations must live inside these limits. Bursting past them throttles the account and, repeated,
looks like abuse.

## The scoring model
Meta rate-limits the Marketing API by a **score**, not a simple call count:
- **Read call = 1 point · Write call = 3 points** (create/update/delete are the expensive ones).
- When the running score hits the tier max, Meta throws a **throttling error** and blocks further calls
  until the score decays.

## Tiers (per app access level)
| Tier | Max score | Decay | Block time when maxed |
|---|---|---|---|
| **Development** (default, unapproved app) | **60** | 300 s | **300 s** |
| **Standard** (Ads Management Standard Access) | **9,000** | 300 s | **60 s** |

Porter's app operates at Standard-type access, but the **per-ad-account** budget still means a single
account can be throttled by a burst of writes — which is what we saw live as `subcode 2859015`
("account restricted / temporarily blocked").

## Getting/keeping Standard access
Qualify with **≥ 500 Marketing API calls in the last 15 days** and an **error rate < 15%** (rolling
last 500 calls). High error rates (spraying invalid writes) can cost the tier — another reason to
validate params before writing.

## Backoff rules for any automation
1. **Batch, don't burst.** Space out writes; prefer one correct call over many retries.
2. **On a throttle / `2859015` / block:** stop, **back off exponentially** (e.g. 60s → 2m → 5m), then
   retry — **never retry-storm** (that deepens the block and looks like abuse).
3. **Validate before writing** so you don't burn score (and tier eligibility) on rejected calls.
4. **Prefer reads to derive state**, then a single write — instead of trial-and-error writes.
5. **Single-use presigned upload tokens** burn on any failed POST — get a fresh one, don't loop.

## Sources
- [Marketing API Rate Limiting — Meta for Developers](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/)
- [Graph API Rate Limits — Meta for Developers](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)
- [Ads Management Standard Access requirements](https://developers.meta.com/blog/updates-to-ads-management-standard-access-feature/)
