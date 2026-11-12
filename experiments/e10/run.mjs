// E10 harness (PROTOCOL.md): evaluates the five rules on the defect classes and the clean negatives.
// Usage: npm run build:cli && node experiments/e10/run.mjs <outdir>
// Smoke test on the debug seeds only (never on held-out seeds): E10_SMOKE=1 node experiments/e10/run.mjs /tmp/somewhere
// Writes <outdir>/instances.csv, clean.json, env.json (all deterministic: no clock, no Math.random).
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  HELD_SEEDS, DEBUG_SEEDS, RULE_IDS, RULES, negativeCases, baseCases, gen, synthetic, applyDefect, OPERATORS, PLANAR_OPS,
  PAIRED, ZIGZAG, POLY, DOWNSAMPLE, pairedSpike, zigzag, regularPolygon, downsample, sizeClass, allVertices,
  n4Cases, genDefaultJoin, baseInfo, evalRules, cleanRules, r6,
} from './lib.mjs';

const out = resolve(process.argv[2] ?? (console.error('usage: node run.mjs <outdir>'), process.exit(2)));
mkdirSync(out, { recursive: true });
const SMOKE = !!process.env.E10_SMOKE;
const SEEDS = SMOKE ? DEBUG_SEEDS : HELD_SEEDS;
const rows = ['class,seed,mode,curves,straight,width,level,S,sizeclass,' + RULE_IDS.map(r => r.toLowerCase()).join(',')];
const gens = { N1: [0, 0], N2: [0, 0], N4: [0, 0], BASE: [0, 0] }; // [generated, failed]
const clean = {}; // set -> rule -> { perSeed: {seed: [n, kink, notOk, warn, under]}, codes: {code: tracks} }
function addClean(set, seed, res) {
  const c = (clean[set] ??= Object.fromEntries(RULE_IDS.map(r => [r, { perSeed: {}, codes: {} }])));
  RULE_IDS.forEach((rid, k) => {
    const cell = (c[rid].perSeed[seed] ??= [0, 0, 0, 0, 0]), r = res[k];
    cell[0]++; if (r.kink) cell[1]++; if (r.notOk) cell[2]++; if (r.warn) cell[3]++; if (r.under) cell[4]++;
    for (const code of r.codes) c[rid].codes[code] = (c[rid].codes[code] ?? 0) + 1;
  });
}
const pushRow = (cls, seed, mode, curves, straight, width, level, S, sc, bits) => rows.push([cls, seed, mode, curves, straight, width, level, r6(S), sc, ...bits].join(','));

for (const seed of SEEDS) {
  // clean negatives N1, N2 (E6 grids, legacy join) and N4 (default tangent join)
  for (const cs of negativeCases(seed)) {
    const t = gen(cs.params);
    if (!t) { gens[cs.set][1]++; continue; }
    gens[cs.set][0]++; addClean(cs.set, seed, cleanRules(t));
  }
  for (const cs of n4Cases(seed)) {
    const t = genDefaultJoin(cs.params);
    if (!t) { gens.N4[1]++; continue; }
    gens.N4[0]++; addClean('N4', seed, cleanRules(t));
  }
  // defect bases
  for (const b of baseCases(seed)) {
    const base = gen(b.params);
    if (!base) { gens.BASE[1]++; continue; }
    gens.BASE[0]++; addClean('BASE', seed, cleanRules(base));
    const bi = baseInfo(base), n = base.points.length - 1, W = base.params.width;
    const emit = (cls, level, d) => {
      const { S, cls: sc } = sizeClass(d.track.points, d.window);
      const win = new Set(d.window.map(j => ((j % n) + n) % n));
      pushRow(cls, seed, b.mode, b.curves, b.straight, W, level, S, sc, evalRules(d.track, win, bi));
    };
    for (const g of PAIRED.gaps) for (const c of PAIRED.c) for (const pat of PAIRED.patterns) emit('pairedSpike', `${g}|${c}|${pat}`, pairedSpike(base, b.key, g, c, pat));
    for (const p of ZIGZAG.periods) for (const L of ZIGZAG.lengths) for (const c of ZIGZAG.c) emit('zigzag', `${p}|${L}|${c}`, zigzag(base, b.key, p, L, c));
    for (const op of PLANAR_OPS) for (const level of OPERATORS[op]) emit(op, `${level}`, applyDefect(base, b.key, op, level));
    for (const k of DOWNSAMPLE) {
      const track = downsample(base, k), win = allVertices(track.points), { S, cls: sc } = sizeClass(track.points, win);
      pushRow('downsample', seed, b.mode, b.curves, b.straight, W, `${k}`, S, sc, evalRules(track, null, bi));
    }
  }
}
// seed-free sets
for (const n of POLY.n) for (const R of POLY.R) for (const w of POLY.width) {
  const t = regularPolygon(n, R, w), { S, cls } = sizeClass(t.points, allVertices(t.points));
  pushRow('polygon', '', 'poly', '', '', w, `${n}|${R}`, S, cls, evalRules(t, null, null));
}
for (const t of synthetic()) addClean('N3', 'grid', cleanRules(t.track));

writeFileSync(join(out, 'instances.csv'), rows.join('\n') + '\n');
writeFileSync(join(out, 'clean.json'), JSON.stringify({ split: SMOKE ? 'SMOKE (debug seeds)' : 'HELD-OUT', generated: gens, clean }, null, 1) + '\n');
writeFileSync(join(out, 'env.json'), JSON.stringify({ node: process.version, protocol: 'experiments/e10/PROTOCOL.md', split: SMOKE ? 'SMOKE' : 'HELD-OUT', seeds: SEEDS, rules: Object.fromEntries(RULES.map(([id, o]) => [id, JSON.stringify(o, (k, v) => (v === Infinity ? 'Infinity' : v))])), instanceRows: rows.length - 1 }, null, 1) + '\n');
console.log(`run.mjs: ${rows.length - 1} instance rows, generated ${JSON.stringify(gens)} -> ${out}`);
