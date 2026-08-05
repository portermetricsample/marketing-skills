# porter-search-console-dashboard — install

A 7-view Google Search Console dashboard (Overview · Keywords · CTR opportunities · Content ·
Cannibalization · Branded vs non-branded · Devices & countries) with **all data masked**
(synthetic, fictional "Acme Analytics" property), published as a hosted Porter report. See
[`SKILL.md`](SKILL.md) for what it builds and how it works.

## Requirements

The **Porter Metrics MCP** connected. The *clone* path (Path A) needs only that — no Search
Console account, no build tools — because the reference report is masked and self-contained.
The *build from source* path (Path B, only for customizing the fake brand) additionally needs
Node + a shell.

## Install in Claude Code

Copy this folder into your skills directory, then restart Claude Code:

```bash
git clone --depth 1 https://github.com/portermetricsample/marketing-skills /tmp/ms \
  && mkdir -p ~/.claude/skills \
  && cp -r /tmp/ms/reporting/porter-search-console-dashboard ~/.claude/skills/ \
  && rm -rf /tmp/ms
```

## Install in Claude.ai (chat) / Cowork

Chat has no filesystem to copy into, so use the packaged artifact instead:

1. Download [`porter-search-console-dashboard.skill`](porter-search-console-dashboard.skill)
   (use the **Download raw file** button — it's a zip, not text).
2. Attach it to a Claude.ai / Cowork conversation.
3. The file card shows a **Save skill** button — click it to install the skill into your
   profile. It stays available across conversations.

The button only appears if your plan/organization allows adding skills; if it doesn't, an
admin has to enable it or add the skill for the workspace.

## Use it

No command needed most of the time — just ask:

> "clone the masked Search Console sample dashboard"
> "make me a demo GSC report with fake data"

To invoke it explicitly: `/porter-search-console-dashboard`

The default (Path A) is a one-call clone of the public masked reference report
`report.portermetrics.com/60f1fc0e-e365-42b4-a6fb-14b5128ff76e` — identical, fully synthetic,
private to you, no account required.
