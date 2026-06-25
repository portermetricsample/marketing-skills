# Google Ads — Keyword → Ad → Landing (skill cluster)

The **journey** a paid click travels: search term → keyword → ad → landing page. Two
complementary skills read the **same journey** from two angles — run them together.

| Sub-skill | Reads | Answers |
|---|---|---|
| [`alignment/`](alignment/) | the **words** | Does term → keyword → ad → landing tell **one story**? Where does the journey **break**? (relevance verdict — Aligned / Needs review / Broken; no 0–10 score) |
| [`metrics/`](metrics/) | the **numbers** | The figures + Google's own grades behind each stage: Quality Score, Impression Share, CTR, CVR, Ad Relevance, Landing Page Experience. **Surfaces, does not judge.** |

**The boundary:** `metrics` shows *what the numbers are*; `alignment` says *whether the journey is
coherent and what to fix*. Use them as a pair — `metrics` for the grades, `alignment` for the verdict.

**Third sibling (different cluster):** [`../account-audit/landing-cro`](../account-audit/landing-cro/)
judges the landing page's **own** conversion quality (is the page built to convert?), which is
separate from the **journey's coherence** (does the page match the ad?) that `alignment` checks.

Each sub-skill follows the standard skill anatomy (`SKILL.md` + `references/{tools,framework,output}.md`,
plus `scripts/` where deterministic). Their `name:` frontmatter stays descriptive
(`keyword-ad-landing-alignment`, `keyword-ad-landing-metrics`).
