// Builds results/SUMMARY.{json,md} and results/validity.jsonl from results/*.json and out/*.polylines.json.
// Needs `npm run build:cli` (imports cli-dist). Deterministic: no clocks, no timing, no random numbers.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), R = join(here, 'results'), O = join(here, 'out'), root = join(here, '../..');
const lib = f => import(pathToFileURL(join(root, 'cli-dist', f)).href);
const { trackFromPolyline } = await lib('polyline.js');
const { validateTrack } = await lib('validate.js');
const { computeMetrics } = await lib('metrics.js');
const { generateTrack } = await lib('core.js');

const ENGINES = [['node22', 'Node 22 (reference)'], ['node22-repeat', 'Node 22 (repeat run)'], ['node20', 'Node 20'], ['node24', 'Node 24'],
  ['deno', 'Deno'], ['bun', 'Bun (JavaScriptCore)'], ['chrome', 'Chrome headless (V8)'], ['firefox', 'Firefox (SpiderMonkey)']];
const readJson = f => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
const ref = readJson(join(R, 'node22.json'));
if (!ref) { console.error('reference results/node22.json missing'); process.exit(1); }
const N = ref.cases.length;
const pct = (k, n) => n === 0 ? null : Math.round(k / n * 10000) / 100;

// ---------------- Q1 ----------------
const refDigest = new Map(ref.cases.map(c => [c.seed, c.digest]));
const refPoly = readJson(join(O, 'node22.polylines.json'));
const engines = [];
for (const [label, name] of ENGINES) {
  const r = readJson(join(R, `${label}.json`));
  const row = { label, name, ran: !!r };
  if (!r) { row.error = existsSync(join(R, `${label}.error.txt`)) ? readFileSync(join(R, `${label}.error.txt`), 'utf8').trim() : 'no results produced'; engines.push(row); continue; }
  const bad = r.cases.filter(c => refDigest.get(c.seed) !== c.digest).map(c => c.seed);
  const badBits = r.cases.filter((c, i) => ref.cases[i].bitsDigest !== c.bitsDigest).length;
  const bad3d = r.cases.filter((c, i) => ref.cases[i].digest3d !== c.digest3d).length;
  Object.assign(row, { env: r.env, n: r.cases.length, mismatches: bad.length, agreementPercent: r.cases.length === N ? pct(N - bad.length, N) : null,
    firstMismatches: bad.slice(0, 10), bitsDigestMismatches: badBits, digest3dMismatches: bad3d,
    selfTest: r.meta.selfTest, scriptSha256Equal: r.meta.scriptSha256 === ref.meta.scriptSha256, newGlobals: r.meta.newGlobals,
    outcomes: r.cases.reduce((a, c) => { const k = c.outcome.startsWith('THROW') ? c.outcome : c.outcome; a[k] = (a[k] ?? 0) + 1; return a; }, {}) });
  // secondary: polylines of mismatching cases
  const poly = readJson(join(O, `${label}.polylines.json`));
  if (poly && refPoly && bad.length) {
    const badSet = new Set(bad);
    let same = 0; const diffs = [];
    poly.forEach((p, i) => {
      if (!badSet.has(p.seed)) return;
      const q = refPoly[i];
      if (p.centerline && q.centerline && p.centerline.length === q.centerline.length) {
        same++;
        let m = 0;
        for (let k = 0; k < p.centerline.length; k++) m = Math.max(m, Math.abs(p.centerline[k][0] - q.centerline[k][0]), Math.abs(p.centerline[k][1] - q.centerline[k][1]));
        diffs.push(m);
      }
    });
    diffs.sort((a, b) => a - b);
    row.secondary = { mismatchingCases: bad.length, sameOutcomeAndPointCount: same, sameShare: same / bad.length,
      maxAbsDiffMedian: diffs.length ? diffs[Math.ceil(diffs.length / 2) - 1] : null, maxAbsDiffMax: diffs.length ? diffs[diffs.length - 1] : null };
  }
  engines.push(row);
}
const ran = engines.filter(e => e.ran);
const matrix = ran.map(a => { const A = readJson(join(R, `${a.label}.json`)).cases; return ran.map(b => { const B = readJson(join(R, `${b.label}.json`)).cases; return A.reduce((k, c, i) => k + (c.digest === B[i].digest ? 1 : 0), 0); }); });
const staticMath = ref.meta.staticMath;
const dynamicCalls = Object.fromEntries(Object.entries(ref.mathCalls).filter(([, v]) => v > 0));

