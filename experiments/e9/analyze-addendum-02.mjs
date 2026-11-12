// E9 ADDENDUM-02 analysis: reads <dir>/tracks.csv, sources.json, env.json (addendum-02.mjs); writes <dir>/SUMMARY.json and <dir>/SUMMARY.md (deterministic).
// Compares the v1.2-pinned columns with the committed E9 results/tracks.csv.gz (prediction A1). Definitions and predictions: ADDENDUM-02.md.
// Usage: node analyze-addendum-02.mjs <dir>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2] ?? (console.error('usage: node analyze-addendum-02.mjs <dir>'), process.exit(2)));
const parse = text => { const L = text.trim().split('\n'), H = L[0].split(','); return L.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(H.map((h, i) => [h, c[i]])); }); };
const rec = parse(readFileSync(join(dir, 'tracks.csv'), 'utf8')), info = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')), env = JSON.parse(readFileSync(join(dir, 'env.json'), 'utf8'));
const Z = 1.959963984540054;
const wilson = (k, n) => { if (!n) return [null, null]; const p = k / n, d = 1 + Z * Z / n, c = p + Z * Z / (2 * n), h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)); return [(c - h) / d, (c + h) / d]; };
const r6 = x => (x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toPrecision(6)));
const pc = x => (x === null ? 'n/a' : (100 * x).toFixed(1) + '%');
const ORDER = ['gen-trackseed', 'real-tumftm', 'gen-e5-thorimbert', 'gen-juangallostra', 'gen-amz-voronoi', 'gen-carracing', 'gen-zzangupenn', 'real-bacinger-f1', 'gen-driftschool-s0', 'gen-driftschool-s1', 'gen-driftschool-s2', 'gen-driftschool-s3', 'gen-driftschool-s4'].filter(s => info[s]);
const SELF = { 'gen-trackseed': 'no (never calls its validator)', 'real-tumftm': 'n/a (real)', 'real-bacinger-f1': 'n/a (real)', 'gen-e5-thorimbert': 'yes: rejects crossing candidates', 'gen-juangallostra': 'yes: minimum point distance, angle limit', 'gen-amz-voronoi': 'yes: curvature limit and self-crossing rejection (79 of 1000 produce nothing)', 'gen-carracing': 'by construction: turn-rate limit, loop closure', 'gen-zzangupenn': 'by construction: turn-rate limit, loop closure' };
for (const s of ORDER) if (s.startsWith('gen-driftschool')) SELF[s] = 'yes: validates its own tracks';
const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sel = (s, run, arm) => rec.filter(r => r.source === s && r.run === run && r.arm === arm);
function stats(s, run, arm) {
  const a = sel(s, run, arm), n = a.length, att = n + (info[s]?.generationFailures ?? 0);
  const cnt = f => a.filter(f).length, has = (r, field, code) => (r[field] ? r[field].split(';').includes(code) : false);
  const ok13 = cnt(r => r.outcome13 === 'ok'), ok12 = cnt(r => r.outcome12 === 'ok'), under = cnt(r => has(r, 'warnings13', 'UNDERSAMPLED')), sharp = cnt(r => has(r, 'errors13', 'SHARP_VERTEX')), kink = cnt(r => has(r, 'errors13', 'LOCAL_KINK'));
  const codeCount = {}; for (const r of a) for (const c of r.errors13 ? r.errors13.split(';') : []) codeCount[c] = (codeCount[c] ?? 0) + 1;
  const warnCount = {}; for (const r of a) for (const c of r.warnings13 ? r.warnings13.split(';') : []) warnCount[c] = (warnCount[c] ?? 0) + 1;
  const fails13 = a.filter(r => r.outcome13 === 'fail'), failsUnder = fails13.filter(r => has(r, 'warnings13', 'UNDERSAMPLED')).length;
  const okUnder = cnt(r => r.outcome13 === 'ok' && has(r, 'warnings13', 'UNDERSAMPLED'));
  const W = (k, d) => { const w = wilson(k, d); return { k, n: d, p: r6(d ? k / d : null), lo: r6(w[0]), hi: r6(w[1]) }; };
  const nums = f => a.map(f).filter(Number.isFinite);
  return { n, attempted: att, ok13: W(ok13, n), ok13OfAttempted: W(ok13, att), ok12: arm === 'cs10' ? null : W(ok12, n), under: W(under, n), sharp: W(sharp, n), kink: W(kink, n), failsWithUnder: { k: failsUnder, n: fails13.length },
    okWithUnder: okUnder, errorCodeTracks: codeCount, warningCodeTracks: warnCount, medShare12: r6(med(nums(r => +r.share12))), medMaxTurn: r6(med(nums(r => +r.maxTurn))), medSpacingOverW: r6(med(nums(r => +r.medSpacing / +r.width))),
    widthRange: n ? [Math.min(...a.map(r => +r.width)), Math.max(...a.map(r => +r.width))] : null };
}
const RESULT = {};
for (const s of ORDER) { RESULT[s] = { produced: info[s].produced, attempted: info[s].produced + info[s].generationFailures, generationFailures: info[s].generationFailures, selfFiltering: SELF[s], runs: {} };
  for (const run of s === 'real-tumftm' ? ['main', 'minw'] : ['main']) { RESULT[s].runs[run] = {}; for (const arm of ['raw', 'cs25', 'cs10']) RESULT[s].runs[run][arm] = stats(s, run, arm); } }
