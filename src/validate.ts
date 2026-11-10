// Headless track validator: pure, DOM-free, deterministic.
//
// Works on every generation mode (including Auto, which runs no geometry audit
// at generation time) and REPORTS problems instead of repairing or hiding them.
// Intersection tests are planar (x/z): a grade-separated crossing is reported
// too. Uses only + - * /, Math.sqrt/abs/min/max/floor/ceil and src/detmath.ts.
import { datan2, dhypot } from './detmath.js';
import { curvatureSamples } from './metrics.js';
import type { Params, Point } from './core.js';

/** What the validator needs; core.Track and schema.ImportedTrack both satisfy it. */
export interface ValidatableTrack {
  params: Pick<Params, 'width'>;
  points: Point[];
  roadEdges: [Point[], Point[]];
}

export type Severity = 'error' | 'warning';
export interface Violation {
  code: string; severity: Severity; message: string;
  /** Sample (or segment) index the violation refers to. */
  index?: number;
  /** Measured value; for intersections the index of the other segment. */
  value?: number;
  /** The limit that `value` was compared with, when there is one. */
  limit?: number;
}
export interface CheckSummary {
  id: 'structure' | 'finite' | 'closure' | 'self-intersection' | 'edge-fold' | 'min-turn-radius' | 'max-slope';
  /** Severity carried by this check's violations. */
  severity: Severity;
  /** True when the check ran and found nothing. */
  passed: boolean;
  /** True when the check could not run (non-finite data or broken structure); then passed is false. */
  skipped: boolean;
  /** Items examined (points, segments or vertices, see the README table). */
  checked: number;
  /** Total number of failing items (not capped by maxViolationsPerCheck). */
  failures: number;
  /** Observed extremes / sub-counts, e.g. { minRadius, maxAbsSlope, centerline, leftEdge }. */
  stats: Record<string, number>;
}
export interface ValidationResult { ok: boolean; violations: Violation[]; checks: CheckSummary[] }

export interface ValidateOptions {
  /** Max 3D distance between first and last point (and between edge ends). Default 1e-6. */
  closureTolerance?: number;
  /** Max |y_first - y_last|. Default 1e-6. */
  heightTolerance?: number;
  /**
   * Absolute floor (degrees, x/z plane) of the seam-tangent test. Default 5. In mode 'ratio' (default) the seam
   * fails only if its turn also exceeds seamRatio x the largest per-vertex turn within seamWindow vertices of it.
   */
  tangentToleranceDegrees?: number;
  /** Seam-continuity outlier factor of closureTangentMode 'ratio'. Default 2. */
  seamRatio?: number;
  /**
   * 'ratio' (default since 0.5.1): CLOSURE_TANGENT iff theta0 > max(tangentToleranceDegrees, seamRatio x max neighbourhood turn).
   * 'absolute' (0.5.0 behaviour): iff theta0 > tangentToleranceDegrees. Library option only (the CLI --limit takes numbers).
   */
  closureTangentMode?: 'ratio' | 'absolute';
  /** A ribbon triangle whose x/z cross product is <= this (units^2) counts as flipped or degenerate. Default 1e-5. */
  foldEpsilon?: number;
  /** Warn when the local radius 1/|kappa| < factor * (width / 2). Default 1. */
  minRadiusToHalfWidth?: number;
  /** Warn when |dy| / planar run of a segment exceeds this (rise over run; 0.3 is about 16.7 degrees). Default 0.3. */
  maxSlope?: number;
  /** At most this many violations are listed per check (counts in `checks` are complete). Default 20. */
  maxViolationsPerCheck?: number;
}
export const DEFAULT_VALIDATE_OPTIONS: Required<ValidateOptions> = {
  closureTolerance: 1e-6, heightTolerance: 1e-6, tangentToleranceDegrees: 5, seamRatio: 2, closureTangentMode: 'ratio', foldEpsilon: 1e-5,
  minRadiusToHalfWidth: 1, maxSlope: 0.3, maxViolationsPerCheck: 20,
};

const RAD_TO_DEG = 180 / Math.PI;
/** Vertices on each side of the seam whose turns form the neighbourhood of the 'ratio' seam test. */
const SEAM_WINDOW = 3;
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

