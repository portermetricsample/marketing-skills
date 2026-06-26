---
name: ai-visibility-checker
description: "AI Visibility Checker. Finds the queries and sources where ChatGPT / Google AI mention your competitors but not you — your roadmap to get cited by AI. Use when the user says 'AI mentions', 'ChatGPT visibility', 'GEO', 'AEO', 'LLM visibility', 'is AI mentioning me', or wants to know which brands ChatGPT cites in their category. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# AI Visibility Checker

Finds the queries and sources where AI assistants (ChatGPT, Google AI) **mention competitors but not you**.
Output: your roadmap to "get cited by AI". Runs on Porter MCP — the `ai_opt_llm_ment_*` family.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `query/brand · your_mentions · competitor_mentions · top_cited_3rd_party_domains · action` + a ≤5-sentence synthesis.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Returns |
|---|---|---|
| Mention metrics (you + competitors) | `porter-tools.ai_opt_llm_ment_agg_metrics` | mentions, AI search volume, source domains, brand entities |
| Top cited domains | `porter-tools.ai_opt_llm_ment_top_domains` | which domains AI cites most |
| Top cited pages | `porter-tools.ai_opt_llm_ment_top_pages` | which exact pages get cited |

## Flow
1. **Start with YOUR domain alone** (don't pass 3 domains at once):
   ```
   { "target": [ {"domain":"yourbrand.com"} ],
     "location_name":"United States", "language_code":"en", "platform":"chat_gpt" }
   ```
   **If it returns empty (`items: []`) THAT IS THE FINDING:** your brand is invisible in AI. It's not an error —
   it's the headline. Report it that way and move to keyword comparison (step 3), not domain comparison.
   (Small brands often have 0 mentions; big ones like ahrefs/semrush return rich data.)
2. **If there's data, compare against competitors** (one or more domains in `target`). Per target you get:
   total mentions, `ai_search_volume`, `sources_domain`, `search_results_domain`, `brand_entities`.
   Repeat with `"platform":"google"`.
3. **Find winnable queries:** use keyword targets (not just domains) in `agg_metrics` with `search_scope`
   question/answer to see which prompts trigger competitor mentions.
4. **Recommend plays:** (a) content to publish/optimize, (b) third-party domains to earn a mention on (the ones
   AI already trusts — Reddit, Wikipedia, review sites), (c) brand-entity fixes. Prioritize by AI search volume × relevance.

## Notes
- Always check `chat_gpt` AND `google` — visibility differs a lot.
- `sources_domain` (what AI reads) ≠ `search_results_domain` (what it shows) — use both.
- Pairs with `ai-keyword-finder`.
