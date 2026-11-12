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
  id: 'structure' | 'finite' | 'closure' | 'local-kink' | 'self-intersection' | 'edge-fold' | 'min-turn-radius' | 'max-slope';
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
   * 'kink' (default since the E6 amendment): CLOSURE_TANGENT iff the seam vertex is flagged by the local-kink rule
   * (`kinkRule` and its parameters), the same rule that LOCAL_KINK applies to every other vertex.
   * 'ratio' (0.5.1 behaviour): CLOSURE_TANGENT iff theta0 > max(tangentToleranceDegrees, seamRatio x max neighbourhood turn);
   * 'absolute' (0.5.0 behaviour): iff theta0 > tangentToleranceDegrees. The two legacy modes run no LOCAL_KINK check
   * and reproduce the earlier results exactly. Library option only (the CLI --limit takes numbers).
   */
  closureTangentMode?: 'kink' | 'ratio' | 'absolute';
  /**
   * Local-kink rule of mode 'kink': 'turn' | 'curvature' | 'outlier' | 'spike', or an AND-combination joined by '+'
   * (for example 'outlier+curvature'): a vertex is flagged only if every listed rule flags it.
   */
  kinkRule?: string;
  /** Rule 'turn': flag a vertex whose heading change (degrees, x/z) exceeds this. */
  kinkTurnDegrees?: number;
  /** Rule 'curvature': flag if (heading change in radians / mean adjacent segment length) x (width / 2) exceeds this (1 = local radius equals half width). */
  kinkCurvature?: number;
  /** Rule 'outlier': the reference is a quantile of the turns at vertices i +- 2 .. i +- kinkWindow (i +- 1 are excluded because a single-vertex spike bends them too). */
  kinkWindow?: number;
  /** Rule 'outlier': quantile of the reference turns, in (0, 1]; 0.5 is the (lower) median, 1 the maximum. */
  kinkQuantile?: number;
  /** Rule 'outlier': flag if turn > max(kinkFloorDegrees, kinkRatio x reference). */
  kinkRatio?: number;
  /** Rule 'outlier': absolute floor in degrees. */
  kinkFloorDegrees?: number;
  /** Rule 'spike': flag if the deviation of the vertex from the chord of its two neighbours exceeds this fraction of the mean adjacent segment length ... */
  kinkSpikeSpacing?: number;
  /** ... AND exceeds this fraction of the road half width. */
  kinkSpikeHalfWidth?: number;
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
  closureTolerance: 1e-6, heightTolerance: 1e-6, tangentToleranceDegrees: 5, seamRatio: 2, closureTangentMode: 'kink', foldEpsilon: 1e-5,
  // kink* defaults = the rule frozen on DEV in experiments/e6 (results/dev/FROZEN.json): rule 'outlier', window 3, maximum, ratio 3, floor 12 degrees.
  // kinkTurnDegrees, kinkCurvature, kinkSpike* belong to the other candidate rules and are inert under the default kinkRule.
  kinkRule: 'outlier', kinkTurnDegrees: 20, kinkCurvature: 1, kinkWindow: 3, kinkQuantile: 1, kinkRatio: 3, kinkFloorDegrees: 12,
  kinkSpikeSpacing: 0.2, kinkSpikeHalfWidth: 0.1,
  minRadiusToHalfWidth: 1, maxSlope: 0.3, maxViolationsPerCheck: 20,
};

const RAD_TO_DEG = 180 / Math.PI;
/** Vertices on each side of the seam whose turns form the neighbourhood of the 'ratio' seam test. */
const SEAM_WINDOW = 3;

