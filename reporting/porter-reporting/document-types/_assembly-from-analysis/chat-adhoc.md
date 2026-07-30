# Format skeleton — Chat / ad-hoc  ⬜ stub

> The special case: **no skeleton.** The user asks one specific question and the AI answers it
> directly. The orchestrator does **not** compose a deliverable — it routes the question to the one
> use case that answers it and returns that.

- **Audience:** anyone, in conversation.
- **SUMAS U:** any (a single slice of the question).

## How routing works (to be worked, after executive-report is approved)

1. **Classify the question** → which use case answers it?
   - "where does my funnel leak?" → `funnel-metrics`
   - "what drove the drop last week?" → `segmentation/time`
   - "is my account healthy?" → `account-audit`
   - "do my keywords match my landing?" → `keyword-ad-landing-alignment`
2. **Run that one use case** (not a plan, not multiple).
3. **Answer from its canonical object** — lead with `synthesis.headline`, then the 1–2 findings that
   directly answer; drop the rest. Conversational, short, no full-report structure.

**Format-specific rule:** one question → one use case → the relevant slice of its output. If the
question genuinely needs several use cases, that's not a chat answer — offer to build a report
instead. To be detailed once the report pattern is validated.
