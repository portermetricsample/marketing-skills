# Framework: Search Intent & Angle Discovery

## Mission
Discover, in the account's **paid** search terms, intents and angles with **real
demand** that the advertiser is not serving — and translate them into content, landing page
and ad variation **ideas**. Offensive (discover opportunity), not defensive (prune).

## Scope
- **YES:** detect intent/angle in the terms that ALREADY triggered, size their
  demand, and propose **which asset to create** and **which ad angle to test**.
- **Unlike the relevance skill, this one DOES use volume** (impressions/clicks) — without
  sizing demand, the ideas would be noise.
- **It does NOT produce the content** (that's the landing/listicle builders / the SEO team).
- **It does NOT see demand that never triggered** in the account (that's SEO keyword research with
  DataForSEO). This only sees what already went through the paid account — but with money behind it.

## The opportunity signal (the core rule)
An **unserved** intent looks like:
**high demand (impressions/clicks) + low conversion + an informational/comparative modifier.**
Those people do NOT want a provider landing with a form; they want **something else**.

> Real example (Acme Insurance): `how much is life insurance` and `best life insurance companies
> in canada` → lots of demand, ~0 conversion on the quote landing. It's not bad
> traffic: it's demand for a **calculator** and a **comparison listicle** the account doesn't offer.

(Note: "low conversion" here is NOT a performance judgment on the term — it's the **clue**
that the query's intent doesn't match the offered asset.)

## Intent taxonomy (DETERMINISTIC where possible)
Detect by **modifier dictionaries** (regex/lists), not by eye. The AI only
resolves the ambiguous ones and names the angle.

| Intent / angle | Modifiers (list, extensible) | Asset it calls for |
|---|---|---|
| **Cost / price** | cost, price, how much, cheap, affordable, rates, premium | Calculator / pricing page |
| **Comparison** | best, top, vs, versus, compare, comparison, reviews, alternatives | "best X" / "X vs Y" listicle |
| **Informational** | what is, how to, guide, explained, do i need, worth it, meaning, "?" | Educational guide / blog |
| **Persona** | for seniors, for young, for families, for self-employed, for [X] | Per-persona landing / ad |
| **Geo** | provinces / cities / "near me" | Local page |
| **Transactional** | buy, get, apply, online, quote, sign up | (already served by the provider landing) |

The deterministic part = the dictionaries. They're maintained per industry and extended with
whatever shows up in the account.

## Output (per intent/angle cluster)
- Sample queries · **demand** (impressions/clicks, # of terms) · does it convert today? ·
  **recommended asset** · **suggested ad variation** · **does the advertiser already serve it?**
  (gap, read from the campaign names / current landings).
- Mark which clusters to hand to the **SEO/content team** (real paid demand as a
  complementary input to their organic strategy).

## Why the own account (not a generic tool)
Each query here **already spent the advertiser's money** = demand demonstrated in THEIR market, geo
and moment — not a theoretical volume from a database. That's the differentiator versus a
keyword tool. Its limit (honestly): it doesn't see the demand that never triggered → that's covered by SEO.

## Period
`last_month` or `{date_from, date_to}` of 30-90 days to have enough demand volume.
