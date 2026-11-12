// E6 shared code: seeds, test sets, defect operators, size oracle, candidate grid, statistics.
// Needs the compiled CLI bundle: `npm run build:cli` (writes cli-dist/, git-ignored). Implements experiments/e6/PROTOCOL.md.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

const DIST = new URL('../../cli-dist/', import.meta.url);
if (!existsSync(new URL('validate.js', DIST))) throw new Error('cli-dist/ missing: run `npm run build:cli` first');
export const core = await import(new URL('core.js', DIST));
export const val = await import(new URL('validate.js', DIST));
export const dm = await import(new URL('detmath.js', DIST));
const { datan2, dhypot, dsin, dcos } = dm;
export const RAD2DEG = 180 / Math.PI, DEG2RAD = Math.PI / 180;

// ---------------------------------------------------------------- seeds
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export { mulberry32 };
const FIXED = [0, 1, 2, 3, 7, 42, 100, 1234, 12345, 65535, 65536, 99999, 1000000, 16777216, 2147483646, 2147483647];
export const SEEDS = (() => {
  const r = mulberry32(20261111), seeds = [...FIXED];
  while (seeds.length < 200) { const v = Math.floor(r() * 2147483648); if (!seeds.includes(v)) seeds.push(v); }
  return seeds;
})();
const sha = s => createHash('sha256').update(s).digest('hex');
if (sha(JSON.stringify(SEEDS)) !== '5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07') throw new Error('seed list differs from PROTOCOL.md');
export const DEV_SEEDS = SEEDS.slice(50, 70), HELD_SEEDS = SEEDS.slice(100, 140), E2_SEEDS = SEEDS.slice(0, 50);

// ---------------------------------------------------------------- modes and generated sets
export const MODES = [
  ['auto', { cornerPattern: 'auto' }],
  ['right-angle', { cornerPattern: 'right-angle', cornerCount: 2, cornerStrength: 60 }],
  ['hairpin', { cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 }],
  ['s-curve', { cornerPattern: 's-curve', cornerCount: 3, cornerStrength: 40 }],
];
// v1.1: pin the v1.0.0 join so committed results reproduce (docs/generator-auto-join.md)
export function gen(params) { try { return core.generateTrack({ ...params, autoJoin: 'legacy' }); } catch (e) { return null; } }

/** Clean negatives N1 (pattern modes) and N2 (Auto, straight 0) of one seed: lazily yields { set, mode, params, key }. */
export function* negativeCases(seed) {
  for (const [mode, over] of MODES) {
    const straights = mode === 'auto' ? [0] : [0, 0.3, 0.6];
    for (const curves of [3, 6, 10]) for (const straight of straights) for (const width of [20, 40, 80])
      for (const size of [1, 2, 3]) for (const height of [0, 200])
        yield { set: mode === 'auto' ? 'N2' : 'N1', mode, key: `${seed}|${mode}|${curves}|${straight}|${width}|${size}|${height}`,
          params: { ...over, curves, straight, width, size, height, seed } };
  }
}
/** Defect bases of one seed (size 2, height 80). */
export function* baseCases(seed) {
  for (const [mode, over] of MODES) {
    const straights = mode === 'auto' ? [0] : [0, 0.3];
    for (const curves of [3, 6, 10]) for (const straight of straights) for (const width of [20, 40, 80])
      yield { mode, curves, straight, width, key: `${seed}|${mode}|${curves}|${straight}|${width}`,
        params: { ...over, curves, straight, width, size: 2, height: 80, seed } };
  }
}
/** Auto with straight > 0 (section 3.3). */
export function* autoStraightCases(seed) {
  for (const straight of [0.3, 0.6]) for (const curves of [3, 6, 10]) for (const width of [20, 40, 80])
    yield { mode: 'auto', key: `${seed}|auto|${curves}|${straight}|${width}`, params: { cornerPattern: 'auto', curves, straight, width, size: 2, height: 80, seed } };
}

// ---------------------------------------------------------------- edges as in core.ts
export function buildEdges(points, width) {
  const n = points.length - 1;
  const normals = points.map((_, i) => {
    const a = points[(i - 1 + n) % n], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z, len = dhypot(dx, dz) || 1;
    return { x: -dz / len, z: dx / len };
  });
  return [-1, 1].map(side => points.map((pt, i) => ({
    x: Math.fround(pt.x + normals[i].x * side * width / 2), y: Math.fround(pt.y), z: Math.fround(pt.z + normals[i].z * side * width / 2) })));
}
export const asTrack = (points, width) => ({ params: { width }, points, roadEdges: buildEdges(points, width) });

