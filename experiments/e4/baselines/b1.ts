// B1: convex hull of random points + one midpoint-displacement pass + centripetal Catmull-Rom (PROTOCOL.md).
import { random } from '../../../src/core.js';
import { dhypot } from '../../../src/detmath.js';
import { BaselineError, centripetalSpline, finishTrack, radiusOf, resample, type BaselineParams, type BaselineTrack, type P2 } from './common.js';

const cross = (o: P2, a: P2, b: P2) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

/** Andrew monotone chain; counter-clockwise (positive x/z cross), strictly convex. */
export function convexHull(pts: P2[]): P2[] {
  const s = [...pts].sort((a, b) => a.x - b.x || a.z - b.z);
  const lower: P2[] = [], upper: P2[] = [];
  for (const p of s) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...s].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

export function generateB1(prm: BaselineParams): BaselineTrack {
  const rng = random(prm.seed ^ 0x0b1ca001), R = radiusOf(prm.size);
  const pts: P2[] = [];
  for (let i = 0; i < 4 * prm.curves; i++) { const x = (rng() * 2 - 1) * R, z = (rng() * 2 - 1) * R; pts.push({ x, z }); }
  const hull = convexHull(pts);
  if (hull.length < 3) throw new BaselineError('convex hull has fewer than 3 vertices');
  const verts: P2[] = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], len = dhypot(b.x - a.x, b.z - a.z) || 1;
    const d = (rng() * 2 - 1) * 0.25 * len;
    verts.push(a, { x: (a.x + b.x) / 2 + (-(b.z - a.z) / len) * d, z: (a.z + b.z) / 2 + ((b.x - a.x) / len) * d });
  }
  return finishTrack(resample(centripetalSpline(verts), prm.spacing ?? 8), verts.length, prm.width, prm.height, prm.seed);
}
