# Shared helper — Currency-aware budget for Meta Ads

**Single source of truth** for turning a user's real-money budget ("$30/day", "300.000 COP/día")
into the correct value for each Meta write action. Both `campaign-setup` and `adset-setup` (and any
future skill that sets a budget or bid) MUST use these rules — never hand-roll budget math in a skill.

## The core problem it solves
Meta budgets are money. Two things make them error-prone:
1. Meta stores budgets in the account currency's **minor unit** (offset). `$30.00` → `3000`.
2. **The two Porter actions disagree on who does the conversion** (validated 2026-07-15, feedback
   gaps 33/35):
   - `campaign_create` / `campaign_update` → **you pass MINOR units** (no conversion). `$30` → `3000`.
   - `adset_create` / `adset_update` → **you pass MAJOR units** (the connector converts). `$30` → `30`.

Passing the wrong one is a **100× error in a money field**. This helper makes that impossible.

## Step 1 — get the currency AND its offset (never assume)
```
object_read(object_id="act_<digits>", fields="currency")   // e.g. "COP", "USD", "JPY"
```
Then resolve the **offset** (minor units per major unit). Do NOT guess per real-world decimals —
use Meta's offset, which is currency-specific:
- Most currencies: **offset 100** (2 minor digits). Validated: **COP = 100** (200.00 COP ⇒ `20000`),
  USD = 100, EUR = 100, MXN = 100, BRL = 100, COP/ARS/CLP-see-below.
- **Zero-decimal currencies: offset 1** — no minor unit. e.g. `JPY`, `KRW`, `VND`, `CLP`, `ISK`,
  `HUF`(*). For these `¥1000` ⇒ `1000` (not ×100).
- (*) A few currencies have non-standard offsets in Meta. If unsure, read Meta's currency object
  (`/act_x?fields=currency` returns the currency; the offset comes from Meta's published currencies
  table) rather than guessing.

> ⚠️ Real-world decimals ≠ Meta offset. COP is effectively cent-less in daily life, yet Meta uses
> offset **100** for it. Always use Meta's offset, not intuition.

## Step 2 — convert per action
Let `amount` = the user's number in MAJOR units (may have decimals, e.g. `30.50`), `offset` = from step 1.

| Target action | Pass this | Formula |
|---|---|---|
| `campaign_create` / `campaign_update` (`daily_budget_amount`, `lifetime_budget_amount`) | **minor units, integer** | `round(amount * offset)` |
| `adset_create` / `adset_update` (`daily_budget_amount`, `lifetime_budget_amount`, `bid_value`) | **major units, as-is** | `amount` (do NOT ×offset) |

Worked examples:
- `$30.00/day` USD (offset 100): campaign → `3000` · ad set → `30`.
- `300000 COP/day` (offset 100): campaign → `30000000` · ad set → `300000`.
- `¥5000/day` JPY (offset 1): campaign → `5000` · ad set → `5000`.

## Step 3 — enforce the account minimum
Meta rejects budgets below a per-account minimum and returns it in the error, in MINOR units:
`"daily budget 50 COP is below the account minimum (3319 COP in minor units)"`. Compare your MINOR
value (or `amount*offset`) against it. Surface a clear message ("min is ~33.19 COP/day") — don't just
forward Meta's raw error.

## Step 4 — guard the 100× mistake
- Pass `confirm_large_budget: true` ONLY after the user confirms an unusually large amount
  (the connector rejects budgets >5000× the account minimum without it).
- If a computed campaign minor value looks ~100× the intended spend, you likely applied the offset to
  the adset path (or vice-versa). Stop.

## Step 5 — self-check after write (cheap, catches unit bugs)
After creating/updating, read the budget back and assert it matches intent:
```
object_read(object_id=<id>, fields="daily_budget")   // returns MINOR units as a string, e.g. "3000"
assert int(daily_budget) == round(amount * offset)
```
If it doesn't match, the unit/offset was wrong — pause and fix before telling the user a number.

## Reporting to the user
Always show the **major-unit** figure with the currency and correct decimals ("$30.00/day",
"300.000 COP/día") — never the raw minor-unit integer. Format decimals per the currency (0 decimals
for offset-1 currencies, 2 for offset-100).

## Related
- Feedback gaps: general/33 (budget minor-units + account minimum undocumented), general/35
  (campaign minor vs ad-set major inconsistency). If those get fixed upstream (both actions take
  MAJOR units), collapse Step 2 to "pass major units everywhere" and keep only Steps 1/3/5.