// ---------------------------------------------------------------- N3 synthetic set
export function synthetic() {
  const out = [], W = [20, 40, 80];
  const closed = pts => [...pts, { ...pts[0] }];
  const P = (x, z) => ({ x, y: 0, z });
  for (const R of [100, 400]) for (const n of [12, 24, 48, 96, 192, 384]) for (const w of W)
    out.push({ key: `circle|${R}|${n}|${w}`, track: asTrack(closed(Array.from({ length: n }, (_, i) => P(R * dcos(i / n * 2 * Math.PI), R * dsin(i / n * 2 * Math.PI)))), w) });
  for (const n of [24, 48, 96, 192, 384]) for (const w of W)
    out.push({ key: `ellipse|${n}|${w}`, track: asTrack(closed(Array.from({ length: n }, (_, i) => P(600 * dcos(i / n * 2 * Math.PI), 300 * dsin(i / n * 2 * Math.PI)))), w) });
  for (const deltaDeg of [5, 10, 15]) for (const w of W) {
    const R = 150, a = 180 / deltaDeg, m = Math.round(400 / (R * deltaDeg * DEG2RAD)), pts = [];
    for (let k = 0; k < m; k++) pts.push(P(-200 + 400 * k / m, -R));
    for (let j = 0; j < a; j++) { const t = (-90 + 180 * j / a) * DEG2RAD; pts.push(P(200 + R * dcos(t), R * dsin(t))); }
    for (let k = 0; k < m; k++) pts.push(P(200 - 400 * k / m, R));
    for (let j = 0; j < a; j++) { const t = (90 + 180 * j / a) * DEG2RAD; pts.push(P(-200 + R * dcos(t), R * dsin(t))); }
    out.push({ key: `stadium|${deltaDeg}|${w}`, track: asTrack(closed(pts), w) });
  }
  if (out.length !== 60) throw new Error('N3 must have 60 tracks');
  return out;
}

// ---------------------------------------------------------------- defect operators (PROTOCOL 3.2)
export const OPERATORS = {
  seamSpike: [1, 2, 4, 8, 16], interiorSpike: [1, 2, 4, 8, 16], corner: [20, 30, 45, 60, 90], tangent: [10, 20, 45], heightStep: [1, 2, 5, 10],
};
export const PLANAR_OPS = ['seamSpike', 'interiorSpike', 'corner', 'tangent'];
const K_CORNER = 4, M_TANGENT = 8;
const u32 = str => createHash('sha256').update(str).digest().readUInt32BE(0);
const leftNormal = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l = dhypot(dx, dz) || 1; return { x: -dz / l, z: dx / l }; };

/** Defective copy of `base` (a Track): { track, window, meta } or null if the base is too short. */
export function applyDefect(base, baseKey, op, level) {
  const pts = base.points.map(p => ({ ...p })), n = pts.length - 1, width = base.params.width;
  const rng = mulberry32(u32(`${baseKey}|${op}|${level}`));
  const s = rng() < 0.5 ? -1 : 1;
  const i = 8 + Math.floor(rng() * (n - 16));
  let window, meta = {};
  if (op === 'seamSpike') {
    const u = leftNormal(pts[n - 1], pts[1]);
    for (const j of [0, n]) { pts[j].x += s * level * u.x; pts[j].z += s * level * u.z; }
    window = [n - 1, 0, 1]; meta = { lateralOverHalfWidth: level / (width / 2) };
  } else if (op === 'interiorSpike') {
    const u = leftNormal(base.points[i - 1], base.points[i + 1]);
    pts[i].x += s * level * u.x; pts[i].z += s * level * u.z;
    window = [i - 1, i, i + 1]; meta = { index: i, lateralOverHalfWidth: level / (width / 2) };
  } else if (op === 'corner') {
    const A = base.points[i - K_CORNER], B = base.points[i + K_CORNER], L = dhypot(B.x - A.x, B.z - A.z);
    const v = leftNormal(A, B), h = (L / 2) * (dsin(level * DEG2RAD / 2) / dcos(level * DEG2RAD / 2));
    const P = { x: (A.x + B.x) / 2 + s * h * v.x, z: (A.z + B.z) / 2 + s * h * v.z };
    pts[i].x = P.x; pts[i].z = P.z;
    for (let j = 1; j < K_CORNER; j++) {
      pts[i - K_CORNER + j].x = A.x + (j / K_CORNER) * (P.x - A.x); pts[i - K_CORNER + j].z = A.z + (j / K_CORNER) * (P.z - A.z);
      pts[i + j].x = P.x + (j / K_CORNER) * (B.x - P.x); pts[i + j].z = P.z + (j / K_CORNER) * (B.z - P.z);
    }
    window = []; for (let j = i - K_CORNER; j <= i + K_CORNER; j++) window.push(j); meta = { index: i };
  } else if (op === 'tangent') {
    const c = dcos(s * level * DEG2RAD), sn = dsin(s * level * DEG2RAD), o = base.points[0];
    for (let j = 1; j <= M_TANGENT; j++) {
      const dx = base.points[j].x - o.x, dz = base.points[j].z - o.z;
      pts[j].x = o.x + c * dx - sn * dz; pts[j].z = o.z + sn * dx + c * dz;
    }
    window = [n - 1, 0, 1, M_TANGENT - 1, M_TANGENT, M_TANGENT + 1];
  } else if (op === 'heightStep') {
    pts[i].y += level; window = [i - 1, i, i + 1]; meta = { index: i };
  } else throw new Error('operator ' + op);
  const track = { params: base.params, points: pts, roadEdges: buildEdges(pts, width) };
  return { track, window, meta: { ...meta, sign: s } };
}
/** Independent heading change (deg, unsigned) at closed-loop vertex i. */
export function turnAt(points, i) {
  const n = points.length - 1, a = points[(i - 1 + n) % n], b = points[i], c = points[(i + 1) % n];
  const ax = b.x - a.x, az = b.z - a.z, bx = c.x - b.x, bz = c.z - b.z;
  return Math.abs(datan2(ax * bz - az * bx, ax * bx + az * bz)) * RAD2DEG;
}
/** PROTOCOL 4: S = largest heading change over the window; class must / grey / sub. */
export function sizeOf(points, window) {
  const n = points.length - 1;
  let S = 0; for (const j of window) S = Math.max(S, turnAt(points, ((j % n) + n) % n));
  return { S, cls: S >= 30 ? 'must' : S >= 15 ? 'grey' : 'sub' };
}

