// Generic input path: build a TrackLab Track-like object from an arbitrary closed polyline, so that
// validateTrack() and computeMetrics() can be applied to tracks that were NOT produced by TrackLab.
//
// Conventions (identical to src/core.ts):
//   - the ground plane is x/z, y is height (up); all planar tests of the validator use x/z only;
//   - the closed loop is stored with points[n] === points[0] (n distinct vertices, n + 1 entries);
//   - normals[i] is the unit x/z vector (-dz, dx)/|d| of the central difference points[i+1]-points[i-1] (wrapping);
//   - roadEdges[side] (side = -1 -> roadEdges[0], +1 -> roadEdges[1]) = fround(point + normal * side * width / 2),
//     with the same float32 rounding (Math.fround) as TrackLab's rendered ribbon;
//   - straightSegments are all false (a third-party polyline carries no straight/curve labelling);
//   - bounds are the x/z/y extent of the centerline widened by width / 2 in x and z (no TrackLab curb/sidewalk margin).
// Nothing is repaired, reordered, smoothed or resampled unless a resample option is requested (OFF by default). The one
// preprocessing step that is always applied: consecutive duplicate vertices (distance <= DUPLICATE_TOLERANCE x bounding-box
// diagonal, including the last vertex against the first) are removed and counted in `duplicatePointsRemoved`.
// Like the generator this module avoids Math.sin/cos/atan2/hypot (src/detmath.ts only).
import { dhypot } from './detmath.js';
import type { Point } from './core.js';
import type { ValidatableTrack } from './validate.js';

export interface PolylineInput {
  /** Vertices in order; y is height and defaults to 0. */
  points: { x: number; y?: number; z: number }[];
  /** Full road width (units of the polyline). Must be a positive finite number. */
  width: number;
  /** Only closed loops are supported. */
  closed: true;
}
export interface PolylineOptions {
  /**
   * Optional uniform arc-length resampling (OFF by default). { spacing } targets that 3D distance between samples:
   * n = max(4, round(length / spacing)) samples, linear interpolation along the closed polyline starting at points[0].
   * This changes the geometry that is validated; reports must state it when used.
   */
  resample?: { spacing: number };
  /**
   * Optional smooth resampling (OFF by default; exclusive with `resample`). A closed centripetal Catmull-Rom spline (alpha 1/2) is
   * laid through the given points (it passes through every one of them), evaluated densely, then resampled uniformly by 3D arc
   * length at `spacing` as for `resample`. It rounds the polygon corners of a coarsely sampled curve but still passes through
   * every input vertex, so a vertex that really sticks out remains a sharp feature. See docs/validator.md, "Sampling requirement".
   */
  resampleSmooth?: { spacing: number };
}

/** Consecutive vertices closer than this fraction of the bounding-box diagonal (3D) are duplicates and are removed. */
export const DUPLICATE_TOLERANCE = 1e-9;
/** Upper bound on the number of samples that a resampling may produce; larger requests are a RangeError instead of an allocation failure. */
export const MAX_RESAMPLED_POINTS = 5_000_000;
export interface PolylineTrack extends ValidatableTrack {
  params: { width: number };
  points: Point[];
  normals: { x: number; z: number }[];
  roadEdges: [Point[], Point[]];
  straightSegments: boolean[];
  length: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  /** Provenance of the closing vertex: true if the input already ended with a copy of its first point. */
  inputWasClosed: boolean;
  /** Number of vertices of the input (before closing/resampling). */
  inputPointCount: number;
  resampled: boolean;
  /** Number of consecutive duplicate vertices removed before the edges were built (the closing copy of the first point is not counted). */
  duplicatePointsRemoved: number;
  /** True if `resampleSmooth` was applied. `resampled` is then true as well. */
  resampledSmooth: boolean;
}

/**
 * Throws RangeError for width not positive finite, for closed !== true, and for fewer than 3 input points.
 * Non-finite coordinates are NOT rejected: they flow into the validator, which reports NON_FINITE.
 */
