// E9 harness: validates and measures every extracted polyline (build/polylines/*) with the library of the built CLI (cli-dist), arms and widths as in PROTOCOL.md.
// Usage: node run.mjs <outdir>        (needs `npm run build:cli` and a completed extract.sh)
// Writes <outdir>/tracks.csv, <outdir>/sources.json, <outdir>/env.json (all deterministic) and <outdir>/timing.json (wall times; excluded from the determinism hash).
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..');
const lib = f => import(pathToFileURL(join(root, 'cli-dist', f)).href);
const { trackFromPolyline, parsePolylineJson } = await lib('polyline.js');
const { validateTrack } = await lib('validate.js');
const { computeMetrics } = await lib('metrics.js');
const out = resolve(process.argv[2] ?? (console.error('usage: node run.mjs <outdir>'), process.exit(2)));
mkdirSync(out, { recursive: true });
const polyRoot = process.env.E9_POLYLINES ? resolve(process.env.E9_POLYLINES) : join(here, 'build', 'polylines'); // E9_POLYLINES: smoke tests on synthetic data only
const SOURCES = readdirSync(polyRoot).filter(d => statSync(join(polyRoot, d)).isDirectory()).sort();
const NORM_N = 720;                       // PROTOCOL.md section 2 (norm-720 arm)
const SMOOTH_FACTOR = 0.25;               // smooth arm: s = 0.25 x width
const MET = ['meanAbsCurvatureNorm', 'p95AbsCurvatureNorm', 'maxAbsCurvatureNorm', 'curvatureEntropyBitsNorm', 'straightLengthFractionNorm', 'turnCountNorm'];
const HEADER = ['source', 'id', 'run', 'arm', 'width', 'spacing', 'outcome', 'errors', 'warnings', 'n_in', 'dup_removed', 'n_used', 'length', ...MET];
const rows = [HEADER.join(',')];
const sourcesInfo = {};
const perimeter = pts => { // closed perimeter of the raw list (closing edge only if the last point is not an exact copy of the first)
  const n = pts.length, m = n >= 2 && pts[0].x === pts[n - 1].x && pts[0].z === pts[n - 1].z ? n - 1 : n;
  let L = 0; for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % m]; L += Math.hypot(b.x - a.x, b.z - a.z); } return L;
};
function evaluate(raw, width, options) {
  const track = trackFromPolyline({ points: raw, width, closed: true }, options);
  const v = validateTrack(track);
  const m = computeMetrics(track);
  return { track, v, m };
}
const num = x => (Number.isFinite(x) ? String(x) : '');
function pushRow(source, id, run, arm, width, spacing, r) {
  if (r.error) { rows.push([source, id, run, arm, num(width), num(spacing), 'error', '', '', '', '', '', '', ...MET.map(() => '')].join(',')); return; }
  const errs = [...new Set(r.v.violations.filter(x => x.severity === 'error').map(x => x.code))].sort().join(';');
  const warns = [...new Set(r.v.violations.filter(x => x.severity === 'warning').map(x => x.code))].sort().join(';');
  rows.push([source, id, run, arm, num(width), num(spacing), r.v.ok ? 'ok' : 'fail', errs, warns, r.track.inputPointCount, r.track.duplicatePointsRemoved, r.track.points.length - 1, num(r.m.length), ...MET.map(k => num(r.m[k]))].join(','));
}
const timingTargets = [];
for (const source of SOURCES) {
  const dir = join(polyRoot, source);
  const manifest = readFileSync(join(dir, 'manifest.tsv'), 'utf8').trim().split('\n').slice(1).map(l => l.split('\t'));
  const fails = readFileSync(join(dir, 'failures.tsv'), 'utf8').trim().split('\n').slice(1).filter(Boolean);
  const reasons = {}; for (const f of fails) { const r = f.split('\t')[1]; reasons[r] = (reasons[r] ?? 0) + 1; }
  sourcesInfo[source] = { unit: manifest[0]?.[3], produced: manifest.length, generationFailures: fails.length, failureReasons: reasons };
  const ids = manifest.map(r => r[0]).sort();
  for (const id of ids) {
    const doc = JSON.parse(readFileSync(join(dir, id + '.json'), 'utf8'));
    const raw = parsePolylineJson(JSON.stringify(doc));
    const widths = [['main', doc.width]];
    if (source === 'real-tumftm') widths.push(['minw', doc.meta.width_min]);
    for (const [run, W] of widths) {
      for (const arm of ['raw', 'smooth']) {
        const s = SMOOTH_FACTOR * W;
        let r; try { r = evaluate(raw, W, arm === 'raw' ? {} : { resampleSmooth: { spacing: s } }); } catch (e) { r = { error: String(e.message) }; }
        pushRow(source, id, run, arm, W, arm === 'raw' ? '' : s, r);
      }
    }
    // norm-720 arm (metrics only)
    const S = perimeter(raw) / NORM_N;
    let r; try { const track = trackFromPolyline({ points: raw, width: doc.width, closed: true }, { resampleSmooth: { spacing: S } }); r = { track, v: { ok: true, violations: [] }, m: computeMetrics(track) }; } catch (e) { r = { error: String(e.message) }; }
    if (r.error) rows.push([source, id, 'main', 'n720', num(doc.width), num(S), 'error', '', '', '', '', '', '', ...MET.map(() => '')].join(','));
    else { const rr = rows.length; pushRow(source, id, 'main', 'n720', doc.width, S, r); rows[rr] = rows[rr].replace(',ok,', ',metrics,'); }
    timingTargets.push([source, id, raw, doc.width]);
  }
}
writeFileSync(join(out, 'tracks.csv'), rows.join('\n') + '\n');
writeFileSync(join(out, 'sources.json'), JSON.stringify(sourcesInfo, null, 1) + '\n');
const sums = join(polyRoot, 'SHA256SUMS');
writeFileSync(join(out, 'env.json'), JSON.stringify({ node: process.version, polylinesSha256: existsSync(sums) ? createHash('sha256').update(readFileSync(sums)).digest('hex') : null, sources: SOURCES, normN: NORM_N, smoothFactor: SMOOTH_FACTOR, validateOptions: 'library defaults', rowCount: rows.length - 1 }, null, 1) + '\n');
// timing pass (raw arm, main width): trackFromPolyline + validateTrack + computeMetrics, one pass per track after a warm-up
for (let i = 0; i < 20; i++) { const t = timingTargets[i % timingTargets.length]; try { evaluate(t[2], t[3], {}); } catch {} }
const timing = {};
for (const [source, id, raw, W] of timingTargets) {
  const t0 = performance.now(); try { evaluate(raw, W, {}); } catch {} const ms = performance.now() - t0;
  (timing[source] ??= []).push([id, Math.round(ms * 1000) / 1000]);
}
writeFileSync(join(out, 'timing.json'), JSON.stringify({ machine: { cpu: os.cpus()[0]?.model, cores: os.cpus().length, platform: `${os.platform()} ${os.arch()}`, node: process.version, memGB: Math.round(os.totalmem() / 2 ** 30) }, ms: timing }) + '\n');
console.log(`run.mjs: ${rows.length - 1} rows, ${timingTargets.length} tracks -> ${out}`);
