// E6 HELD-OUT evaluation (PROTOCOL 7): the frozen rule and the legacy rules, through validateTrack, on the HELD-OUT seeds. Run ONCE after the freeze commit.
// Usage: npm run build:cli && node experiments/e6/run-heldout.mjs [outDir]
// Smoke test of the code on two DEV seeds (never HELD-OUT): E6_SMOKE=1 node experiments/e6/run-heldout.mjs /tmp/somewhere
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
  val, dm, HELD_SEEDS, DEV_SEEDS, negativeCases, baseCases, autoStraightCases, gen, synthetic, candidates, applyDefect, sizeOf,
  OPERATORS, PLANAR_OPS, MODES, wilson, r6, sha256hex, RAD2DEG,
} from './lib.mjs';
import { rowsOf, choose } from './select.mjs';

const root = new URL('./results/', import.meta.url).pathname;
const outDir = process.argv[2] ?? `${root}heldout`;
const SEEDS = process.env.E6_SMOKE ? DEV_SEEDS.slice(0, 2) : HELD_SEEDS;
const frozen = JSON.parse(readFileSync(`${root}dev/FROZEN.json`, 'utf8'));
if (!frozen.criterionMet) throw new Error('DEV criterion not met; no HELD-OUT evaluation of a frozen rule: ' + frozen.reason);

const BIG = { maxViolationsPerCheck: 1e9 };
const RULES = {
  frozen: { ...BIG, ...frozen.options },
  ratio: { ...BIG, closureTangentMode: 'ratio' },
  absolute: { ...BIG, closureTangentMode: 'absolute' },
};
const RULE_NAMES = Object.keys(RULES);
const KINK_CODES = new Set(['CLOSURE_TANGENT', 'LOCAL_KINK']);
const flaggedAnywhere = r => r.violations.some(v => KINK_CODES.has(v.code));
const flaggedIn = (r, win) => r.violations.some(v => KINK_CODES.has(v.code) && win.has(v.index));
const slopeFailures = r => r.checks.find(c => c.id === 'max-slope').failures;

// DEV-best configuration of every family (evaluated through the feature path for transparency; the frozen rule is the chosen one).
const dev = JSON.parse(readFileSync(`${root}dev/candidates.json`, 'utf8')), devRows = rowsOf(dev), cands = candidates();
const familyBest = {};
for (const f of ['A1', 'A2', 'C', 'B', 'B+A2', 'B+C']) { const s = choose(devRows, f); if (s) familyBest[f] = cands[s.chosen.id]; }

const gens = { N1: [0, 0], N2: [0, 0], bases: [0, 0], autoStraight: [0, 0] };
const negCounts = {}; // key `${rule}|${set}|${mode}` -> [flagged, n]
const bump = (m, k, hit) => { const c = (m[k] ??= [0, 0]); c[1]++; if (hit) c[0]++; };
const rows = []; // per defect instance (all rules), for the instance file
const agg = {};  // `${rule}|${op}|${mode}|${level}|${cls}` -> [n, hit]; and validator-level
const vlev = {}; // `${rule}|${op}|${level}` -> [baseOkCount, baseOkAndDefectNotOk]
const fam = {};  // `${family}|${op}|${cls}` -> [n, hit]
const heightAgg = {}; // level -> [n, increasedSlopeFailures, anyNewErrorWhereBaseOk, baseOk]
const autoRows = [];

