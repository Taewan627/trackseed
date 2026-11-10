// Builds ../results/v1.0.0/SUMMARY.{md,json} from the per-engine JSON files (reference = node22).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), R = join(here, '..', 'results', 'v1.0.0');
const ENGINES = [
  ['node22', 'Node 22 (reference)'], ['node22-repeat', 'Node 22 (repeat run)'], ['node20', 'Node 20'], ['node24', 'Node 24'],
  ['deno', 'Deno'], ['bun', 'Bun (JavaScriptCore)'], ['chrome', 'Chrome headless (V8)'], ['firefox', 'Firefox (SpiderMonkey)'],
];
const SUBJECTS = ['v100', 'v050'], KEYS = ['digest', 'contentDigest'];
const read = f => existsSync(join(R, f)) ? JSON.parse(readFileSync(join(R, f), 'utf8')) : null;
const ref = Object.fromEntries(SUBJECTS.map(s => [s, read(`node22.${s}.json`)]));
if (!ref.v100 || !ref.v050) { console.error('reference (node22) results missing'); process.exit(1); }
const refMap = (s, k) => new Map(ref[s].cases.map(c => [c.id, c[k]]));
const origE1 = JSON.parse(readFileSync(join(here, '..', 'results', 'node22.v05.json'), 'utf8'));

const rows = [];
for (const [label, name] of ENGINES) {
  const row = { label, name, subjects: {} };
  const err = existsSync(join(R, `${label}.error.txt`)) ? readFileSync(join(R, `${label}.error.txt`), 'utf8').trim() : null;
  for (const s of SUBJECTS) {
    const r = read(`${label}.${s}.json`);
    if (!r) { row.subjects[s] = null; continue; }
    const e = { n: r.cases.length, selfTest: r.selfTest, generatorVersion: r.generatorVersion, engine: r.engine, version: r.version,
      cliVersion: r.cliVersion ?? null, v8: r.v8 ?? null, revision: r.revision ?? null,
      throwCases: r.cases.filter(c => c.digest.startsWith('THROW:')).length,
      embeddedMismatch: s === 'v100' ? r.cases.filter(c => c.embeddedOk !== true).length : null };
    for (const k of KEYS) {
      const rm = refMap(s, k), bad = r.cases.filter(c => rm.get(c.id) !== c[k]).map(c => c.id);
      e[k] = { mismatches: bad.length, agreement: r.cases.length === 1000 ? (1000 - bad.length) / 10 : null, firstMismatches: bad.slice(0, 10) };
    }
    row.subjects[s] = e;
  }
  row.ran = SUBJECTS.every(s => row.subjects[s]);
  if (!row.ran) row.error = err ?? 'no results produced';
  // cross-version comparison on this engine
  if (row.ran) {
    const a = read(`${label}.v100.json`).cases, b = new Map(read(`${label}.v050.json`).cases.map(c => [c.id, c]));
    row.cross = { contentDigestEqual: a.filter(c => b.get(c.id).contentDigest === c.contentDigest).length,
      digestEqual: a.filter(c => b.get(c.id).digest === c.digest).length, cases: a.length };
  }
  rows.push(row);
}
const o = new Map(origE1.cases.map(c => [c.id, c.digest]));
const sanity = { v050DigestEqualsOriginalE1: ref.v050.cases.filter(c => o.get(c.id) === c.digest).length, cases: ref.v050.cases.length,
  originalE1GeneratorVersion: origE1.generatorVersion };
const bundles = existsSync(join(here, 'build/BUNDLE_SHA256.txt')) ? readFileSync(join(here, 'build/BUNDLE_SHA256.txt'), 'utf8').trim().split('\n') : [];
const pct = x => x === null ? 'n/a' : x.toFixed(1) + '%';
const engineVer = r => { const s = r.subjects.v100; return [s.engine, s.version, s.v8 ? `V8 ${s.v8}` : '', s.revision ? `rev ${s.revision}` : '', s.cliVersion ? `(${s.cliVersion})` : ''].filter(Boolean).join(' '); };
writeFileSync(join(R, 'SUMMARY.json'), JSON.stringify({ reference: 'node22', casesPerSubject: 1000, bundles, rows, sanity }, null, 2) + '\n');

let md = `# E1 at v1.0.0: cross-engine agreement of document digest and contentDigest\n\nAddendum: ../../ADDENDUM-v1.0.0.md. Reference: Node 22. 1000 cases per subject (experiments/e1/cases.mjs). Agreement = cases whose value equals the Node 22 value of the same case id. v1.0.0 = this tree; v0.5.0 = commit 145277e (content-equivalent digest computed by the harness).\n\n`;
md += `| Engine | v1.0.0 digest | mism. | v1.0.0 contentDigest | mism. | v0.5.0 digest | mism. | v0.5.0 content-equivalent | mism. |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  if (!r.ran) { md += `| ${r.name} | not run | | | | | | | |\n`; continue; }
  const a = r.subjects.v100, b = r.subjects.v050;
  md += `| ${r.name} | ${pct(a.digest.agreement)} | ${a.digest.mismatches} | ${pct(a.contentDigest.agreement)} | ${a.contentDigest.mismatches} | ${pct(b.digest.agreement)} | ${b.digest.mismatches} | ${pct(b.contentDigest.agreement)} | ${b.contentDigest.mismatches} |\n`;
}
md += `\n## Cross-version comparison (same engine, same case id)\n\n| Engine | v1.0.0 contentDigest == v0.5.0 content-equivalent | v1.0.0 digest == v0.5.0 digest |\n|---|---|---|\n`;
for (const r of rows.filter(r => r.ran)) md += `| ${r.name} | ${r.cross.contentDigestEqual} / ${r.cross.cases} | ${r.cross.digestEqual} / ${r.cross.cases} |\n`;
md += `\nSanity: v0.5.0 bundle digest equals the digest recorded in the original E1 run (results/node22.v05.json, generator ${sanity.originalE1GeneratorVersion}): ${sanity.v050DigestEqualsOriginalE1} / ${sanity.cases}.\n`;
md += `\n## Engine versions\n\n`;
for (const r of rows) md += r.ran ? `- ${r.name}: ${engineVer(r)}\n` : `- ${r.name}: NOT RUN. Error output:\n\n\`\`\`\n${r.error}\n\`\`\`\n`;
md += `\n## Bundles (SHA-256, built by build.sh, esbuild 0.25, ESM)\n\n${bundles.map(l => '- ' + l).join('\n')}\n\n## Checks\n\n`;
for (const r of rows.filter(r => r.ran)) {
  const a = r.subjects.v100, b = r.subjects.v050;
  md += `- ${r.name}: SHA-256 self-test ${a.selfTest && b.selfTest ? 'pass' : 'FAIL'}; THROW cases v1.0.0 ${a.throwCases}, v0.5.0 ${b.throwCases}; recomputed contentDigest differs from embedded in ${a.embeddedMismatch} cases; generator ${a.generatorVersion} / ${b.generatorVersion}\n`;
}
const mm = rows.filter(r => r.ran && SUBJECTS.some(s => KEYS.some(k => r.subjects[s][k].mismatches)));
if (mm.length) { md += `\n## First mismatching case ids (up to 10)\n\n`; for (const r of mm) for (const s of SUBJECTS) for (const k of KEYS) if (r.subjects[s][k].mismatches) md += `- ${r.name} ${s} ${k}: ${r.subjects[s][k].firstMismatches.join(', ')}\n`; }
writeFileSync(join(R, 'SUMMARY.md'), md);
console.log(md);
