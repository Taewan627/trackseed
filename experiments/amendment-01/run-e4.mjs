// AMENDMENT-01 copy of e4/run.mjs: identical except the validator options (env CLOSURE_TANGENT_MODE=ratio|absolute). Original:  node build/run.mjs sanity <out.json> | node build/run.mjs baselines <out.csv.gz>
// Baseline grid per PROTOCOL.md: seeds(50) x curves x width x size x height, generators B1,B2, spacing 8 (primary), 4 and 12 (sensitivity).
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { validateTrack } from '../../src/validate.ts';
import { V12_VALIDATOR_PIN } from '../_v12-validator.mjs';
import { computeMetrics } from '../../src/metrics.ts';
import { dcos, dsin } from '../../src/detmath.ts';
import { SEEDS, LEVELS } from '../e2/grid.mjs';
import { generateB1 } from '../e4/baselines/b1.ts';
import { generateB2 } from '../e4/baselines/b2.ts';
import { finishTrack, resample } from '../e4/baselines/common.ts';
const MODE = process.env.CLOSURE_TANGENT_MODE || 'ratio';
if (!['ratio', 'absolute'].includes(MODE)) throw new Error('CLOSURE_TANGENT_MODE');
// pin the validator rule in force when these results were produced (legacy modes run neither SHARP_VERTEX nor UNDERSAMPLED; stated explicitly): experiments/_v12-validator.mjs
const VOPTS = { closureTangentMode: MODE, ...V12_VALIDATOR_PIN };

const METRICS = ['sampleCount', 'length', 'boundingBoxArea', 'straightLengthFraction', 'meanAbsCurvature', 'maxAbsCurvature', 'p95AbsCurvature',
  'curvatureEntropyBits', 'turnCount', 'elevationRange', 'maxAbsSlope', 'meanAbsSlope', 'totalTurningDegrees'];
const HEADER = ['generator', 'spacing', 'curves', 'width', 'size', 'height', 'seed', 'generated', 'error', 'ok', 'codes', ...METRICS].join(',');
const fmt = x => String(Number(x.toPrecision(6)));
const GEN = { B1: generateB1, B2: generateB2 };
const gz = t => gzipSync(Buffer.from(t), { level: 9 });
const sha = b => createHash('sha256').update(b).digest('hex');
const [kind, outFile] = process.argv.slice(2);

if (kind === 'sanity') {
  // perfect circle, radius 300, 8-unit spacing, through the common code: must validate ok at every width
  const dense = Array.from({ length: 2000 }, (_, i) => { const a = i / 2000 * Math.PI * 2; return { x: 300 * dcos(a), z: 300 * dsin(a) }; });
  const res = [20, 40, 80].map(width => {
    const t = finishTrack(resample(dense, 8), 1, width, 0, 1), v = validateTrack(t, VOPTS);
    return { width, points: t.points.length, ok: v.ok, codes: [...new Set(v.violations.map(x => x.code))] };
  });
  writeFileSync(outFile, JSON.stringify(res) + '\n'); console.log(JSON.stringify(res));
  if (!res.every(r => r.ok)) { console.error('SANITY GATE FAILED'); process.exit(1); }
} else if (kind === 'baselines') {
  const rows = [HEADER];
  for (const spacing of [8, 4, 12]) for (const g of ['B1', 'B2'])
    for (const curves of LEVELS.curves) for (const width of LEVELS.width) for (const size of LEVELS.size) for (const height of LEVELS.height) for (const seed of SEEDS) {
      const base = [g, spacing, curves, width, size, height, seed];
      let t, error = '';
      try { t = GEN[g]({ curves, width, size, height, seed, spacing }); } catch (e) { error = (e && e.name) || 'Error'; }
      if (!t) { rows.push([...base, 0, error, '', '', ...METRICS.map(() => '')].join(',')); continue; }
      const v = validateTrack(t, VOPTS), m = computeMetrics(t);
      rows.push([...base, 1, '', v.ok ? 1 : 0, [...new Set(v.violations.map(x => x.code))].sort().join(';'), ...METRICS.map(k => fmt(m[k]))].join(','));
    }
  const buf = gz(rows.join('\n') + '\n'); writeFileSync(outFile, buf);
  console.log(JSON.stringify({ file: outFile, rows: rows.length - 1, sha256: sha(buf) }));
} else { console.error('usage: sanity|baselines <out>'); process.exit(2); }
