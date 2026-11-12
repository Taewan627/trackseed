// E7 evaluation (see PROTOCOL.md): legacy vs tangent Auto join on the Auto part of the E2 grid, plus default parameters.
// Usage: npm run build:cli && node experiments/e7/run.mjs dev|heldout|repro <outDir>
//   dev     SEEDS[150..169]  (development set)
//   heldout SEEDS[170..199]  (run once, after the freeze commit)
//   repro   SEEDS[0..49], legacy join only: reproduction of the committed E2 recheck v1.1 columns (prediction P9)
// Writes <outDir>/cases.csv.gz and <outDir>/SUMMARY.json (+ SUMMARY.md). Output is deterministic (no timestamps, no timings).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const DIST = new URL('../../cli-dist/', import.meta.url);
if (!existsSync(new URL('validate.js', DIST))) throw new Error('cli-dist/ missing: run `npm run build:cli` first');
const core = await import(new URL('core.js', DIST));
const val = await import(new URL('validate.js', DIST));
const { datan2, dhypot } = await import(new URL('detmath.js', DIST));

const set = process.argv[2], outDir = process.argv[3];
if (!['dev', 'heldout', 'repro'].includes(set) || !outDir) { console.error('usage: run.mjs dev|heldout|repro <outDir>'); process.exit(2); }

// ---- seeds (identical to experiments/e1/cases.mjs; pinned by SHA-256) ----
function mulberry32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FIXED = [0, 1, 2, 3, 7, 42, 100, 1234, 12345, 65535, 65536, 99999, 1000000, 16777216, 2147483646, 2147483647];
const SEEDS = (() => { const r = mulberry32(20261111), seeds = [...FIXED]; while (seeds.length < 200) { const v = Math.floor(r() * 2147483648); if (!seeds.includes(v)) seeds.push(v); } return seeds; })();
const sha = s => createHash('sha256').update(s).digest('hex');
if (sha(JSON.stringify(SEEDS)) !== '5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07') throw new Error('seed list differs from E1');
const SETS = { dev: SEEDS.slice(150, 170), heldout: SEEDS.slice(170, 200), repro: SEEDS.slice(0, 50) };
const seeds = SETS[set];
// disclosure of PROTOCOL.md section 2: exploratory seeds are outside SEEDS[150..199]
const exploratory = [...Array.from({ length: 200 }, (_, i) => i), ...Array.from({ length: 10 }, (_, k) => 500000 + 7919 * k)];
const evalSeeds = new Set(SEEDS.slice(150, 200));
const exploratoryOverlap = exploratory.filter(s => evalSeeds.has(s));

const LEVELS = { curves: [3, 6, 10], straight: [0, 0.3, 0.6], width: [20, 40, 80], size: [1, 2, 3], height: [0, 80, 200] };
const JOINS = set === 'repro' ? ['legacy'] : ['legacy', 'tangent'];

// ---- statistics ----
const Z = 1.959963984540054;
function wilson(k, n) { if (!n) return { k, n, p: null, lo: null, hi: null }; const p = k / n, d = 1 + Z * Z / n, c = (p + Z * Z / (2 * n)) / d, h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d; return { k, n, p: r6(p), lo: r6(Math.max(0, c - h)), hi: r6(Math.min(1, c + h)) }; }
const r6 = x => Math.round(x * 1e6) / 1e6;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return r6(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2); };
const spread = a => ({ n: a.length, median: median(a), min: a.length ? r6(Math.min(...a)) : null, max: a.length ? r6(Math.max(...a)) : null });

