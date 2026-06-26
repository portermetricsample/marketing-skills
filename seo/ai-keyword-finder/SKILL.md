---
name: ai-keyword-finder
description: "AI Keyword Finder. Turns your classic SEO keywords into the conversational prompts people actually ask ChatGPT / Google AI, and checks who gets mentioned for them. Use when the user says 'AI queries', 'conversational keywords', 'optimize for ChatGPT', 'how do I get found in AI', or wants to bridge classic SEO with AI visibility. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# AI Keyword Finder

Turns your keywords into the **conversational prompts** people ask AI assistants, and checks who gets
mentioned. Bridges classic SEO and AI visibility. Runs on Porter MCP.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `source_keyword · conversational_variants · ai_search_volume · brands_mentioned · action` + a ≤5-sentence synthesis.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Returns |
|---|---|---|
| Source keywords | `porter-tools.google_ranked_keywords` / `get_keyword_data` | keywords + intent to convert |
| AI search volume per query | `porter-tools.ai_optimization_keyword_data_search_volume` | estimated usage of a term inside LLMs |
| Who's mentioned | `porter-tools.ai_opt_llm_ment_agg_metrics` (keyword target) | mentions for that query |
| Live AI answer | `porter-tools.ai_optimization_chat_gpt_scraper` / `porter-tools.ask` | what ChatGPT actually answers |

## Flow
1. **Gather source keywords** and note their `search_intent_info`.
2. **Rewrite to conversational queries:** 2–4 natural variants per keyword (best / how / vs / for-[persona]).
   - "looker studio dashboard" → "what's the best looker studio dashboard for meta ads?"
3. **Size by AI demand:** `ai_optimization_keyword_data_search_volume`. ⚠️ Verified quirk: keywords with no
   AI demand come back **without an `ai_search_volume` field at all** (just `{keyword: "..."}`) — treat a
   missing field as 0 and drop those. Keep only keywords that return a real `ai_search_volume`.
4. **Check current mentions:** `ai_opt_llm_ment_agg_metrics` (keyword target, `search_scope`:["answer"]).
   Spot-check a few with `ai_optimization_chat_gpt_scraper`.
5. **Deliver:** a table source keyword → conversational variants → AI search volume → brands mentioned today →
   recommended action.

## Notes
- AI search volume ≠ Google volume. Feeds directly into `ai-visibility-checker`.
