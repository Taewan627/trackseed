// AMENDMENT-01 copy of e2/run.mjs: identical except the validator options. Usage (after build.sh):
//   [CLOSURE_TANGENT_MODE=absolute] node build/run-e2.mjs validity <det.csv.gz>   (timing/rep kinds are not used by the amendment)
// Original header: node build/run.mjs validity <det.csv.gz>
//                      node build/run.mjs timing <det.csv.gz> <timing.csv.gz>
//                      node build/run.mjs rep <out.json>     (one repetition of the 500-case subset)
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { generateTrack } from '../../src/core.ts';
import { validateTrack } from '../../src/validate.ts';
import { V12_VALIDATOR_PIN } from '../_v12-validator.mjs';
import { computeMetrics } from '../../src/metrics.ts';
import { CASES } from '../e2/grid.mjs';

const MODE = process.env.CLOSURE_TANGENT_MODE || 'ratio'; // 'ratio' (v0.5.1 default) or 'absolute' (v0.5.0 rule)
if (!['ratio', 'absolute'].includes(MODE)) throw new Error('CLOSURE_TANGENT_MODE');
// pin the validator rule in force when these results were produced (legacy modes run neither SHARP_VERTEX nor UNDERSAMPLED; stated explicitly): experiments/_v12-validator.mjs
const VOPTS = { closureTangentMode: MODE, ...V12_VALIDATOR_PIN };

const METRICS = ['sampleCount', 'length', 'boundingBoxArea', 'straightLengthFraction', 'meanAbsCurvature', 'maxAbsCurvature', 'p95AbsCurvature',
  'curvatureEntropyBits', 'turnCount', 'elevationRange', 'maxAbsSlope', 'meanAbsSlope', 'totalTurningDegrees'];
const HEADER = ['index', 'mode', 'curves', 'straight', 'width', 'size', 'height', 'seed', 'generated', 'error', 'ok', 'codes', 'inserted', 'attempts', ...METRICS].join(',');
const fmt = x => String(Number(x.toPrecision(6)));

function evaluate(c, timing) {
  const t0 = performance.now();
  let track, error = '';
  try { track = generateTrack(c.params); } catch (e) { error = (e && e.name) || 'Error'; }
  const t1 = performance.now();
  const base = [c.index, c.mode, c.curves, c.straight, c.width, c.size, c.height, c.seed];
  if (!track) return { row: [...base, 0, error, '', '', '', '', ...METRICS.map(() => '')].join(','), gen: t1 - t0, val: null };
  const t2 = performance.now();
  const v = validateTrack(track, VOPTS);
  const t3 = performance.now();
  const m = computeMetrics(track);
  const codes = [...new Set(v.violations.map(x => x.code))].sort().join(';');
  return { row: [...base, 1, '', v.ok ? 1 : 0, codes, track.patternReport.inserted, track.patternReport.attempts, ...METRICS.map(k => fmt(m[k]))].join(','), gen: t1 - t0, val: t3 - t2 };
}
const gz = text => gzipSync(Buffer.from(text), { level: 9 });
const sha = buf => createHash('sha256').update(buf).digest('hex');
const [kind, ...args] = process.argv.slice(2);

if (kind === 'validity') {
  const rows = [HEADER];
  for (const c of CASES) rows.push(evaluate(c).row);
  const buf = gz(rows.join('\n') + '\n');
  writeFileSync(args[0], buf);
  console.log(JSON.stringify({ file: args[0], rows: rows.length - 1, sha256: sha(buf) }));
} else if (kind === 'timing') {
  for (let i = 0; i < CASES.length; i += 486) evaluate(CASES[i]); // 100 untimed warm-up cases
  const rows = [HEADER], tim = ['index,generation_ms,validation_ms'];
  const t0 = performance.now();
  for (const c of CASES) {
    const r = evaluate(c);
    rows.push(r.row); tim.push(`${c.index},${r.gen.toFixed(3)},${r.val === null ? '' : r.val.toFixed(3)}`);
  }
  const wall = performance.now() - t0;
  const b1 = gz(rows.join('\n') + '\n'), b2 = gz(tim.join('\n') + '\n');
  writeFileSync(args[0], b1); writeFileSync(args[1], b2);
  console.log(JSON.stringify({ det: args[0], detSha256: sha(b1), timing: args[1], wallSeconds: +(wall / 1000).toFixed(1) }));
} else if (kind === 'rep') {
  const subset = Array.from({ length: 500 }, (_, i) => CASES[Math.floor(i * CASES.length / 500)]);
  for (const c of subset.slice(0, 100)) evaluate(c);
  const gen = [], val = [];
  for (const c of subset) { const r = evaluate(c); gen.push(+r.gen.toFixed(3)); val.push(r.val === null ? null : +r.val.toFixed(3)); }
  writeFileSync(args[0], JSON.stringify({ indices: subset.map(c => c.index), gen, val }));
} else { console.error('usage: validity|timing|rep'); process.exit(2); }
