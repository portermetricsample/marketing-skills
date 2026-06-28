# Framework: Offline Conversion Tracking Audit

## 1. Business question
> Is **offline/CRM conversion import** set up, are the **counted (primary) conversions
> down-funnel**, and do they **carry values**?

## 2. The signals (two queries, joined by `conversion_action_name`)
**A · config** — `conversion_action_name`, `_category`, `_type`, `_conversion_source`,
`_primary_for_goal`, `_status`.
**B · metrics** — `conversion_action_name`, `conversions`, `conversions_value`.
(Config and metrics **don't combine** — "cannot be combined" — so two pulls, join by name.)

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

## 4. The 4 objective rules (the recommendation)
Run over the **ENABLED** actions (drop REMOVED/HIDDEN), joined A+B:
- **R1 — offline import missing** → if NO enabled action has `type ∈ {UPLOAD_CLICKS, UPLOAD_CONVERSIONS, STORE_SALES_*}`
  or `conversion_source` containing "Upload"/a CRM → 🔴 "no offline/CRM import; import down-funnel
  CRM events for revenue optimization." (Acme §2 core.)
- **R2 — primary is shallow** → among `primary_for_goal == True` actions, find the deepest by the
  ladder. If it's **L1** → 🔴 "your counted conversion is a shallow event; promote a deeper (L2/L3)
  action to primary." If L2 while an L3 exists unused → 🟡 "a deeper event exists — consider it."
- **R3 — value missing** → any `primary_for_goal == True` action with `conversions > 0` and
  `value == 0` → 🔴 "primary '{name}' fires {N} conv with **no value** — add a conversion value."
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

## 7. Dogfood (Acme Insurance, last 30d — validated, real)
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
