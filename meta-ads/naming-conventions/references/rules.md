# Naming rules (the hard constraints)

These exist for **data management**: names become UTM values and must split cleanly back
into levers. Every rule below protects that.

## 1. Casing — all lowercase
- Lowercase everything, **including acronyms**: `tofu`, `us`, `lal`, not `TOFU`, `US`, `LAL`.
- No camelCase, no PascalCase.
- **Why:** UTMs and GA4 are case-sensitive. `Facebook`, `facebook`, and `FaceBook` become
  three different rows in your reports, silently fragmenting the data. (This overturns the
  ClickMinded sheet's "uppercase for acronyms" rule — on purpose.)

## 2. Delimiters — two levels
- **`_` (underscore) separates fields** — the levers, the "columns" of the name.
- **`-` (hyphen) separates words inside one field value.**
- **Hard rule:** an `_` never appears inside a value; a `-` never separates fields.
- **Why:** this is the single rule that lets any name split into clean columns with
  `SPLIT(name, "_")` in Sheets/Looker or `REGEXP_EXTRACT` in GA4. Keep the underscore
  sacred as the field boundary and nothing else.

Example — `lal_purchasers-1pct_us_en_feed` splits on `_` into
`[lal] [purchasers-1pct] [us] [en] [feed]`; the audience detail keeps its internal words
with `-`.

## 3. Allowed characters
- Allowed: `a–z`, `0–9`, `-`, `_`. Nothing else.
- **Forbidden:** space, `%`, `&`, `=`, `?`, `#`, `+`, `.`, `/`, `@`, and accents/ñ.
- Transliterate accents: `ñ→n`, `á→a`, `ç→c`.
- Spell out symbols: `1%` → `1pct`, `3×` → `3x`, `$250` → `250usd`, `#1` → `no1`.
- **Why:** any character Meta URL-encodes (`%20`, `%26`…) corrupts the UTM value. The
  charset rule is what makes names safe to drop straight into `url_tags`.

## 4. Dates
- Format `yymmdd` (e.g. `250716` = 2025-07-16).
- Sorts chronologically as text and stays compact. Used at the **ad** level (creation date
  of the creative).

## 5. Field order and optional levers
- Field order per level is **fixed** (see the patterns) — positional splitting depends on it.
- An **optional trailing** lever may simply be omitted (e.g. drop `_market` if unused).
- An omitted **middle** lever becomes the placeholder **`na`** so column positions never
  shift. Example: audience with no language → `lal_purchasers-1pct_us_na_feed`.

## 6. Vocabulary discipline
- Use the **controlled vocabulary** from the account's spec + `default-taxonomy.md`. Do not
  invent ad-hoc abbreviations — `vid`, `video`, and `vd` for the same thing break every
  rollup. One value = one code, always.
- Keep each field short; abbreviate multi-word values with hyphens (`cart-abandoners-30d`).

## 7. Length
- No hard Meta API limit, but keep names readable in the UI — aim **< ~100 characters**.
  If a name is getting long, you are probably repeating a lever that belongs at another
  level (see `lever-map.md`).

## Validation

A single **field token** is: lowercase words joined by hyphens →
`[a-z0-9]+(-[a-z0-9]+)*`.

With all default levers active:

| Level | Fields (in order) | Regex (default levers on) |
|---|---|---|
| Campaign | `brand_funnel_objective_offer[_market]` | `^[a-z0-9-]+(_[a-z0-9-]+){3,4}$` |
| Ad set | `audience-type_audience-detail_geo_lang[_placement]` | `^[a-z0-9-]+(_[a-z0-9-]+){3,4}$` |
| Ad | `yymmdd_angle_format_hook_variation` | `^[0-9]{6}(_[a-z0-9-]+){4}$` |

To **validate a name**: check (a) it matches the charset (`^[a-z0-9_-]+$`), (b) no
uppercase, (c) the field count fits the active levers, (d) every field value exists in the
account's vocabulary. To **repair**: lowercase everything, replace spaces/reserved chars
per §3, and re-split.
