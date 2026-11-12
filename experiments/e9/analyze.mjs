// E9 analysis: reads <dir>/tracks.csv, sources.json (written by run.mjs) and writes <dir>/SUMMARY.json, <dir>/SUMMARY.md (deterministic) and
// <dir>/TIMING.md (from timing.json; machine dependent, excluded from the determinism hash). All definitions: PROTOCOL.md.
// Usage: node analyze.mjs <dir>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const dir = resolve(process.argv[2] ?? (console.error('usage: node analyze.mjs <dir>'), process.exit(2)));
const lines = readFileSync(join(dir, 'tracks.csv'), 'utf8').trim().split('\n');
const H = lines[0].split(',');
const rec = lines.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(H.map((h, i) => [h, c[i]])); });
const info = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'));
const MET = ['meanAbsCurvatureNorm', 'p95AbsCurvatureNorm', 'maxAbsCurvatureNorm', 'curvatureEntropyBitsNorm', 'straightLengthFractionNorm', 'turnCountNorm'];
const PRIMARY = ['real-tumftm', 'gen-e5-thorimbert', 'gen-juangallostra', 'gen-amz-voronoi', 'gen-carracing', 'gen-zzangupenn'];
const SUPP = ['real-bacinger-f1', 'gen-driftschool-s0', 'gen-driftschool-s1', 'gen-driftschool-s2', 'gen-driftschool-s3', 'gen-driftschool-s4'];
const ALL = [...PRIMARY, ...SUPP].filter(s => info[s]);
const FAMILY = { 'real-tumftm': 'real', 'real-bacinger-f1': 'real', 'gen-juangallostra': 'HD', 'gen-driftschool-s0': 'HD*', 'gen-driftschool-s1': 'HD*', 'gen-driftschool-s2': 'HD*', 'gen-driftschool-s3': 'HD*', 'gen-driftschool-s4': 'HD*', 'gen-amz-voronoi': 'VOR', 'gen-carracing': 'CAR', 'gen-zzangupenn': 'CAR', 'gen-e5-thorimbert': 'E5' };
const pct = (a, b) => (b ? 100 * a / b : NaN), f2 = x => (Number.isFinite(x) ? x.toFixed(2) : 'n/a'), f3 = x => (Number.isFinite(x) ? x.toFixed(3) : 'n/a');
function wilson(k, n, z = 1.959963984540054) { if (!n) return [NaN, NaN]; const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [100 * (c - h) / d, 100 * (c + h) / d]; }
const by = (xs, key) => { const m = new Map(); for (const x of xs) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
const quant = (sorted, q) => { if (!sorted.length) return NaN; const p = (sorted.length - 1) * q, i = Math.floor(p), f = p - i; return sorted[i] + (i + 1 < sorted.length ? (sorted[i + 1] - sorted[i]) * f : 0); };
const sortNum = a => [...a].sort((x, y) => x - y);
const desc = a => { const s = sortNum(a); return { n: s.length, min: s[0], q1: quant(s, .25), median: quant(s, .5), q3: quant(s, .75), max: s[s.length - 1], mean: s.reduce((p, c) => p + c, 0) / s.length }; };
const sd = a => { const m = a.reduce((p, c) => p + c, 0) / a.length; return Math.sqrt(a.reduce((p, c) => p + (c - m) ** 2, 0) / (a.length - 1)); };
function w1(a, b) { // exact 1-D Wasserstein-1 between two empirical distributions (quantile-function integral)
  const x = sortNum(a), y = sortNum(b), n = x.length, m = y.length;
  let i = 0, j = 0, u = 0, tot = 0;
  while (i < n && j < m) { const nu = Math.min((i + 1) / n, (j + 1) / m); tot += (nu - u) * Math.abs(x[i] - y[j]); u = nu; if ((i + 1) / n <= nu + 1e-15) i++; if ((j + 1) / m <= nu + 1e-15) j++; }
  return tot;
}
function mulberry32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- Q1 ----
const val = rec.filter(r => r.arm === 'raw' || r.arm === 'smooth');
const Q1 = {};
for (const s of ALL) {
  const q = { unit: info[s].unit, produced: info[s].produced, generationFailures: info[s].generationFailures, failureReasons: info[s].failureReasons, runs: {} };
  const rs = val.filter(r => r.source === s);
  for (const run of [...new Set(rs.map(r => r.run))].sort()) {
    const R = { arms: {} };
    for (const arm of ['raw', 'smooth']) {
      const a = rs.filter(r => r.run === run && r.arm === arm), ok = a.filter(r => r.outcome === 'ok').length, err = a.filter(r => r.outcome === 'error').length;
      const codes = {}, warns = {}; for (const r of a) { for (const c of r.errors ? r.errors.split(';') : []) codes[c] = (codes[c] ?? 0) + 1; for (const c of r.warnings ? r.warnings.split(';') : []) warns[c] = (warns[c] ?? 0) + 1; }
      const spacings = [...new Set(a.map(r => r.spacing))];
      R.arms[arm] = { n: a.length, ok, buildErrors: err, okRate: pct(ok, a.length), wilson95: wilson(ok, a.length), okRateOfAttempted: pct(ok, a.length + q.generationFailures), errorCodeTracks: Object.fromEntries(Object.entries(codes).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))), warningCodeTracks: warns, widthRange: [Math.min(...a.map(r => +r.width)), Math.max(...a.map(r => +r.width))], spacing: arm === 'smooth' ? (spacings.length === 1 ? +spacings[0] : [Math.min(...a.map(r => +r.spacing)), Math.max(...a.map(r => +r.spacing))]) : null,
        inputPoints: desc(a.map(r => +r.n_in)), dupRemoved: { tracksWithDup: a.filter(r => +r.dup_removed > 0).length, total: a.reduce((p, r) => p + (+r.dup_removed || 0), 0) } };
    }
    const raw = new Map(rs.filter(r => r.run === run && r.arm === 'raw').map(r => [r.id, r])), sm = new Map(rs.filter(r => r.run === run && r.arm === 'smooth').map(r => [r.id, r]));
    const T = { okok: 0, failToOk: 0, okToFail: 0, failFail: 0 }; const persist = {};
    for (const [id, a] of raw) { const b = sm.get(id); if (!b) continue; const ao = a.outcome === 'ok', bo = b.outcome === 'ok';
      if (ao && bo) T.okok++; else if (!ao && bo) T.failToOk++; else if (ao && !bo) T.okToFail++; else { T.failFail++; for (const c of b.errors ? b.errors.split(';') : []) persist[c] = (persist[c] ?? 0) + 1; } }
    const rawFail = T.failToOk + T.failFail;
    R.transitions = { ...T, rawFailures: rawFail, explainedBySampling: rawFail >= 5 ? pct(T.failToOk, rawFail) : null, okToFailShare: pct(T.okToFail, raw.size), persistentCodes: persist };
    q.runs[run] = R;
  }
  Q1[s] = q;
}
const circuits = (Q1['real-tumftm'] ? [...new Set(val.filter(r => r.source === 'real-tumftm').map(r => r.id))].sort() : []).map(id => {
  const g = (run, arm) => val.find(r => r.source === 'real-tumftm' && r.id === id && r.run === run && r.arm === arm);
  return { id, width: +g('main', 'raw').width, minWidth: +g('minw', 'raw').width, raw: g('main', 'raw').outcome, rawErrors: g('main', 'raw').errors, smooth: g('main', 'smooth').outcome, smoothErrors: g('main', 'smooth').errors, rawMinW: g('minw', 'raw').outcome, smoothMinW: g('minw', 'smooth').outcome };
});