// transitions raw -> cs25 (v1.3)
for (const s of ORDER) { const raw = new Map(sel(s, 'main', 'raw').map(r => [r.id, r])), t = { okok: 0, failToOk: 0, okToFail: 0, failFail: 0 };
  for (const r of sel(s, 'main', 'cs25')) { const a = raw.get(r.id); if (!a) continue; const x = a.outcome13 === 'ok', y = r.outcome13 === 'ok'; if (x && y) t.okok++; else if (!x && y) t.failToOk++; else if (x && !y) t.okToFail++; else t.failFail++; }
  RESULT[s].transitions13 = t; }
// juangallostra quantisation diagnostic (and all sources, for reference)
const QUANT = {}; for (const s of ORDER) { const a = sel(s, 'main', 'raw'), ints = a.filter(r => r.allInt === '1').length, ms = med(a.map(r => +r.medSpacing).filter(Number.isFinite)); QUANT[s] = { allIntegerTracks: ints, n: a.length, medianSpacing: r6(ms), qDegrees: r6(ms ? 2 * Math.atan(0.5 / ms) * 180 / Math.PI : null) }; }
// TUMFTM per circuit
const circuits = [...new Set(rec.filter(r => r.source === 'real-tumftm').map(r => r.id))].sort().map(id => { const g = (run, arm) => rec.find(r => r.source === 'real-tumftm' && r.id === id && r.run === run && r.arm === arm); return { id, width: +g('main', 'raw').width, minWidth: +g('minw', 'raw').width, raw13: g('main', 'raw').outcome13, rawErr: g('main', 'raw').errors13, rawWarn: g('main', 'raw').warnings13, cs25: g('main', 'cs25').outcome13, cs25Err: g('main', 'cs25').errors13, rawMin: g('minw', 'raw').outcome13, cs25Min: g('minw', 'cs25').outcome13, raw12: g('main', 'raw').outcome12, cs25_12: g('main', 'cs25').outcome12 }; });