// ---- per-track measures (centreline, x/z) ----
const DEG = 180 / Math.PI;
function geometry(t) {
  const P = t.points, n = P.length - 1, turn = new Array(n), len = new Array(n);
  for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const x0 = b.x - a.x, z0 = b.z - a.z, x1 = c.x - b.x, z1 = c.z - b.z;
    turn[i] = Math.abs(datan2(x0 * z1 - z0 * x1, x0 * x1 + z0 * z1)) * DEG; len[i] = dhypot(c.x - b.x, c.z - b.z); }
  let total = 0, straight = 0, maxTurn = 0, over12 = 0;
  for (let i = 0; i < n; i++) { total += len[i]; if (turn[i] < 0.01 && turn[(i + 1) % n] < 0.01) straight += len[i]; if (turn[i] > maxTurn) maxTurn = turn[i]; if (turn[i] > 12) over12++; }
  return { straightFraction: straight / total, maxTurn, over12 };
}
function evaluate(params) {
  let t;
  try { t = core.generateTrack(params); } catch (e) { return { generated: 0 }; }
  const r = val.validateTrack(t), g = geometry(t);
  return { generated: 1, ok: r.ok, codes: [...new Set(r.violations.map(v => v.code))].sort(),
    errCodes: [...new Set(r.violations.filter(v => v.severity === 'error').map(v => v.code))].sort(),
    length: t.length, ...g, pointsSha: sha(JSON.stringify(t.points)) };
}

// ---- run ----
const rows = ['index,curves,straight,width,size,height,seed,join,generated,ok,errcodes,codes,length,straightFraction,maxTurn,over12,pointsSha8'];
const cases = []; // {key, join, ...}
let index = 0;
for (const curves of LEVELS.curves) for (const straight of LEVELS.straight) for (const width of LEVELS.width)
  for (const size of LEVELS.size) for (const height of LEVELS.height) for (const seed of seeds) {
    for (const join of JOINS) {
      const params = { cornerPattern: 'auto', curves, straight, width, size, height, seed, autoJoin: join };
      const e = evaluate(params);
      cases.push({ index, curves, straight, width, size, height, seed, join, ...e });
      rows.push([index, curves, straight, width, size, height, seed, join, e.generated, e.generated ? +e.ok : '', (e.errCodes ?? []).join(';'), (e.codes ?? []).join(';'),
        e.generated ? e.length.toFixed(6) : '', e.generated ? e.straightFraction.toFixed(6) : '', e.generated ? e.maxTurn.toFixed(6) : '', e.generated ? e.over12 : '', e.generated ? e.pointsSha.slice(0, 8) : ''].join(','));
    }
    index++;
  }

const summary = { protocol: 'experiments/e7/PROTOCOL.md', set, seeds, gridSize: index, joins: JOINS,
  validator: { closureTangentMode: val.DEFAULT_VALIDATE_OPTIONS.closureTangentMode, kinkRule: val.DEFAULT_VALIDATE_OPTIONS.kinkRule },
  exploratorySeedOverlapWithEvaluationSeeds: exploratoryOverlap };

