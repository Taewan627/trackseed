// Builds ../results/v1.2.0/SUMMARY.{md,json} from the per-engine JSON files (reference = node22). Predictions P1 to P5: ../../ADDENDUM-v1.2.0.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from '../cases.mjs';
import { sanitize } from './build/sanitize.mjs';
const here = dirname(fileURLToPath(import.meta.url)), R = join(here, '..', 'results', 'v1.2.0');
const ENGINES = [
  ['node22', 'Node 22 (reference)'], ['node22-repeat', 'Node 22 (repeat run)'], ['node20', 'Node 20'], ['node24', 'Node 24'],
  ['deno', 'Deno'], ['bun', 'Bun (JavaScriptCore)'], ['chrome', 'Chrome headless (V8)'], ['firefox', 'Firefox (SpiderMonkey)'], ['webkit', 'WebKit (Playwright build, JavaScriptCore)'],
];
const SUBJECTS = ['s1', 's2'], KEYS = ['digest', 'contentDigest'];
const read = f => existsSync(join(R, f)) ? JSON.parse(readFileSync(join(R, f), 'utf8')) : null;
const ref = Object.fromEntries(SUBJECTS.map(s => [s, read(`node22.${s}.json`)]));
if (!ref.s1 || !ref.s2) { console.error('reference (node22) results missing'); process.exit(1); }
const refMap = (s, k) => new Map(ref[s].cases.map(c => [c.id, c[k]]));

const rows = [];
for (const [label, name] of ENGINES) {
  const row = { label, name, subjects: {} };
  const err = existsSync(join(R, `${label}.error.txt`)) ? readFileSync(join(R, `${label}.error.txt`), 'utf8').trim() : null;
  for (const s of SUBJECTS) {
    const r = read(`${label}.${s}.json`);
    if (!r) { row.subjects[s] = null; continue; }
    const e = { n: r.cases.length, selfTest: r.selfTest, generatorVersion: r.generatorVersion, documentStamps: r.documentStamps ?? null, engine: r.engine, version: r.version,
      cliVersion: r.cliVersion ?? null, v8: r.v8 ?? null, revision: r.revision ?? null,
      throwCases: r.cases.filter(c => c.digest.startsWith('THROW:')).length,
      embeddedMismatch: r.cases.filter(c => c.embeddedOk !== true).length };
    for (const k of KEYS) {
      const rm = refMap(s, k), bad = r.cases.filter(c => rm.get(c.id) !== c[k]).map(c => c.id);
      e[k] = { mismatches: bad.length, agreement: r.cases.length === 1000 ? (1000 - bad.length) / 10 : null, firstMismatches: bad.slice(0, 10) };
    }
    row.subjects[s] = e;
  }
  row.ran = SUBJECTS.every(s => row.subjects[s]);
  if (!row.ran) row.error = err ?? 'no results produced';
  rows.push(row);
}

// Predictions P2 to P4 on every engine that ran, against the committed v1.1.0 (S1, S2) and v1.0.0 (v100) Node 22 results.
const committed = f => JSON.parse(readFileSync(join(here, '..', 'results', f), 'utf8'));
const maps = f => new Map(committed(f).cases.map(c => [c.id, c]));
const v110 = { s1: maps('v1.1.0/node22.s1.json'), s2: maps('v1.1.0/node22.s2.json') }, v100Map = maps('v1.0.0/node22.v100.json');
const caseOf = Object.fromEntries(CASES.map(c => [c.id, c]));
const expectDiffer = new Set(CASES.filter(c => sanitize(c.params).autoJoin !== sanitize({ ...c.params, autoJoin: 'legacy' }).autoJoin).map(c => c.id));
const checks = [];
for (const r of rows.filter(r => r.ran)) {
  const a = new Map(read(`${r.label}.s1.json`).cases.map(c => [c.id, c])), b = read(`${r.label}.s2.json`).cases;
  const cnt = (arr, f) => arr.filter(f).length;
  const A = [...a.values()];
  const cfg = id => id.split(':')[0];
  const diffCfg = {};
  for (const c of b) { const x = a.get(c.id); if (x.contentDigest !== c.contentDigest) diffCfg[cfg(c.id)] = (diffCfg[cfg(c.id)] ?? 0) + 1; }
  checks.push({ label: r.label, name: r.name, cases: b.length,
    p2S1ContentEqualV110: cnt(A, c => v110.s1.get(c.id)?.contentDigest === c.contentDigest),
    p2S2ContentEqualV110: cnt(b, c => v110.s2.get(c.id)?.contentDigest === c.contentDigest),
    p3S2ContentEqualV100: cnt(b, c => v100Map.get(c.id)?.contentDigest === c.contentDigest),
    p4S1DigestEqualV110: cnt(A, c => v110.s1.get(c.id)?.digest === c.digest),
    p4S2DigestEqualV110: cnt(b, c => v110.s2.get(c.id)?.digest === c.digest),
    p4S2DigestEqualV100: cnt(b, c => v100Map.get(c.id)?.digest === c.digest),
    s1S2ContentDiffer: cnt(b, c => a.get(c.id).contentDigest !== c.contentDigest),
    s1S2DifferByConfig: diffCfg,
    s1S2DifferExactlyExpectedIds: b.every(c => (a.get(c.id).contentDigest !== c.contentDigest) === expectDiffer.has(c.id)),
    documentStamps: { s1: r.subjects.s1.documentStamps, s2: r.subjects.s2.documentStamps } });
}
const expected = { s1S2Differ: expectDiffer.size, s1S2Equal: CASES.length - expectDiffer.size };
const bundles = existsSync(join(here, 'build/BUNDLE_SHA256.txt')) ? readFileSync(join(here, 'build/BUNDLE_SHA256.txt'), 'utf8').trim().split('\n') : [];
const pct = x => x === null ? 'n/a' : x.toFixed(1) + '%';
const engineVer = r => { const s = r.subjects.s1; return [s.engine, s.version, s.v8 ? `V8 ${s.v8}` : '', s.revision ? `rev ${s.revision}` : '', s.cliVersion ? `(${s.cliVersion})` : ''].filter(Boolean).join(' '); };
writeFileSync(join(R, 'SUMMARY.json'), JSON.stringify({ reference: 'node22', casesPerSubject: 1000, expected, bundles, rows, checks }, null, 2) + '\n');