interface Segment { a: Point; b: Point; ring: number; index: number; minX: number; maxX: number; minZ: number; maxZ: number }
function intersects(s: Segment, t: Segment): boolean {
  if (s.maxX < t.minX || t.maxX < s.minX || s.maxZ < t.minZ || t.maxZ < s.minZ) return false;
  return cross(s.a, s.b, t.a) * cross(s.a, s.b, t.b) <= 0 && cross(t.a, t.b, s.a) * cross(t.a, t.b, s.b) <= 0;
}

const MAX_CELLS_PER_SEGMENT = 1024;
/**
 * Every pair of the closed contours' segments that intersects, found with a
 * uniform spatial hash (segments spanning more than MAX_CELLS_PER_SEGMENT cells
 * go to a brute-force list). Pairs within one contour that share a vertex are
 * skipped. `wanted(ringA, ringB)` filters which contour pairs are compared.
 */
function scanIntersections(rings: Point[][], n: number, cell: number,
  wanted: (a: number, b: number) => boolean, hit: (a: Segment, b: Segment) => void): void {
  const segments: Segment[] = [], grid = new Map<string, number[]>(), big: number[] = [];
  const stamp = new Int32Array(rings.length * n);
  for (const [ring, contour] of rings.entries()) for (let i = 0; i < n; i++) {
    const a = contour[i], b = contour[i + 1];
    const s: Segment = { a, b, ring, index: i, minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
      minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) };
    const x0 = Math.floor(s.minX / cell), x1 = Math.floor(s.maxX / cell);
    const z0 = Math.floor(s.minZ / cell), z1 = Math.floor(s.maxZ / cell);
    const isBig = (x1 - x0 + 1) * (z1 - z0 + 1) > MAX_CELLS_PER_SEGMENT;
    const id = segments.length, mark = id + 1;
    const test = (otherId: number) => {
      if (stamp[otherId] === mark) return;
      stamp[otherId] = mark;
      const o = segments[otherId];
      if (!wanted(o.ring, ring)) return;
      if (o.ring === ring) { const gap = Math.abs(o.index - i); if (gap <= 1 || gap === n - 1) return; }
      if (intersects(s, o)) hit(o, s);
    };
    if (isBig) for (let k = 0; k < id; k++) test(k);
    else {
      for (const k of big) test(k);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (const k of grid.get(`${x},${z}`) ?? []) test(k);
    }
    segments.push(s);
    if (isBig) big.push(id);
    else for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const key = `${x},${z}`, list = grid.get(key);
      if (list) list.push(id); else grid.set(key, [id]);
    }
  }
}

