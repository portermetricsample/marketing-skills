// Porter data simulator — a local mock of the runtime's POST /internal/v1/query.
// Same request/response contract as production, so the bridge client's dev mode
// (lib/porter.ts) gets REAL feedback while you build: deterministic demo rows
// for valid specs, and the exact `unknown_field` error envelope when you request
// a field that doesn't exist for a connector. That catches the #1 authoring
// mistake — asking for a field that isn't in the connector's schema — locally,
// before you ever deploy.
//
// Schemas live in simulator/schemas/{connector}.json (regenerate real ones from
// the MCP with `node simulator/refresh-schemas.mjs`). Run standalone with
// `npm run simulator`, or together with Next via `npm run dev`.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SIMULATOR_PORT || 8787);

const schemas = {}; // connector -> Set(field names)

async function loadSchemas() {
  const dir = join(here, 'schemas');
  let files = [];
  try {
    files = await readdir(dir);
  } catch {
    return;
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const connector = f.replace(/\.json$/, '');
    try {
      const data = JSON.parse(await readFile(join(dir, f), 'utf8'));
      schemas[connector] = new Set((data.fields || []).map((x) => (typeof x === 'string' ? x : x.name)));
    } catch (e) {
      console.error(`[simulator] bad schema ${f}: ${e.message}`);
    }
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-porter-data-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

// Stub source-account universe for dev mode: two demo accounts per connector that
// has a schema, mirroring the runtime's GET /api/accounts shape so the account
// selector (porter.getAccounts / <AccountSelector>) renders while building locally.
function demoAccounts() {
  const connectors = Object.keys(schemas);
  const accounts = [];
  const by_connector = {};
  for (const connector of connectors) {
    by_connector[connector] = [];
    for (let i = 1; i <= 2; i++) {
      const id = `${connector}-acct-${i}`;
      accounts.push({ id, name: `${connector} account ${i}`, connector });
      by_connector[connector].push(id);
    }
  }
  return { accounts, by_connector, connectors };
}

function inferConnector(spec) {
  const a = (spec.accounts || [])[0] || {};
  return spec.connector || a.component_name || a.connector || '';
}

// Deterministic demo rows: dates for date-ish fields, labels for dimension-ish
// fields, numbers otherwise. The values are meaningless — the point is shape +
// field validation, not analytics.
function demoRows(fields, limit) {
  const n = Math.max(1, Math.min(Number(limit) || 30, 100));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = {};
    for (const f of fields) {
      const lf = String(f).toLowerCase();
      if (lf.includes('date')) {
        row[f] = `2026-06-${String((i % 28) + 1).padStart(2, '0')}`;
      } else if (/image|thumbnail|picture|creative/.test(lf)) {
        // Creative image fields resolve to first-party Porter media URLs in prod;
        // mirror that shape so `npm run audit` renders them under the real img-src CSP.
        row[f] = `https://dev-media.portermetrics.com/demo/asset/${(i % 6) + 1}.jpeg`;
      } else if (/campaign|adset|ad_name|ad_group|country|region|device|placement|name/.test(lf)) {
        row[f] = `${dimLabel(lf)} ${(i % 6) + 1}`;
      } else {
        row[f] = Math.round(50 + 950 * Math.abs(Math.sin((i + lf.length) / 3)));
      }
    }
    rows.push(row);
  }
  return rows;
}
function dimLabel(lf) {
  if (lf.includes('campaign')) return 'Campaign';
  if (lf.includes('adset')) return 'Ad set';
  if (lf.includes('ad')) return 'Ad';
  if (lf.includes('country')) return 'Country';
  if (lf.includes('device')) return 'Device';
  return 'Item';
}

// Pure ratios Porter's blend model does NOT expose as fields — they must be
// computed CLIENT-SIDE from their components. Only used to turn an otherwise
// bare unknown_field into a more actionable message, so it can never false-flag
// a field the connector's schema actually has.
const DERIVED_FIELDS = new Set([
  'ctr', 'cpc', 'cpm', 'cpp', 'roas', 'frequency',
  'conversion_rate', 'cost_per_conversion', 'cost_per_result',
  'cost_per_click', 'cost_per_purchase', 'cost_per_lead',
]);
function isDerivedField(f) {
  const lf = String(f).toLowerCase();
  if (DERIVED_FIELDS.has(lf)) return true;
  return /^cost_per_|_rate$|^cp[cmp]$|roas/.test(lf);
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  res.setHeader('content-type', 'application/json');
  if (req.method === 'GET' && req.url.startsWith('/internal/v1/accounts')) {
    res.writeHead(200);
    res.end(JSON.stringify(demoAccounts()));
    return;
  }
  if (req.method !== 'POST' || !req.url.startsWith('/internal/v1/query')) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: { code: 'not_found', message: 'POST /internal/v1/query or GET /internal/v1/accounts' } }));
    return;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let spec = {};
  try {
    spec = JSON.parse(raw || '{}');
  } catch {
    res.writeHead(200);
    res.end(JSON.stringify({ error: { code: 'bad_request', message: 'body is not valid JSON' } }));
    return;
  }
  const fields = spec.fields || [];
  if (!Array.isArray(fields) || fields.length === 0) {
    res.writeHead(200);
    res.end(JSON.stringify({ error: { code: 'bad_request', message: 'spec.fields is required' } }));
    return;
  }
  // Parity with the live data plane: a spec needs accounts (subset of the
  // report's accounts_used) OR a blend_query_destination_id. Catching this
  // locally stops account-less specs from shipping and rendering blank live.
  const hasAccounts = Array.isArray(spec.accounts) && spec.accounts.length > 0;
  if (!spec.blend_query_destination_id && !hasAccounts) {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        error: {
          code: 'bad_request',
          message: 'the query spec needs either accounts or a blend_query_destination_id',
        },
      })
    );
    return;
  }
  const connector = inferConnector(spec);
  // Blend destinations carry custom/formula fields → skip schema validation.
  if (!spec.blend_query_destination_id && connector && schemas[connector]) {
    const known = schemas[connector];
    const bad = fields.find((f) => !known.has(f));
    if (bad) {
      const error = isDerivedField(bad)
        ? {
            code: 'derived_field',
            message: `field '${bad}' is a derived ratio, not a real field for connector '${connector}'. Request its components (e.g. clicks + ads_impressions, or amount_spent + conversions) and compute the ratio CLIENT-SIDE. See list_fields (or simulator/schemas/${connector}.json).`,
          }
        : {
            code: 'unknown_field',
            message: `field '${bad}' does not exist for connector '${connector}'. Use list_fields (or simulator/schemas/${connector}.json) to see valid fields.`,
          };
      res.writeHead(200);
      res.end(JSON.stringify({ error }));
      return;
    }
  }
  res.writeHead(200);
  res.end(JSON.stringify({ columns: fields, rows: demoRows(fields, spec.limit), meta: { demo: true, connector } }));
});

await loadSchemas();
server.listen(PORT, () => {
  const conns = Object.keys(schemas).join(', ') || 'none';
  console.log(`[porter-simulator] POST http://localhost:${PORT}/internal/v1/query — schemas: ${conns}`);
});
