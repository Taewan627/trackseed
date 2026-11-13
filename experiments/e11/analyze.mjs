// E11 analysis (PROTOCOL.md sections 4 and 6). Reads <runDir>/run.json, writes drives.csv.gz, tracks.csv.gz, SUMMARY.json and SUMMARY.md into <outDir>.
// Usage: node experiments/e11/analyze.mjs <runDir> <outDir> [determinismFile]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { HANDLES_FOR_ANALYSIS as HANDLES } from './handles.mjs';

const [runDir, outDir, detFile] = process.argv.slice(2);
if (!runDir || !outDir) { console.error('usage: analyze.mjs <runDir> <outDir> [determinismFile]'); process.exit(2); }
const run = JSON.parse(readFileSync(`${runDir}/run.json`, 'utf8'));
const DRIVERS = ['D0', 'D1', 'D2'];

// ------------------------------------------------------------------ helpers
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function mulberry32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function bootstrapMedianCI(x, B = 2000, seed = 20261114) {
  if (x.length < 2) return [null, null];
  const r = mulberry32(seed), meds = [];
  for (let b = 0; b < B; b++) { const y = []; for (let i = 0; i < x.length; i++) y.push(x[Math.floor(r() * x.length)]); meds.push(median(y)); }
  meds.sort((p, q) => p - q);
  return [meds[Math.floor(0.025 * B)], meds[Math.ceil(0.975 * B) - 1]];
}
function binomTwoSided(k, n) { // exact two-sided sign test, p = min(1, 2 * P(X <= min(k, n-k)))
  if (n === 0) return 1;
  const lo = Math.min(k, n - k); let p = 0, c = 1;
  for (let i = 0; i <= n; i++) { if (i > 0) c = c * (n - i + 1) / i; if (i <= lo) p += c; }
  return Math.min(1, 2 * p / 2 ** n);
}
function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function spearman(x, y) {
  if (x.length < 3) return null;
  const rx = ranks(x), ry = ranks(y), mx = rx.reduce((a, b) => a + b, 0) / rx.length, my = ry.reduce((a, b) => a + b, 0) / ry.length;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < rx.length; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}
const r4 = v => v === null || v === undefined ? null : Math.round(v * 1e4) / 1e4;
function gzipUnix(text) { const b = gzipSync(Buffer.from(text)); b[9] = 3; return b; } // OS byte = Unix on every platform, so the file is platform-independent

// ------------------------------------------------------------------ index
const byKey = new Map(); // `${condition}|${seed}|${driver}` -> drive
for (const d of run.drives) byKey.set(`${d.condition}|${d.seed}|${d.driver}`, d);
const get = (over, seed, driver) => byKey.get(`${JSON.stringify(over)}|${seed}|${driver}`);

const handles = {};
for (const [handle, levels] of Object.entries(HANDLES)) {
  handles[handle] = {};
  for (const driver of DRIVERS) {
    const perLevel = levels.map(([level, over]) => {
      const ds = run.seeds.map(s => get(over, s, driver)).filter(Boolean), fin = ds.filter(d => d.end === 'finished');
      return { level, drives: ds.length, finished: fin.length, stuck: ds.filter(d => d.end === 'stuck').length, timeout: ds.filter(d => d.end === 'timeout').length,
        medianMeanSpeed: r4(median(fin.map(d => d.meanSpeed))), medianContactsPerKm: r4(median(ds.map(d => d.contactsPerKm))),
        medianBrakeTime: r4(median(fin.map(d => d.brakeTime))), medianReversalsPerMin: r4(median(fin.map(d => d.reversalsPerMin))) };
    });
    const [lowLevel, lowOver] = levels[0], [highLevel, highOver] = levels[levels.length - 1];
    const pairs = run.seeds.map(s => [get(lowOver, s, driver), get(highOver, s, driver)]).filter(([a, b]) => a && b && a.end === 'finished' && b.end === 'finished');
    const dSpeed = pairs.map(([a, b]) => b.meanSpeed / a.meanSpeed - 1), dContacts = pairs.map(([a, b]) => b.contactsPerKm - a.contactsPerKm);
    const speedHarder = dSpeed.filter(x => x < 0).length, speedEasier = dSpeed.filter(x => x > 0).length;
    const contHarder = dContacts.filter(x => x > 0).length, contEasier = dContacts.filter(x => x < 0).length;
    const pSpeed = binomTwoSided(speedHarder, speedHarder + speedEasier), pCont = binomTwoSided(contHarder, contHarder + contEasier);
    const medSpeed = median(dSpeed), medCont = median(dContacts), lowCont = perLevel[0].medianContactsPerKm ?? 0;
    const speedStrong = pSpeed < 0.01 && medSpeed !== null && Math.abs(medSpeed) >= 0.05;
    const contStrong = pCont < 0.01 && medCont !== null && Math.abs(medCont) >= Math.max(2, 0.25 * lowCont);
    const verdict = speedStrong || contStrong ? 'strong' : (pSpeed < 0.01 || pCont < 0.01) ? 'weak' : 'none';
    // monotonicity over all seed x level drives (level index ascending as listed)
    const xi = [], ys = [], xc = [], yc = [];
    levels.forEach(([, over], li) => run.seeds.forEach(s => { const d = get(over, s, driver); if (!d) return; xc.push(li); yc.push(d.contactsPerKm); if (d.end === 'finished') { xi.push(li); ys.push(d.meanSpeed); } }));
    handles[handle][driver] = {
      low: lowLevel, high: highLevel, perLevel, pairs: pairs.length,
      dSpeed: { median: r4(medSpeed), ci95: bootstrapMedianCI(dSpeed).map(r4), highHarder: speedHarder, highEasier: speedEasier, signP: r4(pSpeed) },
      dContactsPerKm: { median: r4(medCont), ci95: bootstrapMedianCI(dContacts).map(r4), highHarder: contHarder, highEasier: contEasier, signP: r4(pCont) },
      spearmanSpeed: r4(spearman(xi, ys)), spearmanContacts: r4(spearman(xc, yc)), verdict,
    };
  }
}

