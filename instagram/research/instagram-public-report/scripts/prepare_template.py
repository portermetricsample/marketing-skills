#!/usr/bin/env python3
"""
Download the Porter report template and wire in the baked Instagram report.

Usage:
  python3 prepare_template.py <base_template_url> <report_data.ts> <dest_dir>

<base_template_url> comes from create_report(...). Drops report_data.ts + the
composition page (report_index.tsx) into the template and pins a dash-free
buildId. Run publish.py next.
"""
import sys, os, subprocess, json, base64, zipfile, shutil

base_url, data_ts, dest = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
index_tsx = os.path.join(HERE, "report_index.tsx")

r = subprocess.run(["curl", "-sS", "-X", "POST", "-A", "Mozilla/5.0", base_url],
                   capture_output=True, text=True)
d = json.loads(r.stdout)
blob = base64.b64decode(d["body"]["content_base64"])
os.makedirs(dest, exist_ok=True)
zp = os.path.join(dest, "_tpl.zip")
open(zp, "wb").write(blob)
with zipfile.ZipFile(zp) as z:
    z.extractall(dest)
os.remove(zp)

shutil.copy(data_ts, os.path.join(dest, "report_data.ts"))
shutil.copy(index_tsx, os.path.join(dest, "pages", "index.tsx"))

nc = os.path.join(dest, "next.config.js")
s = open(nc).read()
if "generateBuildId" not in s:
    s = s.replace("reactStrictMode: true,",
                  "reactStrictMode: true,\n  generateBuildId: async () => 'porterigreport',")
    open(nc, "w").write(s)
print("template ready:", dest)