let md = `# E1 at v1.2.0: cross-engine agreement of document digest and contentDigest\n\nAddendum (pre-registration): ../../ADDENDUM-v1.2.0.md. Reference: Node 22. 1000 cases per subject (experiments/e1/cases.mjs). S1 = v1.2.0 default join, S2 = v1.2.0 with autoJoin 'legacy'. Agreement = cases whose value equals the Node 22 value of the same case id.\n\n`;
md += `| Engine | S1 digest | mism. | S1 contentDigest | mism. | S2 digest | mism. | S2 contentDigest | mism. |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  if (!r.ran) { md += `| ${r.name} | not run | | | | | | | |\n`; continue; }
  const a = r.subjects.s1, b = r.subjects.s2;
  md += `| ${r.name} | ${pct(a.digest.agreement)} | ${a.digest.mismatches} | ${pct(a.contentDigest.agreement)} | ${a.contentDigest.mismatches} | ${pct(b.digest.agreement)} | ${b.digest.mismatches} | ${pct(b.contentDigest.agreement)} | ${b.contentDigest.mismatches} |\n`;
}
md += `\n## Predictions P2 to P4 (per engine)\n\nExpected before the run (addendum): every count below is 1000 / 1000 except the three digest columns of P4, which are 0 / 1000. Comparison files: committed results of v1.1.0 (S1, S2, Node 22) and v1.0.0 (v100, Node 22).\n\n`;
md += `| Engine | P2 S1 contentDigest == v1.1.0 S1 | P2 S2 contentDigest == v1.1.0 S2 | P3 S2 contentDigest == v1.0.0 | P4 S1 digest == v1.1.0 S1 (expect 0) | P4 S2 digest == v1.1.0 S2 (expect 0) | P4 S2 digest == v1.0.0 (expect 0) |\n|---|---|---|---|---|---|---|\n`;
for (const c of checks) md += `| ${c.name} | ${c.p2S1ContentEqualV110} / ${c.cases} | ${c.p2S2ContentEqualV110} / ${c.cases} | ${c.p3S2ContentEqualV100} / ${c.cases} | ${c.p4S1DigestEqualV110} / ${c.cases} | ${c.p4S2DigestEqualV110} / ${c.cases} | ${c.p4S2DigestEqualV100} / ${c.cases} |\n`;
md += `\n## Consequence of P2: S1 against S2 contentDigest (expected ${expected.s1S2Differ} differ, ${expected.s1S2Equal} equal)\n\n| Engine | S1 != S2 contentDigest | per configuration | differing ids are exactly the expected ids |\n|---|---|---|---|\n`;
for (const c of checks) md += `| ${c.name} | ${c.s1S2ContentDiffer} / ${c.cases} | ${Object.entries(c.s1S2DifferByConfig).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'} | ${c.s1S2DifferExactlyExpectedIds ? 'yes' : 'NO'} |\n`;
md += `\n## Engine versions\n\n`;
for (const r of rows) md += r.ran ? `- ${r.name}: ${engineVer(r)}\n` : `- ${r.name}: NOT RUN. Error output:\n\n\`\`\`\n${r.error}\n\`\`\`\n`;
md += `\n## Bundles (SHA-256, built by build.sh, esbuild 0.25, ESM)\n\n${bundles.map(l => '- ' + l).join('\n')}\n\n## Checks (P5)\n\n`;
for (const r of rows.filter(r => r.ran)) {
  const a = r.subjects.s1, b = r.subjects.s2;
  md += `- ${r.name}: SHA-256 self-test ${a.selfTest && b.selfTest ? 'pass' : 'FAIL'}; THROW cases S1 ${a.throwCases}, S2 ${b.throwCases}; recomputed contentDigest differs from embedded in S1 ${a.embeddedMismatch}, S2 ${b.embeddedMismatch} cases; generator (VERSION) ${a.generatorVersion} / ${b.generatorVersion}; stamps read from the documents S1 ${JSON.stringify(a.documentStamps)}, S2 ${JSON.stringify(b.documentStamps)}\n`;
}
const mm = rows.filter(r => r.ran && SUBJECTS.some(s => KEYS.some(k => r.subjects[s][k].mismatches)));
if (mm.length) { md += `\n## First mismatching case ids (up to 10)\n\n`; for (const r of mm) for (const s of SUBJECTS) for (const k of KEYS) if (r.subjects[s][k].mismatches) md += `- ${r.name} ${s} ${k}: ${r.subjects[s][k].firstMismatches.join(', ')}\n`; }
writeFileSync(join(R, 'SUMMARY.md'), md);
console.log(md);
