// Reads out/*.json (raw engine outputs), writes results/SUMMARY.json, SUMMARY.md (results part), records.json.gz, diffs.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out'), res = join(here, '../../e1b/results/amendment-01');
mkdirSync(res, { recursive: true });
const PRIMARY = ['throw', 'nPoints', 'inserted', 'attempts', 'scale', 'straightSegments', 'straightCount', 'propCount', 'propKinds', 'obstacleCount', 'ok', 'codes'];
const ORDER = [['node22', 'Node 22 (reference)'], ['node22-repeat', 'Node 22 (repeat run)'], ['node20', 'Node 20'], ['node24', 'Node 24'],
  ['deno', 'Deno'], ['bun', 'Bun (JavaScriptCore)'], ['chrome', 'Chrome headless (V8)'], ['firefox', 'Firefox (SpiderMonkey)']];
const load = l => existsSync(join(out, l + '.json')) ? JSON.parse(readFileSync(join(out, l + '.json'), 'utf8')) : null;
const ref = load('node22');
if (!ref) throw new Error('node22 output missing');
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');

// two-sided Clopper-Pearson upper bound at 95% by bisection on the binomial cdf
function cpUpper(k, n) {
  if (k >= n) return 1;
  const cdf = p => { let s = 0, t = Math.pow(1 - p, n); for (let i = 0; i <= k; i++) { s += t; t *= (n - i) / (i + 1) * p / (1 - p); } return s; };
  let lo = k / n, hi = 1;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cdf(m) > 0.025) lo = m; else hi = m; }
  return hi;
}
const eq = (a, b) => a === b;
const engines = [], diffs = {};
for (const [label, name] of ORDER) {
  const o = load(label);
  if (!o) { engines.push({ label, name, available: false, note: existsSync(join(res, label + '.error.txt')) ? readFileSync(join(res, label + '.error.txt'), 'utf8').trim().split('\n').slice(-3).join(' | ') : 'not run' }); continue; }
  const byId = new Map(o.cases.map(c => [c.id, c.rec]));
  const perField = Object.fromEntries(PRIMARY.map(f => [f, 0]));
  let anyCount = 0, checkFailDiff = 0, lengthDiff = 0, maxRel = 0;
  const ids = [], detail = [];
  for (const c of ref.cases) {
    const r = byId.get(c.id), a = c.rec;
    const bad = PRIMARY.filter(f => !eq(a[f], r[f]));
    if (bad.length) { anyCount++; bad.forEach(f => perField[f]++); if (ids.length < 10) ids.push(c.id); detail.push({ id: c.id, fields: Object.fromEntries(bad.map(f => [f, { node22: a[f], [label]: r[f] }])) }); }
    if (a.checkFailures !== r.checkFailures) checkFailDiff++;
    if (a.length !== r.length) { lengthDiff++; maxRel = Math.max(maxRel, Math.abs(a.length - r.length) / Math.abs(a.length)); }
  }
  diffs[label] = detail;
  const selfRef = label === 'node22';
  engines.push({ label, name, available: true, version: `${o.engine} ${o.version}${o.v8 ? ' V8 ' + o.v8 : ''}${o.cliVersion ? ' (' + o.cliVersion + ')' : ''}`,
    casesWithAnyDiscreteDisagreement: anyCount, ofCases: ref.cases.length, perField, firstIds: ids,
    clopperPearsonUpper95: +cpUpper(anyCount, ref.cases.length).toFixed(5),
    secondary: { casesWithDifferentCheckFailures: checkFailDiff, casesWithDifferentLength: lengthDiff, maxRelativeLengthDifference: maxRel },
    rawSha256: sha(join(out, label + '.json')), selfRef });
}
const summary = { reference: 'node22', primaryFields: PRIMARY, engines, bundleSha256: readFileSync(join(here, 'build', 'BUNDLE_SHA256.txt'), 'utf8').trim().split(/\s+/)[0] };
writeFileSync(join(res, 'SUMMARY.json'), JSON.stringify(summary, null, 1) + '\n');
writeFileSync(join(res, 'diffs.json'), JSON.stringify(diffs) + '\n');
writeFileSync(join(res, 'records-node22.json.gz'), gzipSync(JSON.stringify(ref.cases), { level: 9, mtime: 0 }));

// non-reference engines' secondary + primary tables as markdown fragment
const L = [];
L.push('| Engine | cases with any discrete disagreement | ' + PRIMARY.join(' | ') + ' | CP 95% upper |');
L.push('|---|---|' + PRIMARY.map(() => '---').join('|') + '|---|');
for (const e of engines) {
  if (!e.available) { L.push(`| ${e.name} | UNAVAILABLE (${e.note}) |` + PRIMARY.map(() => '').join('|') + '| |'); continue; }
  L.push(`| ${e.name} | ${e.casesWithAnyDiscreteDisagreement} / ${e.ofCases} | ` + PRIMARY.map(f => e.perField[f]).join(' | ') + ` | ${(100 * e.clopperPearsonUpper95).toFixed(2)}% |`);
}
L.push('', '| Engine | cases with different checkFailures string | cases with different track.length | max relative length difference |', '|---|---|---|---|');
for (const e of engines.filter(e => e.available)) L.push(`| ${e.name} | ${e.secondary.casesWithDifferentCheckFailures} | ${e.secondary.casesWithDifferentLength} | ${e.secondary.maxRelativeLengthDifference.toExponential(2)} |`);
L.push('', 'Engine versions:', ...engines.filter(e => e.available).map(e => `- ${e.name}: ${e.version}`));
L.push('', 'First differing case ids (up to 10):', ...engines.filter(e => e.available && e.casesWithAnyDiscreteDisagreement).map(e => `- ${e.name}: ${e.firstIds.join(', ')}`));
writeFileSync(join(res, 'table.md'), L.join('\n') + '\n');
console.log(L.join('\n'));
