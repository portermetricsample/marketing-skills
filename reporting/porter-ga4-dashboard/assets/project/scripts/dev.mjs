// `npm run dev`: run the data simulator + Next dev server together, so the
// report gets live data (and real unknown_field feedback) while you build.
import { spawn } from 'node:child_process';

const procs = [
  spawn(process.execPath, ['simulator/server.mjs'], { stdio: 'inherit' }),
  spawn('npx', ['--no-install', 'next', 'dev'], { stdio: 'inherit', shell: true }),
];

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const p of procs) {
    try {
      p.kill();
    } catch {}
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
for (const p of procs) p.on('exit', (code) => shutdown(code ?? 0));
