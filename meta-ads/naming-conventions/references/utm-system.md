# UTM / URL tracking system

The naming convention and the UTMs are **one system**. Because the names are lowercase and
URL-safe, they drop straight into the UTMs — and Meta's dynamic params let the UTMs
**auto-fill from the names**, so you maintain the convention in one place, not two.

## Where the UTMs go in Meta
- The **destination** goes in the ad's `link` (or `cta_link`).
- The **UTMs go in `url_tags`** — a query string **without** the leading `?`. Meta keeps it
  separate from `link` and appends it on click. **Never** bake UTMs into `link`.
  (This matches `meta-ads/PARAMETERS-REFERENCE.md` §7.)

## Meta dynamic params (the auto-fill)
Meta substitutes these at delivery time:

| Param | Resolves to |
|---|---|
| `{{campaign.name}}` | the campaign name |
| `{{adset.name}}` | the ad set name |
| `{{ad.name}}` | the ad name |
| `{{placement}}` | the placement (e.g. `Instagram_Stories`) |
| `{{site_source_name}}` | the platform: `fb`, `ig`, `an`, `msg` |
| `{{campaign.id}}` / `{{adset.id}}` / `{{ad.id}}` | the numeric ids |

## Recommended `url_tags` template
Set this **once** and reuse it on every ad (paste it into each ad's URL parameters, or as
the account/template default):

```
utm_source={{site_source_name}}&utm_medium=paid-social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&placement={{placement}}
```

### Lever → UTM param
| UTM param | Value | Carries |
|---|---|---|
| `utm_source` | `{{site_source_name}}` | which platform (fb / ig / an / msg) |
| `utm_medium` | `paid-social` | channel type (static) |
| `utm_campaign` | `{{campaign.name}}` | brand · funnel · objective · offer · market |
| `utm_term` | `{{adset.name}}` | audience · geo · language · placement |
| `utm_content` | `{{ad.name}}` | date · **angle** · format · hook · variation |
| `placement` | `{{placement}}` | exact placement (custom param) |

## Choices to be aware of
- **`utm_source={{site_source_name}}` vs static `facebook`.** The dynamic version splits
  Facebook vs Instagram vs Audience Network vs Messenger — real platform attribution.
  Trade-off: `utm_source` is then not a single constant. Recommended: keep the dynamic
  version; you almost always want fb/ig separated. Use static `facebook` only if your
  reporting depends on one fixed source value.
- **`utm_medium=paid-social`** uses a hyphen (not `paid_social`) to keep the underscore
  reserved as the field separator everywhere. GA4's default "Paid Social" channel grouping
  matches `paid.*`, so `paid-social` is recognized correctly.
- **`utm_id={{campaign.id}}`** — add it if you use GA4's manual campaign import / want an
  id-stable join key alongside the human-readable `utm_campaign`.

## GA4 / Looker payoff
Because every name is lowercase, URL-safe, and underscore-delimited:
- `utm_campaign`, `utm_term`, `utm_content` arrive clean (no case fragmentation).
- You can split each back into its levers with a calculated field (`SPLIT` on `_`) and then
  group by **angle**, **audience**, **funnel**, etc. across the whole account — the reason
  the convention exists.

## URL hygiene
- Never put personal data (email, phone, name) in a URL/UTM.
- Keep the landing URL itself clean; let `url_tags` carry the tracking.
- If a name ever contains a character from the forbidden set (`rules.md` §3), the UTM
  breaks — that is exactly what the charset rule prevents.