// ---------------- Q2 ----------------
const WIDTHS = [4, 8, 14];
const polys = refPoly.map((p, i) => ({ ...p, rec: ref.cases[i] }));
const okPolys = polys.filter(p => p.centerline);
const toInput = (p, width, withHeight) => ({ points: p.centerline.map((q, i) => ({ x: q[0], z: q[1], y: withHeight ? p.heights[i] : 0 })), width, closed: true });
const wilson = (k, n) => { if (n === 0) return null; const z = 1.959964, ph = k / n, d = 1 + z * z / n, c = ph + z * z / (2 * n), s = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)); return [Math.round((c - s) / d * 10000) / 100, Math.round((c + s) / d * 10000) / 100]; };
const q2 = { widths: {}, ownWidth: { min: Math.min(...okPolys.map(p => p.rec.ownWidth)), casesBelow4: okPolys.filter(p => p.rec.ownWidth < 4).length }, okOutputs: okPolys.length, totalCases: N };
const validityLines = new Map(okPolys.map(p => [p.seed, { seed: p.seed }]));
for (const W of WIDTHS) {
  let pass = 0; const errCases = {}, warnCases = {}, firstError = {};
  for (const p of okPolys) {
    const v = validateTrack(trackFromPolyline(toInput(p, W, false)));
    if (v.ok) pass++;
    const codes = new Map(); for (const x of v.violations) codes.set(x.code, x.severity);
    // violations list is capped per check, but every failing code appears at least once in it
    for (const [c, sev] of codes) { const t = sev === 'error' ? errCases : warnCases; t[c] = (t[c] ?? 0) + 1; }
    validityLines.get(p.seed)[`w${W}`] = { ok: v.ok, codes: [...codes.keys()].sort() };
  }
  const sortObj = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  q2.widths[W] = { pass, passShareOfOk: pct(pass, okPolys.length), wilson95: wilson(pass, okPolys.length), passShareOfAll: pct(pass, N),
    errorCodeCases: sortObj(errCases), warningCodeCases: sortObj(warnCases), failing: okPolys.length - pass };
}
{ // 3D at W=4: MAX_SLOPE only
  let slope = 0, ok3 = 0;
  for (const p of okPolys) { const v = validateTrack(trackFromPolyline(toInput(p, 4, true))); if (v.ok) ok3++; if (v.violations.some(x => x.code === 'MAX_SLOPE')) slope++; }
  q2.threeD = { width: 4, okCases: ok3, maxSlopeWarningCases: slope };
}
writeFileSync(join(R, 'validity.jsonl'), [...validityLines.values()].map(x => JSON.stringify(x)).join('\n') + '\n');

// Additional, NOT pre-registered: independent brute-force check of the centerline self-intersection finding (plain O(n^2) segment test).
{
  const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const hit = (a, b, c, d) => !(Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0]) || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1]))
    && cr(a, b, c) * cr(a, b, d) <= 0 && cr(c, d, a) * cr(c, d, b) <= 0; // same closed-segment test incl. bounding-box rejection as src/validate.ts, written independently
  const brute = [];
  for (const p of okPolys) {
    const c = [...p.centerline, p.centerline[0]], n = c.length - 1; let any = false;
    for (let i = 0; i < n && !any; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (hit(c[i], c[i + 1], c[j], c[j + 1])) { any = true; break; } }
    if (any) brute.push(p.seed);
  }
  const validator = [...validityLines.values()].filter(l => l.w4.codes.includes('SELF_INTERSECTION_CENTERLINE')).map(l => l.seed);
  q2.bruteForceCenterlineCrossCheck = { bruteForceSeeds: brute, validatorSeeds: validator, identical: JSON.stringify(brute) === JSON.stringify(validator) };
}