// ------------------------------------------------------------------ predictions (PROTOCOL.md section 6)
const V = (h, d) => handles[h][d].verdict;
const lvl = (h, d, i) => handles[h][d].perLevel[i];
const allD = run.drives.filter(d => d.driver === 'D0'), allD1 = run.drives.filter(d => d.driver === 'D1');
const det = detFile && existsSync(detFile) ? readFileSync(detFile, 'utf8') : '';
const predictions = [
  { id: 'P1', text: 'width (20 vs 80): strong for D1 and D2; none or weak for D0',
    held: V('width', 'D1') === 'strong' && V('width', 'D2') === 'strong' && V('width', 'D0') !== 'strong', observed: `D0 ${V('width', 'D0')}, D1 ${V('width', 'D1')}, D2 ${V('width', 'D2')}` },
  { id: 'P2', text: 'hairpins (0 vs 3): strong for D1 and D2',
    held: V('hairpins', 'D1') === 'strong' && V('hairpins', 'D2') === 'strong', observed: `D0 ${V('hairpins', 'D0')}, D1 ${V('hairpins', 'D1')}, D2 ${V('hairpins', 'D2')}` },
  { id: 'P3', text: 'straight (0 vs 0.6): at most weak for every driver',
    held: DRIVERS.every(d => V('straight', d) !== 'strong'), observed: DRIVERS.map(d => `${d} ${V('straight', d)} (median dSpeed ${handles.straight[d].dSpeed.median})`).join(', ') },
  { id: 'P4', text: 'curves: D0 median meanSpeed at curves 3 below that at curves 10',
    held: lvl('curves', 'D0', 0).medianMeanSpeed < lvl('curves', 'D0', 4).medianMeanSpeed, observed: `${lvl('curves', 'D0', 0).medianMeanSpeed} vs ${lvl('curves', 'D0', 4).medianMeanSpeed}` },
  { id: 'P5', text: 'height (0 vs 200): none or weak for D1 and D2; D0 median dSpeed < 0',
    held: V('height', 'D1') !== 'strong' && V('height', 'D2') !== 'strong' && handles.height.D0.dSpeed.median < 0,
    observed: `D1 ${V('height', 'D1')}, D2 ${V('height', 'D2')}, D0 median dSpeed ${handles.height.D0.dSpeed.median}` },
  { id: 'P6', text: 'D0 finishes every lap; D1 at least 95 % of laps',
    held: allD.every(d => d.end === 'finished') && allD1.filter(d => d.end === 'finished').length >= 0.95 * allD1.length,
    observed: `D0 ${allD.filter(d => d.end === 'finished').length}/${allD.length}, D1 ${allD1.filter(d => d.end === 'finished').length}/${allD1.length}` },
  { id: 'P7', text: 'the two runs are byte-identical', held: det ? /identical: yes/.test(det) : null, observed: det ? det.trim().split('\n').pop() : 'not checked' },
];

