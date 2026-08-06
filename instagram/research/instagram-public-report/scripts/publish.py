#!/usr/bin/env python3
"""
Build the prepared report template and upload it to the Porter gate.

Usage:
  python3 publish.py <dest_dir> <upload_url>

<upload_url> comes from edit_report(report_id, operations=[{action:'add_page',name:'__rebuild__'}]).
Prints the gate JSON: on success {report_url, version_id, diagnostics:{error_count:0}}.
Run with the sandbox OFF (npm + network). macOS/node required.
"""
import sys, os, subprocess, zipfile, base64, json

dest, upload_url = sys.argv[1], sys.argv[2]

if not os.path.isdir(os.path.join(dest, "node_modules")):
    subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=dest, check=True)
subprocess.run(["npm", "run", "build"], cwd=dest, check=True)

EX = {"node_modules", ".next", ".audit", ".git"}
zp = os.path.join(dest, "_bundle.zip")
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    for dp, dns, fns in os.walk(dest):
        dns[:] = [x for x in dns if x not in EX]
        for f in fns:
            if f.endswith(".zip"):
                continue
            z.write(os.path.join(dp, f), os.path.relpath(os.path.join(dp, f), dest))

b64 = base64.b64encode(open(zp, "rb").read()).decode()
bodyf = os.path.join(dest, "_ub.json")
open(bodyf, "w").write(json.dumps({"params": {"content_base64": b64}}))
r = subprocess.run(["curl", "-sS", "-X", "POST", "-H", "content-type: application/json",
                    "--data", "@" + bodyf, upload_url], capture_output=True, text=True)
try:
    d = json.loads(r.stdout)
    b = d.get("body", {})
    diag = b.get("diagnostics", {})
    print("status", d.get("status"), "| audit", diag.get("audit_status"), "| errors", diag.get("error_count"))
    print("report_url:", b.get("report_url"))
    if diag.get("error_count"):
        print("ERRORS:", json.dumps(diag.get("errors"), indent=1)[:2000])
except Exception:
    print(r.stdout[:2000])