export function trackFromPolyline(input: PolylineInput, options: PolylineOptions = {}): PolylineTrack {
  if (input.closed !== true) throw new RangeError('only closed polylines are supported (closed: true)');
  if (!(typeof input.width === 'number' && Number.isFinite(input.width) && input.width > 0))
    throw new RangeError(`width must be a positive finite number, got ${input.width}`);
  if (!Array.isArray(input.points) || input.points.length < 3) throw new RangeError('a closed polyline needs at least 3 points');
  if (options.resample && options.resampleSmooth) throw new RangeError('resample and resampleSmooth are mutually exclusive');
  let pts: Point[] = input.points.map(p => ({ x: p.x, y: p.y ?? 0, z: p.z }));
  const first = pts[0], last = pts[pts.length - 1];
  const inputWasClosed = pts.length >= 4 && first.x === last.x && first.y === last.y && first.z === last.z;
  const dedup = removeConsecutiveDuplicates(inputWasClosed ? pts.slice(0, -1) : pts);
  if (dedup.points.length < 3) throw new RangeError(`fewer than 3 distinct points after removing ${dedup.removed} duplicate vertices`);
  pts = dedup.points;
  pts.push({ ...pts[0] });
  const duplicatePointsRemoved = dedup.removed;
  let resampled = false, resampledSmooth = false;
  if (options.resample) {
    const spacing = options.resample.spacing;
    if (!(Number.isFinite(spacing) && spacing > 0)) throw new RangeError(`resample.spacing must be positive finite, got ${spacing}`);
    pts = resampleClosed(pts, spacing);
    resampled = true;
  } else if (options.resampleSmooth) {
    const spacing = options.resampleSmooth.spacing;
    if (!(Number.isFinite(spacing) && spacing > 0)) throw new RangeError(`resampleSmooth.spacing must be positive finite, got ${spacing}`);
    pts = resampleClosed(smoothDense(pts, spacing), spacing);
    resampled = true; resampledSmooth = true;
  }
  const n = pts.length - 1, width = input.width;
  const normals = pts.map((_, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = dhypot(dx, dz) || 1;
    return { x: -dz / len, z: dx / len };
  });
  let length = 0;
  for (let i = 0; i < n; i++) length += dhypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y, pts[i + 1].z - pts[i].z);
  const margin = width / 2;
  return {
    params: { width }, points: pts, normals, straightSegments: Array<boolean>(n).fill(false), length,
    roadEdges: [-1, 1].map(side => pts.map((pt, i) => ({
      x: Math.fround(pt.x + normals[i].x * side * width / 2),
      y: Math.fround(pt.y), z: Math.fround(pt.z + normals[i].z * side * width / 2),
    }))) as [Point[], Point[]],
    bounds: extent(pts, margin),
    inputWasClosed, inputPointCount: input.points.length, resampled, duplicatePointsRemoved, resampledSmooth,
  };
}

/** x/z/y extent, widened by `margin` in x and z. A loop, not Math.min(...array): the spread overflows the call stack at about 10^5 points. */
function extent(pts: Point[], margin: number): PolylineTrack['bounds'] {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of pts) {
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  }
  return { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin, minY, maxY };
}

/**
 * Removes consecutive duplicates of the open vertex list `open` (the loop closes from the last vertex to the first, so the last is
 * also compared with the first). Two vertices are duplicates if their 3D distance is <= DUPLICATE_TOLERANCE x the bounding-box
 * diagonal of the finite vertices (0 if none), so exact duplicates always are. A vertex with a non-finite coordinate is never
 * a duplicate (it is left for the validator to report). The first of a run is kept.
 */
function removeConsecutiveDuplicates(open: Point[]): { points: Point[]; removed: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of open) {
    if (!(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))) continue;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const diag = minX <= maxX ? dhypot(maxX - minX, maxY - minY, maxZ - minZ) : 0;
  const eps = Number.isFinite(diag) ? DUPLICATE_TOLERANCE * diag : 0;
  const near = (a: Point, b: Point) => dhypot(a.x - b.x, a.y - b.y, a.z - b.z) <= eps;
  const kept: Point[] = [];
  let removed = 0;
  for (const p of open) {
    if (kept.length > 0 && near(kept[kept.length - 1], p)) removed++; else kept.push(p);
  }
  while (kept.length > 1 && near(kept[kept.length - 1], kept[0])) { kept.pop(); removed++; }
  return { points: kept, removed };
}

/** Uniform arc-length resampling of a closed loop (pts[last] === pts[0]); returns a loop of the same form. */
function resampleClosed(pts: Point[], spacing: number): Point[] {
  const m = pts.length - 1;
  const cum = [0];
  for (let i = 0; i < m; i++) cum.push(cum[i] + dhypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y, pts[i + 1].z - pts[i].z));
  const total = cum[m];
  if (!(total > 0) || !Number.isFinite(total)) throw new RangeError('cannot resample a polyline of zero or non-finite length');
  const count = Math.max(4, Math.round(total / spacing));
  if (count > MAX_RESAMPLED_POINTS) throw new RangeError(`resampling at spacing ${spacing} would give ${count} points (limit ${MAX_RESAMPLED_POINTS})`);
  const out: Point[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const s = total * k / count;
    while (seg < m - 1 && cum[seg + 1] <= s) seg++;
    const len = cum[seg + 1] - cum[seg], t = len > 0 ? (s - cum[seg]) / len : 0;
    const a = pts[seg], b = pts[seg + 1];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  }
  out.push({ ...out[0] });
  return out;
}

