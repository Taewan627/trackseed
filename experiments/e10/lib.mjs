// E10 shared code: operators of classes (a), (b), (c), the default-join set N4, the five rules, window handling. Implements PROTOCOL.md.
// E6 code is imported unchanged. Needs `npm run build:cli`.
import { createHash } from 'node:crypto';
import {
  core, val, dm, SEEDS, HELD_SEEDS, mulberry32, buildEdges, asTrack, turnAt, wilson, r6,
} from '../e6/lib.mjs';
import { V12_VALIDATOR_PIN } from '../_v12-validator.mjs';
export { core, val, dm, SEEDS, HELD_SEEDS, mulberry32, buildEdges, asTrack, turnAt, wilson, r6 };
export { negativeCases, baseCases, gen, synthetic, applyDefect, OPERATORS, PLANAR_OPS } from '../e6/lib.mjs';

export const DEBUG_SEEDS = [7000001, 7000002, 7000003, 7000004];
if (DEBUG_SEEDS.some(s => SEEDS.includes(s))) throw new Error('debug seeds must be outside SEEDS');

// ---------------------------------------------------------------- rules (PROTOCOL 3)
const BIG = { maxViolationsPerCheck: 1e9 };
export const RULES = [
  ['R1', { ...BIG }],
  ['R2', { ...BIG, sharpVertexDegrees: Infinity }],
  ['R3', { ...BIG, undersampledCheck: false }],
  ['R4', { ...BIG, ...V12_VALIDATOR_PIN }],
  ['R5', { ...BIG, closureTangentMode: 'ratio' }],
];
export const RULE_IDS = RULES.map(r => r[0]);
export const KINK_CODES = new Set(['CLOSURE_TANGENT', 'LOCAL_KINK', 'SHARP_VERTEX']);

// bit encoding of one rule's outcome on one track: 1 ok, 2 kinkWin, 4 under (UNDERSAMPLED), 8 newWarn, 16 baseOk
export const B_OK = 1, B_KINK = 2, B_UNDER = 4, B_NEWWARN = 8, B_BASEOK = 16;
export function baseInfo(track) {
  return RULES.map(([, o]) => { const r = val.validateTrack(track, o); return { ok: r.ok, warns: new Set(r.violations.filter(v => v.severity === 'warning').map(v => v.code)) }; });
}
/** Five rule outcomes of `track`; win = Set of vertex indices (null = all vertices); base = baseInfo() or null. */
export function evalRules(track, win, base) {
  return RULES.map(([, o], k) => {
    const r = val.validateTrack(track, o);
    let bits = 0;
    if (r.ok) bits |= B_OK;
    let kink = false, under = false, newWarn = false;
    for (const v of r.violations) {
      if (KINK_CODES.has(v.code) && (win === null || win.has(v.index))) kink = true;
      if (v.severity === 'warning') { if (v.code === 'UNDERSAMPLED') under = true; if (!base || !base[k].warns.has(v.code)) newWarn = true; }
    }
    if (kink) bits |= B_KINK; if (under) bits |= B_UNDER; if (newWarn) bits |= B_NEWWARN;
    if (!base || base[k].ok) bits |= B_BASEOK;
    return bits;
  });
}
/** Clean-track outcome per rule: kink-family flag anywhere, not ok, any warning, UNDERSAMPLED, error codes. */
export function cleanRules(track) {
  return RULES.map(([, o]) => {
    const r = val.validateTrack(track, o);
    let kink = false, warn = false, under = false; const codes = new Set();
    for (const v of r.violations) {
      if (KINK_CODES.has(v.code)) kink = true;
      if (v.severity === 'warning') { warn = true; if (v.code === 'UNDERSAMPLED') under = true; } else codes.add(v.code);
    }
    return { kink, notOk: !r.ok, warn, under, codes: [...codes] };
  });
}