// ---- Q2 ----
const n720 = rec.filter(r => r.arm === 'n720' && r.outcome === 'metrics');
const rawMet = rec.filter(r => r.arm === 'raw' && r.run === 'main' && r.outcome !== 'error');
const vals = (rows, s, m) => rows.filter(r => (Array.isArray(s) ? s.includes(r.source) : r.source === s)).map(r => +r[m]).filter(Number.isFinite);
const real = id => vals(n720, 'real-tumftm', id);
const SPLITS = 2000, rng = mulberry32(20261113), baseline = {};
for (const m of MET) {
  const x = real(m), idx = x.map((_, i) => i), ds = [], S = sd(x);
  for (let k = 0; k < SPLITS; k++) { for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } const A = idx.slice(0, 12).map(i => x[i]), B = idx.slice(12).map(i => x[i]); ds.push(w1(A, B) / S); }
  ds.sort((a, b) => a - b);
  baseline[m] = { sdReal: S, splitMedian: quant(ds, .5), splitP95: ds[Math.ceil(0.95 * SPLITS) - 1], threshold: Math.max(0.5, ds[Math.ceil(0.95 * SPLITS) - 1]) };
}
const groups = Object.fromEntries([...ALL.map(s => [s, s]), ['CAR (carracing + track_gen pooled)', ['gen-carracing', 'gen-zzangupenn']]]);
const Q2 = { baseline, sources: {}, rawArmMedians: {} };
for (const [name, s] of Object.entries(groups)) {
  const row = { description: {}, d: {}, differs: {} };
  for (const m of MET) {
    const v = vals(n720, s, m); if (!v.length) continue;
    row.description[m] = desc(v);
    const d = name === 'real-tumftm' ? 0 : w1(v, real(m)) / baseline[m].sdReal;
    row.d[m] = d; row.differs[m] = name === 'real-tumftm' ? null : d > baseline[m].threshold;
  }
  const ds = Object.values(row.d); row.meanD = ds.length ? ds.reduce((p, c) => p + c, 0) / ds.length : NaN; row.nDiffer = Object.values(row.differs).filter(x => x === true).length;
  Q2.sources[name] = row;
  Q2.rawArmMedians[name] = Object.fromEntries(MET.map(m => [m, desc(vals(rawMet, s, m)).median]));
}