export function validateTrack(track: ValidatableTrack, options: ValidateOptions = {}): ValidationResult {
  const o = { ...DEFAULT_VALIDATE_OPTIONS, ...options };
  const violations: Violation[] = [], checks: CheckSummary[] = [];
  const cap = o.maxViolationsPerCheck;
  const emitted = new Map<string, number>();
  const add = (v: Violation) => {
    const key = v.code, c = emitted.get(key) ?? 0;
    emitted.set(key, c + 1);
    if (c < cap) violations.push(v);
  };
  const record = (c: Omit<CheckSummary, 'passed' | 'skipped'> & { skipped?: boolean }) =>
    checks.push({ ...c, skipped: c.skipped ?? false, passed: !c.skipped && c.failures === 0 });

  const pts = track.points, n = pts.length - 1, width = track.params.width;
  const edges = track.roadEdges;
  const structureProblems: string[] = [];
  if (!Array.isArray(pts) || pts.length < 4) structureProblems.push(`a closed track needs at least 4 points, got ${Array.isArray(pts) ? pts.length : 'none'}`);
  else if (!Array.isArray(edges) || edges.length !== 2 || edges[0].length !== pts.length || edges[1].length !== pts.length)
    structureProblems.push('roadEdges must be two arrays with one entry per centerline point');
  if (structureProblems.length) {
    for (const message of structureProblems) add({ code: 'STRUCTURE', severity: 'error', message });
    record({ id: 'structure', severity: 'error', skipped: false, checked: 1, failures: structureProblems.length, stats: {} });
    for (const [id, severity] of [['finite', 'error'], ['closure', 'error'], ['self-intersection', 'error'],
      ['edge-fold', 'error'], ['min-turn-radius', 'warning'], ['max-slope', 'warning']] as const)
      record({ id, severity, skipped: true, checked: 0, failures: 0, stats: {} });
    return { ok: false, violations, checks };
  }
  record({ id: 'structure', severity: 'error', checked: 1, failures: 0, stats: {} });

  // 2. finite -------------------------------------------------------------
  let nonFinite = 0, checkedValues = 0;
  const scanFinite = (list: Point[], label: string) => list.forEach((p, i) => {
    checkedValues++;
    if (!(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))) {
      nonFinite++;
      add({ code: 'NON_FINITE', severity: 'error', index: i, message: `${label}[${i}] has a non-finite coordinate` });
    }
  });
  scanFinite(pts, 'points'); scanFinite(edges[0], 'roadEdges[0]'); scanFinite(edges[1], 'roadEdges[1]');
  if (!Number.isFinite(width) || width <= 0) {
    nonFinite++;
    add({ code: 'NON_FINITE', severity: 'error', message: `params.width must be a positive finite number, got ${width}`, value: width });
  }
  record({ id: 'finite', severity: 'error', checked: checkedValues, failures: nonFinite, stats: {} });
  const finite = nonFinite === 0;

  // 1. closure ------------------------------------------------------------
  if (!finite) record({ id: 'closure', severity: 'error', skipped: true, checked: 0, failures: 0, stats: {} });
  else {
    let failures = 0;
    const gap = dhypot(pts[n].x - pts[0].x, pts[n].y - pts[0].y, pts[n].z - pts[0].z);
    const edgeGap = Math.max(...edges.map(e => dhypot(e[n].x - e[0].x, e[n].y - e[0].y, e[n].z - e[0].z)));
    const heightGap = Math.abs(pts[n].y - pts[0].y);
    const ux = pts[n].x - pts[n - 1].x, uz = pts[n].z - pts[n - 1].z, vx = pts[1].x - pts[0].x, vz = pts[1].z - pts[0].z;
    const tangent = Math.abs(datan2(ux * vz - uz * vx, ux * vx + uz * vz)) * RAD_TO_DEG;
    // per-vertex heading change (degrees) at vertex i of the closed loop of n distinct vertices
    const turnAt = (i: number) => {
      const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
      const ax = b.x - a.x, az = b.z - a.z, bx = c.x - b.x, bz = c.z - b.z;
      return Math.abs(datan2(ax * bz - az * bx, ax * bx + az * bz)) * RAD_TO_DEG;
    };
    const near = new Set<number>();
    for (let k = 1; k <= SEAM_WINDOW; k++) { near.add((n - k) % n); near.add(k % n); }
    near.delete(0);
    let neighbourhood = 0;
    for (const i of near) neighbourhood = Math.max(neighbourhood, turnAt(i));
    const tangentLimit = o.closureTangentMode === 'absolute' ? o.tangentToleranceDegrees
      : Math.max(o.tangentToleranceDegrees, o.seamRatio * neighbourhood);
    if (gap > o.closureTolerance) { failures++; add({ code: 'CLOSURE_POSITION', severity: 'error', index: n, value: gap, limit: o.closureTolerance,
      message: `last point is ${gap} units from the first point (limit ${o.closureTolerance})` }); }
    if (edgeGap > o.closureTolerance) { failures++; add({ code: 'CLOSURE_EDGE', severity: 'error', index: n, value: edgeGap, limit: o.closureTolerance,
      message: `a road edge's last point is ${edgeGap} units from its first point (limit ${o.closureTolerance})` }); }
    if (heightGap > o.heightTolerance) { failures++; add({ code: 'CLOSURE_HEIGHT', severity: 'error', index: n, value: heightGap, limit: o.heightTolerance,
      message: `height differs by ${heightGap} across the seam (limit ${o.heightTolerance})` }); }
    if (tangent > tangentLimit) { failures++; add({ code: 'CLOSURE_TANGENT', severity: 'error', index: 0, value: tangent, limit: tangentLimit,
      message: `heading changes by ${tangent} degrees across the seam (limit ${tangentLimit}; neighbourhood maximum ${neighbourhood} degrees, mode ${o.closureTangentMode})` }); }
    record({ id: 'closure', severity: 'error', checked: 4, failures,
      stats: { positionGap: gap, edgeGap, heightGap, tangentDegrees: tangent, neighbourhoodMaxDegrees: neighbourhood,
        ...(neighbourhood > 0 ? { tangentRatio: tangent / neighbourhood } : {}) } });
  }

  // 3. self-intersection (centerline, each edge, edge vs edge) -------------
  if (!finite) record({ id: 'self-intersection', severity: 'error', skipped: true, checked: 0, failures: 0, stats: {} });
  else {
    const counts = { centerline: 0, leftEdge: 0, rightEdge: 0, edgeToEdge: 0 };
    const cell = Math.max(64, width * 2);
    scanIntersections([pts, edges[0], edges[1]], n, cell,
      (a, b) => a === b || (a !== 0 && b !== 0),
      (p, q) => {
        const same = p.ring === q.ring;
        const [code, key, what] = !same ? ['EDGE_EDGE_INTERSECTION', 'edgeToEdge', 'left and right road edges']
          : p.ring === 0 ? ['SELF_INTERSECTION_CENTERLINE', 'centerline', 'the centerline']
          : p.ring === 1 ? ['SELF_INTERSECTION_EDGE', 'leftEdge', 'the left road edge (roadEdges[0])']
          : ['SELF_INTERSECTION_EDGE', 'rightEdge', 'the right road edge (roadEdges[1])'];
        counts[key as keyof typeof counts]++;
        const [lo, hi] = p.ring <= q.ring ? [p, q] : [q, p];
        add({ code, severity: 'error', index: lo.index, value: hi.index,
          message: `segments ${lo.index} and ${hi.index} of ${what} intersect (planar x/z test)` });
      });
    const failures = counts.centerline + counts.leftEdge + counts.rightEdge + counts.edgeToEdge;
    record({ id: 'self-intersection', severity: 'error', checked: 3 * n, failures, stats: { ...counts } });
  }

  // 4. edge fold (ribbon triangle orientation, same triangles as the asphalt mesh)
  if (!finite) record({ id: 'edge-fold', severity: 'error', skipped: true, checked: 0, failures: 0, stats: {} });
  else {
    let failures = 0, flipped = 0;
    const [l, r] = edges;
    for (let i = 0; i < n; i++) {
      const c1 = cross(l[i], l[i + 1], r[i]), c2 = cross(r[i], l[i + 1], r[i + 1]);
      const bad = (c1 <= o.foldEpsilon ? 1 : 0) + (c2 <= o.foldEpsilon ? 1 : 0);
      if (bad) {
        failures++; flipped += bad;
        add({ code: 'EDGE_FOLD', severity: 'error', index: i, value: Math.min(c1, c2), limit: o.foldEpsilon,
          message: `road ribbon segment ${i} has ${bad} flipped or degenerate triangle(s) (min signed area x2 = ${Math.min(c1, c2)})` });
      }
    }
    record({ id: 'edge-fold', severity: 'error', checked: n, failures, stats: { flippedTriangles: flipped } });
  }

  // 5. minimum turning radius vs half width (warning) ------------------------
  if (!finite) record({ id: 'min-turn-radius', severity: 'warning', skipped: true, checked: 0, failures: 0, stats: {} });
  else {
    const limit = o.minRadiusToHalfWidth * width / 2;
    let failures = 0, minRadius = Infinity;
    curvatureSamples(pts).forEach((k, i) => {
      if (k === 0) return;
      const radius = 1 / Math.abs(k);
      minRadius = Math.min(minRadius, radius);
      if (radius < limit) {
        failures++;
        add({ code: 'MIN_TURN_RADIUS', severity: 'warning', index: i, value: radius, limit,
          message: `local radius ${radius} at sample ${i} is below ${limit} (${o.minRadiusToHalfWidth} x half width)` });
      }
    });
    record({ id: 'min-turn-radius', severity: 'warning', checked: n, failures,
      stats: Number.isFinite(minRadius) ? { minRadius, limit } : { limit } });
  }

  // 6. maximum longitudinal slope (warning) ---------------------------------
  if (!finite) record({ id: 'max-slope', severity: 'warning', skipped: true, checked: 0, failures: 0, stats: {} });
  else {
    let failures = 0, maxAbsSlope = 0;
    for (let i = 0; i < n; i++) {
      const run = dhypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      if (!(run > 0)) continue;
      const slope = Math.abs(pts[i + 1].y - pts[i].y) / run;
      maxAbsSlope = Math.max(maxAbsSlope, slope);
      if (slope > o.maxSlope) {
        failures++;
        add({ code: 'MAX_SLOPE', severity: 'warning', index: i, value: slope, limit: o.maxSlope,
          message: `slope ${slope} of segment ${i} exceeds ${o.maxSlope}` });
      }
    }
    record({ id: 'max-slope', severity: 'warning', checked: n, failures, stats: { maxAbsSlope, limit: o.maxSlope } });
  }

  return { ok: checks.every(c => c.severity !== 'error' || c.passed), violations, checks };
}