/**
 * Dense evaluation of the closed centripetal Catmull-Rom spline (alpha 1/2) through the loop `pts` (pts[last] === pts[0], all
 * consecutive points distinct). Knot interval of span i = sqrt(|P_{i+1} - P_i|) (3D), evaluated with the Barry-Goldman pyramid
 * (only + - * / and Math.sqrt). Span i is sampled at max(2, ceil(4 |P_{i+1} - P_i| / spacing)) parameters, so the dense polyline
 * has a step of at most spacing / 4 along each chord; the result is a closed loop (last === first) for resampleClosed().
 */
function smoothDense(pts: Point[], spacing: number): Point[] {
  const m = pts.length - 1;
  const d: number[] = [], k: number[] = [];
  let samples = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = dhypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (!(len > 0) || !Number.isFinite(len)) throw new RangeError('cannot smooth a polyline with a zero-length or non-finite segment');
    d.push(len); k.push(Math.sqrt(len));
    samples += Math.max(2, Math.ceil(4 * len / spacing));
    if (samples > MAX_RESAMPLED_POINTS) throw new RangeError(`smooth resampling at spacing ${spacing} needs more than ${MAX_RESAMPLED_POINTS} evaluation points`);
  }
  const out: Point[] = [];
  const mix = (a: Point, b: Point, wa: number, wb: number): Point => ({ x: wa * a.x + wb * b.x, y: wa * a.y + wb * b.y, z: wa * a.z + wb * b.z });
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
    const t0 = 0, t1 = k[(i - 1 + m) % m], t2 = t1 + k[i], t3 = t2 + k[(i + 1) % m];
    const steps = Math.max(2, Math.ceil(4 * d[i] / spacing));
    for (let j = 0; j < steps; j++) {
      const t = t1 + (t2 - t1) * j / steps;
      const a1 = mix(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
      const a2 = mix(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
      const a3 = mix(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));
      const b1 = mix(a1, a2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
      const b2 = mix(a2, a3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));
      out.push(mix(b1, b2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)));
    }
  }
  out.push({ ...out[0] });
  return out;
}

// ---- parsing (pure; file I/O stays in the CLI) -------------------------------------------------
export class PolylineParseError extends Error {}
type RawPoint = { x: number; y?: number; z: number };

/** JSON: {"points": [...]} or a bare array. Each point is [x, z] (exactly 2 numbers) or {x, z[, y]}. */
export function parsePolylineJson(text: string): RawPoint[] {
  let v: unknown;
  try { v = JSON.parse(text); } catch (e) { throw new PolylineParseError(`invalid JSON (${e instanceof Error ? e.message : String(e)})`); }
  const list = Array.isArray(v) ? v : (typeof v === 'object' && v !== null ? (v as { points?: unknown }).points : undefined);
  if (!Array.isArray(list)) throw new PolylineParseError('expected {"points": [...]} or an array of points');
  return list.map((p, i) => {
    if (Array.isArray(p)) {
      if (p.length !== 2 || !p.every(c => typeof c === 'number')) throw new PolylineParseError(`points[${i}]: an array point must be exactly [x, z] (use {x,y,z} for height)`);
      return { x: p[0] as number, z: p[1] as number };
    }
    if (typeof p === 'object' && p !== null) {
      const o = p as Record<string, unknown>;
      if (typeof o.x !== 'number' || typeof o.z !== 'number' || (o.y !== undefined && typeof o.y !== 'number'))
        throw new PolylineParseError(`points[${i}]: object point needs numeric x and z (and optional numeric y)`);
      return o.y === undefined ? { x: o.x, z: o.z } : { x: o.x, y: o.y, z: o.z };
    }
    throw new PolylineParseError(`points[${i}]: not a point`);
  });
}

/** CSV: one point per line, "x,z" or "x,z,y" (note the order: height last); an optional first line that is not numeric is a header. */
export function parsePolylineCsv(text: string): RawPoint[] {
  const out: RawPoint[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  lines.forEach((line, idx) => {
    const cells = line.split(',').map(c => c.trim());
    const nums = cells.map(c => (c === '' ? NaN : Number(c)));
    if (idx === 0 && nums.some(Number.isNaN)) return; // header
    if ((cells.length !== 2 && cells.length !== 3) || nums.some(x => !Number.isFinite(x)))
      throw new PolylineParseError(`line ${idx + 1}: expected "x,z" or "x,z,y" with finite numbers, got "${line}"`);
    out.push(cells.length === 2 ? { x: nums[0], z: nums[1] } : { x: nums[0], y: nums[2], z: nums[1] });
  });
  return out;
}
