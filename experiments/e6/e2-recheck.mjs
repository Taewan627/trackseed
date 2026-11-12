// E6 PROTOCOL 9: effect of the post-RT1 validator (v1.1, default 'kink') on the 48,600 E2 grid tracks.
// Regenerates the E2 grid (experiments/e2/grid.mjs parameters, seeds SEEDS[0..49]) with the current generator, validates each track with
// the legacy 'ratio' rule and with the DEFAULT options, and checks that 'ratio' reproduces the committed amendment-01 `ok` column.
// Usage: npm run build:cli && node experiments/e6/e2-recheck.mjs [outDir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { val, E2_SEEDS, MODES, gen, wilson, r6 } from './lib.mjs';

const outDir = process.argv[2] ?? new URL('./results/e2-recheck', import.meta.url).pathname;
const old = gunzipSync(readFileSync(new URL('../e2/results/amendment-01/validity.csv.gz', import.meta.url))).toString().trim().split('\n');
const hdr = old[0].split(','), iOk = hdr.indexOf('ok'), iGen = hdr.indexOf('generated'), iCodes = hdr.indexOf('codes');
const LEVELS = { curves: [3, 6, 10], straight: [0, 0.3, 0.6], width: [20, 40, 80], size: [1, 2, 3], height: [0, 80, 200] };
const rows = ['index,mode,generated,ok_ratio,ok_v11,codes_v11'];
const st = {}; // mode -> counters
let idx = 0, mismatch = 0;
for (const [mode, over] of MODES) {
  const s = (st[mode] = { generated: 0, failed: 0, okRatio: 0, okV11: 0, okToNot: 0, notToOk: 0, codes: {} });
  for (const curves of LEVELS.curves) for (const straight of LEVELS.straight) for (const width of LEVELS.width)
    for (const size of LEVELS.size) for (const height of LEVELS.height) for (const seed of E2_SEEDS) {
      const line = old[idx + 1].split(',');
      const t = gen({ ...over, curves, straight, width, size, height, seed });
      if (!t) {
        s.failed++; if (line[iGen] !== '0') mismatch++;
        rows.push(`${idx},${mode},0,,,`); idx++; continue;
      }
      if (line[iGen] !== '1') mismatch++;
      s.generated++;
      const a = val.validateTrack(t, { closureTangentMode: 'ratio' }), b = val.validateTrack(t);
      if ((a.ok ? '1' : '0') !== line[iOk]) mismatch++;
      if (a.ok) s.okRatio++; if (b.ok) s.okV11++;
      if (a.ok && !b.ok) s.okToNot++; if (!a.ok && b.ok) s.notToOk++;
      const codes = [...new Set(b.violations.map(v => v.code))].sort();
      for (const c of codes) s.codes[c] = (s.codes[c] ?? 0) + 1;
      rows.push(`${idx},${mode},1,${a.ok ? 1 : 0},${b.ok ? 1 : 0},${codes.join(';')}`); idx++;
    }
}
if (idx !== 48600) throw new Error('grid size ' + idx);
const W = (k, n) => { const w = wilson(k, n); return { k, n, p: r6(w.p), lo: r6(w.lo), hi: r6(w.hi) }; };
const result = { label: 'post-RT1 validator v1.1 (default closureTangentMode kink)', protocol: 'experiments/e6/PROTOCOL.md section 9',
  reproduction: { ratioOkMatchesAmendment01Csv: mismatch === 0, mismatches: mismatch }, defaults: { closureTangentMode: val.DEFAULT_VALIDATE_OPTIONS.closureTangentMode, kinkRule: val.DEFAULT_VALIDATE_OPTIONS.kinkRule },
  perMode: Object.fromEntries(Object.entries(st).map(([m, s]) => [m, { generated: s.generated, generationFailures: s.failed, okRatio: W(s.okRatio, s.generated), okV11: W(s.okV11, s.generated),
    okToNotOk: W(s.okToNot, s.generated), notOkToOk: W(s.notToOk, s.generated), v11CodeCounts: s.codes }])) };
const pc = x => `${(100 * x.p).toFixed(2)}% [${(100 * x.lo).toFixed(2)}, ${(100 * x.hi).toFixed(2)}]`;
const md = ['# E2 recheck: post-RT1 validator v1.1', '', `Reproduction of the amendment-01 ok column by the 'ratio' rule on the regenerated grid: ${mismatch === 0 ? 'EXACT (0 mismatches over 48,600 cases)' : mismatch + ' MISMATCHES'}.`, '',
  '| mode | generated | ok under ratio (v1.0.0) | ok under v1.1 default | ok -> not ok | not ok -> ok |', '|---|---|---|---|---|---|'];
for (const [m, r] of Object.entries(result.perMode)) md.push(`| ${m} | ${r.generated} (failed ${r.generationFailures}) | ${pc(r.okRatio)} | ${pc(r.okV11)} | ${r.okToNotOk.k} (${pc(r.okToNotOk)}) | ${r.notOkToOk.k} (${pc(r.notOkToOk)}) |`);
md.push('', 'v1.1 error/violation code counts (tracks with the code, per mode):', '');
for (const [m, r] of Object.entries(result.perMode)) md.push(`- ${m}: ${JSON.stringify(r.v11CodeCounts)}`);
mkdirSync(outDir, { recursive: true });
const text = JSON.stringify(result, null, 1) + '\n', gz = gzipSync(Buffer.from(rows.join('\n') + '\n'), { level: 9 });
writeFileSync(`${outDir}/SUMMARY.json`, text); writeFileSync(`${outDir}/SUMMARY.md`, md.join('\n') + '\n'); writeFileSync(`${outDir}/validity-v1.1.csv.gz`, gz);
console.log(JSON.stringify({ outDir, summarySha256: createHash('sha256').update(text).digest('hex'), csvGzSha256: createHash('sha256').update(gz).digest('hex'), mismatch }));
