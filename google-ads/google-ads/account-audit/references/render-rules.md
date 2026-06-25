# Render rules — the LOCKED design system

This is what makes every account's audit look identical. **The design is fixed; you fill in
content only.** The look does NOT change per account, per industry, or per run.

## The two files you render with
- **`design/audit.css`** — the complete stylesheet (Porter brand, scoped under `#audit`). **Paste it
  VERBATIM** into the output's `<style>` block. Never add, remove, reorder, or edit a rule.
- **`design/skeleton.html`** — the HTML shell with `<!-- SLOT:… -->` markers. You fill the slots.

## The one hard rule
> **Fill slots with content. Never touch the design.**
- ❌ No new CSS, no `<style>` edits, no `style="…"` inline attributes, no new class names, no new colors,
  no font changes, no extra `<script>`, no other CDN/asset.
- ✅ Only: write text into slots, and **repeat** the provided component blocks (a `<tr>`, a `.scard`, a
  `.passcard`, a `.item`, a `.section`) as many times as the findings need.
- If a section's data does not exist for this account, **delete that whole `.section` block** — do not
  invent content to fill the layout, and do not restyle the gap.

## Component catalog (use ONLY these classes)
| Need | Markup | Allowed values |
|---|---|---|
| Section verdict chip | `<span class="chip c-…">` | `c-ok` · `c-review` · `c-broken` · `c-na` |
| Severity tag | `<span class="sev sev-…">` | `sev-h` (HIGH) · `sev-m` (MED) · `sev-l` (LOW) |
| Per-finding state | `<span class="state s-…">` | `s-raise` · `s-ok` · `s-cut` · `s-broken` · `s-review` · `s-flag` |
| Scorecard | `.scard` → `.lab` `.val` `.delta d-…` `.cap` | delta: `d-good` · `d-bad` · `d-flat` |
| Findings table | `.tablewrap > table`; evidence `<span class="ev">`; rec `<td class="rec">` | — |
| Callout | `.callout co-…` → `.ico` + `.ct` | `co-fix` · `co-watch` · `co-win` · `co-info` |
| Clean-fundamental card | `.passcard` → `.h` + `.b` | — |
| Action item | `.todo > .item` → `.rank`(auto) + `.tc`(`.tt` `.td` `.tmeta`) | — |

**Meaning-colored, not arrow-colored.** A delta's color reflects whether it's *good or bad for the
business*, not its direction: spend ▲ is usually `d-bad`; CPA ▼ is `d-good`; ROAS ▼ is `d-bad`.

## Document order (fixed)
header → executive summary (`.exec`, REQUIRED) → 6 scorecards → legend → **findings sections
(severity-ordered, HIGH→LOW — not §-number order)** → "What's already set up right" (`.passgrid`) →
"Prioritized action plan" (`.todo`) → footer with **Method + Caveats** (REQUIRED).

## The 11 candidate sections (include the ones that apply, drop the rest)
conversion-tracking · bid-strategy · value-based-bidding · spend-allocation · quality-score ·
search-terms & negatives · device & dayparting · geography · audience & demographics · ad-assets ·
landing-cro · demand-gen. Each maps 1:1 to a check under `google-ads/account-audit/*` (or a reused
check). Order them by **money at stake**, then number them 01, 02, … in that order.

## Voice inside the slots (from `_framework/writing.md`)
- Section `<h2>` = a **closed question** the data answers ("Is the budget going to the campaigns that
  pay?"). The `.lead`'s **first sentence answers it**, then names the driver.
- Numbers carry their comparison **as data** (in the `.ev`/`.delta`/`.cap`), not spelled out in prose.
- Every recommendation is **Where · What · Why**, plain language for a non-technical owner, exact
  setting in parentheses. Never bare jargon ("switch to tROAS") — say it plainly, then `(setting: …)`.
- A bridge line (`.sec-bridge`) hands off to the next section; omit if there's nothing to point to.

## Baked-in lessons (do not repeat these mistakes)
- **Read the real ad copy before judging it** — strong copy with a structural problem ≠ "rewrite the ads".
- **Label every metric's window** (a 30-day actual next to a 90-day ROAS looks like a contradiction).
- **Separate brand from non-brand** before any efficiency claim; exclude brand from baselines; never
  scale a brand campaign as a "winner" ([`brand-vs-nonbrand`](../../../_framework/brand-vs-nonbrand.md)).
- **"Zero conversions" ≠ "< 1 conversion"** — state the strict figure.
- **Relevant zero-conversion search terms are NOT waste to cut** — they're a diagnose item; only
  off-vertical / competitor / informational terms become negatives.
- **Honesty in the footer**: every data gap flagged "verify in-account", zero fabricated values.

## Producing the file, then the Porter report
1. Write the filled standalone HTML to an **out-of-repo** path (see SKILL.md data-safety).
2. Deploy it as a hosted Porter report with `scripts/to_porter_bundle.py` (standalone HTML → the
   reports-v2 3-file bundle), then `create_report` (see [`tools.md`](tools.md) step D). The CSS is
   already scoped under `#audit`, so it drops into Porter's chrome unchanged.