for (const seed of SEEDS) {
  for (const cs of negativeCases(seed)) {
    const t = gen(cs.params);
    if (!t) { gens[cs.set][1]++; continue; }
    gens[cs.set][0]++;
    for (const rn of RULE_NAMES) {
      const f = flaggedAnywhere(val.validateTrack(t, RULES[rn]));
      bump(negCounts, `${rn}|${cs.set}|all`, f); bump(negCounts, `${rn}|${cs.set}|${cs.mode}`, f);
    }
  }
  for (const b of baseCases(seed)) {
    const base = gen(b.params);
    if (!base) { gens.bases[1]++; continue; }
    gens.bases[0]++;
    const baseRes = Object.fromEntries(RULE_NAMES.map(rn => [rn, val.validateTrack(base, RULES[rn])]));
    for (const op of Object.keys(OPERATORS)) for (const level of OPERATORS[op]) {
      const d = applyDefect(base, b.key, op, level), n = d.track.points.length - 1;
      if (op === 'heightStep') {
        const r = val.validateTrack(d.track, RULES.frozen), cell = (heightAgg[level] ??= [0, 0, 0, 0]);
        cell[0]++; if (slopeFailures(r) > slopeFailures(baseRes.frozen)) cell[1]++;
        if (baseRes.frozen.ok) { cell[3]++; if (!r.ok) cell[2]++; }
        continue;
      }
      const { S, cls } = sizeOf(d.track.points, d.window);
      const win = new Set(d.window.map(j => ((j % n) + n) % n));
      const row = { seed, mode: b.mode, curves: b.curves, straight: b.straight, width: b.width, op, level, S: r6(S), cls, index: d.meta.index ?? '', sign: d.meta.sign };
      for (const rn of RULE_NAMES) {
        const r = val.validateTrack(d.track, RULES[rn]), hit = flaggedIn(r, win);
        row[rn] = hit ? 1 : 0;
        bump(agg, `${rn}|${op}|${b.mode}|${level}|${cls}`, hit);
        if (baseRes[rn].ok) { const c = (vlev[`${rn}|${op}|${level}`] ??= [0, 0]); c[0]++; if (!r.ok) c[1]++; }
      }
      const profile = val.kinkProfile(d.track.points, d.track.params.width);
      for (const [f, cd] of Object.entries(familyBest)) {
        let hit = false; for (const j of win) if (val.kinkFlagAt(profile, cd.parts, cd.opts, j)) { hit = true; break; }
        row[`fam_${f}`] = hit ? 1 : 0; bump(fam, `${f}|${op}|${cls}`, hit);
      }
      rows.push(row);
    }
  }
  // Auto with straight > 0 (PROTOCOL 3.3), oracle from the generator's own construction
  for (const cs of autoStraightCases(seed)) {
    const t = gen(cs.params);
    if (!t) { gens.autoStraight[1]++; continue; }
    gens.autoStraight[0]++;
    const wp = t.waypoints, m = wp.length, st = t.straightSegments;
    const at = k => wp[((k % m) + m) % m];
    const startTan = i => { const b = at(i), c = at(i + 1); return st[((i % m) + m) % m] ? { x: c.x - b.x, z: c.z - b.z } : { x: 0.5 * (c.x - at(i - 1).x), z: 0.5 * (c.z - at(i - 1).z) }; };
    const endTan = i => { const b = at(i), c = at(i + 1); return st[((i % m) + m) % m] ? { x: c.x - b.x, z: c.z - b.z } : { x: 0.5 * (at(i + 2).x - b.x), z: 0.5 * (at(i + 2).z - b.z) }; };
    let join = 0;
    for (let k = 0; k < m; k++) {
      const u = endTan(k - 1), v = startTan(k);
      join = Math.max(join, Math.abs(dm.datan2(u.x * v.z - u.z * v.x, u.x * v.x + u.z * v.z)) * RAD2DEG);
    }
    const row = { seed, join: r6(join), group: join >= 30 ? 'genuine' : join < 10 ? 'smooth' : 'middle' };
    for (const rn of RULE_NAMES) row[rn] = flaggedAnywhere(val.validateTrack(t, RULES[rn])) ? 1 : 0;
    autoRows.push(row);
  }
}
for (const t of synthetic()) for (const rn of RULE_NAMES) bump(negCounts, `${rn}|N3|all`, flaggedAnywhere(val.validateTrack(t.track, RULES[rn])));

// ---- assemble the deterministic result
const W = ([k, n]) => { const w = wilson(k, n); return { k, n, p: r6(w.p), lo: r6(w.lo), hi: r6(w.hi) }; };
const result = { protocol: 'experiments/e6/PROTOCOL.md', split: process.env.E6_SMOKE ? 'SMOKE (2 DEV seeds)' : 'HELD-OUT', seeds: SEEDS, frozen: { id: frozen.id, label: frozen.label, options: frozen.options },
  generated: gens, familyBestDev: Object.fromEntries(Object.entries(familyBest).map(([f, c]) => [f, { id: c.id, label: c.label }])), negatives: {}, defects: {}, validatorLevel: {}, heightStep: {}, perMode: {}, autoStraight: {}, familyBest: {} };