// ---------------------------------------------------------------- predictions
const preds = []; const part = (text, observed, ok) => ({ text, observed, ok });
const add = (id, label, kind, parts) => preds.push({ id, label, kind, verdict: parts.every(p => p.ok) ? 'held' : 'failed', parts });
const R = (s, arm, run = 'main') => RESULT[s]?.runs[run][arm];
const rate = x => (x && x.p !== null ? x.p : null), between = (x, lo, hi) => x !== null && x >= lo && x <= hi;
{ // A1
  const e9p = join(here, 'results', 'tracks.csv.gz'), e9env = join(here, 'results', 'env.json'); let a1 = null;
  if (existsSync(e9p) && env.sources.includes('real-tumftm')) {
    const e9 = parse(gunzipSync(readFileSync(e9p)).toString()), map = new Map(e9.filter(r => r.arm === 'raw' || r.arm === 'smooth').map(r => [`${r.source}|${r.id}|${r.run}|${r.arm === 'smooth' ? 'cs25' : 'raw'}`, r]));
    let cmp = 0, mis = 0, missing = 0; for (const r of rec) { if (r.arm === 'cs10' || r.source === 'gen-trackseed') continue; const e = map.get(`${r.source}|${r.id}|${r.run}|${r.arm}`); if (!e) { missing++; continue; } cmp++; if (e.outcome !== r.outcome12 || e.errors !== r.errors12) mis++; }
    const e9hash = JSON.parse(readFileSync(e9env, 'utf8')).polylinesSha256; a1 = { compared: cmp, mismatches: mis, notInE9: missing, e9PolylinesSha256: e9hash, thisRun: env.polylinesSha256 };
  }
  add('A1', 'v1.2-pinned outcomes equal the committed E9 table; polyline hash equal', 'construction', [part('0 mismatches, hash equal', a1 ? JSON.stringify(a1) : 'not evaluated (no E9 results or smoke)', a1 ? a1.mismatches === 0 && a1.compared > 0 && a1.e9PolylinesSha256 === a1.thisRun : false)]);
  const bad = rec.filter(r => r.outcome12 === 'fail' && r.outcome13 === 'ok').length; add('A2', 'ok(v1.3) implies ok(v1.2)', 'construction', [part('0 tracks with v1.2 fail and v1.3 ok', `${bad}`, bad === 0)]);
}
{ const raw = R('gen-trackseed', 'raw'), cs = R('gen-trackseed', 'cs25');
  add('A3', 'TrackSeed raw', 'informed', [part('ok >= 95%', pc(rate(raw?.ok13)), rate(raw?.ok13) >= 0.95), part('UNDERSAMPLED <= 1%', pc(rate(raw?.under)), rate(raw?.under) <= 0.01), part('SHARP <= 0.5%', pc(rate(raw?.sharp)), rate(raw?.sharp) <= 0.005)]);
  add('A4', 'TrackSeed cs25', 'informed', [part('ok >= 95%', pc(rate(cs?.ok13)), rate(cs?.ok13) >= 0.95), part('|raw - cs25| <= 3 pp', `${(100 * Math.abs(rate(raw?.ok13) - rate(cs?.ok13))).toFixed(2)} pp`, Math.abs(rate(raw?.ok13) - rate(cs?.ok13)) <= 0.03), part('UNDERSAMPLED <= 1%', pc(rate(cs?.under)), rate(cs?.under) <= 0.01)]); }
{ const p5 = [], u = s => rate(R(s, 'raw')?.under), k = (s, c) => R(s, 'raw')?.under?.k;
  p5.push(part('AMZ <= 2%', pc(u('gen-amz-voronoi')), u('gen-amz-voronoi') <= 0.02));
  for (const st of [0, 1, 2, 3, 4]) p5.push(part(`drift-school s${st} <= 1%`, pc(u(`gen-driftschool-s${st}`)), u(`gen-driftschool-s${st}`) <= 0.01));
  p5.push(part('E5 <= 25%', pc(u('gen-e5-thorimbert')), u('gen-e5-thorimbert') <= 0.25)); p5.push(part('CarRacing >= 80%', pc(u('gen-carracing')), u('gen-carracing') >= 0.8)); p5.push(part('track_gen >= 80%', pc(u('gen-zzangupenn')), u('gen-zzangupenn') >= 0.8));
  p5.push(part('juangallostra >= 90%', pc(u('gen-juangallostra')), u('gen-juangallostra') >= 0.9)); p5.push(part('bacinger >= 40%', pc(u('real-bacinger-f1')), u('real-bacinger-f1') >= 0.4)); p5.push(part('TUMFTM 0..3 of 25', `${k('real-tumftm')} of 25`, k('real-tumftm') <= 3));
  add('A5', 'raw UNDERSAMPLED rates', 'informed', p5);
  const sh = s => rate(R(s, 'raw')?.sharp), p6 = [part('AMZ 0%', pc(sh('gen-amz-voronoi')), sh('gen-amz-voronoi') === 0)];
  for (const st of [0, 1, 2, 3, 4]) p6.push(part(`drift-school s${st} 0%`, pc(sh(`gen-driftschool-s${st}`)), sh(`gen-driftschool-s${st}`) === 0));
  p6.push(part('CarRacing <= 5%', pc(sh('gen-carracing')), sh('gen-carracing') <= 0.05), part('E5 <= 2%', pc(sh('gen-e5-thorimbert')), sh('gen-e5-thorimbert') <= 0.02), part('track_gen 30..70%', pc(sh('gen-zzangupenn')), between(sh('gen-zzangupenn'), 0.3, 0.7)),
    part('bacinger >= 40%', pc(sh('real-bacinger-f1')), sh('real-bacinger-f1') >= 0.4), part('TUMFTM <= 4 of 25', `${R('real-tumftm', 'raw')?.sharp.k} of 25`, R('real-tumftm', 'raw')?.sharp.k <= 4));
  add('A6', 'raw SHARP_VERTEX rates', 'informed', p6);
  const p7 = []; const dd = s => Math.abs(rate(R(s, 'cs25')?.ok13) - rate(R(s, 'cs25')?.ok12));
  for (const s of ['gen-e5-thorimbert', 'gen-amz-voronoi', 'gen-carracing', 'gen-driftschool-s0', 'gen-driftschool-s1', 'gen-driftschool-s2', 'gen-driftschool-s3', 'gen-driftschool-s4', 'gen-trackseed']) p7.push(part(`${s} |v1.3 - v1.2| <= 2 pp`, `${(100 * dd(s)).toFixed(2)} pp`, dd(s) <= 0.02));
  { const a = R('real-tumftm', 'cs25'); p7.push(part('TUMFTM <= 2 circuits', `${a.ok12.k - a.ok13.k}`, a.ok12.k - a.ok13.k <= 2)); }
  add('A7', 'cs25: v1.3 vs v1.2 ok', 'informed', p7);
  const uc = s => rate(R(s, 'cs25')?.under), p8 = [];
  for (const s of ['gen-e5-thorimbert', 'gen-amz-voronoi', 'gen-trackseed', 'gen-driftschool-s0', 'gen-driftschool-s1', 'gen-driftschool-s2', 'gen-driftschool-s3', 'gen-driftschool-s4']) p8.push(part(`${s} <= 5%`, pc(uc(s)), uc(s) <= 0.05));
  p8.push(part('CarRacing >= 60%', pc(uc('gen-carracing')), uc('gen-carracing') >= 0.6), part('track_gen >= 50%', pc(uc('gen-zzangupenn')), uc('gen-zzangupenn') >= 0.5), part('TUMFTM <= 3 of 25', `${R('real-tumftm', 'cs25')?.under.k} of 25`, R('real-tumftm', 'cs25')?.under.k <= 3));
  add('A8', 'cs25 UNDERSAMPLED rates', 'informed', p8);
  const m = R('real-tumftm', 'cs25'), mn = R('real-tumftm', 'cs25', 'minw'), rm = R('real-tumftm', 'raw'), rn = R('real-tumftm', 'raw', 'minw');
  add('A9', 'TUMFTM width runs', 'informed', [part('cs25 ok(min) - ok(median) >= 2 circuits', `${mn.ok13.k} vs ${m.ok13.k}`, mn.ok13.k - m.ok13.k >= 2), part('raw ok differs by <= 1 circuit', `${rn.ok13.k} vs ${rm.ok13.k}`, Math.abs(rn.ok13.k - rm.ok13.k) <= 1)]);
  const j = R('gen-juangallostra', 'raw'), jc = R('gen-juangallostra', 'cs25'), q = QUANT['gen-juangallostra'];
  add('A10', 'juangallostra', 'informed', [part('raw ok <= 0.5%', pc(rate(j.ok13)), rate(j.ok13) <= 0.005), part('cs25 ok <= 12.83%', pc(rate(jc.ok13)), rate(jc.ok13) <= 0.1283), part('all-integer tracks >= 99%', `${q.allIntegerTracks}/${q.n}`, q.allIntegerTracks / q.n >= 0.99), part('q >= 15 degrees', `${q.qDegrees}`, q.qDegrees >= 15)]);
  const tf = rm.failsWithUnder, cf = R('gen-carracing', 'raw').failsWithUnder, zf = R('gen-zzangupenn', 'raw').failsWithUnder;
  add('A11', 'the sampling diagnostic does not explain real-circuit failures', 'informed', [part('TUMFTM: failing raw circuits with UNDERSAMPLED <= 30%', `${tf.k}/${tf.n}`, tf.n === 0 || tf.k / tf.n <= 0.3), part('CarRacing >= 90%', `${cf.k}/${cf.n}`, cf.k / cf.n >= 0.9), part('track_gen >= 90%', `${zf.k}/${zf.n}`, zf.k / zf.n >= 0.9)]);
}
const held = preds.filter(p => p.verdict === 'held').length;
const tally = { total: preds.length, held, failed: preds.length - held, note: 'A12 (determinism) is evaluated by addendum-02.sh and recorded in DETERMINISM.txt' };
writeFileSync(join(dir, 'SUMMARY.json'), JSON.stringify({ protocol: 'experiments/e9/ADDENDUM-02.md', validator: 'v1.3 library defaults', predictions: preds, tally, sources: RESULT, quantisation: QUANT, tumftmCircuits: circuits, env: { polylinesSha256: env.polylinesSha256, trackseedPolylinesSha256: env.trackseedPolylinesSha256, node: env.node } }) + '\n');

