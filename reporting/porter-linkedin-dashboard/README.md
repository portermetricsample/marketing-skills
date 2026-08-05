# porter-linkedin-dashboard — install

A 4-page LinkedIn Company Page dashboard (Overview · Posts · Audience · Discovery)
published as a hosted Porter report. See [`SKILL.md`](SKILL.md) for what it builds and how
it works. It is the LinkedIn-Pages sibling of `porter-instagram-dashboard`.

## Requirements

The **Porter Metrics MCP** connected, with the LinkedIn Page reachable through the
`linkedin-pages` connector and its authorization complete (an incomplete LinkedIn
authorization makes every chart fail `reauth_required` — see the gotchas). Without the MCP
the skill has no data to read.

The *clone* path (Path A) needs only the MCP. The *build from source* path (Path B)
additionally needs Node + a shell.

## Install in Claude Code

Copy this folder into your skills directory, then restart Claude Code:

```bash
git clone --depth 1 https://github.com/portermetricsample/marketing-skills /tmp/ms \
  && mkdir -p ~/.claude/skills \
  && cp -r /tmp/ms/reporting/porter-linkedin-dashboard ~/.claude/skills/ \
  && rm -rf /tmp/ms
```

## Install in Claude.ai (chat)

Chat has no filesystem to copy into, so use the packaged artifact instead:

1. Download `porter-linkedin-dashboard.skill` (use the **Download raw file**
   button — it's a zip, not text).
2. Attach it to a Claude.ai conversation.
3. The file card shows a **Save skill** button — click it to install the skill into your
   profile. It stays available across conversations.

The button only appears if your plan/organization allows adding skills; if it doesn't, an
admin has to enable it or add the skill for the workspace.

## Use it

No command needed most of the time — just ask:

> "build me a dashboard for my LinkedIn page"

or hand it a Porter LinkedIn report URL and say "replicate this for my page". To invoke it
explicitly: `/porter-linkedin-dashboard`