if (set === 'repro') {
  const old = gunzipSync(readFileSync(new URL('../e6/results/e2-recheck/validity-v1.1.csv.gz', import.meta.url))).toString().trim().split('\n');
  const hdr = old[0].split(','), iOk = hdr.indexOf('ok_v11'), iCodes = hdr.indexOf('codes_v11'), iGen = hdr.indexOf('generated');
  let okMismatch = 0, codeMismatch = 0, genMismatch = 0;
  for (const c of cases) {
    const line = old[c.index + 1].split(','); // Auto is the first mode of the E2 recheck, in the same loop order
    if (String(c.generated) !== line[iGen]) genMismatch++;
    if (c.generated) { if (String(+c.ok) !== line[iOk]) okMismatch++; if (c.codes.join(';') !== (line[iCodes] ?? '')) codeMismatch++; }
  }
  summary.reproduction = { cases: cases.length, okMismatches: okMismatch, codeMismatches: codeMismatch, generatedMismatches: genMismatch,
    reference: 'experiments/e6/results/e2-recheck/validity-v1.1.csv.gz (Auto rows 0..' + (cases.length - 1) + ')' };
  summary.predictions = { P9: { claim: 'legacy join reproduces the committed E2 recheck v1.1 ok and code columns exactly', observed: summary.reproduction, held: okMismatch + codeMismatch + genMismatch === 0 } };
} else {
  const by = (join, f) => cases.filter(c => c.join === join && c.generated && f(c));
  const okRate = (join, f) => { const xs = by(join, f); return wilson(xs.filter(c => c.ok).length, xs.length); };
  const codeCounts = (join, f) => { const o = {}; for (const c of by(join, f)) for (const k of c.errCodes) o[k] = (o[k] ?? 0) + 1; return o; };
  const allGen = c => true, pos = c => c.straight > 0;
  summary.generationFailures = Object.fromEntries(JOINS.map(j => [j, cases.filter(c => c.join === j && !c.generated).length]));
  summary.okOverall = Object.fromEntries(JOINS.map(j => [j, okRate(j, allGen)]));
  summary.okStraightZero = Object.fromEntries(JOINS.map(j => [j, okRate(j, c => c.straight === 0)]));
  summary.okStraightPositive = Object.fromEntries(JOINS.map(j => [j, okRate(j, pos)]));
  summary.okByCurvesStraight = Object.fromEntries(JOINS.map(j => [j, Object.fromEntries(LEVELS.curves.flatMap(cv => LEVELS.straight.map(s => [`curves${cv}_straight${s}`, okRate(j, c => c.curves === cv && c.straight === s)])))]));
  summary.okByCurvesStraightPositive = Object.fromEntries(JOINS.map(j => [j, Object.fromEntries(LEVELS.curves.map(cv => [`curves${cv}`, okRate(j, c => c.curves === cv && pos(c))]))]));
  summary.okByWidthStraightPositive = Object.fromEntries(JOINS.map(j => [j, Object.fromEntries(LEVELS.width.map(w => [`width${w}`, okRate(j, c => c.width === w && pos(c))]))]));
  summary.errorCodeCounts = Object.fromEntries(JOINS.map(j => [j, codeCounts(j, allGen)]));
  summary.errorCodeCountsStraightPositive = Object.fromEntries(JOINS.map(j => [j, codeCounts(j, pos)]));
  // paired
  const L = new Map(), T = new Map();
  for (const c of cases) if (c.generated) (c.join === 'legacy' ? L : T).set(c.index, c);
  const cross = { okOk: 0, okNot: 0, notOk: 0, notNot: 0 }; let bitIdentical = 0, zeroCases = 0, zeroOkSame = 0, zeroCodesSame = 0;
  const dLen = [], ratio = [], sfL = [], sfT = [], mtL = [], mtT = [], o12L = [], o12T = [], req = [], quant = [];
  const failuresOtherCodes = [];
  for (const [i, l] of L) {
    const t = T.get(i); if (!t) continue;
    cross[(l.ok ? 'ok' : 'not') + (t.ok ? 'Ok' : 'Not')]++;
    if (l.straight === 0) { zeroCases++; if (l.pointsSha === t.pointsSha) bitIdentical++; if (l.ok === t.ok) zeroOkSame++; if (l.codes.join() === t.codes.join()) zeroCodesSame++; }
    else {
      dLen.push(Math.abs(t.length / l.length - 1)); if (l.straightFraction > 0) ratio.push(t.straightFraction / l.straightFraction);
      sfL.push(l.straightFraction); sfT.push(t.straightFraction); mtL.push(l.maxTurn); mtT.push(t.maxTurn); o12L.push(l.over12); o12T.push(t.over12);
      req.push(l.straight); quant.push(Math.round(l.straight * l.curves) / l.curves);
    }
    if (!t.ok && t.errCodes.some(k => k !== 'SELF_INTERSECTION_EDGE' && k !== 'EDGE_FOLD')) failuresOtherCodes.push(i);
  }
  summary.paired = { cross: { 'legacyOk_tangentOk': cross.okOk, 'legacyOk_tangentNotOk': cross.okNot, 'legacyNotOk_tangentOk': cross.notOk, 'legacyNotOk_tangentNotOk': cross.notNot } };
  summary.straightZeroEquivalence = { cases: zeroCases, pointsBitIdentical: bitIdentical, okSame: zeroOkSame, codesSame: zeroCodesSame };
  summary.geometryStraightPositive = { cases: dLen.length, absRelativeLengthChange: spread(dLen), realisedStraightFractionRatioTangentOverLegacy: spread(ratio),
    requestedStraightParameter: spread(req), quantisedStraightFraction: spread(quant), realisedStraightFractionLegacy: spread(sfL), realisedStraightFractionTangent: spread(sfT),
    maxVertexTurnDegreesLegacy: spread(mtL), maxVertexTurnDegreesTangent: spread(mtT), verticesOver12DegreesLegacy: spread(o12L), verticesOver12DegreesTangent: spread(o12T) };
  // default parameters
  const defaults = seeds.map(seed => { const e = evaluate({ seed }); return { seed, generated: e.generated, ok: e.ok, errCodes: e.errCodes }; });
  summary.defaultParameters = { autoJoinOfDefaults: core.DEFAULTS.autoJoin, ok: wilson(defaults.filter(d => d.generated && d.ok).length, defaults.length), failures: defaults.filter(d => !d.ok), generationFailures: defaults.filter(d => !d.generated).length };

  // ---- predictions ----
  const P = {};
  const rate = x => x.p;
  P.P1 = { claim: 'default parameters, tangent join: >= 99% ok', observed: summary.defaultParameters.ok, held: summary.defaultParameters.ok.p >= 0.99 };
  P.P2 = { claim: 'legacy join at straight > 0: ok rate <= 2%', observed: summary.okStraightPositive.legacy, held: rate(summary.okStraightPositive.legacy) <= 0.02 };
  const bc = summary.okByCurvesStraightPositive.tangent;
  P.P3 = { claim: 'tangent join at straight > 0: ok >= 75% overall; curves 6 >= 95%, curves 10 >= 75%, curves 3 >= 55%',
    observed: { overall: summary.okStraightPositive.tangent, curves3: bc.curves3, curves6: bc.curves6, curves10: bc.curves10 },
    held: rate(summary.okStraightPositive.tangent) >= 0.75 && rate(bc.curves6) >= 0.95 && rate(bc.curves10) >= 0.75 && rate(bc.curves3) >= 0.55 };
  const kinkTracks = cases.filter(c => c.join === 'tangent' && c.generated && (c.errCodes.includes('LOCAL_KINK') || c.errCodes.includes('CLOSURE_TANGENT'))).length;
  P.P4 = { claim: 'no tangent-join track carries LOCAL_KINK or CLOSURE_TANGENT', observed: { tracks: kinkTracks, of: by('tangent', allGen).length }, held: kinkTracks === 0 };
  P.P5 = { claim: 'every failing tangent-join track fails only with SELF_INTERSECTION_EDGE and/or EDGE_FOLD', observed: { failingTracksWithOtherErrorCodes: failuresOtherCodes.length }, held: failuresOtherCodes.length === 0 };
  const z = summary.straightZeroEquivalence;
  P.P6 = { claim: 'straight = 0: bit-identical points, identical ok and codes in 100% of cases', observed: z, held: z.pointsBitIdentical === z.cases && z.okSame === z.cases && z.codesSame === z.cases };
  P.P7 = { claim: 'no case ok under legacy and not ok under tangent', observed: { cases: cross.okNot }, held: cross.okNot === 0 };
  const g = summary.geometryStraightPositive;
  P.P8 = { claim: 'median |relative length change| <= 10%; median straight-fraction ratio >= 0.5; median max per-vertex turn (tangent) <= 15 degrees',
    observed: { medianAbsRelativeLengthChange: g.absRelativeLengthChange.median, medianStraightFractionRatio: g.realisedStraightFractionRatioTangentOverLegacy.median,
      medianMaxTurnTangent: g.maxVertexTurnDegreesTangent.median, medianMaxTurnLegacy: g.maxVertexTurnDegreesLegacy.median },
    held: g.absRelativeLengthChange.median <= 0.10 && g.realisedStraightFractionRatioTangentOverLegacy.median >= 0.5 && g.maxVertexTurnDegreesTangent.median <= 15 };
  P.P10 = { claim: 'no Auto generation throws under either join (byte-identity of two runs is checked by run-twice.mjs)', observed: { grid: summary.generationFailures, defaults: summary.defaultParameters.generationFailures },
    held: Object.values(summary.generationFailures).every(x => x === 0) && summary.defaultParameters.generationFailures === 0 };
  summary.predictions = P;
}

