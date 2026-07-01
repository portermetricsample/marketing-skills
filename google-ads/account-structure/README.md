# Google Ads — Account Structure (skill cluster)

Skills that work on the account's **defined structure** (campaigns / ad groups /
keywords), **not** on the search terms report. Different from the `search-terms/` cluster:
here the raw material is how the advertiser **organized** the account, not what people searched.

## The cluster's skills

| Skill | Does | Status |
|-------|------|--------|
| [structure-audit/](structure-audit/) | **Validates** keyword↔adgroup↔campaign alignment and hygiene against the account's own convention | ✅ ready |
| [structure-map/](structure-map/) | **Decodes** the naming convention from dimensions → segmentation parameters (with MCP research) | ✅ ready |
| [naming-convention/](naming-convention/) | **Generates** the target naming convention (campaign + ad-group grammar, controlled vocabulary, coherence rules) — LLM-inferred from the account's dominant scheme, emitted as data | ✅ ready |

## How they compose
- **`structure-map`** decodes the names → dimensions (what exists, to segment by).
- **`structure-audit`** validates that this structure is consistent (what's wrong).
- **`naming-convention`** generates the convention for what's new (what it should be) —
  LLM-inferred each run, no regex parser.
Decode what exists → audit whether it's right → define what it should be. They share the
name-parsing layer.

## Common principle (key)
**There is no universal "correct" structure** (some segment by match type, others by
audience, brand or product). The skills **infer the account's own convention**
from the names and check/generate against THAT, not against a fixed ideal.

## Boundary with search-terms/
- `search-terms/` = what people searched and what triggered (search terms report).
- `account-structure/` = how the account is built (defined keywords/ad groups/campaigns).
- Occasional overlap: the "keyword redundancy" of `structure-audit` (same keyword
  defined across several ad groups) is a relative of `term-routing` in search-terms (same
  search term served by several keywords) — but the **unit is different** (defined keyword
  vs search term).
