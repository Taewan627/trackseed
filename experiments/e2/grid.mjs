// E2 grid (see PROTOCOL.md): full factorial, 48,600 cases.
import { SEEDS as E1_SEEDS } from '../e1/cases.mjs';
export const SEEDS = E1_SEEDS.slice(0, 50);
export const MODES = [
  ['auto', { cornerPattern: 'auto' }],
  ['right-angle', { cornerPattern: 'right-angle', cornerCount: 2, cornerStrength: 60 }],
  ['hairpin', { cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 }],
  ['s-curve', { cornerPattern: 's-curve', cornerCount: 3, cornerStrength: 40 }],
];
export const LEVELS = { curves: [3, 6, 10], straight: [0, 0.3, 0.6], width: [20, 40, 80], size: [1, 2, 3], height: [0, 80, 200] };
export const CASES = [];
for (const [mode, over] of MODES)
  for (const curves of LEVELS.curves) for (const straight of LEVELS.straight) for (const width of LEVELS.width)
    for (const size of LEVELS.size) for (const height of LEVELS.height) for (const seed of SEEDS)
      // v1.1: pin the v1.0.0 join so committed results reproduce (docs/generator-auto-join.md). Used by e2/run.mjs,
      // amendment-01/run-e2.mjs and amendment-01/examples.mjs, which all generate from CASES[i].params.
      CASES.push({ index: CASES.length, mode, curves, straight, width, size, height, seed, params: { ...over, curves, straight, width, size, height, seed, autoJoin: 'legacy' } });
if (CASES.length !== 48600) throw new Error('expected 48600 cases');
