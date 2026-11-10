// Builds results/E1_SUMMARY.{md,json} from results/*.json (reference = node22).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), R = join(here, 'results');
const ENGINES = [
  ['node22', 'Node 22 (reference)'], ['node22-repeat', 'Node 22 (repeat run)'], ['node20', 'Node 20'], ['node24', 'Node 24'],
  ['deno', 'Deno'], ['bun', 'Bun (JavaScriptCore)'], ['chrome', 'Chrome headless (V8)'], ['firefox', 'Firefox (SpiderMonkey)'],
];
const read = f => existsSync(join(R, f)) ? JSON.parse(readFileSync(join(R, f), 'utf8')) : null;
const ref = { v05: read('node22.v05.json'), legacy: read('node22.legacy.json') };
if (!ref.v05 || !ref.legacy) { console.error('reference (node22) results missing'); process.exit(1); }
const refMap = s => new Map(ref[s].cases.map(c => [c.id, c.digest]));

const rows = [];
for (const [label, name] of ENGINES) {
  const row = { label, name, subjects: {} };
  const err = existsSync(join(R, `${label}.error.txt`)) ? readFileSync(join(R, `${label}.error.txt`), 'utf8').trim() : null;
  for (const s of ['v05', 'legacy']) {
    const r = read(`${label}.${s}.json`);
    if (!r) { row.subjects[s] = null; continue; }
    const rm = refMap(s), bad = [];
    let throws = 0;
    for (const c of r.cases) { if (c.digest.startsWith('THROW:')) throws++; if (rm.get(c.id) !== c.digest) bad.push(c.id); }
    const n = r.cases.length;
    row.subjects[s] = { n, mismatches: bad.length, agreement: n === 1000 && ref[s].cases.length === 1000 ? (1000 - bad.length) / 10 : null,
      firstMismatches: bad.slice(0, 10), throwCases: throws, selfTest: r.selfTest, generatorVersion: r.generatorVersion,
      engine: r.engine, version: r.version, cliVersion: r.cliVersion ?? null, v8: r.v8 ?? null, revision: r.revision ?? null };
  }
  row.ran = !!(row.subjects.v05 && row.subjects.legacy);
  if (!row.ran) row.error = err ?? 'no results produced';
  rows.push(row);
}
const bundles = existsSync(join(here, 'build/BUNDLE_SHA256.txt')) ? readFileSync(join(here, 'build/BUNDLE_SHA256.txt'), 'utf8').trim().split('\n') : [];
const pct = x => x === null ? 'n/a' : x.toFixed(1) + '%';
const engineVer = r => { const s = r.subjects.v05; return [s.engine, s.version, s.v8 ? `V8 ${s.v8}` : '', s.revision ? `rev ${s.revision}` : '', s.cliVersion ? `(${s.cliVersion})` : ''].filter(Boolean).join(' '); };

const out = { reference: 'node22', casesPerSubject: 1000, bundles, rows, referenceThrowCases: { v05: rows[0].subjects.v05.throwCases, legacy: rows[0].subjects.legacy.throwCases } };
writeFileSync(join(R, 'E1_SUMMARY.json'), JSON.stringify(out, null, 2) + '\n');

let md = `# E1 summary: cross-engine agreement\n\nReference: Node 22. Cases per subject: 1000 (200 seeds x 5 configurations, see PROTOCOL.md). Agreement = cases whose digest equals the Node 22 digest for the same case id.\n\n`;
md += `| Engine | v0.5 agreement | v0.5 mismatches | legacy v0.4 agreement | legacy v0.4 mismatches |\n|---|---|---|---|---|\n`;
for (const r of rows) {
  if (!r.ran) { md += `| ${r.name} | not run | not run | not run | not run |\n`; continue; }
  const a = r.subjects.v05, b = r.subjects.legacy;
  md += `| ${r.name} | ${pct(a.agreement)} | ${a.mismatches} | ${pct(b.agreement)} | ${b.mismatches} |\n`;
}
md += `\n## Engine versions\n\n`;
for (const r of rows) md += r.ran ? `- ${r.name}: ${engineVer(r)}\n` : `- ${r.name}: NOT RUN. Error output:\n\n\`\`\`\n${r.error}\n\`\`\`\n`;
md += `\n## Bundles (SHA-256, built by build.sh, esbuild 0.25, ESM)\n\n${bundles.map(l => '- ' + l).join('\n')}\n`;
md += `\n## Checks\n\n`;
for (const r of rows.filter(r => r.ran)) {
  md += `- ${r.name}: SHA-256 self-test ${r.subjects.v05.selfTest && r.subjects.legacy.selfTest ? 'pass' : 'FAIL'}; cases producing THROW: v0.5 ${r.subjects.v05.throwCases}, legacy ${r.subjects.legacy.throwCases}; generator ${r.subjects.v05.generatorVersion} / ${r.subjects.legacy.generatorVersion}\n`;
}
const mm = rows.filter(r => r.ran && (r.subjects.v05.mismatches || r.subjects.legacy.mismatches));
if (mm.length) { md += `\n## First mismatching case ids (up to 10 per subject)\n\n`; for (const r of mm) for (const s of ['v05', 'legacy']) if (r.subjects[s].mismatches) md += `- ${r.name} ${s}: ${r.subjects[s].firstMismatches.join(', ')}\n`; }
writeFileSync(join(R, 'E1_SUMMARY.md'), md);
console.log(md);
