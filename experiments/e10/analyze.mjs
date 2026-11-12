// E10 analysis (PROTOCOL.md section 4 and 5): reads <dir>/instances.csv, clean.json, env.json; writes <dir>/SUMMARY.json and <dir>/SUMMARY.md (deterministic).
// Usage: node analyze.mjs <dir>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2] ?? (console.error('usage: node analyze.mjs <dir>'), process.exit(2)));
const env = JSON.parse(readFileSync(join(dir, 'env.json'), 'utf8')), cleanDoc = JSON.parse(readFileSync(join(dir, 'clean.json'), 'utf8'));
const SMOKE = env.split === 'SMOKE';
const RULES = ['R1', 'R2', 'R3', 'R4', 'R5'];
const RNAME = { R1: 'v1.3 default', R2: 'v1.3, SHARP off', R3: 'v1.3, UNDERSAMPLED off', R4: 'v1.2 (both off)', R5: 'legacy ratio' };
const seeds = env.seeds, SI = new Map(seeds.map((s, i) => [String(s), i])), NS = seeds.length;
const r6 = x => (x === null || x === undefined || !Number.isFinite(x)) ? null : Number(x.toPrecision(6));
const pct = x => (x === null ? 'n/a' : (100 * x).toFixed(2) + '%');
function mulberry32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const Z = 1.959964;
const wilson = (k, n) => { if (!n) return [null, null]; const p = k / n, d = 1 + Z * Z / n, c = (p + Z * Z / (2 * n)) / d, h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
// Clopper-Pearson for k = 0 or k = m of m (closed form)
const cpZero = m => 1 - Math.pow(0.025, 1 / m), cpAll = m => Math.pow(0.025, 1 / m);
// shared bootstrap resamples of the seeds (common random numbers; PROTOCOL: B = 2000, mulberry32(20261114))
const B = 2000, rng = mulberry32(20261114), IDX = new Int32Array(B * NS);
for (let i = 0; i < IDX.length; i++) IDX[i] = Math.floor(rng() * NS);
/** per-seed arrays K, N -> {k, n, p, lo, hi, wilson, degenerate} */
function interval(K, N) {
  let k = 0, n = 0; for (let i = 0; i < NS; i++) { k += K[i]; n += N[i]; }
  if (!n) return { k, n, p: null };
  const ps = new Float64Array(B); let m = 0;
  for (let b = 0; b < B; b++) { let kk = 0, nn = 0; for (let j = 0; j < NS; j++) { const s = IDX[b * NS + j]; kk += K[s]; nn += N[s]; } if (nn) ps[m++] = kk / nn; }
  const sorted = Array.from(ps.subarray(0, m)).sort((a, b) => a - b), q = f => sorted[Math.min(m - 1, Math.max(0, Math.floor(f * m)))];
  const out = { k, n, p: r6(k / n), lo: r6(q(0.025)), hi: r6(q(0.975)), wilson: wilson(k, n).map(r6) };
  // degenerate: every seed that has instances has the same rate 0 or 1
  const live = []; for (let i = 0; i < NS; i++) if (N[i]) live.push(i);
  if (live.length && (live.every(i => K[i] === 0) || live.every(i => K[i] === N[i]))) {
    out.degenerate = true; out.seedsWithData = live.length;
    if (k === 0) out.cpSeedLevel = [0, r6(cpZero(live.length))]; else out.cpSeedLevel = [r6(cpAll(live.length)), 1];
  }
  return out;
}

// ---------------------------------------------------------------- parse instances
const lines = readFileSync(join(dir, 'instances.csv'), 'utf8').trim().split('\n'), H = lines[0].split(',');
const ROWS = lines.slice(1).map(l => { const c = l.split(','); const o = Object.fromEntries(H.map((h, i) => [h, c[i]])); o.S = +o.S; o.bits = RULES.map((_, k) => +o['r' + (k + 1)]); o.si = o.seed === '' ? -1 : SI.get(o.seed); return o; });
const OK = 1, KINK = 2, UNDER = 4, NEWW = 8, BASEOK = 16;
const MEASURES = {
  M1: b => [(b & BASEOK) ? 1 : 0, (b & BASEOK) && !(b & OK) ? 1 : 0],           // [den, num]
  M2: b => [1, (b & KINK) ? 1 : 0],
  under: b => [1, (b & UNDER) ? 1 : 0],
  warnedOnly: b => [(b & BASEOK) ? 1 : 0, (b & BASEOK) && (b & OK) && (b & NEWW) ? 1 : 0],
  silent: b => [(b & BASEOK) ? 1 : 0, (b & BASEOK) && (b & OK) && !(b & NEWW) ? 1 : 0],
};
const MN = Object.keys(MEASURES);
/** group rows (those with keyFn(row) !== null) by key -> per rule, per measure, per seed K/N */
function group(filterKey) {
  const g = new Map();
  for (const r of ROWS) {
    const key = filterKey(r); if (key === null || key === undefined) continue;
    let c = g.get(key); if (!c) { c = { rows: 0, byRule: RULES.map(() => Object.fromEntries(MN.map(m => [m, { K: new Float64Array(NS), N: new Float64Array(NS) }]))) }; g.set(key, c); }
    c.rows++; if (r.si < 0) c.seedFree = true;
    const si = r.si < 0 ? 0 : r.si;
    RULES.forEach((_, k) => { for (const m of MN) { const [d, x] = MEASURES[m](r.bits[k]); const cell = c.byRule[k][m]; cell.N[si] += d; cell.K[si] += x; } });
  }
  return g;
}
const cache = new Map();
function stat(g, key, rule, m) {
  const c = g.get(key); if (!c) return null;
  const ck = c, id = rule + '|' + m; ck._i ??= {};
  return (ck._i[id] ??= (() => {
    const cell = c.byRule[RULES.indexOf(rule)][m];
    if (c.seedFree) { const k = cell.K[0], n = cell.N[0]; if (!n) return { k, n, p: null }; const w = wilson(k, n).map(r6); return { k, n, p: r6(k / n), lo: w[0], hi: w[1], wilson: w, seedFree: true }; }
    return interval(cell.K, cell.N);
  })());
}
const P = (g, key, rule, m) => { const s = stat(g, key, rule, m); return s && s.p !== null ? s.p : null; };
const isAB = r => r.class === 'pairedSpike' || r.class === 'zigzag';
const D_OPS = ['seamSpike', 'interiorSpike', 'corner', 'tangent'];
const isD = r => D_OPS.includes(r.class);
const mType = r => (r.mode === 'auto' ? 'auto' : 'pattern');

// groupings
const G = {
  paired_level: group(r => r.class === 'pairedSpike' ? r.level : null),
  paired_gap_c: group(r => { if (r.class !== 'pairedSpike') return null; const [g, c] = r.level.split('|'); return `gap ${g}, c ${c}`; }),
  paired_gap_size: group(r => { if (r.class !== 'pairedSpike') return null; return `${r.level.split('|')[0]}|${r.sizeclass}`; }),
  paired_c: group(r => r.class === 'pairedSpike' ? `c ${r.level.split('|')[1]}` : null),
  paired_all: group(r => r.class === 'pairedSpike' ? 'all' : null),
  zig_level: group(r => r.class === 'zigzag' ? r.level : null),
  zig_p_c: group(r => { if (r.class !== 'zigzag') return null; const [p, , c] = r.level.split('|'); return `period ${p}, c ${c}`; }),
  zig_p_L: group(r => { if (r.class !== 'zigzag') return null; const [p, L] = r.level.split('|'); return `period ${p}, L ${L}`; }),
  zig_pL_c05: group(r => { if (r.class !== 'zigzag') return null; const [p, L, c] = r.level.split('|'); return +c >= 0.05 ? `${p}|${L}` : null; }),
  zig_size: group(r => r.class === 'zigzag' ? r.sizeclass : null),
  zig_c_width: group(r => { if (r.class !== 'zigzag') return null; const [p, , c] = r.level.split('|'); return `period ${p}, c ${c}, width ${r.width}`; }),
  ab_size: group(r => isAB(r) ? r.sizeclass : null),
  ab_c_mtype: group(r => { if (!isAB(r)) return null; const c = r.class === 'pairedSpike' ? r.level.split('|')[1] : r.level.split('|')[2]; return `${r.class}, c ${c}, ${mType(r)}`; }),
  d_level: group(r => isD(r) ? `${r.class} ${r.level}` : null),
  d_size: group(r => isD(r) ? `${r.class}|${r.sizeclass}` : null),
  d_all: group(r => isD(r) ? 'all' : null),
  poly_n: group(r => r.class === 'polygon' ? `n=${r.level.split('|')[0]}` : null),
  poly_all: group(r => r.class === 'polygon' ? 'all' : null),
  ds_k: group(r => r.class === 'downsample' ? `k=${r.level}` : null),
  ds_k_size: group(r => r.class === 'downsample' ? `${r.level}|${r.sizeclass}` : null),
  ds_k_mtype: group(r => r.class === 'downsample' ? `k=${r.level}, ${mType(r)}` : null),
};

// ---------------------------------------------------------------- clean negatives
const CLEAN = {}; // set -> rule -> {n, kink:{...}, notOk, warn, under, codes}
for (const [set, byRule] of Object.entries(cleanDoc.clean)) {
  CLEAN[set] = {};
  for (const rid of RULES) {
    const ps = byRule[rid].perSeed, keys = Object.keys(ps);
    const seedFree = keys.length === 1 && keys[0] === 'grid';
    const col = j => { const K = new Float64Array(NS), N = new Float64Array(NS); if (seedFree) { return { k: ps.grid[j], n: ps.grid[0], w: wilson(ps.grid[j], ps.grid[0]).map(r6) }; } for (const [s, v] of Object.entries(ps)) { const i = SI.get(s); K[i] = v[j]; N[i] = v[0]; } return interval(K, N); };
    CLEAN[set][rid] = { n: seedFree ? ps.grid[0] : keys.reduce((a, s) => a + ps[s][0], 0), seedFree, kink: col(1), notOk: col(2), warn: col(3), under: col(4), errorCodeTracks: byRule[rid].codes };
  }
}

// ---------------------------------------------------------------- predictions
const preds = [];
const add = (id, label, kind, parts) => preds.push({ id, label, kind, verdict: parts.every(p => p.ok) ? 'held' : 'failed', parts });
const part = (text, observed, ok) => ({ text, observed, ok });
const f = x => (x === null ? 'n/a' : (100 * x).toFixed(1) + '%');
const inBand = (x, lo, hi) => x !== null && x >= lo && x <= hi;

// P1, P2 (construction)
{
  let m13 = 0, m24 = 0, tot = ROWS.length; for (const r of ROWS) { if ((r.bits[0] & OK) !== (r.bits[2] & OK)) m13++; if ((r.bits[1] & OK) !== (r.bits[3] & OK)) m24++; }
  let cleanMis = 0; // clean sets: not-ok must agree too
  for (const [set, byRule] of Object.entries(CLEAN)) { if (byRule.R1.notOk.k !== byRule.R3.notOk.k || byRule.R2.notOk.k !== byRule.R4.notOk.k) cleanMis++; }
  let kinkMis = 0, kinkChecked = 0; for (const r of ROWS) if (r.sizeclass === 'grey' || r.sizeclass === 'sub') { kinkChecked++; if ((r.bits[0] & KINK) !== (r.bits[3] & KINK)) kinkMis++; }
  // E6 comparison of class (d)
  let e6 = null; const e6path = join(here, '..', 'e6', 'results', 'heldout', 'instances.csv.gz');
  if (!SMOKE && existsSync(e6path)) {
    const L = gunzipSync(readFileSync(e6path)).toString().trim().split('\n'), h = L[0].split(','), idx = n => h.indexOf(n);
    const map = new Map(L.slice(1).map(l => { const c = l.split(','); return [[c[idx('seed')], c[idx('mode')], +c[idx('curves')], +c[idx('straight')], +c[idx('width')], c[idx('op')], +c[idx('level')]].join('|'), [+c[idx('frozen')], +c[idx('ratio')]]]; }));
    let matched = 0, mis = 0, miss = 0, dn = 0;
    for (const r of ROWS) if (isD(r)) { dn++; const v = map.get([r.seed, r.mode, +r.curves, +r.straight, +r.width, r.class, +r.level].join('|')); if (!v) { miss++; continue; } matched++; if (((r.bits[3] & KINK) ? 1 : 0) !== v[0] || ((r.bits[4] & KINK) ? 1 : 0) !== v[1]) mis++; }
    e6 = { e6Rows: map.size, dRows: dn, matched, notFoundInE6: miss, mismatches: mis };
  }
  add('P1', 'ok(R1)=ok(R3), ok(R2)=ok(R4); (d) equals E6 columns; R1 kinkWin = R4 kinkWin for S<30', 'construction', [
    part('ok(R1) != ok(R3): 0', `${m13} of ${tot} rows (clean sets with different not-ok counts R1/R3 or R2/R4: ${cleanMis})`, m13 === 0 && cleanMis === 0),
    part('ok(R2) != ok(R4): 0', `${m24} of ${tot} rows`, m24 === 0),
    part('class (d), R4/R5 kinkWin equal E6 frozen/ratio on all 45,360 instances', e6 ? JSON.stringify(e6) : 'not evaluated (smoke)', e6 ? e6.mismatches === 0 && e6.matched === 45360 : SMOKE),
    part('kinkWin(R1) = kinkWin(R4) on every instance with S<30 (grey, sub)', `${kinkMis} differences in ${kinkChecked} instances`, kinkMis === 0)]);
  const mustRows = ROWS.filter(r => (isAB(r) || isD(r) || (r.class === 'polygon' && +r.level.split('|')[0] <= 11)) && r.sizeclass === 'must');
  const bad = mustRows.filter(r => (r.bits[0] & OK) || !(r.bits[0] & KINK));
  add('P2', 'R1 detects 100% of must instances (a), (b), (d), polygons n<=11', 'construction', [part('100%', `${mustRows.length - bad.length} of ${mustRows.length}`, bad.length === 0)]);
}
// P3, P4, P5
{
  const parts3 = []; for (const gp of [2, 3, 4, 5, 6]) { const x = P(G.paired_gap_size, `${gp}|must`, 'R4', 'M2'); parts3.push(part(gp <= 4 ? `gap ${gp} <= 5%` : `gap ${gp} >= 95%`, f(x), gp <= 4 ? x !== null && x <= 0.05 : x !== null && x >= 0.95)); }
  add('P3', 'paired spikes, R4, M2, must: masking for gaps 2-4', 'informed', parts3);
  const x4 = P(G.zig_size, 'must', 'R4', 'M2'); add('P4', 'zigzag patches, R4, M2, must pooled <= 2%', 'informed', [part('<= 2%', f(x4), x4 !== null && x4 <= 0.02)]);
  const p5 = []; for (const op of D_OPS) { const x = P(G.d_size, `${op}|must`, 'R4', 'M2'); p5.push(part(`R4 ${op} must = 100%`, f(x), x === 1)); }
  const e6v = { seamSpike: 0.5421, interiorSpike: 0, corner: 0, tangent: 0.9366 };
  for (const op of D_OPS) { const x = P(G.d_size, `${op}|must`, 'R5', 'M2'); p5.push(part(`R5 ${op} must = ${f(e6v[op])} (E6)`, f(x), x !== null && Math.abs(x - e6v[op]) <= 0.0005)); }
  add('P5', 'class (d): R4 100% on must, R5 equals E6', 'informed', p5);
}
// P6, P7, P8
{
  const b6 = { 'c 0.1': [0.55, 0.85], 'c 0.25': [0.93, 1], 'c 0.5': [0.98, 1], 'c 1': [0.98, 1] }, p6 = [];
  for (const [k, [lo, hi]] of Object.entries(b6)) { const x = P(G.paired_c, k, 'R1', 'M1'); p6.push(part(`R1 M1 ${k}: ${f(lo)}..${f(hi)}`, f(x), inBand(x, lo, hi))); }
  add('P6', 'R1 M1 paired spikes by c', 'blind', p6);
  const b7 = { 'period 2, c 0.02': [0.25, 0.6], 'period 2, c 0.05': [0.6, 0.9], 'period 2, c 0.1': [0.95, 1], 'period 2, c 0.25': [0.95, 1], 'period 2, c 0.5': [0.95, 1],
    'period 4, c 0.02': [0, 0.2], 'period 4, c 0.05': [0.3, 0.65], 'period 4, c 0.1': [0.6, 0.9], 'period 4, c 0.25': [0.95, 1], 'period 4, c 0.5': [0.95, 1] }, p7 = [];
  for (const [k, [lo, hi]] of Object.entries(b7)) { const x = P(G.zig_p_c, k, 'R1', 'M1'); p7.push(part(`R1 M1 ${k}: ${f(lo)}..${f(hi)}`, f(x), inBand(x, lo, hi))); }
  add('P7', 'R1 M1 zigzag by period and c', 'blind', p7);
  const b8 = { must: { R1: [1, 1], R4: [0.35, 0.75] }, grey: { R1: [0.25, 0.6], R4: [0, 0.25] }, sub: { R1: [0, 0.15], R4: [0, 0.05] } }, p8 = [];
  for (const [sc, o] of Object.entries(b8)) for (const [r, [lo, hi]] of Object.entries(o)) { const x = P(G.ab_size, sc, r, 'M1'); p8.push(part(`${r} M1 ${sc}: ${f(lo)}..${f(hi)}`, f(x), inBand(x, lo, hi))); }
  add('P8', 'M1 by size class, pooled (a)+(b)', 'blind', p8);
}
// P9
{
  let a = 0, b = 0, sharpOnly = 0; for (const r of ROWS) { if ((r.bits[0] & OK) !== (r.bits[2] & OK)) a++; if ((r.bits[1] & OK) !== (r.bits[3] & OK)) b++; if (!(r.bits[0] & OK) && (r.bits[1] & OK)) sharpOnly++; }
  add('P9', 'the M1 gain of v1.3 over v1.2 comes from SHARP_VERTEX only', 'construction/informed', [part('R3 = R1 and R2 = R4 on `ok`', `${a} and ${b} differences; instances where only SHARP_VERTEX makes R1 fail but R2 ok: ${sharpOnly}`, a === 0 && b === 0)]);
}
// P10
{
  const p10 = [], bands = { '2|8': [0, 0.01], '2|16': [0, 0.03], '2|32': [0.35, 0.7], '2|64': [0.9, 1], '4|8': [0, 0.03], '4|16': [0, 0.03], '4|32': [0, 0.03], '4|64': [0.35, 0.7] };
  for (const [k, [lo, hi]] of Object.entries(bands)) { const x = P(G.zig_pL_c05, k, 'R1', 'under'); const [p, L] = k.split('|'); p10.push(part(`UNDERSAMPLED period ${p}, L ${L}, c>=0.05: ${f(lo)}..${f(hi)}`, f(x), inBand(x, lo, hi))); }
  const xa = P(G.paired_all, 'all', 'R1', 'under'), xd = P(G.d_all, 'all', 'R1', 'under');
  p10.push(part('paired spikes pooled <= 2%', f(xa), xa !== null && xa <= 0.02)); p10.push(part('class (d) pooled <= 2%', f(xd), xd !== null && xd <= 0.02));
  add('P10', 'UNDERSAMPLED rate on zigzag, paired spikes, class (d)', 'blind', p10);
}
// P11
{
  const p11 = [];
  const n1 = []; for (let n = 3; n <= 11; n++) n1.push(P(G.poly_n, `n=${n}`, 'R1', 'M1')); p11.push(part('R1 error 100% for n=3..11', n1.map(f).join(' '), n1.every(x => x === 1)));
  const n2 = []; for (let n = 13; n <= 16; n++) n2.push(P(G.poly_n, `n=${n}`, 'R1', 'M1')); p11.push(part('R1 error 0% for n=13..16', n2.map(f).join(' '), n2.every(x => x === 0)));
  p11.push(part('n=12 reported (excluded)', `R1 error ${f(P(G.poly_n, 'n=12', 'R1', 'M1'))}`, true));
  const u1 = P(G.poly_all, 'all', 'R1', 'under'), u2 = P(G.poly_all, 'all', 'R2', 'under'); p11.push(part('UNDERSAMPLED in all 84 under R1 and R2', `R1 ${f(u1)}, R2 ${f(u2)}`, u1 === 1 && u2 === 1));
  const r4 = []; for (let n = 4; n <= 16; n++) r4.push(P(G.poly_n, `n=${n}`, 'R4', 'M1')); p11.push(part('R4 error <= 10% for n>=4', r4.map(f).join(' '), r4.every(x => x <= 0.1)));
  const t4 = P(G.poly_n, 'n=3', 'R4', 'M1'); p11.push(part('R4 error 100% for n=3', f(t4), t4 === 1));
  const r5 = []; for (let n = 4; n <= 16; n++) r5.push(P(G.poly_n, `n=${n}`, 'R5', 'M1')); p11.push(part('R5 error <= 10% for n>=4', r5.map(f).join(' '), r5.every(x => x <= 0.1)));
  add('P11', 'regular polygons', 'informed', p11);
}
// P12
{
  const p12 = [], bs = { 2: [0, 0.03], 4: [0.2, 0.5], 8: [0.9, 1], 16: [0.98, 1] }, bu = { 2: [0.1, 0.55], 4: [0.85, 1], 8: [0.98, 1], 16: [0.98, 1] };
  for (const k of [2, 4, 8, 16]) {
    const c = G.ds_k.get(`k=${k}`), sharpRows = ROWS.filter(r => r.class === 'downsample' && +r.level === k), x = sharpRows.filter(r => r.sizeclass === 'must').length / sharpRows.length;
    p12.push(part(`k=${k} SHARP_VERTEX (max turn > 30) share: ${f(bs[k][0])}..${f(bs[k][1])}`, `${f(x)} (of ${sharpRows.length}); R1 M1 any error ${f(P(G.ds_k, `k=${k}`, 'R1', 'M1'))}`, inBand(x, bs[k][0], bs[k][1])));
    const u = P(G.ds_k, `k=${k}`, 'R1', 'under'); p12.push(part(`k=${k} UNDERSAMPLED: ${f(bu[k][0])}..${f(bu[k][1])}`, f(u), inBand(u, bu[k][0], bu[k][1])));
    const kw = P(G.ds_k, `k=${k}`, 'R4', 'M2'); p12.push(part(`k=${k} R4 kinkWin <= 15%`, f(kw), kw !== null && kw <= 0.15));
  }
  add('P12', 'down-sampled clean bases', 'blind', p12);
}
// P13, P14, P15
{
  const p13 = [], z = (set, rule, key) => CLEAN[set]?.[rule]?.[key];
  for (const set of ['N1', 'N2', 'N4', 'BASE']) { const c = z(set, 'R1', 'kink'); p13.push(part(`R1 kink-family FP ${set} = 0`, `${c.k}/${CLEAN[set].R1.n}`, c.k === 0)); }
  for (const set of ['N1', 'N2', 'N4']) { const c = z(set, 'R1', 'under'); p13.push(part(`R1 UNDERSAMPLED ${set} = 0`, `${c.k}/${CLEAN[set].R1.n}`, c.k === 0)); }
  for (const set of ['N1', 'N2']) for (const r of ['R4', 'R5']) { const c = z(set, r, 'kink'); p13.push(part(`${r} kink FP ${set} = 0`, `${c.k}/${CLEAN[set][r].n}`, c.k === 0)); }
  { const c = z('N4', 'R4', 'kink'); p13.push(part('R4 kink FP N4 = 0', `${c.k}/${CLEAN.N4.R4.n}`, c.k === 0)); }
  { const c = z('N4', 'R5', 'kink'); p13.push(part('R5 kink FP N4 <= 2%', `${c.k}/${CLEAN.N4.R5.n} = ${f(c.k / CLEAN.N4.R5.n)}`, c.k / CLEAN.N4.R5.n <= 0.02)); }
  add('P13', 'clean negatives: kink-family FP and UNDERSAMPLED', 'informed', p13);
  const a = z('N3', 'R1', 'kink').k, b = z('N3', 'R4', 'kink').k, u = z('N3', 'R1', 'under').k;
  add('P14', 'N3 synthetic', 'informed', [part('R1 kink flags <= 6 of 60 (expected 6)', `${a}`, a <= 6), part('R4 kink flags = 0', `${b}`, b === 0), part('UNDERSAMPLED 12..21 of 60', `${u}`, u >= 12 && u <= 21)]);
  const p15 = []; for (const r of ['R1', 'R2', 'R3', 'R4']) { const c = z('N4', r, 'notOk'), x = c.k / CLEAN.N4[r].n; p15.push(part(`${r} N4 any-error 15..25%`, f(x), inBand(x, 0.15, 0.25))); }
  const codes = Object.keys(CLEAN.N4.R1.errorCodeTracks).sort(); p15.push(part('N4 error codes only EDGE_FOLD, SELF_INTERSECTION_EDGE (R1)', codes.join(','), codes.every(c => ['EDGE_FOLD', 'SELF_INTERSECTION_EDGE'].includes(c))));
  add('P15', 'N4 any-error rate (context)', 'informed', p15);
}
const held = preds.filter(p => p.verdict === 'held'), failedP = preds.filter(p => p.verdict === 'failed');
const tally = { total: preds.length, held: held.length, failed: failedP.length, constructionTotal: preds.filter(p => p.kind.startsWith('construction')).length, constructionHeld: held.filter(p => p.kind.startsWith('construction')).length,
  nonConstructionTotal: preds.filter(p => !p.kind.startsWith('construction')).length, nonConstructionHeld: held.filter(p => !p.kind.startsWith('construction')).length };

// ---------------------------------------------------------------- output
const toJson = g => Object.fromEntries([...g.keys()].sort().map(key => [key, { rows: g.get(key).rows, rules: Object.fromEntries(RULES.map(r => [r, Object.fromEntries(MN.map(m => [m, stat(g, key, r, m)]))])) }]));
const tables = Object.fromEntries(Object.entries(G).map(([name, g]) => [name, toJson(g)]));
const summary = { protocol: 'experiments/e10/PROTOCOL.md', split: env.split, seeds: NS, instanceRows: ROWS.length, generated: cleanDoc.generated, rules: RNAME, bootstrap: { B, rng: 'mulberry32(20261114)', unit: 'seed' }, predictions: preds, tally, clean: CLEAN, tables };
writeFileSync(join(dir, 'SUMMARY.json'), JSON.stringify(summary) + '\n');

const cellTxt = s => { if (!s || s.p === null) return 'n/a'; let t = `${(100 * s.p).toFixed(1)}`; if (s.seedFree) t += ` [Wilson ${(100 * s.lo).toFixed(1)}, ${(100 * s.hi).toFixed(1)}] (${s.k}/${s.n})`; else if (s.degenerate) t += ` [seeds: CP ${(100 * s.cpSeedLevel[0]).toFixed(1)}-${(100 * s.cpSeedLevel[1]).toFixed(1)}]`; else t += ` [${(100 * s.lo).toFixed(1)}, ${(100 * s.hi).toFixed(1)}]`; return t; };
function mdTable(title, g, m, keys, rules = RULES, note = '') {
  const L = [`### ${title}`, '', note ? note + '\n' : '', `| key | rows | ${rules.map(r => `${r} ${RNAME[r]}`).join(' | ')} |`, `|---|---|${rules.map(() => '---').join('|')}|`];
  for (const k of keys ?? [...g.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) { const c = g.get(k); if (!c) continue; L.push(`| ${k} | ${c.rows} | ${rules.map(r => cellTxt(stat(g, k, r, m))).join(' | ')} |`); }
  return L.join('\n') + '\n';
}
const md = [];
md.push(`# E10 results: adversarial classes for the validator (${env.split})\n`);
md.push(`Protocol: \`experiments/e10/PROTOCOL.md\` (committed alone before the harness). Evaluation seeds: ${NS} (${SMOKE ? 'DEBUG, smoke test' : 'E6 HELD-OUT SEEDS[100..139]'}); ${ROWS.length} instance rows; generated ${JSON.stringify(cleanDoc.generated)} [generated, failed].\nIntervals: seed-clustered percentile bootstrap (B=${B}, mulberry32(20261114), 95%); degenerate cells show the seed-level Clopper-Pearson bound instead. Polygons and N3 are seed-free design grids (Wilson). Percentages; cell = rate [interval].\n`);
md.push(`Rules: ${RULES.map(r => `${r} = ${RNAME[r]}`).join('; ')}. M1 = error detection among instances whose base is ok under the same rule; M2 = kink-family flag (LOCAL_KINK, CLOSURE_TANGENT, SHARP_VERTEX) inside the defect window; under = UNDERSAMPLED present; warnedOnly = ok with a new warning; silent = ok with no new warning.\n`);
md.push(`**Disclosure repeated:** the 30 degrees of SHARP_VERTEX were chosen after the RT3 probes were seen, on TrackSeed's own tracks; E10 is not an independent confirmation of the threshold (PROTOCOL section 0).\n`);
md.push(`## Predictions\n\nTally: ${tally.held} held, ${tally.failed} failed of ${tally.total}; construction-labelled checks: ${tally.constructionHeld} of ${tally.constructionTotal} held; the other predictions: ${tally.nonConstructionHeld} of ${tally.nonConstructionTotal} held.\n`);
md.push('| id | kind | verdict | part | observed |\n|---|---|---|---|---|');
for (const p of preds) p.parts.forEach((q, i) => md.push(`| ${i === 0 ? `${p.id} ${p.label}` : ''} | ${i === 0 ? p.kind : ''} | ${i === 0 ? '**' + p.verdict + '**' : ''} ${q.ok ? '(ok)' : '(FAILED)'} | ${q.text} | ${q.observed} |`));
md.push('\n## Clean negatives (kink-family flag anywhere = primary FP; any-error and warnings for context)\n');
md.push('| set | rule | n | kink-family FP | any error | any warning | UNDERSAMPLED | error codes (tracks) |\n|---|---|---|---|---|---|---|---|');
const cc = c => (c.seedFree ? null : c); const ct = s => (s.p === undefined ? `${s.k}/${s.n ?? ''} [Wilson ${s.w.map(x => (100 * x).toFixed(1)).join(', ')}]` : cellTxt(s));
for (const set of ['N1', 'N2', 'N4', 'BASE', 'N3']) if (CLEAN[set]) for (const r of RULES) { const c = CLEAN[set][r], q = x => (c.seedFree ? `${x.k}/${c.n} [Wilson ${x.w.map(y => (100 * y).toFixed(1)).join(', ')}]` : `${cellTxt(x)} (${x.k}/${x.n})`); md.push(`| ${set} | ${r} | ${c.n} | ${q(c.kink)} | ${q(c.notOk)} | ${q(c.warn)} | ${q(c.under)} | ${JSON.stringify(c.errorCodeTracks)} |`); }
md.push('\n## Class (a) paired spikes\n');
md.push(mdTable('M1 error detection by c (pooled over gaps, patterns, widths, modes)', G.paired_c, 'M1'));
md.push(mdTable('M2 kink-family flag in window by c', G.paired_c, 'M2'));
md.push(mdTable('M1 by gap and c (pooled over patterns)', G.paired_gap_c, 'M1', null, ['R1', 'R4', 'R5']));
md.push(mdTable('M2 by gap and c (pooled over patterns)', G.paired_gap_c, 'M2', null, ['R1', 'R4', 'R5']));
md.push(mdTable('M2 by gap, must instances only (the masking claim)', G.paired_gap_size, 'M2', ['2|must', '3|must', '4|must', '5|must', '6|must'], ['R1', 'R4', 'R5']));
md.push(mdTable('Outcome mix by c (R1 v1.3): warned-only and silent accepts', G.paired_c, 'silent', null, ['R1', 'R4'], 'silent accept = ok and no new warning (the dangerous cell).'));
md.push('\n## Class (b) zigzag patches\n');
md.push(mdTable('M1 by period and c (pooled over L, widths, modes)', G.zig_p_c, 'M1'));
md.push(mdTable('M2 by period and c', G.zig_p_c, 'M2'));
md.push(mdTable('M1 by period and L (pooled over c)', G.zig_p_L, 'M1', null, ['R1', 'R4', 'R5']));
md.push(mdTable('UNDERSAMPLED by period and L (c >= 0.05)', G.zig_pL_c05, 'under', null, ['R1', 'R2']));
md.push(mdTable('M1 by period, c and width (R1 vs R4)', G.zig_c_width, 'M1', null, ['R1', 'R4']));
md.push('\n## Pooled (a)+(b) and class (d)\n');
md.push(mdTable('M1 by size class, pooled (a)+(b)', G.ab_size, 'M1')); md.push(mdTable('M2 by size class, pooled (a)+(b)', G.ab_size, 'M2'));
md.push(mdTable('M1 by class, c and mode type', G.ab_c_mtype, 'M1', null, ['R1', 'R4']));
md.push(mdTable('Class (d) M2 by operator and size class (compare E6 HELD-OUT)', G.d_size, 'M2')); md.push(mdTable('Class (d) M1 by operator and level', G.d_level, 'M1', null, ['R1', 'R4', 'R5']));
md.push('\n## Class (c) coarse polygons\n');
md.push(mdTable('(c1) regular n-gons: M1 error rate (seed-free design grid, 6 tracks per n: counts with Wilson 95%, descriptive of the grid)', G.poly_n, 'M1'));
md.push('Polygon rows (seed-free): ' + [3, 4, 8, 11, 12, 13, 16].map(n => { const c = G.poly_n.get(`n=${n}`); return `n=${n}: ${RULES.map(r => `${r} ${stat(G.poly_n, `n=${n}`, r, 'M1').k}/${stat(G.poly_n, `n=${n}`, r, 'M1').n}`).join(', ')}`; }).join('; ') + '\n');
md.push(mdTable('(c2) down-sampled clean bases: M1 (any error) by k', G.ds_k, 'M1')); md.push(mdTable('(c2) kink-family flag (all vertices) by k', G.ds_k, 'M2')); md.push(mdTable('(c2) UNDERSAMPLED by k', G.ds_k, 'under', null, ['R1', 'R2']));
md.push(mdTable('(c2) M2 by k and mode type', G.ds_k_mtype, 'M2', null, ['R1', 'R4']));
md.push('\n## Per-level tables\n\nThe full per-level tables (all classes, levels, rules, measures, with intervals and iid Wilson) are in `SUMMARY.json` under `tables`.\n');
writeFileSync(join(dir, 'SUMMARY.md'), md.join('\n') + '\n');
console.log(`analyze.mjs: ${tally.held} held, ${tally.failed} failed of ${tally.total} predictions -> ${dir}`);
for (const p of preds) console.log(p.id, p.verdict, p.parts.filter(q => !q.ok).map(q => `${q.text} => ${q.observed}`).join(' | '));
