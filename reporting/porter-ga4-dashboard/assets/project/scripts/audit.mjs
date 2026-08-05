// `npm run audit` — LOCAL pre-upload audit with PRODUCTION-fidelity transport.
//
// `npm run dev` only proves field names: it hits the simulator over a raw fetch
// and NEVER exercises the wrapper handshake, so a report that would fail to
// embed in production still "works" locally. This harness closes that gap. It:
//   1. builds nothing (run `next build` first) — it drives the real `out/`,
//   2. embeds it in a mock wrapper that speaks the REAL bridge (porter:ready →
//      ack + MessagePort, brokers porter:rpc@v2 `query` to the simulator, keeps
//      window.__PORTER_AUDIT__ + the render-state beacon, drives print mode),
//   3. renders it headless (Playwright) exactly like the cloud audit, then reads
//      the same signals: did the handshake complete, which chart queries failed,
//      which came back empty — plus a full screenshot + PDF for a visual check.
//
// Exit non-zero if the bridge never connected or any chart query failed, so the
// agent can iterate to green BEFORE uploading (the upload runs the same audit
// against REAL data and rejects a broken report).

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '..');
const OUT = path.join(PROJ, 'out');
const SIM_PORT = 8787;
const SRV_PORT = 8799;
const AUDIT_DIR = path.join(PROJ, '.audit');

function die(msg, code = 2) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(code);
}

if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  die('out/index.html is missing — run `next build` before `npm run audit`.');
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  die('Playwright is not installed. Run `npm install` then `npx playwright install chromium`, then re-run `npm run audit`.');
}

// The mock wrapper: a faithful re-implementation of the production bridge
// (internal/viewer/shell/bridge-spa.js) so the report takes its EMBEDDED/RPC
// path, not the dev fetch. Keep this in sync with the @v2 contract.
const WRAPPER_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#0b0e14}
  #porter-page{border:0;width:1122px;display:block}
</style></head><body>
<script>
(function(){
  var SIM = "http://localhost:${SIM_PORT}/internal/v1/query";
  var audit = { queries: {} };
  window.__PORTER_AUDIT__ = audit;
  function setBeacon(s){ document.documentElement.setAttribute("data-porter-render-state", s); }
  setBeacon("loading");
  var iframe = document.createElement("iframe");
  iframe.id = "porter-page";
  iframe.setAttribute("sandbox", "allow-scripts");  // opaque origin, like prod
  iframe.src = "/report/";
  document.body.appendChild(iframe);

  var port = null, handshook = false, inflight = 0, quiet = null;
  function settleSoon(){
    if (!handshook || inflight > 0) return;
    if (quiet) clearTimeout(quiet);
    quiet = setTimeout(function(){ if (handshook && inflight === 0) setBeacon("complete"); }, 800);
  }
  function record(spec, body){
    var err = body && body.error ? body.error : null;
    audit.queries[JSON.stringify(spec || {})] = {
      spec: spec || {}, ok: !err,
      rows: body && Array.isArray(body.rows) ? body.rows.length : 0, error: err
    };
  }
  function broker(m){
    inflight++; setBeacon("loading");
    fetch(SIM, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(m.spec || {}) })
      .then(function(r){ return r.json(); })
      .then(function(body){ reply(m.id, body); record(m.spec, body); inflight=Math.max(0,inflight-1); settleSoon(); })
      .catch(function(e){ var b={error:{code:"transport_error",message:String(e)}}; reply(m.id,b); record(m.spec,b); inflight=Math.max(0,inflight-1); settleSoon(); });
  }
  function reply(id, body){ if (port) port.postMessage({ type:"porter:rpc-result@v2", id:id, body:body }); }

  window.addEventListener("message", function(e){
    if (e.source !== iframe.contentWindow) return;
    var msg = e.data || {};
    if (msg.type !== "porter:ready@v2") return;
    var ch = new MessageChannel();
    port = ch.port1;
    port.onmessage = function(ev){
      var m = ev.data || {};
      if (m.type === "porter:rpc@v2" && m.method === "query") { broker(m); return; }
      if (m.type === "porter:resize@v2" && typeof m.height === "number" && m.height > 0) {
        iframe.style.height = Math.ceil(m.height) + "px";
      }
      if (m.type === "porter:export-ready@v2") settleSoon();
    };
    iframe.contentWindow.postMessage(
      { type:"porter:ack@v2", ctx:{ reportId:"audit-local", route:"", state:{}, theme:{ mode:"dark" } } },
      "*", [ch.port2]);
    handshook = true;
    settleSoon();
    // Drive print mode: mount every page + fire every query (like the cloud audit).
    port.postMessage({ type:"porter:export-pdf@v2", mode:"full", state:{} });
  });

  // Handshake watchdog (mirrors bridge-spa.js): a report that never connects is
  // a hard failure, not a slow chart.
  setTimeout(function(){ if (!handshook){ audit.bridge = { handshook:false }; setBeacon("handshake-failed"); } }, 9000);
})();
</script></body></html>`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.map': 'application/json',
};

// img-src the report is served under (matches production buildAppCSP: same
// origin + first-party Porter media hosts + data:/blob:). Only img-src is
// enforced so scripts/styles render freely — the goal is to catch creative
// images pointing at a host that production would block.
const MEDIA_HOSTS = 'https://media.portermetrics.com https://dev-media.portermetrics.com';
const IMG_CSP = `img-src http://localhost:${SRV_PORT} ${MEDIA_HOSTS} data: blob:`;