const pct = w => w && w.p !== null ? `${(100 * w.p).toFixed(2)}% [${(100 * w.lo).toFixed(2)}, ${(100 * w.hi).toFixed(2)}] (${w.k}/${w.n})` : 'n/a';
const md = [`# E7 ${set}`, '', `Seeds: ${seeds.length} (${set}); grid: ${summary.gridSize} parameter-set x seed cells per join; validator v1.1 defaults.`, ''];
if (set === 'repro') md.push(`Legacy reproduction of the E2 recheck v1.1 columns: ${JSON.stringify(summary.reproduction)}`);
else {
  md.push('| quantity | legacy | tangent |', '|---|---|---|');
  md.push(`| ok, all cases | ${pct(summary.okOverall.legacy)} | ${pct(summary.okOverall.tangent)} |`);
  md.push(`| ok, straight = 0 | ${pct(summary.okStraightZero.legacy)} | ${pct(summary.okStraightZero.tangent)} |`);
  md.push(`| ok, straight > 0 | ${pct(summary.okStraightPositive.legacy)} | ${pct(summary.okStraightPositive.tangent)} |`);
  for (const cv of LEVELS.curves) md.push(`| ok, straight > 0, curves ${cv} | ${pct(summary.okByCurvesStraightPositive.legacy[`curves${cv}`])} | ${pct(summary.okByCurvesStraightPositive.tangent[`curves${cv}`])} |`);
  for (const w of LEVELS.width) md.push(`| ok, straight > 0, width ${w} | ${pct(summary.okByWidthStraightPositive.legacy[`width${w}`])} | ${pct(summary.okByWidthStraightPositive.tangent[`width${w}`])} |`);
  md.push('', `Default parameters (autoJoin ${summary.defaultParameters.autoJoinOfDefaults}): ${pct(summary.defaultParameters.ok)}`, '', 'Error-code counts (tracks with the code):', '',
    `- legacy: ${JSON.stringify(summary.errorCodeCounts.legacy)}`, `- tangent: ${JSON.stringify(summary.errorCodeCounts.tangent)}`, '', `Paired: ${JSON.stringify(summary.paired.cross)}`, '',
    `Geometry at straight > 0: ${JSON.stringify(summary.geometryStraightPositive)}`, '', '## Predictions', '');
  for (const [k, v] of Object.entries(summary.predictions)) md.push(`- ${k} ${v.held ? 'HELD' : 'FAILED'}: ${v.claim}; observed ${JSON.stringify(v.observed)}`);
}
mkdirSync(outDir, { recursive: true });
const summaryText = JSON.stringify(summary, null, 1) + '\n', csv = gzipSync(Buffer.from(rows.join('\n') + '\n'), { level: 9, mtime: 0 });
writeFileSync(`${outDir}/SUMMARY.json`, summaryText); writeFileSync(`${outDir}/SUMMARY.md`, md.join('\n') + '\n'); writeFileSync(`${outDir}/cases.csv.gz`, csv);
console.log(JSON.stringify({ set, outDir, summarySha256: sha(summaryText), casesCsvGzSha256: createHash('sha256').update(csv).digest('hex'), summaryMdSha256: sha(md.join('\n') + '\n') }));
