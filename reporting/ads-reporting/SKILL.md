---
name: ads-reporting
description: >-
  Build your paid-ads report end-to-end, the practical way — one multi-channel
  report across Meta Ads, Google Ads, TikTok, LinkedIn and Shopify, using the
  SUMAS framework on the Porter Metrics MCP. Use when a user with the Porter MCP
  asks to "build my ads report", "report my Meta and Google ads", "a paid media
  report", "how are my ads doing this month", a "cross-channel / multi-channel
  ad report", or wants one blended view of spend and ROAS instead of jumping
  between each Ads Manager. Works in plain chat (data + answers + a hosted
  dashboard URL). It reports and analyzes paid performance; it does NOT create,
  edit or pause campaigns.
---

# Ads Reporting — build your paid report (0→100)

The companion skill to Porter's "How I build my ads report" class. It turns the
question *"how are my paid channels doing?"* into a clear, defensible report —
without opening five Ads Managers, exporting to Sheets and stitching in Looker.

**One method, three outputs** (pick what the user needs):
1. **A chat answer** — a fast, specific read (e.g. "spend and ROAS by channel, this month vs last").
2. **A hosted dashboard** — a live Porter report URL, multi-channel, that refreshes on its own.
3. **An executive summary** — the report written as a short narrative for a client or boss.

The report is always structured with **SUMAS** — the same 5 steps for any channel or
business — so you use *fewer* metrics, not more, and every number is compared, not
naked. See [`references/framework.md`](references/framework.md).

---

## Prerequisite — the Porter Metrics MCP

This skill runs on the **Porter Metrics MCP**, which is where the live ad data comes
from (Meta, Google, TikTok, LinkedIn, Shopify and 25+ more connectors). No API keys.

- If the MCP is not connected yet, set it up first: **[`core/porter-setup`](../../core/porter-setup/)**
  (or visit `mcp.portermetrics.com/install`). Then connect the paid channels you report on.
- Confirm it's live with `whoami`; list what's connected with `list_accounts`.

If no paid account is connected, say so plainly and point to `porter-setup` — do not
invent numbers.

---

## The flow (SUMAS applied to paid)

Run it in order. Each step maps to one part of the report. The brain of each step —
the exact metric spine, the rates, the traps — lives in
[`references/framework.md`](references/framework.md); the dashboard look lives in
[`references/design.md`](references/design.md).

**1 · Strategy — what are we optimizing?**
Run the **3Cs** *for* the user (ask/infer — don't hand them a blank template): Customers,
Company, Competition. Their answers decide which conversion metrics the whole report
shows — is it **e-commerce** (ROAS, AOV, revenue) or **lead-gen / B2B** (CPA, leads,
pipeline)? The exact questions to resolve and the analysis→metrics mapping are in
[`references/strategy-3cs.md`](references/strategy-3cs.md).

**2 · Use case — who reads it, how often?**
- *Operations* (daily) → budget pacing, anomaly checks. Keep it to a chat answer.
- *Performance management* (weekly/monthly) → the hosted dashboard, KPIs vs goal.
- *Influence decisions* (monthly/quarterly) → the executive summary for the client.
Match the output to the reader — don't build a 6-page dashboard for a daily pacing check.

**3 · Metrics — pull the funnel, per channel.**
Organize every metric into **Visibility → Engagement → Conversion**. Pull the base
counts per connected paid account with the MCP (`list_fields` to see what a connector
exposes, then `query_data`). The canonical paid spine and the exact fields are in
`references/framework.md`.

**4 · Add context — turn counts into rates, always compared.**
A naked number lies. For every base count, compute its **rate** (CTR, CVR, CPC, CPM,
CPA, ROAS…) and compare it **vs the previous period** and **vs the goal**. Never show a
metric without a comparison. (⚠️ Porter's google-ads `cost_micros` is already in
currency — never divide by 1e6; see `references/framework.md` for connector traps.)

**5 · Segment — break the average.**
The account total hides the story. Segment by **channel → campaign → audience →
creative** so the report shows *where* it wins and leaks, not just the blended average.
(SUMAS = STP.)

**6 · Design — deliver it so people act on it.**
If the output is a dashboard or written report, apply the 5 dashboard principles —
Hierarchy, Contrast, Consistency, Redundancy, Reduce cognitive load — in
[`references/design.md`](references/design.md). For a hosted dashboard, hand off to
[`dashboard-builder`](../dashboard-builder/) (the end-to-end publisher) or clone a
ready-made channel dashboard; this skill supplies the paid *method*, those supply the
*assembly*.

---

## Tools (Porter MCP, in order)

| Step | Call | Why |
|---|---|---|
| check | `whoami`, `list_accounts` | confirm MCP is live and see connected paid accounts |
| discover | `list_connectors`, `list_fields` | see which metrics each paid connector exposes |
| pull | `query_data` | the base counts per channel, per period (this period + previous) |
| deeper | `list_actions` / `execute_action` | anything not in the flat tools (public competitor ads, etc.) |
| publish | `create_report` / `preview_report` (or a clone path) | the hosted dashboard URL |

Deterministic rate math (CTR, CPA, ROAS, vs-previous %) should be computed from the
base counts, not trusted from account-total rate fields — several connectors return a
broken rate at the total aggregate. Details and the safe recipe: `references/framework.md`.

---

## Scope — what this skill does NOT do

- It does **not** create, edit, pause or budget campaigns (that's a write action — a
  different skill). This one only **reports and analyzes**.
- It is **paid-only** and multi-channel. For a single organic channel, use that
  channel's own dashboard skill (`porter-instagram-dashboard`, etc.).
- Examples use fictional **Acme Insurance**. Never bake a real client's data into this repo.

---

*Part of the Porter Metrics marketing-skills library. This skill grows alongside the
"How I build my ads report" class — sections are added as the method is taught.*
