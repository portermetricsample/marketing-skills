# Audience Segmentation (movement attribution)

> Explain **who drove a metric's up/down** — and which audiences convert efficiently — by
> attributing the change to audience segments.

- **Who is it for?** The marketer / analyst running the account.
- **When is it used?** When a metric moved and you need to know *which audience* caused it, or to
  find the segments worth more / less bid.
- **What decision does it help make?** Demographic / geo / device bid adjustments, budget
  reallocation, and creative targeting.

Third member of the [`segmentation/`](../) family — same contribution-to-change engine as
[`time/`](../time/) and [`campaign/`](../campaign/). **Audience is an umbrella**: it holds three
sub-segments, because each has its own availability, chart and decision.

## Sub-segments

| Sub-segment | Cut | Folder | Status |
|---|---|---|---|
| **Demographics** | age + gender | [`demographics/`](demographics/) | built |
| **Geography** | country › region › metro › city | [`geography/`](geography/) | built |
| **Devices** | device | [`devices/`](devices/) | built |

## What makes audience different from time / campaign

Time and campaign are universal and fully covered. **Audience is patchy and partial** — so every
sub-segment opens with two checks before any analysis:

1. **Availability** — `list_fields(data_source_name="google-ads", search="<criterion>")`. If the
   dimension isn't exposed, the analysis doesn't apply. Say so.
2. **Coverage** — compare the dimension's total spend to the account total; state the coverage %,
   and keep any `UNDETERMINED` bucket visible. Never read a partial split as the account.

## What Google Ads exposes (validated Jun 2026)

| Criterion | Exposed? | Dimension(s) |
|---|---|---|
| Age | ✅ partial coverage (~13% of spend on Acme Golf) | `google_ads_age` |
| Gender | ✅ partial coverage | `google_ads_gender` |
| Geography | ✅ full hierarchy, ~full coverage | `geo_target_country / region / metro / city / most_specific_location`, `location_type` |
| Device | ✅ full coverage | `google_ads_device` |
| Parental status | ❌ not exposed | — (0 fields) |
| Household income | ❌ not exposed | — (0 fields) |
| Interests / affinity / in-market | ❌ not exposed | only `audience_name` (the applied list — config, not a breakdown) |
| Language (as a user cut) | ❌ not exposed | only config (DSA / product / asset language) |

> **Not audience:** placement / topic (`detail_placement_view_*`) = *where the ad showed*
> (website / app / YouTube). That's content/context — a different segmentation member, not here.

This inventory is Google-Ads-specific. Other connectors expose different audience surfaces (Meta:
detailed interests; LinkedIn: job title / industry) — validate per connector before building there.

## Files per sub-segment
- `framework.md` — the method (the important part).
- `datos.md` — what Porter MCP data is needed.
