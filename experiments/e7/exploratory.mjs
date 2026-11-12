// EXPLORATORY (not pre-registered; run after the HELD-OUT run): numbers quoted in docs/generator-auto-join.md that are not E7 predictions.
// Usage: node experiments/e7/exploratory.mjs > experiments/e7/results/exploratory.txt
import { V100_PIN } from '../_v100-params.mjs'; // height 80 (v1.0.0 default) wherever height is left unset below
const core = await import(new URL('../../cli-dist/core.js', import.meta.url));
const val = await import(new URL('../../cli-dist/validate.js', import.meta.url));
const met = await import(new URL('../../cli-dist/metrics.js', import.meta.url));
const { datan2 } = await import(new URL('../../cli-dist/detmath.js', import.meta.url));
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const out = [];
// 1. the auditor's default-parameter measurement: seeds 0..199, validator v1.1 default
for (const join of ['legacy', 'tangent']) {
  let ok = 0; for (let seed = 0; seed < 200; seed++) if (val.validateTrack(core.generateTrack({ ...V100_PIN, seed, autoJoin: join })).ok) ok++;
  out.push(`default parameters, seeds 0..199, autoJoin ${join}: ${ok}/200 ok`);
}
// 2. per-join-vertex turn at curves 8, straight 0.3, seeds 0..299 (the auditor's setup): max turn over the join vertices of each track
for (const join of ['legacy', 'tangent']) {
  const per = [];
  for (let seed = 0; seed < 300; seed++) {
    const t = core.generateTrack({ ...V100_PIN, seed, curves: 8, straight: 0.3, autoJoin: join }), P = t.points, n = P.length - 1;
    let worst = 0;
    for (let i = 0; i < 8; i++) { if (!t.straightSegments[i] && !t.straightSegments[(i + 7) % 8]) continue;
      const j = i * core.STEPS, a = P[(j - 1 + n) % n], b = P[j], c = P[(j + 1) % n];
      worst = Math.max(worst, Math.abs(datan2((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x), (b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z))) * 180 / Math.PI); }
    per.push(worst);
  }
  out.push(`curves 8, straight 0.3, seeds 0..299, autoJoin ${join}: max turn over join vertices per track: median ${median(per).toFixed(2)} deg, min ${Math.min(...per).toFixed(2)}, max ${Math.max(...per).toFixed(2)}`);
}
// 3. total absolute turning (metrics.ts totalTurningDegrees; 360 for a convex loop) at straight > 0, default curves 6 / straight 0.25 / seeds 0..199
for (const join of ['legacy', 'tangent']) {
  const v = []; for (let seed = 0; seed < 200; seed++) v.push(met.computeMetrics(core.generateTrack({ ...V100_PIN, seed, autoJoin: join })).totalTurningDegrees);
  out.push(`default parameters, seeds 0..199, autoJoin ${join}: totalTurningDegrees median ${median(v).toFixed(2)}, max ${Math.max(...v).toFixed(2)}`);
}
console.log(out.join('\n'));