// ------------------------------------------------------------------ outputs
mkdirSync(outDir, { recursive: true });
const dcols = ['condition', 'seed', 'driver', 'end', 'L', 'time', 'progress', 'meanSpeed', 'contacts', 'contactsPerKm', 'contactTime', 'brakeTime', 'reversalsPerMin'];
const tcols = ['condition', 'seed', 'length', 'meanAbsCurvature', 'maxAbsCurvature', 'p95AbsCurvature', 'straightLengthFraction', 'turnCount', 'maxAbsSlope', 'validatorOk', 'minTurnRadius', 'patternsInserted', 'error'];
const csv = (rows, cols) => [cols.join(','), ...rows.map(r => cols.map(c => { const v = r[c]; return v === undefined || v === null ? '' : typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : String(v); }).join(','))].join('\n') + '\n';
writeFileSync(`${outDir}/drives.csv.gz`, gzipUnix(csv(run.drives, dcols)));
writeFileSync(`${outDir}/tracks.csv.gz`, gzipUnix(csv(run.tracks, tcols)));
const summary = { experiment: 'E11', version: run.version, smoke: run.smoke, seeds: run.seeds.length, conditions: run.conditions.length,
  tracks: run.tracks.length, drives: run.drives.length, generationFailures: run.generationFailures, handles, predictions };
writeFileSync(`${outDir}/SUMMARY.json`, JSON.stringify(summary, null, 2) + '\n');

const L = [`# E11 summary (generated by experiments/e11/analyze.mjs; TrackSeed ${run.version}${run.smoke ? '; SMOKE RUN on debug seeds' : ''})`, '',
  `${run.seeds.length} seeds x ${run.conditions.length} conditions = ${run.tracks.length} tracks (${run.generationFailures} generation failures), ${run.drives.length} drives (drivers D0 ideal, D1 delay 0.2 s, D2 delay 0.2 s cautious). Protocol: PROTOCOL.md.`, '',
  '## Effect of each handle (extreme levels, paired by seed; dSpeed relative, dContacts per km)', '',
  '| Handle (low -> high) | Driver | pairs | median dSpeed [95% CI] | high harder/easier (speed), p | median dContacts/km [95% CI] | high harder/easier (contacts), p | Spearman speed / contacts | verdict |', '|---|---|---|---|---|---|---|---|---|'];
const pct = v => v === null ? '-' : `${(v * 100).toFixed(1)}%`;
for (const [h, byD] of Object.entries(handles)) for (const d of DRIVERS) {
  const e = byD[d];
  L.push(`| ${h} (${e.low} -> ${e.high}) | ${d} | ${e.pairs} | ${pct(e.dSpeed.median)} [${pct(e.dSpeed.ci95[0])}, ${pct(e.dSpeed.ci95[1])}] | ${e.dSpeed.highHarder}/${e.dSpeed.highEasier}, ${e.dSpeed.signP} | ${e.dContactsPerKm.median} [${e.dContactsPerKm.ci95[0]}, ${e.dContactsPerKm.ci95[1]}] | ${e.dContactsPerKm.highHarder}/${e.dContactsPerKm.highEasier}, ${e.dContactsPerKm.signP} | ${e.spearmanSpeed} / ${e.spearmanContacts} | **${e.verdict}** |`);
}
L.push('', '## Medians per level', '', '| Handle | Level | Driver | finished | median meanSpeed (u/s) | median contacts/km | median brake time (s) |', '|---|---|---|---|---|---|---|');
for (const [h, byD] of Object.entries(handles)) for (const d of DRIVERS) for (const p of byD[d].perLevel)
  L.push(`| ${h} | ${p.level} | ${d} | ${p.finished}/${p.drives} | ${p.medianMeanSpeed} | ${p.medianContactsPerKm} | ${p.medianBrakeTime} |`);
L.push('', '## Predictions (PROTOCOL.md section 6)', '', '| ID | Prediction | Observed | Held |', '|---|---|---|---|');
for (const p of predictions) L.push(`| ${p.id} | ${p.text} | ${p.observed} | ${p.held === null ? 'not checked' : p.held ? 'held' : 'failed'} |`);
writeFileSync(`${outDir}/SUMMARY.md`, L.join('\n') + '\n');
console.log(JSON.stringify({ outDir, verdicts: Object.fromEntries(Object.entries(handles).map(([h, b]) => [h, DRIVERS.map(d => b[d].verdict).join('/')])), predictions: predictions.map(p => `${p.id}:${p.held}`) }));
