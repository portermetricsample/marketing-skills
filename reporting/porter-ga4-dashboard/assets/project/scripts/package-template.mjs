// Package the base template into a zip artifact for distribution (CI uploads it
// to gs://<bundles-bucket>/_templates/base-<version>.zip; create_report returns
// a signed URL to it). Excludes build/install artifacts. Uses the system `zip`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'base-template.zip');

const exclude = [
  'node_modules/*',
  '.next/*',
  'out/*',
  '.audit/*',
  '*.zip',
  '.DS_Store',
  '.git/*',
];

const args = ['-r', '-q', out, '.', '-x', ...exclude];
const res = spawnSync('zip', args, { cwd: root, stdio: 'inherit' });
if (res.status !== 0) {
  console.error('zip failed (is the `zip` CLI installed?)');
  process.exit(res.status || 1);
}
console.log(`packaged template → ${out}`);
