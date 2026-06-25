# Google Ads — Search Terms (skill cluster)

Atomic and **composable** skills that work on the **search terms report** of a **paid**
Google Ads account (via Porter MCP). They all start from the same data (what people
searched and triggered your ads), but with different objectives.

## The cluster's skills

### Defensive — clean up (keyword/negative hygiene)
| Skill | Judges | Input | Status |
|-------|-------|--------|--------|
| [relevance/](relevance/) | **Relevance** term↔keyword: did that keyword deserve to trigger that term? | keyword + search term | ✅ ready |
| [term-routing/](term-routing/) | **Cannibalization / routing**: a term matched by 2+ different keywords → consolidate under the most-relevant one, negative the rest (same-campaign / cross-campaign / cross-product) | + campaign + ad group | ✅ ready |
| performance/ | **Performance**: prioritize by spend, decide destinations, Winning/Waste | + metrics + ad group/campaign | ⬜ pending |

### Offensive — grow (discover opportunity)
| Skill | Discovers | Input | Status |
|-------|----------|--------|--------|
| [intent-discovery/](intent-discovery/) | **Intents/angles** with real demand that are NOT served → content/landing/ad ideas | search term + impressions/clicks | ✅ ready |

## How they compose (the contract)
1. **`relevance`** (defensive) runs first: a verdict per term↔keyword pair
   (Justified/Loose/Leak/Misplaced/Brand/Competitor/Review). No metrics.
2. **`performance`** (defensive) takes that output + metrics + structure → prioritizes by
   spend, decides destinations, does Winning/Waste.
3. **`intent-discovery`** (offensive) looks at the same terms but searches for **unserved
   demand** → content roadmap and angles. It reuses the terms that `relevance`
   marked **Loose/informational** (relevant but not a fit for a provider
   landing): that is the raw material for new ideas.

Defensive says *what's wrong and what to cut*; offensive says *what's missing to create*.

## Boundary with SEO (important)
These are **Google Ads** skills (paid data, deterministic query). They are **NOT** the
SEO skills (which use DataForSEO/keyword research over organic demand). `intent-discovery`
**complements** SEO: it hands it intent with **demonstrated paid demand** as input
for the organic strategy — but it lives here, not in SEO. Its limit: it only sees what has
already triggered in the account; demand that never triggered an ad is covered by the SEO skills.

## Why separate
- **Focus/precision:** each skill with a small context and a single question.
- **Discipline:** "irrelevant ≠ poor performance ≠ opportunity". Relevance judges the
  matching; performance judges the money; intent-discovery searches for new demand.
  Mixing them leads to crooked decisions.