// ---------------------------------------------------------------- operators (PROTOCOL 2)
const u32 = str => createHash('sha256').update(str).digest().readUInt32BE(0);
const leftNormal = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l = dm.dhypot(dx, dz) || 1; return { x: -dz / l, z: dx / l }; };
const shift = (pts, base, k, amount) => { const u = leftNormal(base.points[k - 1], base.points[k + 1]); pts[k].x += amount * u.x; pts[k].z += amount * u.z; };
const rebuilt = (base, pts) => ({ params: base.params, points: pts, roadEdges: buildEdges(pts, base.params.width) });
export const PAIRED = { gaps: [2, 3, 4, 5, 6], c: [0.1, 0.25, 0.5, 1], patterns: ['same', 'opposite'] };
export const ZIGZAG = { periods: [2, 4], lengths: [8, 16, 32, 64], c: [0.02, 0.05, 0.1, 0.25, 0.5] };
export const POLY = { n: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], R: [100, 400], width: [20, 40, 80] };
export const DOWNSAMPLE = [2, 4, 8, 16];

export function pairedSpike(base, baseKey, g, c, pattern) {
  const pts = base.points.map(p => ({ ...p })), n = pts.length - 1, w = base.params.width, h = c * w;
  const rng = mulberry32(u32(`${baseKey}|pairedSpike|${g}|${c}|${pattern}`));
  const s1 = rng() < 0.5 ? -1 : 1, i = 8 + Math.floor(rng() * (n - 16 - g)), s2 = pattern === 'same' ? s1 : -s1;
  shift(pts, base, i, s1 * h); shift(pts, base, i + g, s2 * h);
  const window = []; for (let j = i - 1; j <= i + g + 1; j++) window.push(j);
  return { track: rebuilt(base, pts), window, index: i };
}
export function zigzag(base, baseKey, p, L, c) {
  const pts = base.points.map(q => ({ ...q })), n = pts.length - 1, w = base.params.width, pat = p === 2 ? [1, -1] : [1, 0, -1, 0];
  const rng = mulberry32(u32(`${baseKey}|zigzag|${p}|${L}|${c}`));
  const s = rng() < 0.5 ? -1 : 1, i = 8 + Math.floor(rng() * (n - 16 - L));
  for (let k = 0; k < L; k++) if (pat[k % p] !== 0) shift(pts, base, i + k, s * c * w * pat[k % p]);
  const window = []; for (let j = i - 1; j <= i + L; j++) window.push(j);
  return { track: rebuilt(base, pts), window, index: i };
}
export function regularPolygon(n, R, width) {
  const pts = Array.from({ length: n }, (_, k) => ({ x: R * dm.dcos(k / n * 2 * Math.PI), y: 0, z: R * dm.dsin(k / n * 2 * Math.PI) }));
  return asTrack([...pts, { ...pts[0] }], width);
}
export function downsample(base, k) {
  const n = base.points.length - 1, keep = []; for (let j = 0; j < n; j += k) keep.push({ ...base.points[j] });
  const pts = [...keep, { ...keep[0] }];
  return rebuilt(base, pts);
}
/** PROTOCOL 2: S = largest heading change over the window; class must / grey / sub, 'edge' if within 1e-6 of 30. */
export function sizeClass(points, window) {
  const n = points.length - 1; let S = 0;
  for (const j of window) S = Math.max(S, turnAt(points, ((j % n) + n) % n));
  return { S, cls: Math.abs(S - 30) < 1e-6 ? 'edge' : S >= 30 ? 'must' : S >= 15 ? 'grey' : 'sub' };
}
export const allVertices = points => Array.from({ length: points.length - 1 }, (_, i) => i);

/** N4 (default tangent join): Auto straight {0.3,0.6} x curves x width x size x height. */
export function* n4Cases(seed) {
  for (const straight of [0.3, 0.6]) for (const curves of [3, 6, 10]) for (const width of [20, 40, 80]) for (const size of [1, 2, 3]) for (const height of [0, 200])
    yield { key: `${seed}|N4|${curves}|${straight}|${width}|${size}|${height}`, params: { cornerPattern: 'auto', curves, straight, width, size, height, seed } };
}
export function genDefaultJoin(params) { try { return core.generateTrack(params); } catch { return null; } }
