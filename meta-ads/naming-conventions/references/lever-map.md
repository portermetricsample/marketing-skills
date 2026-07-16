# Lever → level map

Each lever (SUMAS *palanca*) has **one home level**. Read `campaign > ad set > ad`
together and you have the ad's full identity — no lever is repeated.

| Lever (SUMAS palanca) | Home level | Name field | Flows into UTM |
|---|---|---|---|
| Brand / account | Campaign (prefix) | `brand` | `utm_campaign` |
| Funnel stage (tofu/mofu/bofu) | Campaign | `funnel` | `utm_campaign` |
| Objective (awareness/traffic/leads/sales…) | Campaign | `objective` | `utm_campaign` |
| Product / Offer | Campaign | `offer` | `utm_campaign` |
| Market (optional) | Campaign | `market` | `utm_campaign` |
| Audience type (broad/interest/lookalike/retargeting) | Ad set | `audience-type` | `utm_term` |
| Audience detail (the specific saved audience) | Ad set | `audience-detail` | `utm_term` |
| Geo / Location | Ad set | `geo` | `utm_term` |
| Language | Ad set | `lang` | `utm_term` |
| Placement (optional) | Ad set | `placement` | `placement` param |
| **Angle** (pain/proof/offer/fomo…) | **Ad** | `angle` | `utm_content` |
| Format / Asset (img/vid/car/ugc) | Ad | `format` | `utm_content` |
| Copy / Hook | Ad | `hook` | `utm_content` |
| Variation (v1/v2/a/b) | Ad | `variation` | `utm_content` |
| Date (yymmdd) | Ad | `yymmdd` | — |

## Why this split
- **Campaign** = the *strategic* decisions Meta freezes/optimizes here: objective, funnel,
  budget model, and the offer being promoted.
- **Ad set** = the *targeting* decisions configured here: who (audience), where (geo),
  which language, which placement.
- **Ad** = the *creative* decisions: which **angle**, format, hook, and variation. Angle is
  promoted to its own coded field on purpose — it is the lever the classic ClickMinded
  sheet loses (it buries angle in a free-text "copy description"), so you can never report
  "which angle won" across the account. Here you can: it lives in `utm_content`.

## Configurable home levels
The defaults above are opinionated but not rigid. In a `naming-spec.yml` a lever can be
turned off, or its home level moved, when an account's structure demands it. The most
common override:

- **Geo → Campaign** when the account runs **one campaign per market** (geo is then a
  campaign attribute and drops out of the ad set). Pick one home for geo and stick to it —
  never both, or your names drift.

## Anti-pattern
Repeating a lever at every level (e.g. putting the audience in the campaign name *and* the
ad set name). It makes names long, and — worse — someone edits one and forgets the other,
so the UTMs start lying. One lever, one home.
