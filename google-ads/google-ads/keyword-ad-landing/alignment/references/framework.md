# Keyword → ad → landing alignment — the judgment rubric

This is the **intelligence layer**. `assemble.py` builds the facts (one packet per ad group);
this file is how the AI turns them into a verdict — by reading, not by a formula, because "does
the page deliver what the ad promised?" needs reading comprehension.

The whole job is **relevance**: for each **keyword**, do the four pieces talk about the same
thing — *what people searched → the keyword that caught it → the ad they saw → the page they
landed on*? Nothing else (no competitor analysis, no account-structure auditing, no keyword expansion).

---

## The output unit is the AD GROUP (with the keyword breakdown inside it)
One finding = **one ad group** (because the ad and the landing are shared at that level). The
**keyword-level breakdown lives inside the finding's Intent block** — each keyword with its
match type and the search terms it caught. The same ad group name in two campaigns with
different ads/pages is two findings. Do NOT invent a unit word like "journey".

## The relevance links — grade each, then roll up to one verdict
For every keyword, read these links. Each is **PASS / PARTIAL / FAIL** with a one-line reason
grounded in the data (quote the term, the headline, the page).

| # | Link | The question |
|---|------|--------------|
| **L1** | Search term ↔ keyword | Are the *actual searches* this keyword caught on-intent, or pulling a different product / buyer / junk? |
| **L2** | Keyword ↔ ad | Does the ad copy echo the searcher's words and intent? |
| **L3** | Ad ↔ landing | Does the page **deliver what the ad promised** — same product, offer, hook? Weigh the **H1/hero most**, but read the **whole page**. |
| **L4** | Intent ↔ landing | Ignoring the ad, does the page satisfy the original need? |

L3/L4 are where the money leaks. L1/L2 are cheaper, higher-frequency fixes.

## The verdict: THREE states, no score
No 0–10 number. The axis is your **certainty about relevance**, on the *words* only (do NOT look at CPA/CVR).

| Internal state | Show to the user as | When |
|---|---|---|
| **PASS** | **Aligned** | Every link PASS (or trivial PARTIALs). The pieces tell one story. |
| **REVIEW** | **Needs review** | Evidence ambiguous OR missing (page not scraped, genuine judgment call). Say *why*. |
| **FAIL** | **Broken** | Any clear FAIL, or a chain-breaking PARTIAL (e.g. the H1 names a different product). |

Aggregation: any clear FAIL → Broken; else any unknown/ambiguous → Needs review; else → Aligned.
(Certainty of a break outranks review; missing evidence outranks aligned — never "Aligned" a page you couldn't read.)

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
2. **Verdict** — `Aligned` / `Needs review` / `Broken` (the three states above; no 0–10 score).
3. **Intent** — the keyword breakdown: each keyword + its match type + the top 2–3 real search
   terms it caught. Mark the off-intent search terms in the broken cases.
4. **Message** — the ad: lead headlines + the description.
5. **Destination** — the **literal final URL** (e.g. `acme.com/health-insurance`,
   not the page title) + a **plain-language summary of what the page actually says** (its
   headline/offer/product, from the scrape). Call out the specific word that reveals a mismatch.
6. **Recommendation** — the **break type** when Broken (wrong page / copy gap / keyword drift /
   ad miss), a one-line **plain-language problem** ("the page headline says 'Health', not
   'dental'"), and the **concrete action** ("lead the hero with 'dental', or use a dedicated
   dental page"). No PPC shorthand, no "improve relevance".

The three content blocks **Intent → Message → Destination** are the backbone — they let the
reader follow one click: what was searched, what was shown, where it landed. Keep every line
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
- **Weight by spend, not row count.**
- **Brand is its own case.** Brand keyword → homepage is usually Aligned.
- **Search-term coverage is partial** — listed searches are a sample; the keyword's `cost` is the real spend.
