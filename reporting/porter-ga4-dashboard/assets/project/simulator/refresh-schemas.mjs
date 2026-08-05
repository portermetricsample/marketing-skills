// Regenerate simulator/schemas/{connector}.json from the authoritative Porter
// field catalog so local unknown_field validation matches production.
//
// The field list comes from the Porter MCP `list_fields` tool (per connector).
// Run this against an MCP endpoint you can reach with a service token:
//
//   PORTER_MCP_BASE_URL=https://dev-mcp.portermetrics.com \
//   PORTER_MCP_TOKEN=<internal token> \
//   node simulator/refresh-schemas.mjs facebook-ads google-ads
//
// If you don't have direct MCP access, ask your Porter agent to run list_fields
// for each connector and paste the field names into the schema JSON by hand —
// the simulator only needs the flat list of valid field names.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.env.PORTER_MCP_BASE_URL;
const token = process.env.PORTER_MCP_TOKEN;
const connectors = process.argv.slice(2);

if (!connectors.length) {
  console.error('usage: node simulator/refresh-schemas.mjs <connector> [<connector>...]');
  process.exit(2);
}
if (!base || !token) {
  console.error('Set PORTER_MCP_BASE_URL and PORTER_MCP_TOKEN (or edit simulator/schemas/*.json by hand).');
  process.exit(2);
}

await mkdir(join(here, 'schemas'), { recursive: true });
for (const connector of connectors) {
  // list_fields shape may evolve — adjust the tool id / path to your MCP.
  const resp = await fetch(`${base.replace(/\/$/, '')}/internal/v1/list_fields`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-porter-service-token': token },
    body: JSON.stringify({ data_source_name: connector }),
  });
  if (!resp.ok) {
    console.error(`${connector}: HTTP ${resp.status}`);
    continue;
  }
  const data = await resp.json();
  const fields = (data.fields || data.schema || []).map((f) => (typeof f === 'string' ? f : f.name || f.field)).filter(Boolean);
  await writeFile(
    join(here, 'schemas', `${connector}.json`),
    JSON.stringify({ connector, fields }, null, 2) + '\n'
  );
  console.log(`${connector}: wrote ${fields.length} fields`);
}