// ---------------------------------------------------------------- markdown
const cell = x => (x && x.p !== null ? `${(100 * x.p).toFixed(1)}% (${x.k}/${x.n}) [${(100 * x.lo).toFixed(1)}, ${(100 * x.hi).toFixed(1)}]` : 'n/a');
const md = ['# E9 addendum-02: what validator v1.3 reports about each source at its own sampling and at a common sampling rule\n',
  'Protocol: `experiments/e9/ADDENDUM-02.md` (committed alone before the harness). **Question: what the validator reports about each source\'s sampling and geometry under one rule set. This is not a quality ranking and not a validity verdict.** Validator: v1.3 library defaults (`SHARP_VERTEX` 30 degrees, `UNDERSAMPLED` 12 degrees / 10 %), calibrated on TrackSeed\'s own tracks (home advantage: see the protocol, section 1). Arms: raw = as emitted; cs25 = smooth resampling at spacing 0.25 x road width for every source (the common rule); cs10 = 0.10 x width (sensitivity). Wilson 95 % intervals; one track per seed; the original E9 results are untouched.\n',
  `Polyline set sha256 (E9 sources): ${env.polylinesSha256}; TrackSeed polylines: ${env.trackseedPolylinesSha256}. Node ${env.node}.\n`,
  `## Predictions\n\nTally: ${tally.held} held, ${tally.failed} failed of ${tally.total} (${tally.note}).\n`, '| id | verdict | part | observed |\n|---|---|---|---|'];