// ---------------- Q3 ----------------
const FIELDS = ['sampleCount', 'length', 'boundingBoxArea', 'straightLengthFraction', 'meanAbsCurvature', 'maxAbsCurvature', 'p95AbsCurvature',
  'curvatureEntropyBits', 'turnCount', 'elevationRange', 'maxAbsSlope', 'meanAbsSlope', 'totalTurningDegrees'];
const rank = (s, q) => s[Math.max(0, Math.ceil(q * s.length) - 1)];
const stat = xs => { const s = [...xs].sort((a, b) => a - b); return { n: s.length, median: rank(s, 0.5), p25: rank(s, 0.25), p75: rank(s, 0.75), min: s[0], max: s[s.length - 1] }; };
const metricsOf = list => list.map(m => ({ ...Object.fromEntries(FIELDS.map(f => [f, m[f]])), meanAbsCurvatureTimesLength: m.meanAbsCurvature * m.length, totalTurningOver360: m.totalTurningDegrees / 360 }));
const groupStats = rows => Object.fromEntries([...FIELDS, 'meanAbsCurvatureTimesLength', 'totalTurningOver360'].map(f => [f, stat(rows.map(r => r[f]))]));
const SCALE = 420 / 150;
const tp = okPolys.map(p => trackFromPolyline(toInput(p, 4, false)));
const tpRows = metricsOf(tp.map(t => computeMetrics(t)));
const tpScaled = metricsOf(tp.map(t => computeMetrics({ points: t.points.map(q => ({ x: q.x * SCALE, y: q.y * SCALE, z: q.z * SCALE })) })));
const CONFIGS = [['auto', {}], ['right-angle', { cornerPattern: 'right-angle', cornerCount: 2, cornerStrength: 60 }], ['hairpin', { cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 }],
  ['s-curve', { cornerPattern: 's-curve', cornerCount: 3, cornerStrength: 40, curves: 8 }], ['extreme', { curves: 10, size: 3, width: 80, height: 200, obstacles: 8, density: 20 }]]; // = experiments/e1/PROTOCOL.md
const seeds200 = ref.cases.slice(0, 200).map(c => c.seed);
const q3 = { 'third-party (as is)': groupStats(tpRows), [`third-party (scaled x${SCALE})`]: groupStats(tpScaled) };
for (const [id, over] of CONFIGS) q3[`TrackLab ${id}`] = groupStats(metricsOf(seeds200.map(seed => computeMetrics(generateTrack({ ...over, seed })))));
const minTurning = Math.min(...tpRows.map(r => r.totalTurningDegrees));

// ---------------- predictions vs results ----------------
const eng = l => engines.find(e => e.label === l);
const share = e => e && e.ran ? e.agreementPercent : null;
const checks = [];
const P = (id, text, observed, holds) => checks.push({ id, prediction: text, observed, holds });
P('Q1a', 'Node 22 repeat: 100%', share(eng('node22-repeat')), share(eng('node22-repeat')) === 100);
P('Q1b', 'Node 20: 100%', share(eng('node20')), share(eng('node20')) === 100);
P('Q1c', 'Node 24: below 100%, within 10-90%', share(eng('node24')), share(eng('node24')) !== null && share(eng('node24')) < 100 && share(eng('node24')) >= 10 && share(eng('node24')) <= 90);
for (const l of ['deno', 'bun', 'chrome', 'firefox']) P(`Q1d-${l}`, `${l}: at most 10%`, share(eng(l)), share(eng(l)) !== null && share(eng(l)) <= 10);
const sec = ran.filter(e => e.secondary);
P('Q1e', 'among mismatching cases (every engine with mismatches): >= 95% same outcome and point count, max |diff| < 1e-6 units',
  sec.map(e => ({ engine: e.label, sameShare: e.secondary.sameShare, maxAbsDiffMax: e.secondary.maxAbsDiffMax })),
  sec.every(e => e.secondary.sameShare >= 0.95 && (e.secondary.maxAbsDiffMax === null || e.secondary.maxAbsDiffMax < 1e-6)));
