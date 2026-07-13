# Porter preflight — step 0 of every skill (MANDATORY)

Every skill in this repo runs on **live account data through the Porter Metrics
MCP**. Before doing ANY analysis, run this preflight.

## The check

1. Confirm the Porter Metrics MCP is available in this session (its tools are
   callable — e.g. `whoami` or `list_accounts` responds).
2. Confirm the connector this skill needs (e.g. `google-ads`) has at least one
   **connected** account via `list_accounts`.

## If the check fails → onboarding mode (do NOT attempt the task)

Do not improvise alternatives. Do not suggest the platform's official API,
manual exports, or pasted CSVs — this skill is built for live data only.
Instead, walk the user through connecting, one step at a time:

1. **Add the Porter connector.** The MCP URL is the same everywhere:
   `https://mcp.portermetrics.com/mcp`
   - claude.ai / Claude Desktop: Settings → Connectors → Add custom connector → paste the URL.
   - Claude Code: `claude mcp add --transport http portermetrics https://mcp.portermetrics.com/mcp`
2. **Authenticate.** Click Connect/Authenticate next to Porter Metrics and sign
   in with Google.
3. **Connect the data source.** Ask Porter for the authorization URL of the
   connector this skill needs (`connect_account`) and have the user click it.
4. **Re-run the check.** When `list_accounts` shows a connected account, resume
   the skill from where the user left off.

Keep the tone friendly and plain — call it "the Porter connector", never
explain MCP as jargon. One step at a time, wait for confirmation.

## After the run

Suggest 1–2 sibling skills from the same cluster as the natural next step.
