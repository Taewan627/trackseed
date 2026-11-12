// Runs `run.mjs` twice in separate processes, requires byte-identical outputs, keeps the first and writes DETERMINISM.txt.
// Usage: node experiments/e8/run-twice.mjs <outDir>
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = process.argv[2];
if (!out) { console.error('usage: run-twice.mjs <outDir>'); process.exit(2); }
const run = dir => { const r = spawnSync(process.execPath, [new URL('./run.mjs', import.meta.url).pathname, dir], { stdio: ['ignore', 'pipe', 'inherit'] }); if (r.status !== 0) process.exit(r.status ?? 1); };
const files = ['SUMMARY.json', 'SUMMARY.md', 'cases.csv'];
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const second = mkdtempSync(join(tmpdir(), 'e8-'));
run(out); run(second);
const lines = [`E8 held-out: two runs in separate Node processes (${process.version})`, ''];
let same = true;
for (const f of files) { const a = sha(join(out, f)), b = sha(join(second, f)); if (a !== b) same = false; lines.push(`${f}  run1 ${a}  run2 ${b}  ${a === b ? 'identical' : 'DIFFERENT'}`); }
lines.push('', same ? 'RESULT: byte-identical' : 'RESULT: NOT DETERMINISTIC');
rmSync(second, { recursive: true, force: true });
writeFileSync(join(out, 'DETERMINISM.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n')); process.exit(same ? 0 : 1);
