# Account Profile — the inferred, per-account config every skill consumes

The deterministic scripts (`process.py`) must work for **thousands of advertisers in any
industry**. So they NEVER hardcode an advertiser's vocabulary. Instead:

- **Code = the universal** (true for every Google Ads account): match types
  (BROAD/PHRASE/EXACT), channel types (SEARCH/PMAX/...), and the structural operations
  (group, count, compare a real match type to a name token, detect generic names,
  name-vs-config). No advertiser vocabulary needed.
- **Profile = the account-specific** (inferred once, reused): the naming grammar, the
  product taxonomy/codes, the keyword→product lexicon, brand and competitor terms, and the
  intentional-variant rule.

The LLM infers the profile once per account (`structure-map` is the producer); the scripts
consume it. Inference is flexible (any industry); execution is deterministic (fast,
reproducible). No rigidity.

## Schema (`account_profile.json`)
```json
{
  "account_id": "<customer_id>-<login_customer_id>",
  "naming": {
    "separators": ["_", "-", "|", "()", "[]"],
    "grammar": "<one-line description of the inferred token pattern>",
    "schemes": { "<prefix>": "<count or note>" }
  },
  "products": {
    "code_of_line":   { "<product line word>": "<family code>" },
    "line_of_word":   { "<word seen in campaign names>": "<canonical product line>" },
    "keyword_lexicon":{ "<topic word seen in keywords>": "<canonical product line>" }
  },
  "brand_terms": ["<own brand>", "..."],
  "competitors": ["<competitor>", "..."],
  "intentional_variant_rule": "same base name + a varying segment suffix (audience/age/geo/test)",
  "ambiguous_tokens": ["<token the team must define, e.g. AO>"]
}
```

- **`line_of_word`** canonicalizes campaign product words into lines (e.g. `life`,
  `bestlife`, `lifebroadmatch` → `life`). This is what removes the per-account guessing the
  scripts used to hardcode.
- **`keyword_lexicon`** maps topic words found in *search terms / keywords* to a product
  line (e.g. `health`→health, `car`→auto). Used for cross-product detection.
- **`code_of_line`** is the family hierarchy (line → code).

## How it flows
1. `structure-map` infers the profile from the campaign/ad-group names (+ optional site
   research) and emits it. The LLM resolves ambiguous tokens; the team confirms.
2. The profile is cached per account (re-infer only when campaigns change).
3. Every `process.py` takes the profile as an optional argument and uses it. **Without a
   profile** the scripts run in a degraded "generic" mode (universal checks only; the
   vocabulary-dependent parts are best-effort or deferred to the LLM) — never with a
   wrong hardcoded guess.

## Producer and consumers
- **Producer:** `structure-map` — its decode (segmentation params + `code_to_lines` +
  ambiguous tokens) IS the basis of the profile; the LLM fills `keyword_lexicon`,
  `brand_terms`, `competitors` and resolves ambiguous tokens.
- **Consumers** (take the profile as an optional 2nd CLI arg today):
  - `structure-audit/process.py` — cross-product `theme_suspects`.
  - `term-routing/process.py` — term→line routing.
  - (to come) `relevance`, `intent-discovery` — brand/competitor/product judgments.

Each consumer runs its UNIVERSAL checks with no profile at all; only the
vocabulary-dependent part uses it, and degrades gracefully (generic derivation) without one.

## Rule of thumb
**Code Google's vocabulary; infer the advertiser's vocabulary.** If a check needs to know
what the advertiser sells, it reads the profile — it does not assume.
