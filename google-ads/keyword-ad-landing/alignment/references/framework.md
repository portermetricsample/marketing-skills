# Keyword → ad → landing alignment — the judgment rubric

This is the **intelligence layer**. `assemble.py` builds the facts (one packet per ad group);
this file is how the AI turns them into a verdict — by reading, not by a formula, because "does
the page deliver what the ad promised?" needs reading comprehension.

The whole job is **relevance**: for each **keyword**, do the four pieces talk about the same
thing — *what people searched → the keyword that caught it → the ad they saw → the page they
landed on*? Nothing else (no competitor analysis, no account-structure auditing, no keyword expansion).

---

## The output unit is the AD GROUP, broken into AD → LANDING pairings
One finding = **one ad group**, keyed by `(campaign, ad_group)` (the same name in two campaigns =
two findings). Inside it, two breakdowns:
- **Intent (shared):** the keywords + their search terms the group caught. One row per keyword.
- **Pairings:** **one per ad → its OWN landing page.** An ad group can run several ads, and each ad
  carries its own final URL — so the group can point to more than one page. Judge **each pairing on
  its own** (L2/L3/L4 + a pairing verdict). `assemble.py` hands you `ad_count` / `landing_count` (the
  "N ads · M pages" badge) and a `pairings[]` array already joined ad→page.

**NEVER attribute a keyword to a specific ad.** Within an ad group Google rotates which ad serves —
the data does not (and cannot) say "keyword X used ad Y". Keywords are shared across the group's ads.
Break the box down by **ad → its page**, not keyword → ad. Do NOT invent a unit word like "journey".

## The relevance links — grade each, then roll up to one verdict
For every keyword, read these links. Each is **PASS / PARTIAL / FAIL** with a one-line reason
grounded in the data (quote the term, the headline, the page).

| # | Link | The question |
|---|------|--------------|
| **L1** | Search term ↔ keyword | Are the *actual searches* this keyword caught on-intent, or pulling a different product / buyer / junk? |
| **L2** | Keyword ↔ ad | Does the ad copy echo the searcher's words and intent? |
| **L3** | Ad ↔ landing | Does the page **deliver what the ad promised** — same product, offer, hook? Lead with the page's **`page_title`** (its `<title>` — the reliable hero signal), then read the **markdown**; weigh the **hero most**, but read the **whole page**. |
| **L4** | Intent ↔ landing | Ignoring the ad, does the page satisfy the original need? |

L3/L4 are where the money leaks. L1/L2 are cheaper, higher-frequency fixes.

**Where each link lives:** L1 is judged once at the **group** level (on the `intent[]` search terms —
`on_intent` / `off_reason`). L2/L3/L4 are judged **per pairing** — each ad→page gets its own
L2/L3/L4 + verdict, because different ads/pages in the same group can break differently.

### L1 — flag off-intent search terms (consistent categories)
For **every** search term (not only inside broken journeys) decide `on_intent: true/false`. When false,
tag **one** `off_reason` so the call is the same across runs:
- **`competitor_brand`** — a rival's brand, not a generic query (e.g. a generic "term life insurance"
  keyword catching **"beacon life insurance"** = the rival brand *Beacon Life*). Judge intent, don't
  pattern-match: the same words used **descriptively** are on-intent, while the **brand name itself**
  (a named rival — e.g. "beacon life", "evershield") leans competitor; watch word order, where a generic
  "&lt;product&gt; &lt;place&gt;" phrase can flip into a rival's brand. When genuinely ambiguous, still set
  `on_intent:false` + `off_reason:competitor_brand` but say it's a judgment call (it may be a worthwhile
  conquest, not waste).
- **`wrong_product`** — a different product/line than the keyword (e.g. a *dental* ad group catching
  **"health insurance"**).
- **`wrong_geo`** — a place the account doesn't serve, or a mismatched region.
- **`informational`** — research/no-buying-intent ("how much is life insurance", "what is term").

This is **AI judgment per term**, NOT a hardcoded word list — that is what keeps it both flexible and
consistent (a hardcoded list over-flags a brand-shaped phrase like "beacon life insurance"; the AI weighs it). The reporting layer
highlights every `on_intent:false` term with its `off_reason`.

## The verdict: THREE states, no score
No 0–10 number. The axis is your **certainty about relevance**, on the *words* only (do NOT look at CPA/CVR).

