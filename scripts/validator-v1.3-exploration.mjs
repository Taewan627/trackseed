// Exploration for validator v1.3 (docs/validator-v1.3-exploration.md): EXPLORATORY, not a protocol. Chooses sharpVertexDegrees and the UNDERSAMPLED
// definition from clean generated TrackSeed tracks and prints the RT3 probe outcomes before/after. Needs `npm run build:cli`.
// Usage: node scripts/validator-v1.3-exploration.mjs [--json] [--probes-only]   (the full run takes about 6 minutes on the 2-vCPU machine; --probes-only a second)
import { existsSync } from 'node:fs';
const DIST = new URL('../cli-dist/', import.meta.url);
if (!existsSync(new URL('validate.js', DIST))) throw new Error('cli-dist/ missing: run `npm run build:cli` first');
const E6 = new URL('../experiments/e6/lib.mjs', import.meta.url);
const { core, val, DEV_SEEDS, HELD_SEEDS, E2_SEEDS, negativeCases, autoStraightCases, synthetic, gen } = await import(E6);
const { trackFromPolyline } = await import(new URL('polyline.js', DIST));

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const quant = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : 0; };
function stats(track) { // per-track: max turn, share of vertices over 12 / 8 / 6 degrees
  const p = val.kinkProfile(track.points, track.params.width), n = p.n;
  let max = 0, o12 = 0, o8 = 0, o6 = 0;
  for (let i = 0; i < n; i++) { const t = p.theta[i]; if (t > max) max = t; if (t > 12) o12++; if (t > 8) o8++; if (t > 6) o6++; }
  return { max, s12: o12 / n, s8: o8 / n, s6: o6 / n, n };
}
const PROBES_ONLY = process.argv.includes('--probes-only');
const sets = {};
const add = (name, t) => { if (t) (sets[name] ??= []).push(stats(t)); };
const v12 = p => { try { return core.generateTrack(p); } catch { return null; } }; // v1.2 defaults (tangent join, height default)
if (!PROBES_ONLY) {
for (const seed of DEV_SEEDS) { for (const c of negativeCases(seed)) add(`DEV ${c.set} (legacy join, E6 grid)`, gen(c.params)); }
for (const seed of HELD_SEEDS) { for (const c of negativeCases(seed)) add(`CONFIRM held-out seeds ${'N1/N2'} (legacy join)`, gen(c.params)); }
for (const seed of E2_SEEDS) {
  for (const c of negativeCases(seed)) add('CONFIRM E2 seeds N1/N2, v1.2 defaults (tangent join)', v12({ ...c.params, autoJoin: undefined }));
  for (const c of autoStraightCases(seed)) add('CONFIRM E2 seeds Auto straight>0, v1.2 defaults (tangent join)', v12(c.params));
}
for (const t of synthetic()) add('N3 synthetic (analytic circles, ellipses, stadiums)', t.track);
}

const rows = [];
for (const [name, list] of Object.entries(sets)) {
  const maxs = list.map(x => x.max);
  const row = { set: name, tracks: list.length, maxTurnMax: Math.max(...maxs), maxTurnP999: quant(maxs, 0.999), maxTurnMedian: median(maxs),
    tracksMaxOver12: maxs.filter(x => x > 12).length, tracksMaxOver14: maxs.filter(x => x > 14).length, tracksMaxOver20: maxs.filter(x => x > 20).length, tracksMaxOver30: maxs.filter(x => x > 30).length,
    shareOver12Max: Math.max(...list.map(x => x.s12)), tracksWithShareOver12: list.filter(x => x.s12 > 0).length,
    shareOver8Max: Math.max(...list.map(x => x.s8)), shareOver6Max: Math.max(...list.map(x => x.s6)) };
  rows.push(row);
}

// ---- RT3 probes, validator v1.2 behaviour (both new checks off) versus v1.3 defaults ----
const circle = (n, R, f = () => 0) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; const r = R + f(i); return { x: r * Math.cos(a), z: r * Math.sin(a) }; });
const OLD = { sharpVertexDegrees: Infinity, undersampledCheck: false };
const summarize = r => ({ ok: r.ok, errors: [...new Set(r.violations.filter(v => v.severity === 'error').map(v => v.code))], warnings: [...new Set(r.violations.filter(v => v.severity !== 'error').map(v => v.code))] });
const probe = (pts, width) => { const t = trackFromPolyline({ points: pts, width, closed: true }); return { before: summarize(val.validateTrack(t, OLD)), after: summarize(val.validateTrack(t)),
  maxTurn: stats(t).max }; };
const probes = {};
for (const n of [4, 5, 6, 8]) probes[`regular ${n}-gon, R=500, width 12`] = probe(circle(n, 500), 12);
for (const h of [0.5, 2, 5]) probes[`sawtooth: 2000-gon R=1000, alternating +-${h}, width 10`] = probe(circle(2000, 1000, i => (i % 2 ? h : -h)), 10);
for (const gap of [2, 3, 4]) for (const h of [3, 10]) { const sp = new Set([500, 500 + gap]); probes[`paired spikes gap ${gap}, h=${h}, 2000-gon R=1000, width 10`] = probe(circle(2000, 1000, i => sp.has(i) ? h : 0), 10); }
for (const amp of [1, 3, 6]) probes[`zigzag patch of 20 vertices, amp ${amp}, 2000-gon R=1000, width 10`] = probe(circle(2000, 1000, i => i >= 500 && i < 520 ? (i % 2 ? amp : -amp) : 0), 10);
for (const [name, p] of Object.entries(probes)) p.name = name;
const out = { sets: rows, probes };
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  console.log('| set | tracks | max turn (deg): max / p99.9 / median | tracks with max >12 / >14 / >20 / >30 | max share of vertices >12 / >8 / >6 deg |\n|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.set} | ${r.tracks} | ${r.maxTurnMax.toFixed(2)} / ${r.maxTurnP999.toFixed(2)} / ${r.maxTurnMedian.toFixed(2)} | ${r.tracksMaxOver12} / ${r.tracksMaxOver14} / ${r.tracksMaxOver20} / ${r.tracksMaxOver30} | ${(r.shareOver12Max * 100).toFixed(2)} % / ${(r.shareOver8Max * 100).toFixed(2)} % / ${(r.shareOver6Max * 100).toFixed(2)} % |`);
  console.log('\n| probe | max turn (deg) | v1.2 (new checks off) | v1.3 defaults |\n|---|---|---|---|');
  const f = s => `${s.ok ? 'ok' : 'INVALID'}${s.errors.length ? ' [' + s.errors.join(',') + ']' : ''}${s.warnings.length ? ' warn [' + s.warnings.join(',') + ']' : ''}`;
  for (const p of Object.values(probes)) console.log(`| ${p.name} | ${p.maxTurn.toFixed(1)} | ${f(p.before)} | ${f(p.after)} |`);
}