/** Per-vertex measures of the closed loop of n = points.length - 1 distinct vertices (x/z plane). */
export interface KinkProfile {
  n: number; halfWidth: number;
  /** Heading change at vertex i, degrees, >= 0 (0 where an adjacent segment has zero length). */
  theta: Float64Array;
  /** Mean length of the two segments adjacent to vertex i. */
  spacing: Float64Array;
  /** Distance of vertex i from the chord joining its two neighbours (distance to the neighbour if the chord has zero length). */
  dev: Float64Array;
  /** Memo of outlier references by window and quantile. */
  refs: Map<string, Float64Array>;
}
export function kinkProfile(points: Point[], width: number): KinkProfile {
  const n = points.length - 1;
  const theta = new Float64Array(n), spacing = new Float64Array(n), dev = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n], b = points[i], c = points[(i + 1) % n];
    const ax = b.x - a.x, az = b.z - a.z, bx = c.x - b.x, bz = c.z - b.z;
    const l1 = dhypot(ax, az), l2 = dhypot(bx, bz), chord = dhypot(c.x - a.x, c.z - a.z);
    spacing[i] = (l1 + l2) / 2;
    theta[i] = l1 > 0 && l2 > 0 ? Math.abs(datan2(ax * bz - az * bx, ax * bx + az * bz)) * RAD_TO_DEG : 0;
    dev[i] = chord > 0 ? Math.abs(ax * (c.z - a.z) - az * (c.x - a.x)) / chord : l1;
  }
  return { n, halfWidth: width / 2, theta, spacing, dev, refs: new Map() };
}
/** Reference turn of the 'outlier' rule at every vertex: the `quantile` of theta at i +- 2 .. i +- window (distinct vertices other than i, i - 1, i + 1). */
function outlierReference(p: KinkProfile, window: number, quantile: number): Float64Array {
  const key = `${window}|${quantile}`, hit = p.refs.get(key);
  if (hit) return hit;
  const n = p.n, out = new Float64Array(n), vals: number[] = [];
  for (let i = 0; i < n; i++) {
    vals.length = 0;
    const seen = new Set<number>([i, (i + 1) % n, (i - 1 + n) % n]);
    for (let k = 2; k <= window; k++) for (const j of [(i + k) % n, (i - k % n + n) % n]) {
      if (seen.has(j)) continue;
      seen.add(j); vals.push(p.theta[j]);
    }
    if (vals.length === 0) { out[i] = 0; continue; }
    vals.sort((x, y) => x - y);
    out[i] = vals[Math.min(vals.length - 1, Math.max(0, Math.ceil(quantile * vals.length) - 1))];
  }
  p.refs.set(key, out);
  return out;
}
export type KinkParams = Pick<Required<ValidateOptions>, 'kinkRule' | 'kinkTurnDegrees' | 'kinkCurvature' | 'kinkWindow' | 'kinkQuantile'
  | 'kinkRatio' | 'kinkFloorDegrees' | 'kinkSpikeSpacing' | 'kinkSpikeHalfWidth'>;
