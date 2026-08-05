// Fails the build if the static export emits ABSOLUTE asset references.
// Under the Porter wrapper (served path-by-id with an injected <base href>),
// absolute `/_next/...` would resolve to the origin root → wrong report.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'out');
const ABSOLUTE = /(?:src|href)\s*=\s*["']\/(?:_next|assets)\//g;

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

let bad = 0;
try {
  for await (const f of htmlFiles(OUT)) {
    const html = await readFile(f, 'utf8');
    const hits = html.match(ABSOLUTE);
    if (hits) {
      bad += hits.length;
      console.error(`✗ ${f}: ${hits.length} absolute asset ref(s), e.g. ${hits[0]}`);
    }
  }
} catch (err) {
  console.error(`Could not read out/ — run \`next build\` first. (${err.message})`);
  process.exit(2);
}

if (bad) {
  console.error(`\nFAIL: ${bad} absolute asset reference(s). Set assetPrefix:'.' (relative) in next.config.js.`);
  process.exit(1);
}
console.log('OK: all asset references are relative (wrapper-safe).');