const w = q2.widths;
P('Q2a', 'outcome ok for >= 99% of the 1000 seeds', pct(q2.okOutputs, N), q2.okOutputs / N >= 0.99);
P('Q2b', 'pass share at W=4 >= 50%', w[4].passShareOfOk, w[4].passShareOfOk >= 50);
P('Q2c', 'share(4) >= share(8) >= share(14)', [w[4].pass, w[8].pass, w[14].pass], w[4].pass >= w[8].pass && w[8].pass >= w[14].pass);
const SELF = new Set(['SELF_INTERSECTION_CENTERLINE', 'SELF_INTERSECTION_EDGE', 'EDGE_EDGE_INTERSECTION']);
const topErr = W => { const e = Object.entries(w[W].errorCodeCases); return e.length ? e[0][0] : null; };
P('Q2d', 'most frequent failing error code at every width is a self-intersection code', Object.fromEntries(WIDTHS.map(W => [W, topErr(W)])),
  WIDTHS.every(W => topErr(W) === null || SELF.has(topErr(W))));
const closureCases = [...validityLines.values()].filter(l => l.w4.codes.some(c => c.startsWith('CLOSURE_'))).length;
P('Q2e', 'CLOSURE_* codes in < 10% of ok outputs at W=4 (cases with any CLOSURE_* code)', pct(closureCases, q2.okOutputs), closureCases / q2.okOutputs < 0.10);
P('Q3', 'totalTurningDegrees >= 360 for every ok output', minTurning, minTurning >= 360 - 1e-6);

const out = { cases: N, engines, pairwiseAgreementCounts: { labels: ran.map(e => e.label), counts: matrix }, staticMath, dynamicMathCalls: dynamicCalls,
  scriptSha256: ref.meta.scriptSha256, Q2: q2, Q3: q3, predictions: checks };
writeFileSync(join(R, 'SUMMARY.json'), JSON.stringify(out, null, 2) + '\n');

