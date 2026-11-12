// YannThorimbert/RacingTrackGenerator (MIT, JavaScript; the E5 subject) -> polylines, same method and seeds as experiments/e5.
// Run: node adapters/gen_e5.mjs --build build
// Uses experiments/e5 unchanged: build.sh (pinned fetch + esbuild bundle of the unmodified inline script, needs network/npx) and run.mjs node22
// with E5_SCRATCH=<build>/e5 (so nothing is written into experiments/e5/results). The generator's centre line per seed (outcome ok) is written
// as a polyline; heights are ignored. Width 4 = the primary width of the E5 protocol (the generator's own TRACK_WIDTH is recorded in the note).
// Failures (outcome not ok) are recorded, not retried.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const build = resolve(args.build ?? join(here, '..', 'build'));
const e5 = join(here, '..', '..', 'e5');
const scratch = join(build, 'e5');
mkdirSync(scratch, { recursive: true });
execFileSync('bash', [join(e5, 'build.sh')], { stdio: ['ignore', 'ignore', 'inherit'] });
execFileSync('node', [join(e5, 'run.mjs'), 'node22'], { env: { ...process.env, E5_SCRATCH: scratch }, stdio: ['ignore', 'inherit', 'inherit'] });
const res = JSON.parse(readFileSync(join(scratch, 'results', 'node22.json'), 'utf8'));
const polys = JSON.parse(readFileSync(join(scratch, 'out', 'node22.polylines.json'), 'utf8'));
const source = 'gen-e5-thorimbert', dir = join(build, 'polylines', source); mkdirSync(dir, { recursive: true });
const WIDTH = 4, rows = [], fails = [];
res.cases.forEach((c, i) => {
  const p = polys[i];
  if (c.outcome !== 'ok' || !p || !p.centerline || p.seed !== c.seed) { fails.push([`s${c.seed}`, `outcome ${c.outcome}`]); return; }
  const pts = p.centerline.map(q => [q[0], q[1]]);
  const d = pts.map((q, j) => { const r = pts[(j + 1) % pts.length]; return Math.hypot(r[0] - q[0], r[1] - q[1]); });
  const ds = [...d].sort((a, b) => a - b), mid = ds.length >> 1, med = ds.length % 2 ? ds[mid] : (ds[mid - 1] + ds[mid]) / 2;
  const id = `s${c.seed}`;
  writeFileSync(join(dir, id + '.json'), JSON.stringify({ source, id, unit: 'u', width: WIDTH, closed: true, points: pts }) + '\n');
  rows.push([id, pts.length, WIDTH, 'u', d.reduce((a, b) => a + b, 0), med, 0, `seed ${c.seed}; generator own width ${c.ownWidth}`]);
});
writeFileSync(join(dir, 'manifest.tsv'), ['id\tn_points\twidth\tunit\tlength\tmedian_spacing\tclosing_vertex_dropped\tnote', ...rows.map(r => r.join('\t'))].join('\n') + '\n');
writeFileSync(join(dir, 'failures.tsv'), ['id\treason', ...fails.map(r => r.join('\t'))].join('\n') + '\n');
console.log(`[${source}] wrote ${rows.length} polylines, ${fails.length} generator failures -> ${dir}`);
