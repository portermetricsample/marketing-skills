# Google Ads — Search Terms (skill cluster)

Atomic and **composable** skills that work on the **search terms report** of a **paid**
Google Ads account (via Porter MCP). They all start from the same data (what people
searched and triggered your ads), but with different objectives.

## The cluster's skills

### Defensive — clean up (keyword/negative hygiene)
| Skill | Judges | Input | Status |
|-------|-------|--------|--------|
| [n-grams/](n-grams/) | **N-gram mining** (Brainlabs method): aggregate 1/2/3-grams across all terms → list-level **negatives** (waste) + **themes to expand** (winning), with blast-radius guards | search term + metrics | ✅ ready |
| [performance/](performance/) | **Performance**: prioritize by spend, decide destinations, Winning/Watch/Waste | metrics + campaign | ✅ ready |

### Classifier — label every term (what is it?)
| Skill | Judges | Input | Status |
|-------|-------|--------|--------|
| [classifier/](classifier/) | **Full multi-label card per term** — brand class + intent + cannibalization + per-keyword relevance, rolled up to a recommended disposition. Composes the sub-skills below. | the superset query | ✅ ready |
| [classifier/branded/](classifier/branded/) | **Brand class** — own brand / competitor / generic + contain_brand leak detection | term + campaign | ✅ ready |
| [classifier/relevance/](classifier/relevance/) | **Relevance** term↔keyword: did that keyword deserve to trigger that term? | keyword + search term | ✅ ready |
| [classifier/duplicates/](classifier/duplicates/) | **Cannibalization**: a term matched by 2+ different keywords → consolidate under the most-relevant one, negative the rest | + campaign + ad group | ✅ ready |
| [classifier/opportunity/](classifier/opportunity/) | **Intents/angles** with real demand that are NOT served → content/landing/ad ideas | search term + impressions/clicks | ✅ ready |

> **Looking for "cannibalization"?** That is [`classifier/duplicates/`](classifier/duplicates/) — it detects terms matched by 2+ keywords and routes each to its most-relevant owner.

### Synthesis — the dashboard output
| Skill | Produces | Input | Status |
|-------|----------|--------|--------|
| [insights/](insights/) | **The dollar insights card** — joins `classifier` tags + `performance` money (+ optional `classifier/opportunity`) into one recommended-action row per criterion, in **dollars**, led by a total (measured vs estimated split). | classifier + performance JSON | ✅ ready |

### Orchestrator
| Skill | Does | Status |
|-------|------|--------|
| [run/](run/) | Full audit end-to-end: discover → pull → classify → score → insights → publish as a Porter dashboard | ✅ ready |

## How they compose (the contract)
1. **`classifier/relevance`** runs first: a verdict per term↔keyword pair.
2. **`classifier/duplicates`** finds terms matched by 2+ keywords → routes to the owner.
3. **`classifier/branded`** classifies every term as brand / competitor / generic; flags contain_brand leaks.
4. **`classifier/opportunity`** looks at the same terms but searches for **unserved demand** → content and ad ideas.
5. **`classifier`** (the parent) is the *merged view*: every label at once, one card per term, one recommended disposition.
6. **`performance`** takes the classified terms + metrics → Winning/Watch/Waste.
7. **`insights`** joins classifier tags + performance money → the dollar roll-up card.
8. **`run`** orchestrates the whole chain and publishes the dashboard.

Defensive says *what's wrong and what to cut*; offensive says *what's missing to create*.

## Boundary with SEO (important)
These are **Google Ads** skills (paid data, deterministic query). They are **NOT** the
SEO skills (which use DataForSEO/keyword research over organic demand). `classifier/opportunity`
**complements** SEO: it hands it intent with **demonstrated paid demand** as input
for the organic strategy — but it lives here, not in SEO. Its limit: it only sees what has
already triggered in the account; demand that never triggered an ad is covered by the SEO skills.

## Why separate
- **Focus/precision:** each skill with a small context and a single question.
- **Discipline:** "irrelevant ≠ poor performance ≠ opportunity". Relevance judges the
  matching; performance judges the money; opportunity searches for new demand.
  Mixing them leads to crooked decisions.