const KINK_RULES = ['turn', 'curvature', 'outlier', 'spike'];
/** The single rules of a (possibly '+'-combined) kinkRule name; throws on an unknown name. */
export function kinkParts(rule: string): string[] {
  const parts = rule.split('+');
  if (parts.length === 0 || parts.some(r => !KINK_RULES.includes(r))) throw new Error(`unknown kinkRule "${rule}" (use ${KINK_RULES.join(', ')} or '+' combinations)`);
  return parts;
}
/** Does single rule `r` flag vertex i? `ref` is the outlier reference array when r is 'outlier'. */
function kinkHit(p: KinkProfile, r: string, i: number, k: KinkParams, ref: Float64Array | null): boolean {
  const th = p.theta[i];
  if (r === 'turn') return th > k.kinkTurnDegrees;
  if (r === 'curvature') return p.spacing[i] > 0 && (th / RAD_TO_DEG) / p.spacing[i] * p.halfWidth > k.kinkCurvature;
  if (r === 'outlier') return th > Math.max(k.kinkFloorDegrees, k.kinkRatio * (ref as Float64Array)[i]);
  return p.spacing[i] > 0 && p.dev[i] / p.spacing[i] > k.kinkSpikeSpacing && p.dev[i] > k.kinkSpikeHalfWidth * p.halfWidth;
}
const refFor = (p: KinkProfile, parts: string[], k: KinkParams) => parts.includes('outlier') ? outlierReference(p, k.kinkWindow, k.kinkQuantile) : null;
/** Does the rule (given as `parts` = kinkParts(k.kinkRule)) flag vertex i (closed-loop index 0 .. n - 1)? */
export function kinkFlagAt(p: KinkProfile, parts: string[], k: KinkParams, i: number): boolean {
  const ref = refFor(p, parts, k);
  for (const r of parts) if (!kinkHit(p, r, i, k, ref)) return false;
  return true;
}
/** 1 where the local-kink rule flags the vertex, 0 elsewhere; indices are closed-loop vertices 0 .. n - 1 (0 is the seam). */
export function kinkFlags(p: KinkProfile, k: KinkParams): Uint8Array {
  const parts = kinkParts(k.kinkRule), out = new Uint8Array(p.n), ref = refFor(p, parts, k);
  for (let i = 0; i < p.n; i++) {
    let hit = true;
    for (const r of parts) if (!kinkHit(p, r, i, k, ref)) { hit = false; break; }
    out[i] = hit ? 1 : 0;
  }
  return out;
}
/** The turn limit equivalent to a single-rule verdict at vertex i (degrees), or undefined for 'spike' and combinations. */
function kinkLimit(p: KinkProfile, i: number, k: KinkParams): number | undefined {
  if (k.kinkRule === 'turn') return k.kinkTurnDegrees;
  if (k.kinkRule === 'curvature') return k.kinkCurvature * p.spacing[i] / p.halfWidth * RAD_TO_DEG;
  if (k.kinkRule === 'outlier') return Math.max(k.kinkFloorDegrees, k.kinkRatio * outlierReference(p, k.kinkWindow, k.kinkQuantile)[i]);
  return undefined;
}
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

  const kinkMode = o.closureTangentMode === 'kink';
  if (kinkMode) kinkParts(o.kinkRule); // reject an unknown rule name up front
  const pts = track.points, n = pts.length - 1, width = track.params.width;
  const edges = track.roadEdges;
  const structureProblems: string[] = [];
  if (!Array.isArray(pts) || pts.length < 4) structureProblems.push(`a closed track needs at least 4 points, got ${Array.isArray(pts) ? pts.length : 'none'}`);
  else if (!Array.isArray(edges) || edges.length !== 2 || edges[0].length !== pts.length || edges[1].length !== pts.length)
    structureProblems.push('roadEdges must be two arrays with one entry per centerline point');
  if (structureProblems.length) {
    for (const message of structureProblems) add({ code: 'STRUCTURE', severity: 'error', message });
    record({ id: 'structure', severity: 'error', skipped: false, checked: 1, failures: structureProblems.length, stats: {} });
    for (const [id, severity] of [['finite', 'error'], ['closure', 'error'], ['local-kink', 'error'], ['self-intersection', 'error'],
      ['edge-fold', 'error'], ['min-turn-radius', 'warning'], ['max-slope', 'warning']] as const)
      if (id !== 'local-kink' || kinkMode) record({ id, severity, skipped: true, checked: 0, failures: 0, stats: {} });
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
  let kink: { profile: KinkProfile; flags: Uint8Array } | null = null;
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
    if (kinkMode) { const profile = kinkProfile(pts, width); kink = { profile, flags: kinkFlags(profile, o) }; }
    const tangentLimit = kink ? kinkLimit(kink.profile, 0, o) : o.closureTangentMode === 'absolute' ? o.tangentToleranceDegrees
      : Math.max(o.tangentToleranceDegrees, o.seamRatio * neighbourhood);
    if (gap > o.closureTolerance) { failures++; add({ code: 'CLOSURE_POSITION', severity: 'error', index: n, value: gap, limit: o.closureTolerance,
      message: `last point is ${gap} units from the first point (limit ${o.closureTolerance})` }); }
    if (edgeGap > o.closureTolerance) { failures++; add({ code: 'CLOSURE_EDGE', severity: 'error', index: n, value: edgeGap, limit: o.closureTolerance,
      message: `a road edge's last point is ${edgeGap} units from its first point (limit ${o.closureTolerance})` }); }
    if (heightGap > o.heightTolerance) { failures++; add({ code: 'CLOSURE_HEIGHT', severity: 'error', index: n, value: heightGap, limit: o.heightTolerance,
      message: `height differs by ${heightGap} across the seam (limit ${o.heightTolerance})` }); }
    const tangentFails = kink ? kink.flags[0] === 1 : tangent > (tangentLimit as number);
    if (tangentFails) { failures++; add({ code: 'CLOSURE_TANGENT', severity: 'error', index: 0, value: tangent, ...(tangentLimit !== undefined ? { limit: tangentLimit } : {}),
      message: `heading changes by ${tangent} degrees across the seam (${kink ? `local-kink rule ${o.kinkRule}` : `limit ${tangentLimit}`}; neighbourhood maximum ${neighbourhood} degrees, mode ${o.closureTangentMode})` }); }
    record({ id: 'closure', severity: 'error', checked: 4, failures,
      stats: { positionGap: gap, edgeGap, heightGap, tangentDegrees: tangent, neighbourhoodMaxDegrees: neighbourhood,
        ...(neighbourhood > 0 ? { tangentRatio: tangent / neighbourhood } : {}) } });
  }

  // 2b. local kink (mode 'kink' only): the same rule at every vertex of the closed loop; the seam vertex is reported as CLOSURE_TANGENT
  if (kinkMode) {
    if (!kink) record({ id: 'local-kink', severity: 'error', skipped: true, checked: 0, failures: 0, stats: {} });
    else {
      const { profile, flags } = kink;
      let failures = 0, maxTurn = 0;
      for (let i = 1; i < n; i++) {
        maxTurn = Math.max(maxTurn, profile.theta[i]);
        if (!flags[i]) continue;
        failures++;
        const limit = kinkLimit(profile, i, o);
        add({ code: 'LOCAL_KINK', severity: 'error', index: i, value: profile.theta[i], ...(limit !== undefined ? { limit } : {}),
          message: `heading changes by ${profile.theta[i]} degrees at vertex ${i} (local-kink rule ${o.kinkRule}${limit !== undefined ? `, limit ${limit}` : ''})` });
      }
      record({ id: 'local-kink', severity: 'error', checked: n, failures, stats: { maxTurnDegrees: maxTurn, seamFlagged: flags[0] } });
    }
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
