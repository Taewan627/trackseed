// EXPLORATORY (not pre-registered): distribution of the maximum longitudinal slope under the default parameters.
// Seeds 10000..10199 (outside SEEDS of experiments/e1/cases.mjs; checked below). Heights 0..200 step 10, sizes 1..3.
// Usage: npm run build:cli && node experiments/e8/exploratory.mjs > experiments/e8/exploratory-output.txt
import { SEEDS } from '../e1/cases.mjs';
import { V12_VALIDATOR_PIN } from '../_v12-validator.mjs'; // pin the validator rule of the committed results (v1.3 adds SHARP_VERTEX, UNDERSAMPLED switched off here)
const core = await import(new URL('../../cli-dist/core.js', import.meta.url));
const val = await import(new URL('../../cli-dist/validate.js', import.meta.url));
const seeds = Array.from({ length: 200 }, (_, i) => 10000 + i);
const overlap = seeds.filter(s => SEEDS.includes(s));
if (overlap.length) throw new Error('exploration seeds overlap SEEDS: ' + overlap);
const Z = 1.959963984540054;
const wilson = (k, n) => { const p = k / n, d = 1 + Z * Z / n, c = (p + Z * Z / (2 * n)) / d, h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
const q = (s, f) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
console.log('height\tsize\tn\twarnRate\twilsonLo\twilsonHi\tmedianMaxSlope\tp95MaxSlope\tmedianElevRange');
const heights = []; for (let h = 0; h <= 200; h += 10) heights.push(h);
for (const size of [1, 2, 3]) for (const height of heights) {
  const slopes = [], ranges = []; let warn = 0;
  for (const seed of seeds) {
    const t = core.generateTrack({ seed, size, height }); // all other parameters DEFAULTS (autoJoin tangent)
    const r = val.validateTrack(t, V12_VALIDATOR_PIN);
    const s = r.checks.find(c => c.id === 'max-slope').stats.maxAbsSlope; slopes.push(s);
    if (r.violations.some(v => v.code === 'MAX_SLOPE')) warn++;
    ranges.push(t.bounds.maxY - t.bounds.minY);
  }
  slopes.sort((a, b) => a - b); ranges.sort((a, b) => a - b);
  const [lo, hi] = wilson(warn, seeds.length);
  console.log([height, size, seeds.length, (warn / seeds.length).toFixed(4), lo.toFixed(4), hi.toFixed(4), q(slopes, .5).toFixed(4), q(slopes, .95).toFixed(4), q(ranges, .5).toFixed(2)].join('\t'));
}
// finer scan at the slider grid (step 5), size 2 (the default configuration)
console.log('\nfine scan, size 2, step 5');
for (let height = 5; height <= 40; height += 5) {
  let warn = 0; for (const seed of seeds) if (val.validateTrack(core.generateTrack({ seed, size: 2, height }), V12_VALIDATOR_PIN).violations.some(v => v.code === 'MAX_SLOPE')) warn++;
  console.log(`height ${height}: ${warn}/200 warn (${(warn / 2).toFixed(1)}%)`);
}
// default configuration (DEFAULTS except seed and height; size 2, autoJoin tangent): validator ok (no error-severity violation)
console.log('\ndefault configuration, validator ok (errors only) and elevation range');
for (const height of [15, 20, 25, 80]) {
  let ok = 0, minRange = Infinity; for (const seed of seeds) { const t = core.generateTrack({ seed, height }); if (val.validateTrack(t, V12_VALIDATOR_PIN).ok) ok++; minRange = Math.min(minRange, t.bounds.maxY - t.bounds.minY); }
  console.log(`height ${height}: ok ${ok}/200, minimum elevation range ${minRange.toFixed(2)}`);
}
