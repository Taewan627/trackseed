// W2 example (manuscript Sec. 3.2): validate-polyline on one real circuit (TUMFTM Melbourne), raw and --resample-smooth, plus the smoothed points for the plot.
// Usage: node w2_example.mjs <software-checkout-with-cli-dist> <polylines-dir> <out-dir>
//   <polylines-dir> = experiments/e9/build/polylines (written by experiments/e9/extract.sh, or by adapters/real_tumftm.py after fetching TUMFTM at the pinned commit);
//   third-party data are read, never copied into the paper workspace.
// Writes <out-dir>/w2_melbourne_raw.json, w2_melbourne_smooth.json (verdict excerpts: ok, input, violations, check counts) and w2_melbourne_points.json (raw and smoothed
// vertices; used only by fig_w2.py and not committed).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [sw, polys, out] = process.argv.slice(2).map(p => path.resolve(p));
mkdirSync(out, { recursive: true });
const file = path.join(polys, 'real-tumftm', 'Melbourne.json');
const doc = JSON.parse(readFileSync(file, 'utf8'));
const W = doc.width, S = 0.25 * W;
const cli = path.join(sw, 'cli-dist', 'cli.js');
function run(args) {
  let stdout; try { stdout = execFileSync('node', [cli, 'validate-polyline', file, '--width', String(W), ...args], { encoding: 'utf8' }); }
  catch (e) { stdout = e.stdout; }   // exit code 1 = validation failed; the JSON is on stdout
  return JSON.parse(stdout);
}
for (const [name, args] of [['raw', []], ['smooth', ['--resample-smooth', String(S)]]]) {
  const d = run(args);
  const ex = { command: `trackseed validate-polyline Melbourne.json --width ${W}` + (args.length ? ` --resample-smooth ${S}` : ''), ok: d.ok, input: d.input, violations: d.violations.map(v => ({ code: v.code, index: v.index, value: +v.value.toFixed(2), limit: +v.limit.toFixed(2) })),
    checks: Object.fromEntries(d.checks.map(c => [c.id, c.failures])) };
  writeFileSync(path.join(out, `w2_melbourne_${name}.json`), JSON.stringify(ex, null, 1) + '\n');
}
const { trackFromPolyline } = await import(pathToFileURL(path.join(sw, 'cli-dist', 'polyline.js')).href);
const pts = doc.points.map(([x, z]) => ({ x, y: 0, z }));
const raw = trackFromPolyline({ points: pts, width: W, closed: true }, {});
const sm = trackFromPolyline({ points: pts, width: W, closed: true }, { resampleSmooth: { spacing: S } });
writeFileSync(path.join(out, 'w2_melbourne_points.json'), JSON.stringify({ width: W, spacing: S, raw: raw.points.map(p => [p.x, p.z]), edges: raw.roadEdges.map(e => e.map(p => [p.x, p.z])), smooth: sm.points.map(p => [p.x, p.z]) }));
console.log('w2_example: Melbourne width', W, 'smooth spacing', S, 'raw n', raw.points.length, 'smooth n', sm.points.length);
