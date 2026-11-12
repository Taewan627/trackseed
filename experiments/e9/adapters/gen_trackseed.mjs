// TrackSeed itself as an E9 addendum-02 source: generateTrack with library defaults (default tangent join, width 40), the 1000 E5 seeds (build/seeds.json),
// centreline points[0..n-1] (closing copy dropped, planar x/z) written as a polyline in the E9 format. Failures (exceptions) are recorded, not retried.
// Run: node adapters/gen_trackseed.mjs --build build      (needs `npm run build:cli` and build/seeds.json from adapters/seeds.mjs)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const build = resolve(args.build ?? join(here, '..', 'build'));
const { generateTrack } = await import(pathToFileURL(join(here, '..', '..', '..', 'cli-dist', 'core.js')).href);
const seeds = JSON.parse(readFileSync(join(build, 'seeds.json'), 'utf8'));
const source = 'gen-trackseed', WIDTH = 40, dir = join(build, 'polylines', source); mkdirSync(dir, { recursive: true });
const rows = [], fails = [];
for (const seed of seeds) {
  let t; try { t = generateTrack({ seed }); } catch (e) { fails.push([`s${seed}`, String(e.message).slice(0, 80)]); continue; }
  const pts = t.points.slice(0, t.points.length - 1).map(p => [p.x, p.z]);
  const d = pts.map((q, j) => { const r = pts[(j + 1) % pts.length]; return Math.hypot(r[0] - q[0], r[1] - q[1]); });
  const ds = [...d].sort((a, b) => a - b), mid = ds.length >> 1, med = ds.length % 2 ? ds[mid] : (ds[mid - 1] + ds[mid]) / 2;
  const id = `s${seed}`;
  writeFileSync(join(dir, id + '.json'), JSON.stringify({ source, id, unit: 'u', width: WIDTH, closed: true, points: pts }) + '\n');
  rows.push([id, pts.length, WIDTH, 'u', d.reduce((a, b) => a + b, 0), med, 1, `seed ${seed}; library defaults`]);
}
writeFileSync(join(dir, 'manifest.tsv'), ['id\tn_points\twidth\tunit\tlength\tmedian_spacing\tclosing_vertex_dropped\tnote', ...rows.map(r => r.join('\t'))].join('\n') + '\n');
writeFileSync(join(dir, 'failures.tsv'), ['id\treason', ...fails.map(r => r.join('\t'))].join('\n') + '\n');
console.log(`[${source}] wrote ${rows.length} polylines, ${fails.length} generator failures -> ${dir}`);