// ---- predictions ----
const P = [];
const add = (id, text, observed, held) => P.push({ id, text, observed, verdict: held === null ? 'not testable' : held ? 'held' : 'FAILED' });
const main = (s, arm) => Q1[s]?.runs.main.arms[arm];
const T = s => Q1[s]?.runs.main.transitions;
if (Q1['real-tumftm']) {
  const a = main('real-tumftm', 'raw'), b = main('real-tumftm', 'smooth'), mr = Q1['real-tumftm'].runs.minw.arms.raw;
  add('P1.1', 'TUMFTM raw ok >= 20 of 25', `${a.ok} of ${a.n}`, a.ok >= 20);
  add('P1.2', 'TUMFTM smooth ok >= raw ok - 1', `smooth ${b.ok}, raw ${a.ok}`, b.ok >= a.ok - 1);
  add('P1.3', 'TUMFTM raw ok at minimum width >= at median width, difference <= 3', `min width ${mr.ok}, median width ${a.ok}`, mr.ok >= a.ok && mr.ok - a.ok <= 3);
}
if (Q1['real-bacinger-f1']) { const a = main('real-bacinger-f1', 'raw'), b = main('real-bacinger-f1', 'smooth'); add('P1.4', 'bacinger raw ok <= 50 % and smooth ok >= 70 %', `raw ${f2(a.okRate)} %, smooth ${f2(b.okRate)} %`, a.okRate <= 50 && b.okRate >= 70); }
{ const a = main('gen-amz-voronoi', 'raw'); add('P1.5', 'AMZ raw ok >= 90 %', `${f2(a.okRate)} %`, a.okRate >= 90); }
{ const a = main('gen-e5-thorimbert', 'raw'); add('P1.6', 'E5 generator (W = 4) raw ok >= 90 %', `${f2(a.okRate)} %`, a.okRate >= 90); }
{ const a = main('gen-juangallostra', 'raw'), t = T('gen-juangallostra'), codes = Object.entries(a.errorCodeTracks), top = codes[0]?.[0];
  const edge = c => /^(SELF_INTERSECTION_|EDGE_)/.test(c ?? '');
  const rescued = t.rawFailures ? pct(t.failToOk, t.rawFailures) : NaN;
  add('P1.7', 'juangallostra raw ok <= 40 %, top error code is an edge/centreline self-intersection or fold code, smoothing rescues <= 30 % of raw failures', `raw ${f2(a.okRate)} %, top code ${top} (${codes[0]?.[1]} tracks), rescued ${f2(rescued)} %`, a.okRate <= 40 && edge(top) && rescued <= 30); }
{ const a = main('gen-carracing', 'raw'); add('P1.8', 'CarRacing raw ok between 50 % and 90 %', `${f2(a.okRate)} %`, a.okRate >= 50 && a.okRate <= 90); }
{ const a = main('gen-zzangupenn', 'raw'), c = main('gen-carracing', 'raw'); add('P1.9', 'track_gen raw ok < CarRacing raw ok and <= 60 %', `track_gen ${f2(a.okRate)} %, CarRacing ${f2(c.okRate)} % (difference ${f2(c.okRate - a.okRate)} pp)`, a.okRate < c.okRate && a.okRate <= 60); }
{ const worst = ALL.map(s => [s, T(s)?.okToFailShare]).filter(x => Number.isFinite(x[1])); const bad = worst.filter(x => x[1] >= 2);
  add('P1.10', 'for every source the share ok(raw) -> not ok(smooth) is < 2 %', `max ${f2(Math.max(...worst.map(x => x[1])))} % (${worst.sort((a, b) => b[1] - a[1])[0][0]}); sources >= 2 %: ${bad.map(x => `${x[0]} ${f2(x[1])} %`).join(', ') || 'none'}`, bad.length === 0); }
{ const exp = { 'gen-amz-voronoi': 79, 'gen-juangallostra': 2, 'gen-carracing': 0, 'gen-zzangupenn': 0, 'gen-e5-thorimbert': 0 }; const obs = Object.fromEntries(Object.keys(exp).map(s => [s, info[s]?.generationFailures]));
  add('P1.11', 'generation failures equal the phase-1 counts (AMZ 79, juangallostra 2, others 0)', JSON.stringify(obs), Object.keys(exp).every(s => obs[s] === exp[s])); }
