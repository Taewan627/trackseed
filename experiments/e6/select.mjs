// E6 DEV selection (PROTOCOL 6). Reads results/dev/candidates.json; writes candidates.csv, DEV_SUMMARY.md, FROZEN.json next to it.
// Usage: node experiments/e6/select.mjs [devDir]
import { readFileSync, writeFileSync } from 'node:fs';
import { PLANAR_OPS, FAMILY_ORDER, wilson, r6 } from './lib.mjs';

export function rowsOf(dev) {
  const nClean = dev.generated.N1[0] + dev.generated.N2[0];
  return dev.candidates.map(c => {
    const recall = {}, must = {};
    for (const op of PLANAR_OPS) {
      let tot = 0, hit = 0;
      for (const level of Object.keys(c.det[op] ?? {})) { const cell = c.det[op][level].must; if (cell) { tot += cell[0]; hit += cell[1]; } }
      recall[op] = tot ? hit / tot : 0; must[op] = [hit, tot];
    }
    const macro = PLANAR_OPS.reduce((a, op) => a + recall[op], 0) / PLANAR_OPS.length;
    const fpClean = c.fp.N1 + c.fp.N2;
    return { ...c, recall, must, macro, nClean, fpClean, fpRate: fpClean / nClean, fpAll: fpClean + c.fp.N3,
      admissible: fpClean / nClean <= 0.01 && c.fp.N3 === 0 };
  });
}
/** PROTOCOL 6 steps 1-5 on the rows (optionally restricted to one family). */
export function choose(rows, family = null) {
  const adm = rows.filter(r => r.admissible && (!family || r.family === family));
  if (!adm.length) return null;
  const best = Math.max(...adm.map(r => r.macro));
  let tied = adm.filter(r => r.macro >= best - 0.005);
  const minFp = Math.min(...tied.map(r => r.fpAll)); tied = tied.filter(r => r.fpAll === minFp);
  const rank = f => FAMILY_ORDER.indexOf(f), minRank = Math.min(...tied.map(r => rank(r.family)));
  tied = tied.filter(r => rank(r.family) === minRank).sort((a, b) => a.id - b.id);
  return { chosen: tied[Math.floor((tied.length - 1) / 2)], bestMacro: best, tiedCount: tied.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? new URL('./results/dev/', import.meta.url).pathname.replace(/\/$/, '');
  const dev = JSON.parse(readFileSync(`${dir}/candidates.json`, 'utf8'));
  const rows = rowsOf(dev);
  const csvCols = ['id', 'family', 'label', 'fpN1', 'fpN2', 'fpN3', 'fpRateClean', 'admissible', ...PLANAR_OPS.map(o => `recall_${o}`), 'macroRecall'];
  writeFileSync(`${dir}/candidates.csv`, [csvCols.join(','), ...rows.map(r => [r.id, r.family, `"${r.label}"`, r.fp.N1, r.fp.N2, r.fp.N3, r6(r.fpRate), r.admissible ? 1 : 0,
    ...PLANAR_OPS.map(o => r6(r.recall[o])), r6(r.macro)].join(','))].join('\n') + '\n');
  const sel = choose(rows);
  const perFamily = Object.fromEntries(FAMILY_ORDER.map(f => { const s = choose(rows, f); return [f, s ? s.chosen.id : null]; }));
  const best = sel ? sel.chosen : null;
  const frozen = !sel || sel.bestMacro < 0.90
    ? { criterionMet: false, reason: !sel ? 'no admissible configuration' : `best admissible macro recall ${sel.bestMacro} < 0.90`, bestAdmissibleId: best ? best.id : null, perFamilyBestIds: perFamily }
    : { criterionMet: true, id: best.id, family: best.family, label: best.label, options: { closureTangentMode: 'kink', ...best.opts },
        dev: { fp: best.fp, nClean: best.nClean, fpRateClean: best.fpRate, recall: best.recall, mustDetectCounts: best.must, macroRecall: best.macro,
          tiedConfigurations: sel.tiedCount, bestMacroAmongAdmissible: sel.bestMacro }, perFamilyBestIds: perFamily };
  writeFileSync(`${dir}/FROZEN.json`, JSON.stringify(frozen, null, 2) + '\n');
  const pct = x => (100 * x).toFixed(2) + '%';
  const lines = ['# E6 DEV selection summary', '', `DEV seeds: ${dev.seeds.length}; clean generated tracks N1 ${dev.generated.N1[0]} (failed ${dev.generated.N1[1]}), N2 ${dev.generated.N2[0]} (failed ${dev.generated.N2[1]}); N3 60; defect bases ${dev.generated.bases[0]} (failed ${dev.generated.bases[1]}).`, '',
    `Admissible configurations (FPR on N1+N2 <= 1% and 0 flags on N3): ${rows.filter(r => r.admissible).length} of ${rows.length}.`, '',
    '## Best admissible configuration per family (same criterion restricted to the family)', '',
    '| family | configuration | FP N1 | FP N2 | FP N3 | recall seamSpike | interiorSpike | corner | tangent | macro |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const f of FAMILY_ORDER) {
    const s = choose(rows, f);
    if (!s) { lines.push(`| ${f} | none admissible | | | | | | | | |`); continue; }
    const r = s.chosen;
    lines.push(`| ${f} | ${r.label} (id ${r.id}) | ${r.fp.N1}/${dev.generated.N1[0]} | ${r.fp.N2}/${dev.generated.N2[0]} | ${r.fp.N3}/60 | ${PLANAR_OPS.map(o => `${pct(r.recall[o])} (${r.must[o][0]}/${r.must[o][1]})`).join(' | ')} | ${pct(r.macro)} |`);
  }
  lines.push('', '## Selected (PROTOCOL 6)', '', frozen.criterionMet ? `**${frozen.label}** (id ${frozen.id}, family ${frozen.family}); ${sel.tiedCount} configuration(s) in the final tie set; best admissible macro recall ${pct(sel.bestMacro)}.` : `Criterion NOT MET: ${frozen.reason}.`);
  lines.push('', '## Legacy-style references (not candidates): FP counts of every A1 threshold', '', '| T | FP N1 | FP N2 | FP N3 | macro recall |', '|---|---|---|---|---|');
  for (const r of rows.filter(r => r.family === 'A1')) lines.push(`| ${r.label} | ${r.fp.N1} | ${r.fp.N2} | ${r.fp.N3} | ${pct(r.macro)} |`);
  writeFileSync(`${dir}/DEV_SUMMARY.md`, lines.join('\n') + '\n');
  console.log(JSON.stringify(frozen, null, 1));
}
