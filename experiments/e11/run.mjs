// E11 evaluation run (PROTOCOL.md sections 3-4). Writes <outDir>/run.json (tracks and drives; no timing, no environment) for analyze.mjs.
// Usage: experiments/e11/build.sh && node experiments/e11/run.mjs <outDir> [--smoke]
//   --smoke: debug seeds 8000001..8000002 only (never the evaluation seeds).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateTrack, computeMetrics, validateTrack, DEFAULTS, VERSION } from './build/e11.mjs';
import { drive, PROFILES } from './driver.mjs';
import { SEEDS } from '../e6/lib.mjs';
import { HANDLES } from './handles.mjs';

const outDir = process.argv[2];
if (!outDir) { console.error('usage: run.mjs <outDir> [--smoke]'); process.exit(2); }
const SMOKE = process.argv.includes('--smoke');
const EVAL_SEEDS = SEEDS.slice(140, 200);
const DEBUG_SEEDS = [8000001, 8000002, 8000003, 8000004, 8000005, 8000006, 8000007, 8000008];
if (DEBUG_SEEDS.some(s => SEEDS.includes(s))) throw new Error('debug seed inside SEEDS');
const seeds = SMOKE ? DEBUG_SEEDS.slice(0, 2) : EVAL_SEEDS;

// Distinct conditions (key = canonical JSON of the overrides).
const conditions = new Map();
for (const levels of Object.values(HANDLES)) for (const [, over] of levels) conditions.set(JSON.stringify(over), over);

const tracks = [], drives = [];
let failures = 0;
for (const [key, over] of conditions) {
  for (const seed of seeds) {
    let track;
    try { track = generateTrack({ ...DEFAULTS, obstacles: 0, seed, ...over }); }
    catch (e) { failures++; tracks.push({ condition: key, seed, error: String(e && e.message || e) }); continue; }
    const m = computeMetrics(track), v = validateTrack(track);
    const mtr = v.checks.find(c => c.id === 'min-turn-radius');
    tracks.push({ condition: key, seed, length: m.length, meanAbsCurvature: m.meanAbsCurvature, maxAbsCurvature: m.maxAbsCurvature,
      p95AbsCurvature: m.p95AbsCurvature, straightLengthFraction: m.straightLengthFraction, turnCount: m.turnCount, maxAbsSlope: m.maxAbsSlope,
      validatorOk: v.ok, minTurnRadius: mtr ? mtr.stats.minRadius : null, patternsInserted: track.patternReport ? track.patternReport.inserted : 0 });
    for (const [driver, profile] of Object.entries(PROFILES)) drives.push({ condition: key, seed, driver, ...drive(track, profile) });
  }
  process.stderr.write(`[e11] ${key} done (${drives.length} drives)\n`);
}
const out = { experiment: 'E11', version: VERSION, smoke: SMOKE, seeds, conditions: [...conditions.keys()], generationFailures: failures, tracks, drives };
const text = JSON.stringify(out) + '\n';
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/run.json`, text);
console.log(JSON.stringify({ outDir, sha256: createHash('sha256').update(text).digest('hex'), tracks: tracks.length, drives: drives.length, generationFailures: failures }));
