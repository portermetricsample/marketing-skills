#!/usr/bin/env python3
"""Patch a Porter report template's local audit harness to answer the ACCOUNTS RPC.

This TikTok Insights report resolves its source account at runtime (useAccounts →
porter.getAccounts → a `porter:rpc@v2` message with method "accounts"). The stock
`scripts/audit.mjs` mock only brokers the "query" method, so the report never gets
any accounts, every chart skips its query, and `npm run audit` reports `charts: 0`
while printing a green "0 errors" — a false pass that hides real field errors.

This script teaches the mock to also broker the "accounts" method by fetching the
simulator's GET /internal/v1/accounts endpoint (which serves demo accounts for
every connector that has a schema). Idempotent: safe to run more than once.

Usage:
    python3 patch_local_audit.py <project-dir>
"""
import re
import sys
from pathlib import Path

MARKER = "brokerAccounts"  # presence means already patched


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python3 patch_local_audit.py <project-dir>", file=sys.stderr)
        return 2
    audit = Path(sys.argv[1]) / "scripts" / "audit.mjs"
    if not audit.exists():
        print(f"error: {audit} not found", file=sys.stderr)
        return 1
    src = audit.read_text()
    if MARKER in src:
        print("already patched — nothing to do")
        return 0

    # 1) Add the accounts endpoint URL next to the SIM query URL.
    sim_line = 'var SIM = "http://localhost:${SIM_PORT}/internal/v1/query";'
    if sim_line not in src:
        print("error: could not find the SIM url line to anchor the patch", file=sys.stderr)
        return 1
    src = src.replace(
        sim_line,
        sim_line
        + '\n  var SIM_ACCTS = "http://localhost:${SIM_PORT}/internal/v1/accounts";',
    )

    # 2) Add a brokerAccounts() next to broker(): fetch the simulator's account
    #    universe and reply with it, so useAccounts() populates and charts query.
    broker_anchor = "  function reply(id, body){ if (port) port.postMessage({ type:\"porter:rpc-result@v2\", id:id, body:body }); }"
    if broker_anchor not in src:
        print("error: could not find reply() to anchor brokerAccounts", file=sys.stderr)
        return 1
    broker_accounts = (
        "  function brokerAccounts(m){\n"
        "    inflight++; setBeacon(\"loading\");\n"
        "    fetch(SIM_ACCTS, { method:\"GET\" })\n"
        "      .then(function(r){ return r.json(); })\n"
        "      .then(function(u){ reply(m.id, u); inflight=Math.max(0,inflight-1); settleSoon(); })\n"
        "      .catch(function(e){ reply(m.id, { accounts:[], by_connector:{}, connectors:[] }); inflight=Math.max(0,inflight-1); settleSoon(); });\n"
        "  }\n"
    )
    src = src.replace(broker_anchor, broker_accounts + broker_anchor)

    # 3) Route the accounts RPC to brokerAccounts.
    query_route = '      if (m.type === "porter:rpc@v2" && m.method === "query") { broker(m); return; }'
    if query_route not in src:
        print("error: could not find the query route to anchor the accounts route", file=sys.stderr)
        return 1
    src = src.replace(
        query_route,
        query_route
        + '\n      if (m.type === "porter:rpc@v2" && m.method === "accounts") { brokerAccounts(m); return; }',
    )

    audit.write_text(src)
    print("patched scripts/audit.mjs — the audit now answers the accounts RPC")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
