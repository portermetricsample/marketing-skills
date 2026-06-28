# Framework: Structure Audit

## Mission
Validate that the account is **internally consistent with its own convention**:
keywords ↔ ad groups ↔ campaigns aligned, match type coherent with the name, consistent
naming and no redundancy. It does **not** validate against a universal ideal.

## The backbone: infer → check (2 phases)
Because there's no single "correct" structure (match type / audience / brand / product / funnel):

**Phase 1 — Infer the convention** from the names and state it (the user confirms):
- Do the **campaigns** separate by product, audience, geo, brand, funnel? (read suffixes:
  `(TL)/(HD)/(HA)`, `Embedded_45-54`, `GI_65+`, `Brand`, `MOFU/BOFU`).
- Do the **ad groups** encode theme + match type? (`Life Insurance - Broad`,
  `... - Phrase & Exact`).
- Result: a "this is how your account is organized" summary + which checks apply.

**Phase 2 — Check consistency** against that convention. Only the applicable checks
run (e.g. the match-type one only if the account encodes it in the name).

## The 4 checks

### 1. Theme alignment (keyword ↔ ad group ↔ campaign)
Does the keyword's theme match the ad group's, and the ad group's match the campaign's?
Semantic AI judgment against the inferred theme of each level.
- **Error:** keyword of one product in another's ad group/campaign (health keyword in the
  dental campaign). Fix: move to the correct ad group.

### 2. Name ↔ REAL config coherence (deterministic)
The name "promises" criteria; check that the real config delivers it:
- **Campaign type:** name says PMax/Shopping/Brand → vs `campaign_advertising_channel_type`.
- **Ad group match type:** name says "- Broad" → vs the real `keyword_info_match_type`.
- **Bidding:** name says "ROAS"/"tCPA"/"MaxConv" → vs the real `campaign_bidding_strategy_type`
  (MAXIMIZE_CONVERSION_VALUE / TARGET_CPA / TARGET_IMPRESSION_SHARE / ...).
- **Audience:** name says an audience/age → vs the real audience (2nd query, see below).

#### What can be verified against reality (feasibility — VALIDATED in MCP)
| Criterion in the name | Real dimension | How |
|-----------------------|----------------|------|
| Campaign type | ✅ `campaign_advertising_channel_type` | 1 query (combines) |
| Match type | ✅ `keyword_info_match_type` | 1 query (combines) |
| **Bidding strategy** | ✅ `campaign_bidding_strategy_type` | 1 query (combines) |
| **Audience** | ✅ exists, but does NOT combine with keyword_view | **2nd query** (`ad_group_audience_view`: campaign+ad group+criterion) + join by id |
| Funnel (MOFU/BOFU) | ❌ no dimension | naming only |

> The non-combination of audience with keyword_view is a **GOOGLE** limit (GAQL: separate
> resources that don't join in one query), not Porter's — confirmed in the API docs.
> That's why audience is checked with a 2nd query, not as "naming only". Only the funnel
> is pure naming (check 3).

### 3. Consistent naming (campaigns AND ad groups)
Do NOT assume a single dominant pattern. **Group the names into schemes** (clusters by
token structure) and report:
- **How many schemes coexist** (e.g. `Acme_<Prod>_SEM_(XX)` and `SG_<X>_<Funnel>_SEM_(XX)`
  are TWO valid schemes; 3+ schemes = manageability note, not necessarily an error).
- **Non-conformers within each scheme** (a name that fits none).
- **Ad group level too** (the dogfood showed the worst mess was there): flag
  **generic/default names** (`Ad group 1`, `Ad group N`) and ambiguous non-thematic names
  (`Best`, `Buy up`, `Group`) when the rest of the account uses thematic naming.
- Fix: rename to the scheme; consolidate default ad groups.

### 4. Keyword redundancy (report CONCENTRATED, not per pair)
Group by (keyword text, match type); those defined across **2+ ad groups/campaigns** are
candidates. **Report by hotspot, not the raw count** (the pair count inflates):
- **Within a campaign** (its ad groups step on each other) vs **cross-campaign** — distinguish.
- Report as "**campaign X: N keywords duplicated across M ad groups**", not "1,097 problems".
- **Separate intentional from accidental** with the general rule below.
- Boundary: **defined keyword** level; `term-routing` (search-terms) is **served search
  term** level. Different.

### Intentional vs accidental — GENERAL rule (don't hardcode one account's tokens)
A redundancy is **intentional** if the campaigns/ad groups sharing the keyword have
**the same base name and differ only in a segmentation suffix** (audience, age, geo,
test, landing-split, bidding-test). Detect that by *pattern* (common base + variable token),
NOT by a fixed word list — that way it works for any account. If they share a keyword without
a variant that justifies it → **accidental**.

### Severity (rank, don't dump everything)
Each finding carries severity by **impact**, and the output is ordered by it:
- **High:** breaks the structure at scale (e.g. "Broad" ad group with >30% non-broad keywords;
  campaign with default ad groups + mass-duplicated keywords).
- **Medium:** clear but bounded inconsistency (2nd naming scheme; split that duplicates a campaign).
- **Low:** isolated case (one keyword slipped into N ad groups).

## Output
1. **Inferred convention** (Phase 1) — to confirm the skill understood the structure.
2. **Inconsistencies** by check: what · where (campaign/ad group/keyword) · which convention
   it violates · suggested fix (move / change match / rename / consolidate).

## Data (feasibility — validated end-to-end)
They combine in 1 query: `keyword_info_text + keyword_info_match_type + campaign_name +
campaign_advertising_channel_type + campaign_bidding_strategy_type + ad_group_name`
(campaign type, match type and **bidding** are verifiable name-vs-reality). The
**audience** is fetched in a 2nd query (`ad_group_audience_view`); only the **funnel** is
pure naming. See `datos.md`.

**Pagination (mandatory for 100% coverage):** a single query hits the `limit`
(~5000 rows). For large accounts, paginate — the simplest and most deterministic is **one
query per campaign** (loop over the campaigns `list`) and merge; that way no campaign gets
cut off. Without paginating, the audit covers only the top by impressions (enough for the big
red flags, not for the tail).

> Real dogfood (Acme Insurance, Jun 2026): 20 campaigns / 139 ad groups / 3,080 keywords. The skill
> detected real red flags (ad group "Broad" 52% phrase; campaign `Acme_Dental_MOFU` with ad
> groups default + mass duplication; 2-3 naming schemes) and correctly discarded the age
> tests as intentional. It served to calibrate checks 3 and 4.