const sim = spawn(process.execPath, [path.join(PROJ, 'simulator', 'server.mjs')], { stdio: 'ignore' });
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/' || u.pathname === '') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(WRAPPER_HTML);
    return;
  }
  if (u.pathname.startsWith('/report/')) {
    let rel = decodeURIComponent(u.pathname.slice('/report/'.length)) || 'index.html';
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const fp = path.join(OUT, rel);
    if (!fp.startsWith(OUT + path.sep) && fp !== OUT) {
      res.writeHead(403);
      res.end();
      return;
    }
    let target = fp;
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) target = path.join(fp, 'index.html');
    if (!fs.existsSync(target)) {
      // SPA / trailing-slash routes: fall back to the entry document.
      target = path.join(OUT, 'index.html');
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(target)] || 'application/octet-stream',
      // Reproduce production's img-src so an <img> pointing at a host NOT in the
      // report allowlist (raw fbcdn, a typo, …) is blocked here instead of only
      // going blank in production. Mirror internal/viewer/serve.go buildAppCSP.
      'Content-Security-Policy': IMG_CSP,
    });
    fs.createReadStream(target).pipe(res);
    return;
  }
  res.writeHead(404);
  res.end();
});
await new Promise((r) => server.listen(SRV_PORT, r));

const cleanup = () => {
  try {
    server.close();
  } catch {}
  try {
    sim.kill();
  } catch {}
};

let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  cleanup();
  die(`Could not launch Chromium (${e.message}). Run \`npx playwright install chromium\`.`);
}

const page = await browser.newPage({ viewport: { width: 1122, height: 794 } });
// Capture CSP img-src refusals: Chromium logs "Refused to load the image '<url>'
// because it violates ... Content Security Policy directive: img-src ..." — a
// creative image pointing at a host production would block.
const cspImgBlocks = [];
page.on('console', (m) => {
  const t = m.text();
  if (/Refused to load the image/i.test(t) && /img-src/i.test(t)) cspImgBlocks.push(t);
});
await page.goto(`http://localhost:${SRV_PORT}/`, { waitUntil: 'load' }).catch(() => {});
await page
  .waitForFunction(
    () => ['complete', 'handshake-failed'].includes(document.documentElement.getAttribute('data-porter-render-state')),
    { timeout: 60000 },
  )
  .catch(() => {});

const beacon = await page.evaluate(() => document.documentElement.getAttribute('data-porter-render-state'));
const audit = await page.evaluate(() => window.__PORTER_AUDIT__ || { queries: {} });

fs.mkdirSync(AUDIT_DIR, { recursive: true });
await page.screenshot({ path: path.join(AUDIT_DIR, 'report.png'), fullPage: true }).catch(() => {});
await page.pdf({ path: path.join(AUDIT_DIR, 'report.pdf'), printBackground: true, width: '1122px' }).catch(() => {});
await browser.close();
cleanup();

const queries = Object.values(audit.queries || {});
const errors = queries.filter((q) => !q.ok);
const empties = queries.filter((q) => q.ok && q.rows === 0);
const bridgeFailed = beacon === 'handshake-failed' || (audit.bridge && audit.bridge.handshook === false);

const uniqBlocked = [...new Set(cspImgBlocks)];

console.log('\n──────── local audit ────────');
console.log(`  bridge:    ${bridgeFailed ? '✖ NOT CONNECTED (handshake failed)' : '✓ connected'}`);
console.log(`  charts:    ${queries.length} queried`);
console.log(`  errors:    ${errors.length}`);
console.log(`  empty:     ${empties.length} (warning — a range/account may legitimately have no data)`);
console.log(`  images:    ${uniqBlocked.length ? `✖ ${uniqBlocked.length} blocked by CSP` : '✓ none blocked'}`);
console.log(`  artifacts: ${path.relative(process.cwd(), AUDIT_DIR)}/report.png + report.pdf`);
for (const b of uniqBlocked.slice(0, 5)) {
  console.log(`\n  ✖ ${b.trim()}`);
}
if (uniqBlocked.length) {
  console.log('\n  ✖ Creative images point at a host the report CSP blocks. Porter rehosts');
  console.log('    connector images on its media host — use the field value as-is (e.g. `ad_image_url`),');
  console.log('    do NOT rewrite it to the raw Facebook/Google CDN, or the image will be blank in production.');
}
if (bridgeFailed) {
  console.log('\n  ✖ The report never connected to the wrapper. Do NOT modify porter.init / the bridge,');
  console.log('    do NOT set window.__PORTER_DEV__, and fire queries only after mount.');
}
for (const q of errors) {
  const e = q.error || {};
  console.log(`\n  ✖ [${e.code || '?'}] fields=${JSON.stringify(q.spec?.fields || [])}`);
  console.log(`      ${e.message || ''}`);
}
if (!bridgeFailed && errors.length === 0 && uniqBlocked.length === 0) {
  console.log('\n  ✓ Clean. Now upload with edit_report — the cloud audit re-checks against REAL data.');
}
console.log('─────────────────────────────\n');

process.exit(bridgeFailed || errors.length > 0 || uniqBlocked.length > 0 ? 1 : 0);
