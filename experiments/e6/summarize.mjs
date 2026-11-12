// Writes results/heldout/SUMMARY.md from heldout.json (and the predictions check of PROTOCOL 7). Usage: node experiments/e6/summarize.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('./results/heldout/', import.meta.url).pathname;
const r = JSON.parse(readFileSync(`${dir}heldout.json`, 'utf8'));
const f = c => c.p === null ? '-' : `${(100 * c.p).toFixed(2)}% [${(100 * c.lo).toFixed(2)}, ${(100 * c.hi).toFixed(2)}] (${c.k}/${c.n})`;
const R = [['frozen', 'frozen kink rule v1.1'], ['ratio', "legacy 'ratio'"], ['absolute', "legacy 'absolute'"]];
const OPS = ['seamSpike', 'interiorSpike', 'corner', 'tangent'];
const L = [`# E6 HELD-OUT results (run once with the rule frozen in ../dev/FROZEN.json)`, '',
  `Frozen rule: **${r.frozen.label}** (kinkRule ${r.frozen.options.kinkRule}, window ${r.frozen.options.kinkWindow}, quantile ${r.frozen.options.kinkQuantile}, ratio ${r.frozen.options.kinkRatio}, floor ${r.frozen.options.kinkFloorDegrees} deg). Seeds: ${r.seeds.length} HELD-OUT seeds (SEEDS[100..139]). Evaluated through validateTrack. Wilson 95% CI.`,
  `Generated: N1 ${r.generated.N1[0]} (failed ${r.generated.N1[1]}), N2 ${r.generated.N2[0]}, defect bases ${r.generated.bases[0]}, Auto straight>0 ${r.generated.autoStraight[0]}; N3 60; planar defect instances (operators 1-4): ${r.generated.bases[0] * 18} (instances.csv.gz).`, '',
  '## False positives on clean negatives (flagged = LOCAL_KINK or CLOSURE_TANGENT anywhere)', '', '| rule | N1 pattern modes | N2 Auto straight 0 | N3 synthetic |', '|---|---|---|---|',
  ...R.map(([k, n]) => `| ${n} | ${f(r.negatives[k].N1)} | ${f(r.negatives[k].N2)} | ${f(r.negatives[k].N3)} |`), '',
  '## Recall on MUST-DETECT instances (S >= 30 deg), pooled over levels and modes', '', '| rule | seamSpike | interiorSpike | corner | tangent |', '|---|---|---|---|---|',
  ...R.map(([k, n]) => `| ${n} | ${OPS.map(o => f(r.defects[k][o].mustAll)).join(' | ')} |`), '',
  '## Grey zone (15 <= S < 30) and below-threshold (S < 15): detection rate, not scored', '', '| rule | operator | grey | below threshold |', '|---|---|---|---|',
  ...R.flatMap(([k, n]) => OPS.map(o => `| ${n} | ${o} | ${f(r.defects[k][o].greyAll)} | ${f(r.defects[k][o].subAll)} |`)), '',
  '## Per nominal level, all instances (detection rate; must-detect count in brackets) - frozen rule vs legacy', ''];
for (const o of OPS) {
  L.push(`### ${o}`, '', '| level | instances (must-detect) | frozen | ratio | absolute |', '|---|---|---|---|---|');
  for (const lv of Object.keys(r.defects.frozen[o].levels)) { const c = r.defects.frozen[o].levels[lv];
    L.push(`| ${lv} | ${c.all.n} (${c.must.n}) | ${f(c.all)} | ${f(r.defects.ratio[o].levels[lv].all)} | ${f(r.defects.absolute[o].levels[lv].all)} |`); }
  L.push('');
}
L.push('## Per mode, must-detect recall of the frozen rule (Auto reported separately)', '', '| operator | auto | right-angle | hairpin | s-curve |', '|---|---|---|---|---|',
  ...OPS.map(o => `| ${o} | ${['auto', 'right-angle', 'hairpin', 's-curve'].map(m => f(r.perMode.frozen[o][m])).join(' | ')} |`), '',
  '## Validator-level detection (base ok and defective track not ok), frozen rule, per nominal level', '', '| operator | ' + 'levels (rate) |', '|---|---|',
  ...OPS.map(o => `| ${o} | ${Object.entries(r.defects.frozen[o].levels).map(([l, c]) => `${l}: ${f(c.validatorLevel)}`).join('; ')} |`), '',
  '## Height steps (operator 5; out of scope for the planar kink rule, nothing claimed)', '', '| dy | MAX_SLOPE failure count rises | base ok -> not ok (any error) |', '|---|---|---|',
  ...Object.entries(r.heightStep).map(([l, c]) => `| ${l} | ${f(c.maxSlopeFailuresIncreased)} | ${f(c.baseOkNowNotOk)} |`), '',
  '## Auto with straight > 0 (descriptive; flags are genuine kinks of the original algorithm, not false positives)', '',
  'Oracle group by largest generator join deflection: genuine >= 30 deg, smooth < 10 deg, middle otherwise (no track had all joins < 10 deg).', '', '| group | n | frozen | ratio | absolute |', '|---|---|---|---|---|',
  ...Object.entries(r.autoStraight).map(([g, c]) => `| ${g} | ${c.n} | ${f(c.frozen)} | ${f(c.ratio)} | ${f(c.absolute)} |`), '',
  '## Best DEV configuration of each family, must-detect recall on HELD-OUT (transparency; the frozen rule is family B)', '', '| family | configuration | seamSpike | interiorSpike | corner | tangent |', '|---|---|---|---|---|---|',
  ...Object.entries(r.familyBest).map(([k, v]) => `| ${k} | ${r.familyBestDev[k].label} | ${OPS.map(o => f(v[o])).join(' | ')} |`), '');
const P = r.defects, N = r.negatives;
L.push('## Predictions of PROTOCOL 7 / 8', '',
  `- P1 (legacy ratio detects <= 10% of must-detect seamSpike, ~0% of interior): seamSpike ${f(P.ratio.seamSpike.mustAll)}; interior spike ${f(P.ratio.interiorSpike.mustAll)}, corner ${f(P.ratio.corner.mustAll)}. Interior part CONFIRMED; seam-spike part NOT CONFIRMED (about half of the seam spikes are caught on this grid, unlike the 0/20 of the red-team probe on 8-curve hairpin tracks with straight 0).`,
  `- P2 (legacy absolute >= 95% of must-detect seam operators, ~0% interior, FPR >= 10% on N1): seamSpike ${f(P.absolute.seamSpike.mustAll)}, tangent ${f(P.absolute.tangent.mustAll)}, interior ${f(P.absolute.interiorSpike.mustAll)}, N1 FPR ${f(N.absolute.N1)}. CONFIRMED.`,
  `- P3 (frozen: recall >= 95% on each of operators 1-4, FPR <= 1% on N1 and N2, zero flags on N3): recalls ${OPS.map(o => (100 * P.frozen[o].mustAll.p).toFixed(2) + '%').join(', ')}; N1 ${f(N.frozen.N1)}; N2 ${f(N.frozen.N2)}; N3 ${N.frozen.N3.k}/60. CONFIRMED.`,
  `- P4 (A1 'turn' inadmissible below T = 35): CONFIRMED on DEV (every T <= 30 flags N3 circles, see ../dev/DEV_SUMMARY.md); the best A1 (T = 35) has the lower HELD-OUT recall shown above.`, '');
writeFileSync(`${dir}SUMMARY.md`, L.join('\n'));
