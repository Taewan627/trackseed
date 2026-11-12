// E5 ADDENDUM-01 (see ADDENDUM-01.md; the predictions there were committed before this script was first run).
// `collect`: Node 22 run of the E5 adapter (the same bundle as run.mjs) on the 1000 registered seeds.
// `analyze`: Q2 validity at W = 4, 8, 14 with the current default validator options (v1.1, closureTangentMode 'kink'),
//            the reproduction check of the committed v1.0 baseline (closureTangentMode 'ratio'), the v1.0 -> v1.1 transition table,
//            and the predictions P-A1..P-A3.
// Writes only under results/addendum-01/ and out/addendum-01/ (out/ is git-ignored). Reads the committed results read-only.
// Usage: node addendum-01.mjs collect | analyze
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const R = join(here, 'results'), A = join(R, 'addendum-01'), O = join(here, 'out', 'addendum-01');
const lib = f => import(pathToFileURL(join(root, 'cli-dist', f)).href);
const readJson = f => JSON.parse(readFileSync(f, 'utf8'));
const WIDTHS = [4, 8, 14];
const mode = process.argv[2];

if (mode === 'collect') {
  const mod = await import(pathToFileURL(join(here, 'build', 'e5.mjs')).href);
  const html = readFileSync(join(here, 'build', 'third_party', 'index.html'), 'latin1');
  const { polylines, meta, cases, mathCalls } = mod.runAll(html);
  mkdirSync(A, { recursive: true }); mkdirSync(O, { recursive: true });
  writeFileSync(join(A, 'node22.json'), JSON.stringify({ env: { engine: 'node', version: process.version, v8: process.versions.v8 }, meta, cases, mathCalls }) + '\n');
  writeFileSync(join(O, 'node22.polylines.json'), JSON.stringify(polylines) + '\n');
  const outcomes = {};
  for (const c of cases) outcomes[c.outcome] = (outcomes[c.outcome] ?? 0) + 1;
  console.log(`collected ${cases.length} cases; outcomes ${JSON.stringify(outcomes)}`);
} else if (mode === 'analyze') {
  const { trackFromPolyline } = await lib('polyline.js');
  const { validateTrack } = await lib('validate.js');
  const cur = readJson(join(A, 'node22.json'));
  const polylines = readJson(join(O, 'node22.polylines.json'));
  const committed = readJson(join(R, 'node22.json'));
  const baseline = new Map(readFileSync(join(R, 'validity.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)).map(x => [x.seed, x]));
  const N = cur.cases.length;
  const pct = (k, n) => n === 0 ? null : Math.round(k / n * 10000) / 100;
  const wilson = (k, n) => { if (n === 0) return null; const z = 1.959964, ph = k / n, d = 1 + z * z / n, c = ph + z * z / (2 * n), s = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)); return [Math.round((c - s) / d * 10000) / 100, Math.round((c + s) / d * 10000) / 100]; };
  const sortObj = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));

  // Input checks (not predictions): same seeds, same script bytes, digests equal to the committed Node 22 run.
  const inputs = {
    seedsInSameOrder: cur.cases.every((c, i) => c.seed === committed.cases[i].seed),
    scriptSha256Equal: cur.meta.scriptSha256 === committed.meta.scriptSha256,
    digestsEqualToCommittedNode22: cur.cases.filter((c, i) => committed.cases[i].digest === c.digest).length,
    outcomes: cur.cases.reduce((a, c) => { a[c.outcome] = (a[c.outcome] ?? 0) + 1; return a; }, {}),
  };
  const okPolys = polylines.filter(p => p.centerline);
  const outputs = okPolys.length;

  const toInput = p => ({ points: p.centerline.map(q => ({ x: q[0], z: q[1], y: 0 })), closed: true });
  const check = (p, W, options) => {
    const v = validateTrack(trackFromPolyline({ ...toInput(p), width: W }), options);
    const sev = new Map();
    for (const x of v.violations) sev.set(x.code, x.severity); // violations are capped per code; every failing code appears at least once
    return { ok: v.ok, codes: [...sev.keys()].sort(), errorCodes: [...sev].filter(([, s]) => s === 'error').map(([c]) => c).sort(),
      warningCodes: [...sev].filter(([, s]) => s === 'warning').map(([c]) => c).sort() };
  };

  // Reproduction check of the committed baseline: the current build with the legacy 'ratio' seam rule must reproduce results/validity.jsonl.
  const repro = { checked: 0, mismatches: 0, firstMismatchSeeds: [] };
  for (const p of okPolys) for (const W of WIDTHS) {
    const r = check(p, W, { closureTangentMode: 'ratio' }), b = baseline.get(p.seed)[`w${W}`];
    repro.checked++;
    if (r.ok !== b.ok || JSON.stringify(r.codes) !== JSON.stringify(b.codes)) { repro.mismatches++; if (repro.firstMismatchSeeds.length < 10) repro.firstMismatchSeeds.push(p.seed); }
  }

  // Q2 under the current default options (v1.1, closureTangentMode 'kink').
  const full = okPolys.map(p => ({ seed: p.seed, ...Object.fromEntries(WIDTHS.map(W => [`w${W}`, check(p, W, undefined)])) }));
  const stats = {};
  for (const W of WIDTHS) {
    const rows = full.map(f => f[`w${W}`]);
    const pass = rows.filter(r => r.ok).length;
    const errCases = {}, warnCases = {};
    for (const r of rows) { for (const c of r.errorCodes) errCases[c] = (errCases[c] ?? 0) + 1; for (const c of r.warningCodes) warnCases[c] = (warnCases[c] ?? 0) + 1; }
    const kinkCases = rows.filter(r => r.codes.includes('LOCAL_KINK') || r.codes.includes('CLOSURE_TANGENT')).length;
    stats[W] = { pass, failing: outputs - pass, passShareOfOutputs: pct(pass, outputs), wilson95: wilson(pass, outputs),
      errorCodeCases: sortObj(errCases), warningCodeCases: sortObj(warnCases), localKinkOrClosureTangentCases: kinkCases,
      localKinkCases: rows.filter(r => r.codes.includes('LOCAL_KINK')).length, closureTangentCases: rows.filter(r => r.codes.includes('CLOSURE_TANGENT')).length };
  }

  // v1.0 -> v1.1 transition table against the committed baseline.
  const transition = {};
  for (const W of WIDTHS) {
    const t = { okToNotOk: [], notOkToOk: [], okStays: 0, notOkStays: 0, codeAdded: {}, codeRemoved: {} };
    for (const f of full) {
      const b = baseline.get(f.seed)[`w${W}`], n = f[`w${W}`];
      if (b.ok && !n.ok) t.okToNotOk.push(f.seed); else if (!b.ok && n.ok) t.notOkToOk.push(f.seed);
      else if (b.ok) t.okStays++; else t.notOkStays++;
      for (const c of n.codes) if (!b.codes.includes(c)) t.codeAdded[c] = (t.codeAdded[c] ?? 0) + 1;
      for (const c of b.codes) if (!n.codes.includes(c)) t.codeRemoved[c] = (t.codeRemoved[c] ?? 0) + 1;
    }
    t.codeAdded = sortObj(t.codeAdded); t.codeRemoved = sortObj(t.codeRemoved);
    transition[W] = t;
  }

  // Predictions (ADDENDUM-01.md). Integer arithmetic only.
  const checks = [];
  const P = (id, text, observed, holds) => checks.push({ id, prediction: text, observed, holds });
  const w4 = stats[4];
  P('P-A1', 'pass share at W = 4 >= 95% of outputs', `${w4.pass} of ${outputs} (${w4.passShareOfOutputs}%)`, w4.pass * 100 >= 95 * outputs);
  P('P-A2', 'outputs with LOCAL_KINK or CLOSURE_TANGENT at W = 4 <= 2% of outputs', `${w4.localKinkOrClosureTangentCases} of ${outputs} (${pct(w4.localKinkOrClosureTangentCases, outputs)}%)`,
    w4.localKinkOrClosureTangentCases * 100 <= 2 * outputs);
  const p3 = WIDTHS.map(W => ({ W, v10FailV11Pass: transition[W].notOkToOk.length }));
  P('P-A3', 'every output failing under v1.0 still fails under v1.1, at W = 4, 8, 14', p3, p3.every(x => x.v10FailV11Pass === 0));

  const out = { addendum: 'ADDENDUM-01', validator: 'default options of src/validate.ts (closureTangentMode kink) via cli-dist',
    node: process.version, cases: N, outputs, inputs, baselineReproduction: repro, Q2: stats, transition, predictions: checks };
  writeFileSync(join(A, 'SUMMARY.json'), JSON.stringify(out, null, 2) + '\n');
  writeFileSync(join(A, 'validity.jsonl'), full.map(f => JSON.stringify({ seed: f.seed, w4: { ok: f.w4.ok, codes: f.w4.codes }, w8: { ok: f.w8.ok, codes: f.w8.codes }, w14: { ok: f.w14.ok, codes: f.w14.codes } })).join('\n') + '\n');

  let md = `# E5 ADDENDUM-01 summary (generated by addendum-01.mjs; pre-registration: ADDENDUM-01.md)\n\n`;
  md += `Node ${cur.env.version}, ${N} registered seeds, ${outputs} outcome-ok outputs (outcomes ${JSON.stringify(inputs.outcomes)}). Validator: default options (closureTangentMode 'kink', v1.1). Pass = no error-severity violation.\n\n`;
  md += `## Inputs (checks, not predictions)\n\n- Seed order equal to the committed run: ${inputs.seedsInSameOrder}; script SHA-256 equal to the committed run: ${inputs.scriptSha256Equal}.\n- Digests equal to the committed Node 22 run (results/node22.json): ${inputs.digestsEqualToCommittedNode22} of ${N}.\n- Baseline reproduction (current build, closureTangentMode 'ratio', against committed results/validity.jsonl): ${repro.checked - repro.mismatches} of ${repro.checked} width-cases equal${repro.mismatches ? `; mismatching seeds ${repro.firstMismatchSeeds.join(', ')}` : ''}.\n\n`;
  md += `## Q2 under v1.1 (default options)\n\n| Width | pass | pass share of outputs (Wilson 95%) | error codes (cases) | warning codes (cases) | LOCAL_KINK cases | CLOSURE_TANGENT cases |\n|---|---|---|---|---|---|---|\n`;
  for (const W of WIDTHS) { const s = stats[W]; md += `| ${W} | ${s.pass} | ${s.passShareOfOutputs}% [${s.wilson95.join(', ')}] | ${JSON.stringify(s.errorCodeCases)} | ${JSON.stringify(s.warningCodeCases)} | ${s.localKinkCases} | ${s.closureTangentCases} |\n`; }
  md += `\n## Transition v1.0 (ratio, committed) -> v1.1 (kink), per width\n\n| Width | ok -> not ok | not ok -> ok | ok stays | not ok stays | codes added (outputs) | codes removed (outputs) |\n|---|---|---|---|---|---|---|\n`;
  for (const W of WIDTHS) { const t = transition[W]; md += `| ${W} | ${t.okToNotOk.length} | ${t.notOkToOk.length} | ${t.okStays} | ${t.notOkStays} | ${JSON.stringify(t.codeAdded)} | ${JSON.stringify(t.codeRemoved)} |\n`; }
  md += `\nSeeds with ok -> not ok at W = 4: ${transition[4].okToNotOk.join(', ') || 'none'}. Seeds with not ok -> ok at W = 4: ${transition[4].notOkToOk.join(', ') || 'none'}. Full seed lists for every width: SUMMARY.json.\n`;
  md += `\n## Predictions against results\n\n| id | prediction | observed | holds |\n|---|---|---|---|\n`;
  for (const c of checks) md += `| ${c.id} | ${c.prediction} | ${JSON.stringify(c.observed)} | ${c.holds ? 'yes' : 'NO'} |\n`;
  writeFileSync(join(A, 'SUMMARY.md'), md);
  console.log(md);
} else {
  console.error('usage: node addendum-01.mjs collect | analyze'); process.exit(2);
}
