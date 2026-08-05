# porter-ga4-dashboard — install

A 4-page Google Analytics 4 dashboard (Conversions · Audiences · Content · Time matrix)
published as a hosted Porter report — with **fully masked, synthetic data** (a fictional
"Acme Analytics" property, never a real account). For demos, videos, screenshots and
templates. See [`SKILL.md`](SKILL.md) for what it builds and how the masking works.

## Requirements

The **Porter Metrics MCP** connected. **No GA4 account is needed** — the report queries
nothing (every chart is answered by a local synthetic-data engine), so it is safe to share.

The *clone* path needs only the MCP. The *build from source* path additionally needs Node +
a shell. If you have no Porter MCP at all, `references/artifact-prompt.md` reproduces the
same look as a chat-only interactive artifact.

## Install in Claude Code

Copy this folder into your skills directory, then restart Claude Code:

```bash
git clone --depth 1 https://github.com/portermetricsample/marketing-skills /tmp/ms \
  && mkdir -p ~/.claude/skills \
  && cp -r /tmp/ms/reporting/porter-ga4-dashboard ~/.claude/skills/ \
  && rm -rf /tmp/ms
```

## Install in Claude.ai (chat)

Chat has no filesystem to copy into, so use the packaged artifact instead:

1. Download [`porter-ga4-dashboard.skill`](porter-ga4-dashboard.skill)
   (use the **Download raw file** button — it's a zip, not text).
2. Attach it to a Claude.ai conversation.
3. The file card shows a **Save skill** button — click it to install the skill into your
   profile. It stays available across conversations.

The button only appears if your plan/organization allows adding skills; if it doesn't, an
admin has to enable it or add the skill for the workspace.

## Use it

No command needed most of the time — just ask:

> "give me a masked GA4 dashboard" · "replicate this Google Analytics report with fake data"

To invoke it explicitly: `/porter-ga4-dashboard`

The fastest route (Path A) is one MCP call that clones the public, self-contained masked
reference report and hands back a new private URL showing the Acme Analytics sample data.
