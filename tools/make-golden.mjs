// Usage: node tools/make-golden.mjs   (rewrites tests/fixtures/golden-v05.json from the CURRENT code)
// Only run this on purpose: it re-baselines the geometry hashes.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCore, repo } from './build-core.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'tl-golden-'));
const { core, coins } = await buildCore(repo, tmp);
const legacy = JSON.parse(readFileSync(join(repo, 'tests/fixtures/legacy-layouts.json'), 'utf8'));
const fields = legacy.fields;
const patternFields = [...fields, 'patternReport'];
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const hashTrack = (track, keys) => sha(Object.fromEntries(keys.map(k => [k, track[k]])));
const entry = (name, params, keys) => {
  const track = core.generateTrack(params);
  return { name, params, sha256: hashTrack(track, keys), coinsSha256: sha(coins.generateCoins(track)) };
};
const patternBase = { density: 10, obstacles: 3 };
const golden = {
  source: 'v0.5 deterministic-math (src/detmath.ts) golden hashes; legacy-layouts.json is kept as the v0.3 historical record',
  hashing: 'sha256(JSON.stringify(Object.fromEntries(fields.map(k => [k, generateTrack(params)[k]])))) as lower-case hex; coinsSha256 = sha256(JSON.stringify(generateCoins(track)))',
  fields, patternFields,
  cases: legacy.cases.map((c, i) => entry(`legacy-case-${i + 1}`, c.params, fields)),
  patternCases: [
    entry('right-angle', { ...patternBase, seed: 42, cornerPattern: 'right-angle', cornerCount: 2, cornerStrength: 60 }, patternFields),
    entry('hairpin', { ...patternBase, seed: 7, cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 }, patternFields),
    entry('s-curve', { ...patternBase, seed: 99999, cornerPattern: 's-curve', cornerCount: 3, cornerStrength: 40, curves: 8 }, patternFields),
    entry('right-angle-wide-hilly', { seed: 2147483647, curves: 10, width: 80, height: 200, cornerPattern: 'right-angle', cornerCount: 3, cornerStrength: 100 }, patternFields),
    entry('hairpin-narrow-flat', { seed: 0, curves: 6, width: 20, height: 0, straight: 0, cornerPattern: 'hairpin', cornerCount: 2, cornerStrength: 20 }, patternFields),
  ],
};
writeFileSync(join(repo, 'tests/fixtures/golden-v05.json'), JSON.stringify(golden, null, 2) + '\n');
rmSync(tmp, { recursive: true, force: true });
console.log(`wrote golden-v05.json: ${golden.cases.length} parameter cases, ${golden.patternCases.length} pattern cases`);
