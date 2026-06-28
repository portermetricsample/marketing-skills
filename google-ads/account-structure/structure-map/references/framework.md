# Framework: Structure Map

## Mission
Decode the account's naming convention into a **taxonomy of dimensions** and
expose them as **segmentation parameters**. Output = the navigable map, not a judgment.

## Boundary with the rest of the cluster
- `structure-audit` = is the structure consistent? (validate, find errors).
- **`structure-map` (this one)** = what are the dimensions? (extract, map for segmenting).
- `naming-convention` (future) = generate the convention for new campaigns.
They share the **name-parsing** layer. The "Phase 1: infer convention" of `structure-audit`
is a lite version of this skill's core.

## The method: infer the grammar (NOT a fixed grammar)
Every account names things differently. The skill **infers the token pattern** from the real
names (separators `_`, `-`, `|`, `()`, `[]`), detects which position/token encodes which dimension,
and builds the grammar of THAT account. Don't assume a format.

## The dimensions (what gets extracted)
Target catalog; filled in with what the account actually encodes:
| Dimension | Where it comes from | Cross-check with real data |
|-----------|---------------|----------------------|
| Business / program | prefix (`Acme_` vs `SG_`) | — |
| Product line | product word (`Life`, `Dental`, `Health`, `Auto`) | — |
| Product code / group | parentheses (`(TL)`, `(HD)`, `(HA)`, `(BR)`) | business research |
| Campaign type | token (`SEM`, `Demandgen`) | ✅ `campaign_advertising_channel_type` |
| Funnel stage | token (`TOFU`/`MOFU`/`BOFU`) | partial (inferable by type) |
| Match type | token (`Broad`, `BroadMatch`) | ✅ `keyword_info_match_type` |
| Bidding strategy | token (`ROAS`, `AO`) | ✅ `campaign_bidding_strategy_type` |
| Audience / age | token (`Embedded`, `45-54`) | partial (2nd query / demographic) |
| Geo | province/city in the name | — |
| Test vs evergreen | token (`Test`, `Bidding Test`) | — |

Where there's **real data** (type, match, bidding), validate the token against reality — that
raises the confidence of the mapping (and incidentally that's what `structure-audit` does).

## Confidence and ambiguity (the discipline)
Each decoded token carries **confidence**:
- **Confirmed** — clear parse and/or validated against real data (e.g. `SEM`→SEARCH verified).
- **Inferred** — reasonable but unconfirmed (e.g. `(TL)`=Term Life, validated with site research).
- **Ambiguous** — undecidable (`AO`, `Embedded`) → **list for human resolution / team
  dictionary**, do NOT make it up.
Inconsistent granularity is also flagged (e.g. `(HD)` maps to Dental AND Health → the code
is coarser than the product word).

## Business-context research (Porter MCP)
To validate product/codes: `tool:porter-tools:scrape` (or `crawl`) on the advertiser's
site → confirm what it sells and map codes to real products. Flag "inferred from
the site" vs "confirmed by the team". Internal agency codes public research does NOT
resolve → they stay "ambiguous, needs dictionary".

## The 3 levels (campaign / ad group / keyword) — decode each one
A clear structure needs dimensions at ALL THREE levels, not just campaign:
- **Campaign:** program · **product family → line** (hierarchy, see below) · type ·
  funnel · segment (audience/age/risk) · bidding · test.
- **Ad group:** **sub-segment** (persona: Seniors/Families/Couples/Self-Employed · condition:
  Guaranteed-Issue/High-Risk/No-Medical · coverage: Chiro-Physio/Mental/Prescriptions ·
  intent: Affordable/Best/Buy · geo · attribute: Amounts/Term-Length) + match type
  **if the name encodes it** (usually PARTIAL — don't assume every ad group does).
- **Keyword:** real match type + theme. (Note: the match type often comes **mixed** within the
  ad group; don't assume 1 match type per ad group unless the account isolates it.)

## Product = hierarchy (family → line), not inconsistency
The parentheses code is usually the **family** and the product word the **line**:
`(TL)`→{Life, BestLife, ...}, `(HD)`→{Health, Dental}, `(HA)`→{Home, Auto, Bundle}. That's
a **2-level** dimension (family/line), NOT "inconsistent granularity". Model
hierarchical dimensions as such.

## Disambiguation by crossing levels
An ambiguous campaign token sometimes resolves **by looking at its ad groups/keywords**. Real ex.:
`GI` (campaign) is confirmed as **Guaranteed Issue** because its ad groups are "Guaranteed
Issue", "Pre-Existing Conditions", "Severe Heart". Use the lower levels to raise the
confidence before flagging "ambiguous".

## Output
1. **The inferred grammar** (the account's token pattern).
2. **Map per campaign** — each campaign broken down into its dimensions (with confidence).
3. **Segmentation parameters** — the list of dimensions with their distinct values (what
   they become as filters/groupings: Program={Acme,SG}, Product={Life,Dental,...},
   Funnel={TOFU,MOFU,BOFU}, Match={Broad,...}, etc.).
4. **Ambiguous / to resolve** — tokens with no clear meaning + granularity inconsistencies.

> **Stress-test result (Acme Insurance, 20 campaigns / 71 ad groups):**
> Grammar ≈ `<Program>_<Product>[mods]_[Funnel]_<Type>_[Strategy]_(<Code>)_[Test]`.
> - **Program:** {Acme, SG} · **Family(code):** {TL, HD, HA, BR} → **Line:** TL→{Life,
>   BestLife, LifeBroadMatch}, HD→{Health, Dental}, HA→{Home, Auto, Bundle}, BR→{Brand}.
> - **Type:** {Search, Demand Gen} (✅ vs channel_type) · **Funnel:** {MOFU, BOFU} explicit,
>   TOFU inferred in Demand Gen · **Bidding:** validated (ROAS→MaxConvValue, Brand→TargetIS).
> - **Campaign segment:** {45-54, 55-64, 65+} × {Embedded, GI}. **GI = Guaranteed Issue**
>   (confirmed by its ad groups). · **Test:** {evergreen, Test, ROAS Bidding Test, Split}.
> - **Ad group:** sub-segment (persona/condition/coverage/intent/geo) + partial match.
> - **Unresolved ambiguous (→ team dictionary):** `AO`, `Embedded`.
> - **Coverage caveat:** the keyword query does NOT bring campaigns without keywords (Demand Gen,
>   PMax). For the COMPLETE campaign map, also request at **campaign level** (no keyword).
