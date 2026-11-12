// E9 ADDENDUM-02 harness (ADDENDUM-02.md): every polyline of build/polylines/* (E9 sources + gen-trackseed), arms raw / cs25 / cs10 under validator v1.3 defaults,
// and raw / cs25 under the v1.2 pin (regression against the committed E9 table).
// Usage: node addendum-02.mjs <outdir>   (needs `npm run build:cli`, a completed extract.sh and adapters/gen_trackseed.mjs)
// Writes <outdir>/tracks.csv, sources.json, env.json (deterministic) and timing.json (excluded from the hash).
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..');
import { V12_VALIDATOR_PIN } from '../_v12-validator.mjs';
const lib = f => import(pathToFileURL(join(root, 'cli-dist', f)).href);
const { trackFromPolyline, parsePolylineJson } = await lib('polyline.js');
const { validateTrack } = await lib('validate.js');
const out = resolve(process.argv[2] ?? (console.error('usage: node addendum-02.mjs <outdir>'), process.exit(2)));
mkdirSync(out, { recursive: true });
const polyRoot = process.env.E9_POLYLINES ? resolve(process.env.E9_POLYLINES) : join(here, 'build', 'polylines'); // E9_POLYLINES: smoke tests on synthetic data only
const SOURCES = readdirSync(polyRoot).filter(d => statSync(join(polyRoot, d)).isDirectory()).sort();
const ARMS = [['raw', null], ['cs25', 0.25], ['cs10', 0.10]];
const HEADER = ['source', 'id', 'run', 'arm', 'width', 'spacing', 'outcome13', 'errors13', 'warnings13', 'outcome12', 'errors12', 'n_in', 'dup_removed', 'n_used', 'share12', 'maxTurn', 'medSpacing', 'allInt'];
const rows = [HEADER.join(',')], sourcesInfo = {};
const codes = (r, sev) => [...new Set(r.violations.filter(x => x.severity === sev).map(x => x.code))].sort().join(';');
const num = x => (Number.isFinite(x) ? String(x) : '');
const timingTargets = [];
function evalOne(raw, W, options, withPin) {
  const track = trackFromPolyline({ points: raw, width: W, closed: true }, options);
  const v13 = validateTrack(track), v12 = withPin ? validateTrack(track, V12_VALIDATOR_PIN) : null;
  return { track, v13, v12 };
}
for (const source of SOURCES) {
  const dir = join(polyRoot, source);
  const manifest = readFileSync(join(dir, 'manifest.tsv'), 'utf8').trim().split('\n').slice(1).map(l => l.split('\t'));
  const fails = readFileSync(join(dir, 'failures.tsv'), 'utf8').trim().split('\n').slice(1).filter(Boolean);
  sourcesInfo[source] = { unit: manifest[0]?.[3], produced: manifest.length, generationFailures: fails.length };
  for (const id of manifest.map(r => r[0]).sort()) {
    const doc = JSON.parse(readFileSync(join(dir, id + '.json'), 'utf8'));
    const raw = parsePolylineJson(JSON.stringify(doc));
    const allInt = doc.points.every(p => Number.isInteger(p[0]) && Number.isInteger(p[1])) ? 1 : 0;
    const widths = [['main', doc.width]]; if (source === 'real-tumftm') widths.push(['minw', doc.meta.width_min]);
    for (const [run, W] of widths) for (const [arm, f] of ARMS) {
      const s = f === null ? null : f * W, pin = arm !== 'cs10';
      let r; try { r = evalOne(raw, W, s === null ? {} : { resampleSmooth: { spacing: s } }, pin); } catch (e) { r = { error: String(e.message) }; }
      if (r.error) { rows.push([source, id, run, arm, num(W), num(s), 'error', '', '', pin ? 'error' : '', '', '', '', '', '', '', '', arm === 'raw' ? allInt : ''].join(',')); continue; }
      const us = r.v13.checks.find(c => c.id === 'undersampled')?.stats ?? {};
      rows.push([source, id, run, arm, num(W), num(s), r.v13.ok ? 'ok' : 'fail', codes(r.v13, 'error'), codes(r.v13, 'warning'), r.v12 ? (r.v12.ok ? 'ok' : 'fail') : '', r.v12 ? codes(r.v12, 'error') : '',
        r.track.inputPointCount, r.track.duplicatePointsRemoved, r.track.points.length - 1, num(us.share), num(us.maxTurnDegrees), num(us.medianSpacing), arm === 'raw' ? allInt : ''].join(','));
    }
    timingTargets.push(1);
  }
}
writeFileSync(join(out, 'tracks.csv'), rows.join('\n') + '\n');
writeFileSync(join(out, 'sources.json'), JSON.stringify(sourcesInfo, null, 1) + '\n');
const sums = join(polyRoot, 'SHA256SUMS');
writeFileSync(join(out, 'env.json'), JSON.stringify({ node: process.version, polylinesSha256: existsSync(sums) ? createHash('sha256').update(readFileSync(sums)).digest('hex') : null,
  trackseedPolylinesSha256: (() => { const d = join(polyRoot, 'gen-trackseed'); if (!existsSync(d)) return null; const h = createHash('sha256'); for (const f of readdirSync(d).sort()) h.update(f + '\n' + readFileSync(join(d, f))); return h.digest('hex'); })(),
  sources: SOURCES, arms: ARMS.map(a => a[0] + (a[1] === null ? '' : ` (spacing ${a[1]} x W)`)), validator: 'v1.3 library defaults; v1.2 pin on raw and cs25', rowCount: rows.length - 1 }, null, 1) + '\n');
console.log(`addendum-02.mjs: ${rows.length - 1} rows -> ${out}`);
