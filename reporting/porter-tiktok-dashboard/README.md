# porter-tiktok-dashboard — install

A 5-page TikTok Insights dashboard (Overview · Videos · Video performance · Acquisition ·
Audience) published as a hosted Porter report. See [`SKILL.md`](SKILL.md) for what it
builds and how it works.

## Requirements

The **Porter Metrics MCP** connected, with the TikTok account reachable through the
`tiktok-insights` connector. Without it the skill has no data to read.

The *clone* path (Path A) needs only the MCP. The *build from source* path (Path B)
additionally needs Node + a shell.

## Install in Claude Code

Copy this folder into your skills directory, then restart Claude Code:

```bash
mkdir -p ~/.claude/skills && cp -r porter-tiktok-dashboard ~/.claude/skills/
```

Or, once it's in the marketing-skills repo:

```bash
git clone --depth 1 https://github.com/portermetricsample/marketing-skills /tmp/ms \
  && mkdir -p ~/.claude/skills \
  && cp -r /tmp/ms/reporting/porter-tiktok-dashboard ~/.claude/skills/ \
  && rm -rf /tmp/ms
```

## Install in Claude.ai (chat)

Chat has no filesystem to copy into, so use the packaged artifact instead:

1. Download [`porter-tiktok-dashboard.skill`](porter-tiktok-dashboard.skill) (use the
   **Download raw file** button — it's a zip, not text).
2. Attach it to a Claude.ai conversation.
3. The file card shows a **Save skill** button — click it to install the skill into your
   profile. It stays available across conversations.

The button only appears if your plan/organization allows adding skills; if it doesn't, an
admin has to enable it or add the skill for the workspace.

Note: in plain chat (no build tools), only **Path A (clone)** runs. Path B needs Claude
Code or a coding environment with Node.

## Use it

No command needed most of the time — just ask:

> "build me a dashboard for my TikTok account"

To invoke it explicitly: `/porter-tiktok-dashboard`