for (const rn of RULE_NAMES) {
  result.negatives[rn] = {};
  for (const set of ['N1', 'N2', 'N3']) result.negatives[rn][set] = W(negCounts[`${rn}|${set}|all`]);
  for (const [mode] of MODES) { const k = `${rn}|${mode === 'auto' ? 'N2' : 'N1'}|${mode}`; result.negatives[rn][`mode:${mode}`] = W(negCounts[k] ?? [0, 0]); }
}
const sum = (rn, op, pick) => { const out = [0, 0]; for (const [k, v] of Object.entries(agg)) { const [r, o, mode, level, cls] = k.split('|'); if (r === rn && o === op && pick({ mode, level: +level, cls })) { out[0] += v[0]; out[1] += v[1]; } } return out; };
for (const rn of RULE_NAMES) {
  result.defects[rn] = {}; result.perMode[rn] = {}; result.validatorLevel[rn] = {};
  for (const op of PLANAR_OPS) {
    const levels = {};
    for (const level of OPERATORS[op]) {
      const cell = { all: W(sum(rn, op, x => x.level === level)) };
      for (const cls of ['must', 'grey', 'sub']) cell[cls] = W(sum(rn, op, x => x.level === level && x.cls === cls));
      const v = vlev[`${rn}|${op}|${level}`] ?? [0, 0]; cell.validatorLevel = W([v[1], v[0]]);
      levels[level] = cell;
    }
    result.defects[rn][op] = { levels, mustAll: W(sum(rn, op, x => x.cls === 'must')), greyAll: W(sum(rn, op, x => x.cls === 'grey')), subAll: W(sum(rn, op, x => x.cls === 'sub')) };
    result.perMode[rn][op] = Object.fromEntries(MODES.map(([mode]) => [mode, W(sum(rn, op, x => x.mode === mode && x.cls === 'must'))]));
  }
}
for (const [level, c] of Object.entries(heightAgg)) result.heightStep[level] = { instances: c[0], maxSlopeFailuresIncreased: W([c[1], c[0]]), baseOkNowNotOk: W([c[2], c[3]]) };
for (const group of ['genuine', 'smooth', 'middle']) {
  result.autoStraight[group] = { n: autoRows.filter(r => r.group === group).length };
  for (const rn of RULE_NAMES) result.autoStraight[group][rn] = W([autoRows.filter(r => r.group === group && r[rn]).length, autoRows.filter(r => r.group === group).length]);
}
for (const f of Object.keys(familyBest)) {
  result.familyBest[f] = {};
  for (const op of PLANAR_OPS) { const c = fam[`${f}|${op}|must`] ?? [0, 0]; result.familyBest[f][op] = W(c); }
  result.familyBest[f].note = 'recall on must-detect instances via the feature path; false-positive rates of the family bests are on DEV only (candidates.json)';
}
const text = JSON.stringify(result, null, 1) + '\n';
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/heldout.json`, text);
const header = ['seed', 'mode', 'curves', 'straight', 'width', 'op', 'level', 'S', 'cls', 'index', 'sign', ...RULE_NAMES, ...Object.keys(familyBest).map(f => `fam_${f}`)];
const csv = [header.join(','), ...rows.map(r => header.map(h => r[h] ?? '').join(','))].join('\n') + '\n';
const gz = gzipSync(Buffer.from(csv), { level: 9 });
writeFileSync(`${outDir}/instances.csv.gz`, gz);
writeFileSync(`${outDir}/auto-straight.json`, JSON.stringify(autoRows) + '\n');
console.log(JSON.stringify({ outDir, heldoutJsonSha256: sha256hex(text), instancesGzSha256: createHash('sha256').update(gz).digest('hex'), instances: rows.length, generated: gens }));
