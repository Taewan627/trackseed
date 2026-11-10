// Prints, for the first grid cases (E2 order) of each category, the seam turn theta0 vs the neighbourhood maximum under the v0.5.1 rule.
//  A) Auto-mode tracks that still fail CLOSURE_TANGENT under 'ratio'
//  B) pattern-mode tracks that failed under the v0.5.0 rule ('absolute') and pass under 'ratio'
import { writeFileSync } from 'node:fs';
import { generateTrack } from '../../src/core.ts';
import { validateTrack } from '../../src/validate.ts';
import { CASES } from '../e2/grid.mjs';
const A = [], B = [];
let autoN = 0, autoFail = 0;
for (const c of CASES) {
  if (A.length >= 3 && B.length >= 3) break;
  let t; try { t = generateTrack(c.params); } catch { continue; }
  const r = validateTrack(t), a = validateTrack(t, { closureTangentMode: 'absolute' });
  const cl = r.checks.find(x => x.id === 'closure'), has = x => x.violations.some(v => v.code === 'CLOSURE_TANGENT');
  const row = { index: c.index, mode: c.mode, curves: c.curves, straight: c.straight, width: c.width, size: c.size, height: c.height, seed: c.seed,
    theta0: +cl.stats.tangentDegrees.toFixed(3), neighbourhoodMax: +cl.stats.neighbourhoodMaxDegrees.toFixed(3),
    ratio: cl.stats.tangentRatio === undefined ? null : +cl.stats.tangentRatio.toFixed(3), failsRatio: has(r), failsAbsolute: has(a) };
  if (c.mode === 'auto' && has(r) && A.length < 3) A.push(row);
  if (c.mode !== 'auto' && has(a) && !has(r) && B.length < 3) B.push(row);
}
const out = { A_autoStillFailing: A, B_patternRescued: B };
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n'); console.log(JSON.stringify(out, null, 1));
