# Default taxonomy (Porter defaults)

Generic, account-agnostic vocabulary to start from. An account **overrides/extends** these
in its `naming-spec.yml`. One value = one code, always (see `rules.md` §6).

## Funnel stage (campaign)
| Code | Meaning |
|---|---|
| `tofu` | Top of funnel — cold, awareness |
| `mofu` | Middle of funnel — consideration |
| `bofu` | Bottom of funnel — conversion / retargeting |

## Objective (campaign)
Meta's 6 outcomes (ODAX). Use the full lowercase word — only 6 values, so no code needed.
| Code | Meta outcome |
|---|---|
| `awareness` | Awareness |
| `traffic` | Traffic |
| `engagement` | Engagement |
| `leads` | Leads |
| `app` | App promotion |
| `sales` | Sales |

## Audience type (ad set)
| Code | Meaning |
|---|---|
| `broad` | No detailed targeting / Advantage+ broad |
| `int` | Interest / behavior targeting |
| `lal` | Lookalike (add %: `lal` + detail `purchasers-1pct`) |
| `rt` | Retargeting / warm custom audience |
| `ca` | Custom audience from a list (CRM upload) |

**Audience detail** = the specific saved audience, coded and hyphenated, e.g.
`purchasers-1pct`, `cart-abandoners-30d`, `ig-engagers-365d`, `email-list-active`.

## Format / asset type (ad)
| Code | Meaning |
|---|---|
| `img` | Single static image |
| `vid` | Single video |
| `car` | Carousel |
| `ugc` | User-generated / testimonial video |
| `col` | Collection |
| `dco` | Dynamic creative (DCA / multi-asset) |

## Angle library (ad) — the SUMAS creative lever
The starter set. **Extend per brand** in the spec — this is the highest-value lever to keep
clean, because it's what you group creative performance by.
| Code | The message angle |
|---|---|
| `pain` | Names the problem / pain point |
| `proof` | Social proof, testimonial, reviews |
| `offer` | Discount / promo / deal-led |
| `fomo` | Urgency / scarcity |
| `feature` | Product feature / how it works |
| `founder` | Founder story / brand story |
| `compare` | Vs competitor / vs the old way |
| `authority` | Expert, data, or stat-led |
| `aspiration` | Dream outcome / lifestyle |
| `objection` | Handles a specific objection |
| `educational` | Teach / tips / how-to |

## Geo (ad set)
Lowercase ISO country codes: `us`, `ca`, `mx`, `gb`, `co`, `br`… or regions: `latam`, `na`,
`eu`, `apac`. Pick one system per account and stick to it.

## Language (ad set)
Lowercase ISO 639-1: `en`, `es`, `pt`, `fr`, `de`…

## Placement (ad set, optional)
| Code | Meaning |
|---|---|
| `auto` | Advantage+ placements (automatic) — most common |
| `feed` | Feeds |
| `stories` | Stories |
| `reels` | Reels |
| `search` | Search results |
| `explore` | Explore |

## Abbreviations glossary (carried from the ClickMinded sheet, lowercased)
| Code | Meaning |
|---|---|
| `rm` / `rt` | Remarketing / retargeting |
| `lal` | Lookalike |
| `int` | Interest |
| `ca` | Custom audience |
| `wc` | Website conversions |
| `atc` | Add to cart |
| `lpv` | Landing page views |
| `ppe` | Page post engagement |
| `ctw` | Clicks to website |
| `img` / `vid` / `car` / `ugc` | Image / video / carousel / UGC |
| `tofu` / `mofu` / `bofu` | Funnel stages |
| `na` | Not applicable (middle-lever placeholder) |
