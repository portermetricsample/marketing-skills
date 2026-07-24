#!/usr/bin/env python3
"""Teach the template's local audit harness to answer the `accounts` RPC.

Why this is needed: this report resolves its Instagram account at RUNTIME via
porter.getAccounts() (that's what makes it duplicable onto another account). The
template's scripts/audit.mjs mock wrapper only brokers the `query` RPC, so
getAccounts() never resolves, every chart skips its query, and `npm run audit`
reports "0 charts queried" against a blank page — a false pass that hides real
field errors.

This patch makes the mock answer `accounts` from the local simulator's
/internal/v1/accounts endpoint, and counts it as in-flight work so the audit
waits for the follow-up queries before capturing.

Usage:  python3 patch_local_audit.py /path/to/report-project
(idempotent — safe to run twice)
"""
import sys
import pathlib

QUERY_ANCHOR = '      if (m.type === "porter:rpc@v2" && m.method === "query") { broker(m); return; }'

# NOTE: this text is injected into a JS *template literal* in audit.mjs, so it must
# contain no backslash escapes (a regex like /\/query$/ would collapse and break the
# whole wrapper script). Plain string splitting avoids the problem entirely.
PATCH = '''      if (m.type === "porter:rpc@v2" && m.method === "accounts") {
        inflight++; setBeacon("loading");
        fetch(SIM.split("/query")[0] + "/accounts").then(function(r){ return r.json(); })
          .then(function(b){ reply(m.id, b); inflight=Math.max(0,inflight-1); settleSoon(); })
          .catch(function(){ reply(m.id, { accounts: [], by_connector: {}, connectors: [] }); inflight=Math.max(0,inflight-1); settleSoon(); });
        return;
      }
'''


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    audit = root / "scripts" / "audit.mjs"
    if not audit.exists():
        print(f"✖ not found: {audit}")
        return 1

    src = audit.read_text()
    if 'm.method === "accounts"' in src:
        print("✓ already patched — nothing to do")
        return 0
    if QUERY_ANCHOR not in src:
        print("✖ could not find the query-RPC anchor in scripts/audit.mjs.")
        print("  The template changed; add an `accounts` branch to the mock wrapper by hand.")
        return 1

    audit.write_text(src.replace(QUERY_ANCHOR, PATCH + QUERY_ANCHOR))
    print("✓ patched scripts/audit.mjs — the local audit now resolves accounts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