const GEN5 = ['gen-juangallostra', 'gen-amz-voronoi', 'gen-carracing', 'gen-zzangupenn', 'gen-e5-thorimbert'];
{ const o = Object.fromEntries(GEN5.map(s => [s, Q2.sources[s]?.nDiffer])); add('P2.1', 'each primary generator source differs from TUMFTM in >= 2 of 6 normalised metrics', JSON.stringify(o), GEN5.every(s => o[s] >= 2)); }
{ const rm = Q2.sources['real-tumftm'].description.straightLengthFractionNorm.median, o = Object.fromEntries(GEN5.map(s => [s, Q2.sources[s].description.straightLengthFractionNorm.median])); add('P2.2', 'every primary generator source has a median straightLengthFractionNorm below the real median', `real ${f3(rm)}; ` + GEN5.map(s => `${s} ${f3(o[s])}`).join(', '), GEN5.every(s => o[s] < rm)); }
{ const o = Object.fromEntries(GEN5.map(s => [s, Q2.sources[s].meanD])), best = Object.entries(o).sort((a, b) => a[1] - b[1])[0][0]; add('P2.3', 'E5 generator has the smallest mean d over the 6 metrics among the five sources', GEN5.map(s => `${s} ${f3(o[s])}`).join(', '), best === 'gen-e5-thorimbert'); }
if (Q2.sources['real-bacinger-f1']) { const q = Q2.sources['real-bacinger-f1']; add('P2.4', 'bacinger vs TUMFTM differs in <= 1 of 6 metrics', `${q.nDiffer} of 6 (d: ${MET.map(m => f3(q.d[m])).join(', ')})`, q.nDiffer <= 1); }

const summary = { protocol: 'experiments/e9/PROTOCOL.md', Q1, circuits, Q2, predictions: P, tally: { held: P.filter(p => p.verdict === 'held').length, failed: P.filter(p => p.verdict === 'FAILED').length, notTestable: P.filter(p => p.verdict === 'not testable').length } };
writeFileSync(join(dir, 'SUMMARY.json'), JSON.stringify(summary, null, 1) + '\n');

