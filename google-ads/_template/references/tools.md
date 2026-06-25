# Tools — <Use case name>

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in the plan — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../_framework/porter-mcp-calls.md`](../../_framework/porter-mcp-calls.md).
> Validated against the `<connector>` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="<connector>"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | <pull the rows this skill needs>. `accounts` = the full object from step 1. |
| <n> | `tool:porter-tools:scrape` | `fetch` | `url=<...>` | <only if the skill reads a landing page — delete if not needed>. |

## Step 2 — `query_data` args (this is "the query")
Minimal, exact fields — ask only for what the verdict needs, park the rest:

- `<field_1>` — <what it is>.
- `<field_2>` — <what it is>.
- `<field_3>` — <splitter / filter, if any>.

Period: `<last_month / {date_from, date_to}>`. <filters, grouping, sort/limit if any.>

## Tools NOT needed here (keep it minimal)
- <list the obvious tools this skill deliberately does NOT call, and why>.

## Parked fields (used by a complementary skill, not here)
- <fields that the connector exposes but this skill intentionally does not request>.

## Gotchas
- <connector-specific traps: auto-filters, dedup, missing dimensions, limits, CSV for exhaustiveness>.
