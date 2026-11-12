// E6 DEV evaluation: all 711 candidate configurations on the DEV seeds (PROTOCOL 2, 3, 5). Writes results/dev/candidates.json.
// Usage: npm run build:cli && node experiments/e6/run-dev.mjs [outFile]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { val, DEV_SEEDS, negativeCases, baseCases, gen, synthetic, candidates, applyDefect, sizeOf, OPERATORS, PLANAR_OPS, sha256hex } from './lib.mjs';

const out = process.argv[2] ?? new URL('./results/dev/candidates.json', import.meta.url).pathname;
const cands = candidates(), NC = cands.length;
const fp = cands.map(() => ({ N1: 0, N2: 0, N3: 0 }));
const det = cands.map(() => ({})); // det[c][op][level][cls] = [total, hit]
const gens = { N1: [0, 0], N2: [0, 0], bases: [0, 0] }; // [generated, failed]
const mustCount = {}; // instance counts independent of candidate: op -> level -> cls -> n
const flaggedAny = (profile, c) => { const f = val.kinkFlags(profile, c.opts); for (let i = 0; i < f.length; i++) if (f[i]) return true; return false; };

for (const seed of DEV_SEEDS) {
  for (const cs of negativeCases(seed)) {
    const t = gen(cs.params);
    if (!t) { gens[cs.set][1]++; continue; }
    gens[cs.set][0]++;
    const profile = val.kinkProfile(t.points, t.params.width);
    for (let c = 0; c < NC; c++) if (flaggedAny(profile, cands[c])) fp[c][cs.set]++;
  }
  for (const b of baseCases(seed)) {
    const base = gen(b.params);
    if (!base) { gens.bases[1]++; continue; }
    gens.bases[0]++;
    for (const op of Object.keys(OPERATORS)) {
      if (op === 'heightStep') continue; // not scored for kink rules (PROTOCOL 4)
      for (const level of OPERATORS[op]) {
        const d = applyDefect(base, b.key, op, level), { cls } = sizeOf(d.track.points, d.window);
        const profile = val.kinkProfile(d.track.points, d.track.params.width), n = profile.n;
        const win = [...new Set(d.window.map(j => ((j % n) + n) % n))];
        ((mustCount[op] ??= {})[level] ??= {})[cls] = (mustCount[op][level][cls] ?? 0) + 1;
        for (let c = 0; c < NC; c++) {
          const cd = cands[c];
          let hit = false;
          for (const j of win) if (val.kinkFlagAt(profile, cd.parts, cd.opts, j)) { hit = true; break; }
          const cell = (((det[c][op] ??= {})[level] ??= {})[cls] ??= [0, 0]);
          cell[0]++; if (hit) cell[1]++;
        }
      }
    }
  }
}
for (const t of synthetic()) {
  const profile = val.kinkProfile(t.track.points, t.track.params.width);
  for (let c = 0; c < NC; c++) if (flaggedAny(profile, cands[c])) fp[c].N3++;
}
const result = { protocol: 'experiments/e6/PROTOCOL.md', split: 'DEV', seeds: DEV_SEEDS, generated: gens, instanceCounts: mustCount,
  candidates: cands.map((c, i) => ({ id: c.id, family: c.family, label: c.label, opts: c.opts, fp: fp[i], det: det[i] })) };
const text = JSON.stringify(result);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(JSON.stringify({ out, sha256: sha256hex(text), generated: gens }));