// ---- markdown ----
let md = `# E9 summary (generated by analyze.mjs; definitions and predictions: PROTOCOL.md)\n\nPrimary sources first, supplementary after the blank row. ok = no error-severity violation of \`validateTrack\` with library defaults. Wilson 95 % intervals.\n\n`;
md += `## Q1 validity (width run "main"; raw = as emitted, smooth = \`--resample-smooth\` at 0.25 x width)\n\n| source | family | unit | produced / attempted | raw ok (rate, Wilson 95%) | smooth ok (rate, Wilson 95%) | raw ok of attempted | fail -> ok | ok -> fail | fail/fail | explained by sampling |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const s of ALL) { const q = Q1[s], a = q.runs.main.arms.raw, b = q.runs.main.arms.smooth, t = q.runs.main.transitions;
  md += `${s === SUPP[0] ? '| | | | | | | | | | | |\n' : ''}| ${s}${SUPP.includes(s) ? ' (suppl.)' : ''} | ${FAMILY[s]} | ${q.unit} | ${q.produced} / ${q.produced + q.generationFailures} | ${a.ok}/${a.n} = ${f2(a.okRate)} % [${f2(a.wilson95[0])}, ${f2(a.wilson95[1])}] | ${b.ok}/${b.n} = ${f2(b.okRate)} % [${f2(b.wilson95[0])}, ${f2(b.wilson95[1])}] | ${f2(a.okRateOfAttempted)} % | ${t.failToOk} | ${t.okToFail} | ${t.failFail} | ${t.explainedBySampling === null ? `n/a (< 5 raw failures: ${t.rawFailures})` : f2(t.explainedBySampling) + ' %'} |\n`; }
md += `\nGeneration failures (not retried): ${ALL.filter(s => info[s].generationFailures).map(s => `${s} ${info[s].generationFailures} (${Object.entries(info[s].failureReasons).map(([r, n]) => `${n} x ${r}`).join('; ')})`).join('; ') || 'none'}.\n`;
md += `\n### Error codes (number of tracks having the code; a track can have several)\n\n| source | arm | codes |\n|---|---|---|\n`;
for (const s of ALL) for (const arm of ['raw', 'smooth']) { const a = Q1[s].runs.main.arms[arm]; md += `| ${s} | ${arm} (${arm === 'smooth' ? 's = ' + (Array.isArray(a.spacing) ? a.spacing.map(f3).join('..') : f3(a.spacing)) : 'W = ' + (a.widthRange[0] === a.widthRange[1] ? f3(a.widthRange[0]) : a.widthRange.map(f3).join('..'))}) | ${JSON.stringify(a.errorCodeTracks)}${Object.keys(a.warningCodeTracks).length ? ' warnings ' + JSON.stringify(a.warningCodeTracks) : ''} |\n`; }
md += `\nPersistent error codes in fail/fail tracks (smooth arm): ${ALL.map(s => `${s}: ${JSON.stringify(Q1[s].runs.main.transitions.persistentCodes)}`).join('; ')}.\n`;
md += `\nInput sampling and duplicates (raw arm): ${ALL.map(s => { const a = Q1[s].runs.main.arms.raw; return `${s}: points ${a.inputPoints.min}/${a.inputPoints.median}/${a.inputPoints.max}, tracks with removed duplicate vertices ${a.dupRemoved.tracksWithDup} (${a.dupRemoved.total} vertices)`; }).join('; ')}.\n`;
if (circuits.length) {
  md += `\n### TUMFTM circuits (width = median per-point width; "min" = run at the circuit's minimum per-point width)\n\n| circuit | width (m) | min width (m) | raw | raw errors | smooth | smooth errors | raw @ min width | smooth @ min width |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const c of circuits) md += `| ${c.id} | ${f2(c.width)} | ${f2(c.minWidth)} | ${c.raw} | ${c.rawErrors} | ${c.smooth} | ${c.smoothErrors} | ${c.rawMinW} | ${c.smoothMinW} |\n`;
  const mr = Q1['real-tumftm'].runs.minw.arms; md += `\nAt the minimum width: raw ok ${mr.raw.ok}/${mr.raw.n}, smooth ok ${mr.smooth.ok}/${mr.smooth.n}; error codes raw ${JSON.stringify(mr.raw.errorCodeTracks)}, smooth ${JSON.stringify(mr.smooth.errorCodeTracks)}.\n`;
}
md += `\n## Q2 geometric range (norm-720 arm: smooth resample to about 720 samples; not validated)\n\nd = W1 / sd_real against the 25 TUMFTM circuits; "differs" iff d > max(0.5, p95 of d over ${SPLITS} random 12/13 splits of the circuits). Per metric: sd_real, split median, split p95, threshold:\n\n| metric | sd_real | split median | split p95 | threshold |\n|---|---|---|---|---|\n`;
for (const m of MET) { const b = baseline[m]; md += `| ${m} | ${f3(b.sdReal)} | ${f3(b.splitMedian)} | ${f3(b.splitP95)} | ${f3(b.threshold)} |\n`; }
for (const m of MET) {
  md += `\n### ${m}\n\n| source | n | min | q1 | median | q3 | max | d vs TUMFTM | differs |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const [name, row] of Object.entries(Q2.sources)) { const d = row.description[m]; if (!d) continue; md += `| ${name} | ${d.n} | ${f3(d.min)} | ${f3(d.q1)} | ${f3(d.median)} | ${f3(d.q3)} | ${f3(d.max)} | ${name === 'real-tumftm' ? '-' : f3(row.d[m])} | ${row.differs[m] === null ? '-' : row.differs[m] ? 'yes' : 'no'} |\n`; }
}
md += `\n### Per source: number of metrics that differ, mean d\n\n| source | metrics that differ (of 6) | mean d |\n|---|---|---|\n`;
for (const [name, row] of Object.entries(Q2.sources)) if (name !== 'real-tumftm') md += `| ${name} | ${row.nDiffer} | ${f3(row.meanD)} |\n`;
md += `\n### Secondary: medians on the raw arm (as emitted; sampling-dependent, descriptive only)\n\n| source | ${MET.join(' | ')} |\n|---|${MET.map(() => '---').join('|')}|\n`;
for (const [name, row] of Object.entries(Q2.rawArmMedians)) md += `| ${name} | ${MET.map(m => f3(row[m])).join(' | ')} |\n`;
md += `\n## Predictions (PROTOCOL.md section 4; Q3 verdict in TIMING.md, Q4 in DETERMINISM.txt)\n\n| id | prediction | observed | verdict |\n|---|---|---|---|\n`;
for (const p of P) md += `| ${p.id} | ${p.text} | ${p.observed} | ${p.verdict} |\n`;
md += `\nTally here (Q1, Q2): ${summary.tally.held} held, ${summary.tally.failed} failed, ${summary.tally.notTestable} not testable.\n`;
writeFileSync(join(dir, 'SUMMARY.md'), md);

// ---- timing (machine dependent) ----
if (existsSync(join(dir, 'timing.json'))) {
  const t = JSON.parse(readFileSync(join(dir, 'timing.json'), 'utf8'));
  let tm = `# E9 Q3: wall time per track (trackFromPolyline + validateTrack + computeMetrics, raw arm, main width)\n\nMachine: ${t.machine.cpu}, ${t.machine.cores} cores, ${t.machine.platform}, ${t.machine.memGB} GB, Node ${t.machine.node}. One pass per track after a 20-track warm-up. Indicative only; this file is excluded from the determinism hash.\n\n| source | n | median ms | p95 ms | max ms |\n|---|---|---|---|---|\n`;
  const stat = {};
  for (const s of ALL) { const v = sortNum((t.ms[s] ?? []).map(x => x[1])); if (!v.length) continue; stat[s] = { n: v.length, median: quant(v, .5), p95: quant(v, .95), max: v[v.length - 1] }; tm += `| ${s} | ${v.length} | ${stat[s].median.toFixed(2)} | ${stat[s].p95.toFixed(2)} | ${stat[s].max.toFixed(2)} |\n`; }
  const gen = GEN5.every(s => stat[s]) && stat['real-tumftm'];
  const held = gen && GEN5.every(s => stat[s].median < 20 && stat[s].p95 < 100 && stat[s].max < 1000) && stat['real-tumftm'].median < 50 && stat['real-tumftm'].p95 < 100 && stat['real-tumftm'].max < 1000;
  tm += `\nP3.1 (median < 20 ms for every generator source and < 50 ms for TUMFTM; p95 < 100 ms for every primary source; no track above 1 s): ${gen ? (held ? 'held' : 'FAILED') : 'not testable'}.\n`;
  writeFileSync(join(dir, 'TIMING.md'), tm);
}
console.log(`analyze.mjs: ${P.length} predictions evaluated (${summary.tally.held} held, ${summary.tally.failed} failed) -> ${dir}`);