| Internal state | Show to the user as | When |
|---|---|---|
| **PASS** | **Aligned** | Every link PASS (or trivial PARTIALs). The pieces tell one story. |
| **REVIEW** | **Needs review** | Evidence ambiguous OR missing (page not scraped, genuine judgment call). Say *why*. |
| **FAIL** | **Broken** | Any clear FAIL, or a chain-breaking PARTIAL (e.g. the H1 names a different product). |

Aggregation: any clear FAIL → Broken; else any unknown/ambiguous → Needs review; else → Aligned.
(Certainty of a break outranks review; missing evidence outranks aligned — never "Aligned" a page you couldn't read.)

**Two levels.** Grade each **pairing** with the table above (its L2/L3/L4). The **group** (finding)
verdict = the **worst pairing verdict**, dropped to Broken if a keyword-drift (L1) problem is severe.
A group badged "1 ad · 1 page" has exactly one pairing, so the group verdict == that pairing's verdict.

## Where it breaks — name ONE primary type (plain words)
- **Wrong page (routing)** — right intent, wrong page. *Fix:* repoint the URL. (L3/L4)
- **Page doesn't say it (copy gap)** — right page, but it doesn't name what the ad/keyword promised, esp. the H1. *Fix:* add the words/offer to the page. (L3)
- **Keyword catches the wrong searches (drift)** — broad/phrase pulling a different product or junk. *Fix:* negatives, tighter match, or split. (L1)
- **Ad too generic (ad miss)** — *Fix:* rewrite/insert headlines. (L2)

---

## Output contract — what each finding must CONTAIN
> This defines the **content** the analysis emits, not how it looks. **Visual rendering
> (layout, tables, cards, colors, branding) is handled by the separate design / reporting
> skills** — do NOT specify styling here. Emit the fields below (as structured data and/or
> plain text); a design skill turns them into the final report.

Each finding (one per ad group) carries, in this order:

1. **Identity** — ad group name · campaign · spend (context only — to prioritize; it does NOT move the verdict).
2. **Verdict** — `Aligned` / `Needs review` / `Broken` (the group rollup; the three states above; no 0–10 score).
3. **Counts** — `ad_count` · `landing_count` (the "N ads · M pages" badge; both `1` = one pairing, the whole story).
4. **Intent** — the keyword breakdown: each keyword + its match type + its real search
   terms it caught. Mark **every** off-intent search term (`on_intent:false` + an `off_reason` from the
   L1 categories), not only in broken pairings — competitor-brand bleed often hides under an
   otherwise-Aligned keyword.
5. **Pairings** — one per **ad → its landing page**. Each carries: the ad (lead headlines + the
   description); the **literal final URL** (e.g. `acme.com/health-insurance`, not the page title) + a
   **plain-language summary of what the page says** (call out the specific mismatch word); the
   pairing's **L2/L3/L4 grades**; the pairing **verdict**; and a **recommendation** when it's not
   aligned — break type (wrong page / copy gap / ad miss) + plain problem ("the page headline says
   'Health', not 'dental'") + concrete action ("lead the hero with 'dental', or use a dedicated dental
   page"). No PPC shorthand, no "improve relevance".
6. **Keyword-drift fix (optional)** — a finding-level recommendation when off-intent search terms (L1)
   are the problem (negatives / match type), since that's a keyword issue, not an ad/page one.

The backbone is **Intent → (each) Ad → Landing** — the reader follows one click: what was searched,
what was shown, where it landed — now per ad when the group runs more than one. Keep every line
concrete: the reader should know *what's wrong and exactly what to change* in one read.

## Roll-up (always end with this)
- Keywords reviewed · # Aligned / # Needs review / # Broken.
- **$ on Broken keywords** (size of the problem) and **$ on Needs-review**.
- **Group the breaks into named systemic patterns with summed spend** — e.g. "Dental keywords →
  a 'Health' page · $9.2K" — not 22 one-offs. This grouping is the most useful output.
- Top fixes ordered by **money recovered**.

## Guardrails (do NOT skip)
- **Ground every claim in the data.** Quote the search term, the headline, the page. If the scrape is empty, say so → that link is unknown → **Needs review** (never Aligned, never Broken).
- **Read the whole page, weight the H1/hero most.**
- **The H1/hero is YOUR reading of the page** — lead with `page_title` (the page's own `<title>`, the most reliable signal; `onlyMainContent` can bury the visible hero in the body), then the markdown. Quote it into `destination.h1`. Empty (no title AND no markdown) → page unknown → **Needs review** (never guess).
- **Weight by spend, not row count.**
- **Brand is its own case.** Brand keyword → homepage is usually Aligned.
- **Search-term coverage is partial** — listed searches are a sample; the keyword's `cost` is the real spend.