for (const p of preds) p.parts.forEach((q, i) => md.push(`| ${i === 0 ? `${p.id} ${p.label} (${p.kind})` : ''} | ${i === 0 ? '**' + p.verdict + '**' : ''} ${q.ok ? '(ok)' : '(FAILED)'} | ${q.text} | ${q.observed} |`));
md.push('\n## ok rates with both denominators (validator v1.3, main width)\n');
md.push('| source | produced / attempted | self-filtering | raw ok of produced | raw ok of attempted | cs25 ok of produced | cs25 ok of attempted | cs10 ok of produced | raw ok under v1.2 (E9) | cs25 ok under v1.2 (E9) |\n|---|---|---|---|---|---|---|---|---|---|');
for (const s of ORDER) { const r = RESULT[s].runs.main; md.push(`| ${s} | ${RESULT[s].produced} / ${RESULT[s].attempted} | ${RESULT[s].selfFiltering} | ${cell(r.raw.ok13)} | ${cell(r.raw.ok13OfAttempted)} | ${cell(r.cs25.ok13)} | ${cell(r.cs25.ok13OfAttempted)} | ${cell(r.cs10.ok13)} | ${cell(r.raw.ok12)} | ${cell(r.cs25.ok12)} |`); }
md.push('\n## Sampling diagnostic and error mix (validator v1.3)\n');
md.push('| source | arm | UNDERSAMPLED (tracks) | SHARP_VERTEX (tracks) | LOCAL_KINK (tracks) | fails carrying UNDERSAMPLED | median share of vertices > 12 deg | median largest turn (deg) | median spacing / W (raw) | error codes (tracks) |\n|---|---|---|---|---|---|---|---|---|---|');
for (const s of ORDER) for (const arm of ['raw', 'cs25', 'cs10']) { const r = RESULT[s].runs.main[arm]; md.push(`| ${s} | ${arm} | ${cell(r.under)} | ${cell(r.sharp)} | ${cell(r.kink)} | ${r.failsWithUnder.k}/${r.failsWithUnder.n} | ${r.medShare12 === null ? 'n/a' : (100 * r.medShare12).toFixed(2) + '%'} | ${r.medMaxTurn} | ${arm === 'raw' ? r.medSpacingOverW : ''} | ${JSON.stringify(r.errorCodeTracks)} |`); }
md.push('\n## raw -> cs25 transitions (v1.3)\n\n| source | ok/ok | fail -> ok | ok -> fail | fail/fail |\n|---|---|---|---|---|');
for (const s of ORDER) { const t = RESULT[s].transitions13; md.push(`| ${s} | ${t.okok} | ${t.failToOk} | ${t.okToFail} | ${t.failFail} |`); }
md.push('\n## TUMFTM at the median and at the minimum width (v1.3)\n\n| arm | median width | minimum width |\n|---|---|---|');
for (const arm of ['raw', 'cs25', 'cs10']) md.push(`| ${arm} | ${cell(RESULT['real-tumftm'].runs.main[arm].ok13)} | ${cell(RESULT['real-tumftm'].runs.minw[arm].ok13)} |`);
md.push('\n| circuit | width | min width | raw | raw errors | raw warnings | cs25 | cs25 errors | raw @ min | cs25 @ min | raw v1.2 | cs25 v1.2 |\n|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const c of circuits) md.push(`| ${c.id} | ${c.width.toFixed(2)} | ${c.minWidth.toFixed(2)} | ${c.raw13} | ${c.rawErr} | ${c.rawWarn} | ${c.cs25} | ${c.cs25Err} | ${c.rawMin} | ${c.cs25Min} | ${c.raw12} | ${c.cs25_12} |`);
md.push('\n## juangallostra quantisation caveat\n\nIts input is an integer pixel grid; the raw and smoothed rates measure the grid, not track shapes (a vertex displaced by half a pixel turns the heading by q degrees at the median spacing). Not a headline number.\n\n| source | tracks with all-integer coordinates | median spacing (raw) | q (deg) |\n|---|---|---|---|');
for (const s of ORDER) md.push(`| ${s} | ${QUANT[s].allIntegerTracks}/${QUANT[s].n} | ${QUANT[s].medianSpacing} | ${QUANT[s].qDegrees} |`);
writeFileSync(join(dir, 'SUMMARY.md'), md.join('\n') + '\n');
console.log(`analyze-addendum-02.mjs: ${tally.held} held, ${tally.failed} failed of ${tally.total}`); for (const p of preds) if (p.verdict === 'failed') console.log(p.id, p.parts.filter(q => !q.ok).map(q => `${q.text} => ${q.observed}`).join(' | '));
