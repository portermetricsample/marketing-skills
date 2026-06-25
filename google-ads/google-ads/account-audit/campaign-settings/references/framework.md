# Framework: Campaign Settings Audit (Location + Networks)

## 1. Business question
> Per campaign: is location set to **Presence** (not "Presence or Interest"), and are **Search
> Partners** and **Display** **off** on Search campaigns? Flag the ones set against best practice.

## 2. The signals (direct fields — validated live)
| # | Signal | Field | Values |
|---|--------|-------|--------|
| §6 | Location targeting type | `google_ads_campaign_geo_target_type_setting_positive_geo_target_type` | `PRESENCE` / `PRESENCE_OR_INTEREST` |
| §7 | Search Partners on? | `google_ads_campaign_network_settings_target_partner_search_network` | `True` / `False` |
| §7 | Display on? | `google_ads_campaign_network_settings_target_content_network` | `True` / `False` |
| — | Campaign type | `google_ads_campaign_advertising_channel_type` | SEARCH / DEMAND_GEN / … |
| — | Spend | `google_ads_cost_micros` | rank by dollars |

(Values come back as **strings** — `"PRESENCE"`, `"True"`, `"False"` — compare as strings.)

## 3. The decision logic (per campaign)
- **§6 Location** (all campaign types) → 🔴 flag if `positive_geo_target_type == "PRESENCE_OR_INTEREST"`.
  (Best practice = Presence; "or Interest" shows ads to people merely *interested* in the area → wasted spend.)
- **§7 Search Partners** (**SEARCH campaigns only**) → 🔴 flag if `channel == "SEARCH"` **and**
  `target_partner_search_network == "True"`.
- **§7 Display** (**SEARCH campaigns only**) → 🔴 flag if `channel == "SEARCH"` **and**
  `target_content_network == "True"` (Display on a Search campaign mixes a lower-intent network into Search spend).
- A campaign is **✅ correct** only if its applicable checks pass.

> ⚠️ **Scope the §7 flags to `channel == "SEARCH"`.** On Display / PMax / Demand-Gen campaigns the
> network toggles are expected/irrelevant — flagging them there is a false positive. §6 (location)
> is the only one that applies to every campaign type.

## 3b. When it applies / when it does NOT
- **Applies to:** any account with Search campaigns (§7) and any campaign with geo targeting (§6).
- **Does NOT apply / skip the flag:**
  - §7 on non-Search campaigns (Display/PMax/Demand-Gen) — the toggles don't mean the same thing.
  - §6 when the campaign targets a single small radius / nothing geo-restrictive — "presence or
    interest" still flags, but the dollar leak may be ~0; lead with the spend, not the toggle alone.
  - Accounts already clean (Acme Insurance dogfood) — report "0 flags", which is a valid result, not a gap.

## 4. The §6 impact (optional 2nd query — quantify the leak)
The flag says "could leak"; to size it, pull **spend by country/region** and compare to the
target market:
```
fields: [campaign_name, geo_target_country (or geo_target_region/state), cost_micros]
```
Spend in countries/regions **outside the advertiser's target market** = the wasted-spend number
(Acme's "15-25%"). **The target market must be supplied** (from the account profile or the
user) — the skill can't know "Canada is the target" on its own. Without it, report the geo spread
and let the human mark what's out-of-market.

## 5. Output contract — what each campaign emits (content only)
> **Executable + plain ([cluster rule](../../README.md)).** Name the **exact campaign** with the wrong
> toggle and the **exact change**, for a non-technical owner as **Where · What to do (plain + the
> exact setting in parens) · Why** — no bare jargon. e.g. *"In `Campaign X`, set location to only
> people IN your area, not people interested in it (Location options → Presence), so you stop paying
> for clicks outside your market."*
> Layout/visuals = `porter-reporting` + design system, NOT here.
1. **Identity** — campaign · channel type · spend (30d).
2. **Settings read** — location type · Search Partners (on/off) · Display (on/off).
3. **Verdict** — ✅ all correct / 🔴 flagged (name the wrong toggle(s)).
4. **$ at stake** — campaign spend (money exposed); for §6, the out-of-market spend when the 2nd query ran.
5. **Recommendation** — one plain action per flag ("set location to Presence" / "turn off Search Partners" / "turn off Display").

**Roll-up:** count flagged per toggle · total spend on flagged campaigns · the fix list ranked by spend.

## 6. Gotchas (validated)
- **String values.** Compare `"True"` / `"PRESENCE_OR_INTEREST"` as strings, not booleans.
- **Scope Display flag to SEARCH.** `target_content_network = True` is normal on Display/PMax
  campaigns — only flag it on `channel = SEARCH`.
- **§6 impact needs the target market** (account profile / user). The setting flag is self-contained;
  the dollar leak is not.
- **`cost_micros > 0` auto-filter** hides 0-spend campaigns (fine — we rank by spend). Cost is in
  account currency despite the name.
- **Dogfood (Acme Insurance):** all campaigns came back `PRESENCE` · Partners `False` · Display `False`
  → the account is clean on 6 & 7 (every campaign ✅). The check correctly reports zero flags — a
  pass is a valid, useful result.
