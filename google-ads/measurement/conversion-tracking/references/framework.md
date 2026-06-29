# Framework: Offline Conversion Tracking Audit

## 1. Business question
> Is **offline/CRM conversion import** set up, are the **counted (primary) conversions
> down-funnel**, and do they **carry values**?

## 2. The signals (two queries, joined by `conversion_action_name`)
**A · config** — `conversion_action_name`, `_category`, `_type`, `_conversion_source`,
`_primary_for_goal`, `_status`.
**B · metrics** — `conversion_action_name`, `conversions`, `all_conversions`, `conversions_value`.
(Config and metrics **don't combine** — "cannot be combined" — so two pulls, join by name.)
> Pull **`all_conversions` alongside `conversions`** — the gap between them is how you tell a
> *secondary* action (fires, not counted) from one that *never fires*. See §3.5.

## 3. The category → depth ladder (the objective reference)
Map `conversion_action_category` to funnel depth (Google's own taxonomy):
- **L1 · shallow:** `PAGE_VIEW`, `ENGAGEMENT`, `DEFAULT` (uncategorized — treat as shallow until proven).
- **L2 · mid / lead:** `SUBMIT_LEAD_FORM`, `SIGNUP`, `REQUEST_QUOTE`, `CONTACT`, `BOOK_APPOINTMENT`,
  `PHONE_CALL_LEAD`, `GET_DIRECTIONS`, `DOWNLOAD`.
- **L3 · down-funnel / revenue:** `PURCHASE`, `QUALIFIED_LEAD`, `CONVERTED_LEAD`, `SUBSCRIBE_PAID`,
  `STORE_SALE`, `STORE_VISIT`.
> `DEFAULT` is ambiguous (Google "uncategorized"). Acme Insurance's "Payment Received" actions are
> `DEFAULT` yet clearly down-funnel — so when category is `DEFAULT`, fall back to the **name** for
> depth ("payment"/"purchase"/"sale" → L3; "page view"/"start" → L1/L2) and say it's name-inferred.

## 3.5 Determining what's "primary" — and whether it fires (anti-hallucination)
**Do NOT trust `primary_for_goal`.** The connector returns `True` for *every* action (verified bug),
so it cannot tell primary from secondary. Derive the real state from the metrics instead, per action:
- **Primary (counted):** `conversions > 0`. The `conversions` column = primary actions only.
- **Secondary (fires, not counted):** `conversions == 0` **AND** `all_conversions > 0`. The action
  IS firing — it's just not feeding bidding. The finding is **"make it primary"**, NOT "it doesn't fire".
- **Not firing:** `conversions == 0` **AND** `all_conversions == 0` **over a wide, settled window**.

**Two hard guards before you flag anything as "broken / not tracked / zero":**
1. **Never say "fired zero times" / "not tracked" off the `conversions` field alone.** A `conversions=0`
   with `all_conversions>0` means *secondary*, not *absent* — saying "zero" there is a false claim.
   (Real example: an account's `Paying Customers` showed `conversions=0` but `all_conversions=69` over
   6 months — it fires ~11/mo as a secondary, $0-value action. "Fired zero times" would be wrong.)
2. **Reporting lag:** offline/CRM/`PURCHASE` actions import days-to-weeks late, so the most recent
   month is provisional. Before calling an action "0", **re-pull a wider/earlier settled window**
   (e.g. last 90d or the prior full month) and report the corroborated state, not the snapshot.

## 4. The 4 objective rules (the recommendation)
Run over the **ENABLED** actions (drop REMOVED/HIDDEN), joined A+B. "Primary" below means
**`conversions > 0`** (the §3.5 definition), NOT `primary_for_goal`:
- **R1 — offline import missing** → if NO enabled action has `type ∈ {UPLOAD_CLICKS, UPLOAD_CONVERSIONS, STORE_SALES_*}`
  or `conversion_source` containing "Upload"/a CRM → 🔴 "no offline/CRM import; import down-funnel
  CRM events for revenue optimization." (Acme §2 core.)
- **R2 — primary is shallow** → among **counted (primary, `conversions > 0`)** actions, find the
  deepest by the ladder. If it's **L1** → 🔴 "your counted conversion is a shallow event; promote a
  deeper (L2/L3) action to primary." If L2 while an L3 exists unused → 🟡 "a deeper event exists."
- **R2b — revenue action exists but is only SECONDARY** → an L3 action (`PURCHASE`/`QUALIFIED_LEAD`/…)
  with `conversions == 0` but `all_conversions > 0` → 🔴 "'{name}' fires {all_conversions} times but
  isn't a **primary** conversion, so bidding can't optimize toward it — make it primary." This is the
  correct finding for "the real revenue event isn't driving bids" — NOT "it never fires" (§3.5 guard 1).
- **R3 — value missing** → any **counted (`conversions > 0`)** action with `value == 0` → 🔴 "primary
  '{name}' fires {N} conv with **no value** — add a conversion value." (A secondary L3 with no value
  is R2b, not R3 — fix the primary status first.)
- **R4 — deprecated** → any enabled `type == UNIVERSAL_ANALYTICS_GOAL` → 🟠 "migrate off Universal
  Analytics goals (deprecated/sunset)."
- **Hygiene (info, not a rule):** count `REMOVED`/`HIDDEN` actions → "N legacy actions, clean up."

Each rule's recommendation is a **kind of fix**, not a specific event/CRM — the human picks the
exact target (R1 which CRM, R2 which event).

## 5. Output contract (content only)
> **Executable + plain ([cluster rule](../../README.md)).** Every recommendation names the **exact
> conversion action** (account-level — e.g. `H&D Application Start`) and the **exact change**,
> written for a non-technical owner as **Where · What to do (plain words + the exact setting in
> parens) · Why** — no bare jargon. e.g. *"Add a value to the conversion `H&D Application Start`
> (134 leads, $0 today) so Google can chase the leads that actually pay."*
> Layout/visuals = `porter-reporting`, NOT here. Account-level audit → two-level output.

**Part 1 — Account verdict** (one line each: verdict · finding · recommendation):
1. Offline/CRM conversions — R1.
2. Optimization depth — R2.
3. Conversion values — R3.
4. (info) Hygiene + R4.

**Part 2 — Active actions** (ENABLED, joined A+B), per action:
`name · category (+depth) · type/source · primary? · value? · conversions(30d)` + "N legacy (cleanup)".

**Part 3 — Roll-up:** the fixes ranked by leverage (import CRM + values → promote down-funnel primary
→ add value to the highest-volume value-less action → migrate UA / clean up).

## 6. When it applies / when it does NOT
- **Applies to:** every account (conversion setup is foundational). Account-level, not per-campaign.
- **Does NOT / caveat:**
  - It flags "no offline import" but can't know the advertiser's CRM — recommend the *type* of fix.
  - **`DEFAULT` category** → infer depth from the name; say it's inferred, don't assert.
  - It reads **setup**, not whether a specific event is the "right" business KPI — that's the human's call.
  - **conversions/value** use primary actions (`google_ads_conversions` UI semantics); disclose.
  - **Primary status comes from `conversions` vs `all_conversions` (§3.5), never from `primary_for_goal`**
    (returns True for all — connector bug). Never claim an action "doesn't fire / isn't tracked" off
    `conversions=0` alone, and corroborate recent windows against a settled one (reporting lag).

## 7. The "how many primaries" flag — feeds every segment skill (the inversion guardrail)
This skill is the **single source of truth** for one fact the rest of the audit depends on: **how many
distinct conversion actions actually feed the `conversions` metric** (count those with `conversions > 0`).
Emit it (`primaryCount`) so the segment skills know whether their efficiency reads can be trusted.

- **One primary** → `google_ads_conversions` is that single action everywhere → segment efficiency
  (by match type / age / gender / device / geo / search term) is **real**.
- **More than one primary** (e.g. form-fill **and** MQL **and** Opportunity) → `google_ads_conversions`
  is a **blend**, and Porter **cannot isolate one action by segment** (the conversion-action view will
  not combine with `keyword_view` / segment views — verified). A segment that wins on the blended
  count can be the **worst** on cost-per-qualified. So `match-types`, `audience-demographics`,
  `segmentation/*`, and `search-terms/performance` must report their efficiency ranking as
  **directional only** when `primaryCount > 1` — never assert "most/least efficient". (Live proof:
  Broad match was best on all-conversions $/conv but worst on Cost/MQL — the proxy inverted the truth.)

> **Counting `primaryCount` — use `conversions > 0`, NOT `primary_for_goal`** (§3.5). Verified live: an
> account had **every** action `primary_for_goal == True` yet one returned `conversions = 0` with
> `all_conversions = 19` — effectively **secondary**. Count the distinct actions with `conversions > 0`;
> ignore blank `conversion_action_name` rows.

## 8. Known data gaps (document, don't build)
Two checks an external auditor would run are **not exposed by `query_data`** today. Name them as gaps
(so the audit stays honest); don't pretend to cover them:
- **Attribution model** (last-click vs data-driven) — not a readable field. Flag "confirm the model is
  data-driven" as a manual check.
- **Enhanced conversions / consent mode** — setup state isn't in the metrics API. Manual check.

## 9. Dogfood (Acme Insurance, last 30d — validated, real)
```
Config (A): 30 actions, ~24 REMOVED. Enabled+primary are mostly PAGE_VIEW / UA goals.
            NO UPLOAD type, NO CRM source → R1: no offline import 🔴
            Many type=UNIVERSAL_ANALYTICS_GOAL → R4: migrate 🟠
Firing (B): TLI App Start SSR        DEFAULT  346 conv  val $179,061
            H&D Application Start     SUBMIT_LEAD_FORM  134 conv  val $0   → R3: 🔴 no value
            TLI Payment Received SSR  DEFAULT(name→L3)  55 conv   val $88,800  (down-funnel exists)
            HD Payment Received SSR   DEFAULT(name→L3)  13 conv   val $11,700
            TL Application Start      DEFAULT  1 conv    val $0
Verdict: 🔴 no offline import · 🟡 deep events exist but check they're the primary · 🔴 H&D App Start has no value · 🟠 UA goals to migrate
```
