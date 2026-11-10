// Shared by the E4 baselines: spline evaluation, arc-length resampling and the track object
// (normals, road edges, bounds) built exactly as src/core.ts generateTrack does.
import { dhypot } from '../../../src/detmath.js';
import { CURB, SIDEWALK, catmull, elevation, sanitize, type Params, type Point } from '../../../src/core.js';

export interface P2 { x: number; z: number }
export interface BaselineTrack {
  params: Params; points: Point[]; normals: { x: number; z: number }[]; roadEdges: [Point[], Point[]];
  straightSegments: boolean[]; length: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  props: never[]; obstacles: never[];
}
export class BaselineError extends Error { constructor(msg: string) { super(msg); this.name = 'BaselineError'; } }
export const DENSE = 100; // parameter samples per spline segment before arc-length resampling

/** Closed uniform Catmull-Rom (the `catmull` basis of src/core.ts) through control vertices; dense polyline, no duplicate end. */
export function uniformSpline(v: P2[]): P2[] {
  const n = v.length, out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const [a, b, c, d] = [-1, 0, 1, 2].map(k => v[(i + k + n) % n]);
    for (let s = 0; s < DENSE; s++) {
      const t = s / DENSE;
      out.push({ x: catmull(a.x, b.x, c.x, d.x, t), z: catmull(a.z, b.z, c.z, d.z, t) });
    }
  }
  return out;
}

/** Closed centripetal (alpha = 0.5) Catmull-Rom, Barry-Goldman pyramid form; dense polyline, no duplicate end. */
export function centripetalSpline(v: P2[]): P2[] {
  const n = v.length, out: P2[] = [];
  const knot = (a: P2, b: P2) => Math.max(Math.sqrt(dhypot(b.x - a.x, b.z - a.z)), 1e-6);
  const mix = (a: P2, b: P2, wa: number, wb: number): P2 => ({ x: wa * a.x + wb * b.x, z: wa * a.z + wb * b.z });
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [-1, 0, 1, 2].map(k => v[(i + k + n) % n]);
    const t0 = 0, t1 = t0 + knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
    for (let s = 0; s < DENSE; s++) {
      const t = t1 + (t2 - t1) * s / DENSE;
      const a1 = mix(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
      const a2 = mix(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
      const a3 = mix(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));
      const b1 = mix(a1, a2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
      const b2 = mix(a2, a3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));
      out.push(mix(b1, b2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)));
    }
  }
  return out;
}

/** Equal arc-length resampling of the closed dense polyline to N = max(8, round(L / spacing)) distinct points. */
export function resample(dense: P2[], spacing: number): P2[] {
  const m = dense.length, cum = [0];
  for (let i = 0; i < m; i++) { const a = dense[i], b = dense[(i + 1) % m]; cum.push(cum[i] + dhypot(b.x - a.x, b.z - a.z)); }
  const L = cum[m], N = Math.max(8, Math.round(L / spacing)), out: P2[] = [];
  let seg = 0;
  for (let k = 0; k < N; k++) {
    const s = k * L / N;
    while (seg < m - 1 && cum[seg + 1] <= s) seg++;
    const a = dense[seg], b = dense[(seg + 1) % m], len = cum[seg + 1] - cum[seg], f = len > 0 ? (s - cum[seg]) / len : 0;
    out.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f });
  }
  return out;
}

/** Builds the validator/metrics input exactly like src/core.ts (normals, float32 edges, bounds, length). */
export function finishTrack(resampled: P2[], controlCount: number, width: number, height: number, seed: number): BaselineTrack {
  const p = sanitize({ width, height, seed });
  const N = resampled.length;
  const points: Point[] = resampled.map((q, k) => ({ x: q.x, z: q.z, y: elevation(k / N, p) }));
  points.push({ ...points[0] }); // closed: duplicated last point
  const n = points.length - 1;
  const normals = points.map((_, i) => {
    const a = points[(i - 1 + n) % n], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z, len = dhypot(dx, dz) || 1;
    return { x: -dz / len, z: dx / len };
  });
  const margin = p.width / 2 + CURB + SIDEWALK;
  let length = 0;
  for (let i = 0; i < n; i++) length += dhypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y, points[i + 1].z - points[i].z);
  return {
    params: p, points, normals, straightSegments: Array<boolean>(controlCount).fill(false), length,
    roadEdges: [-1, 1].map(side => points.map((pt, i) => ({
      x: Math.fround(pt.x + normals[i].x * side * p.width / 2), y: Math.fround(pt.y), z: Math.fround(pt.z + normals[i].z * side * p.width / 2),
    }))) as [Point[], Point[]],
    bounds: {
      minX: Math.min(...points.map(v => v.x)) - margin, maxX: Math.max(...points.map(v => v.x)) + margin,
      minZ: Math.min(...points.map(v => v.z)) - margin, maxZ: Math.max(...points.map(v => v.z)) + margin,
      minY: Math.min(...points.map(v => v.y)), maxY: Math.max(...points.map(v => v.y)),
    },
    props: [], obstacles: [],
  };
}

export interface BaselineParams { curves: number; width: number; size: number; height: number; seed: number; spacing?: number }
export const radiusOf = (size: number) => 300 + size * 60; // R of src/core.ts generateTrack