// ---------------- Markdown ----------------
const f4 = x => typeof x === 'number' ? (Number.isInteger(x) ? String(x) : Number(x.toPrecision(4)).toString()) : String(x);
let md = `# E5 summary (generated by analyze.mjs; protocol: PROTOCOL.md)\n\nSubject: YannThorimbert/RacingTrackGenerator @ 3a359db (MIT), unmodified inline script, Math.random replaced by mulberry32(seed). ${N} seeds. Script text SHA-256 ${ref.meta.scriptSha256}.\n\n`;
md += `## Q1: cross-engine agreement of the output polyline (digest = SHA-256 of canonical JSON), reference Node 22\n\n| Engine | agreement | mismatches (of ${N}) | bit-level digest mismatches | 3D-height digest mismatches | first mismatching seeds |\n|---|---|---|---|---|---|\n`;
for (const e of engines) md += e.ran ? `| ${e.name} | ${e.agreementPercent}% | ${e.mismatches} | ${e.bitsDigestMismatches} | ${e.digest3dMismatches} | ${e.firstMismatches.join(', ') || '-'} |\n` : `| ${e.name} | not run | | | | |\n`;
md += `\n### Engine versions\n\n`;
for (const e of engines) md += e.ran ? `- ${e.name}: ${[e.env.engine, e.env.version, e.env.v8 ? 'V8 ' + e.env.v8 : '', e.env.revision ? 'rev ' + e.env.revision : '', e.env.cliVersion ? `(${e.env.cliVersion})` : ''].filter(Boolean).join(' ')}; outcomes ${JSON.stringify(e.outcomes)}; SHA-256 self-test ${e.selfTest ? 'pass' : 'FAIL'}; script text identical ${e.scriptSha256Equal}; new globals after run: ${JSON.stringify(e.newGlobals)}\n` : `- ${e.name}: NOT RUN. Error output:\n\n\`\`\`\n${e.error}\n\`\`\`\n`;
md += `\n### Pairwise agreement (cases with identical digest, of ${N})\n\n| | ${out.pairwiseAgreementCounts.labels.join(' | ')} |\n|---|${out.pairwiseAgreementCounts.labels.map(() => '---').join('|')}|\n`;
out.pairwiseAgreementCounts.labels.forEach((l, i) => { md += `| ${l} | ${matrix[i].join(' | ')} |\n`; });
md += `\n### Secondary: size of the divergence in mismatching cases\n\n| Engine | mismatching cases | same outcome and point count | median over cases of max abs coordinate difference | maximum |\n|---|---|---|---|---|\n`;
for (const e of ran) if (e.secondary) md += `| ${e.name} | ${e.secondary.mismatchingCases} | ${e.secondary.sameOutcomeAndPointCount} (${f4(e.secondary.sameShare * 100)}%) | ${e.secondary.maxAbsDiffMedian === null ? 'n/a' : f4(e.secondary.maxAbsDiffMedian)} | ${e.secondary.maxAbsDiffMax === null ? 'n/a' : f4(e.secondary.maxAbsDiffMax)} |\n`;
md += `\n### Math functions used\n\nStatic (raw text of the script, including comments): ${JSON.stringify(staticMath.raw)}; code only (heuristic comment strip): ${JSON.stringify(staticMath.codeOnly)}; ** operator tokens: raw ${staticMath.powOperatorRaw}, code ${staticMath.powOperatorCodeOnly}.\n`;
md += `Implementation-approximated functions called in code (static): ${staticMath.approximatedUsedInCode.join(', ') || 'none'}.\n`;
md += `Dynamic call counts over the ${N} Node 22 cases: ${JSON.stringify(dynamicCalls)}.\n`;
md += `\n## Q2: validity at stated road widths (validator defaults, ratio seam mode; pass = no error-severity violation)\n\nOutputs with outcome ok: ${q2.okOutputs} of ${N}. Generator's own road width TRACK_WIDTH: minimum ${q2.ownWidth.min}, cases below 4: ${q2.ownWidth.casesBelow4}.\n\n| Width | pass | pass share of ok outputs (Wilson 95%) | pass share of all ${N} | error codes (cases) | warning codes (cases) |\n|---|---|---|---|---|---|\n`;
for (const W of WIDTHS) { const x = w[W]; md += `| ${W} | ${x.pass} | ${x.passShareOfOk}% [${x.wilson95.join(', ')}] | ${x.passShareOfAll}% | ${JSON.stringify(x.errorCodeCases)} | ${JSON.stringify(x.warningCodeCases)} |\n`; }
md += `\nIndependent brute-force centerline-crossing check (not pre-registered): ${JSON.stringify(q2.bruteForceCenterlineCrossCheck)}.\n`;
md += `\n3D variant at W = 4 (y = the script's get_track_h): ok ${q2.threeD.okCases}, cases with a MAX_SLOPE warning ${q2.threeD.maxSlopeWarningCases}.\n`;
md += `\n## Q3: metric distributions (descriptive; median [p25, p75] min..max)\n\n`;
const groups = Object.keys(q3);
const metricNames = Object.keys(q3[groups[0]]);
md += `| metric | ${groups.join(' | ')} |\n|---|${groups.map(() => '---').join('|')}|\n`;
for (const m of metricNames) md += `| ${m} | ${groups.map(g => { const s = q3[g][m]; return `${f4(s.median)} [${f4(s.p25)}, ${f4(s.p75)}] ${f4(s.min)}..${f4(s.max)}`; }).join(' | ')} |\n`;
md += `\nn per group: ${groups.map(g => `${g}: ${q3[g][metricNames[0]].n}`).join('; ')}. Scale-dependent fields (length, boundingBoxArea, sampleCount, curvature statistics, and the fixed-threshold straightLengthFraction/turnCount/curvatureEntropyBits) are not comparable between groups of different size; see the scaled column.\n`;
md += `\n## Predictions (PROTOCOL.md) against results\n\n| id | prediction | observed | holds |\n|---|---|---|---|\n`;
for (const c of checks) md += `| ${c.id} | ${c.prediction} | ${JSON.stringify(c.observed)} | ${c.holds ? 'yes' : 'NO'} |\n`;
writeFileSync(join(R, 'SUMMARY.md'), md);
console.log(md);