// ---------------------------------------------------------------- candidates (PROTOCOL 5)
const range = a => a;
export function candidates() {
  const out = [], D = val.DEFAULT_VALIDATE_OPTIONS;
  const full = o => { const k = {}; for (const key of ['kinkRule', 'kinkTurnDegrees', 'kinkCurvature', 'kinkWindow', 'kinkQuantile', 'kinkRatio', 'kinkFloorDegrees', 'kinkSpikeSpacing', 'kinkSpikeHalfWidth']) k[key] = o[key] ?? D[key]; return k; };
  const add = (family, label, opts) => out.push({ id: out.length, family, label, opts: full(opts), parts: val.kinkParts(opts.kinkRule) });
  for (const T of [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 35, 40]) add('A1', `turn T=${T}`, { kinkRule: 'turn', kinkTurnDegrees: T });
  for (const c of [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8]) add('A2', `curvature c=${c}`, { kinkRule: 'curvature', kinkCurvature: c });
  const Bs = [];
  for (const K of [3, 5]) for (const q of [0.5, 1]) for (const r of [2, 3, 4]) for (const F of [8, 10, 12, 15, 20, 25, 30]) Bs.push({ kinkWindow: K, kinkQuantile: q, kinkRatio: r, kinkFloorDegrees: F });
  const bl = b => `K=${b.kinkWindow} q=${b.kinkQuantile} r=${b.kinkRatio} F=${b.kinkFloorDegrees}`;
  for (const b of Bs) add('B', `outlier ${bl(b)}`, { kinkRule: 'outlier', ...b });
  for (const ts of [0.1, 0.2, 0.3, 0.5]) for (const tw of [0.05, 0.1, 0.25, 0.5]) add('C', `spike ts=${ts} tw=${tw}`, { kinkRule: 'spike', kinkSpikeSpacing: ts, kinkSpikeHalfWidth: tw });
  for (const b of Bs) for (const c of [0.5, 1, 2]) add('B+A2', `outlier ${bl(b)} + curvature c=${c}`, { kinkRule: 'outlier+curvature', ...b, kinkCurvature: c });
  for (const b of Bs) for (const [ts, tw] of [[0.2, 0.1], [0.2, 0.25], [0.5, 0.1], [0.5, 0.25]]) add('B+C', `outlier ${bl(b)} + spike ts=${ts} tw=${tw}`, { kinkRule: 'outlier+spike', ...b, kinkSpikeSpacing: ts, kinkSpikeHalfWidth: tw });
  if (out.length !== 711) throw new Error('expected 711 candidates, got ' + out.length);
  return out;
}
export const FAMILY_ORDER = ['A1', 'A2', 'C', 'B', 'B+A2', 'B+C'];

// ---------------------------------------------------------------- statistics
const Z = 1.959964;
export function wilson(k, n) {
  if (n === 0) return { k, n, p: null, lo: null, hi: null };
  const p = k / n, d = 1 + Z * Z / n, c = (p + Z * Z / (2 * n)) / d, h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d;
  return { k, n, p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}
export const r6 = x => (x === null || x === undefined) ? x : Number(x.toPrecision(6));
export function sha256hex(s) { return sha(s); }
