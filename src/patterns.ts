import { datan2, dcos, dexp, dhypot, dsin } from './detmath.js';
import type { Params, Point } from './core.js';

export type CornerPattern = 'auto' | 'right-angle' | 'hairpin' | 's-curve';
export const MAX_PATTERN_ATTEMPTS = 6;
export interface PatternMeasurement {
  kind: Exclude<CornerPattern, 'auto'>; startIndex: number; endIndex: number;
  turnDegrees: number; positiveTurnDegrees: number; negativeTurnDegrees: number;
  curvatureChanges: number; parallelDot?: number; verified: boolean;
}
export interface GeometryAudit {
  valid: boolean; closed: boolean; minRadius: number; maxStepAngle: number;
  selfIntersections: number; boundaryIntersections: number; foldedTriangles: number;
  boundariesChecked: boolean; reasons: string[];
}
export interface PatternReport {
  selected: CornerPattern; requested: number; inserted: number; attempts: number; scale: number;
  patterns: PatternMeasurement[]; geometry: GeometryAudit | null;
}
export class PatternGenerationError extends Error {
  constructor(readonly attempts: number, readonly reasons: string[]) {
    super(`Corner pattern failed (${attempts} attempts): ${reasons.at(-1) ?? 'geometry check failed'}`);
    this.name = 'PatternGenerationError';
  }
}

const P = (x: number, z: number): Point => ({ x, y: 0, z });
const distance = (a: Point, b: Point) => dhypot(b.x - a.x, b.z - a.z);
const mix = (a: Point, b: Point, t: number) => P(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
const direction = (a: Point, b: Point) => {
  const d = distance(a, b) || 1; return P((b.x - a.x) / d, (b.z - a.z) / d);
};
const angle = (a: Point, b: Point) => datan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
const degrees = (r: number) => r * 180 / Math.PI;

function cumulative(points: Point[]) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]));
  return lengths;
}

function resample(points: Point[], spacing = 8) {
  const lengths = cumulative(points), length = lengths.at(-1)!;
  const count = Math.min(1800, Math.max(120, Math.ceil(length / spacing)));
  const result: Point[] = [];
  let index = 0;
  for (let i = 0; i < count; i++) {
    const d = i * length / count;
    while (index < points.length - 2 && lengths[index + 1] < d) index++;
    result.push(mix(points[index], points[index + 1], (d - lengths[index]) /
      (lengths[index + 1] - lengths[index] || 1)));
  }
  result.push({ ...result[0] });
  return { points: result, length, step: length / count };
}

// Only explicit pattern mode rounds the legacy straight/curve joins. The input
// remains the original Catmull–Rom/linear seeded circuit; Auto never enters here.
function smoothBase(original: Point[], scale: number, margin: number, rounding: number) {
  const sampled = resample(original.map(p => P(p.x * scale, p.z * scale)));
  const n = sampled.points.length - 1, sigma = Math.max(12, margin * rounding) / sampled.step;
  const radius = Math.ceil(sigma * 3);
  const weights = Array.from({ length: radius * 2 + 1 }, (_, i) => dexp(-0.5 * (((i - radius) / sigma) * ((i - radius) / sigma))));
  const sum = weights.reduce((a, b) => a + b, 0);
  const points = sampled.points.slice(0, -1).map((_, i) => {
    let x = 0, z = 0;
    weights.forEach((w, k) => {
      const p = sampled.points[(i + k - radius + n) % n]; x += p.x * w; z += p.z * w;
    });
    return P(x / sum, z / sum);
  });
  points.push({ ...points[0] });
  return resample(points);
}

interface LocalPattern { points: Point[]; start: number; end: number; leg: number }
function localPattern(kind: Exclude<CornerPattern, 'auto'>, radius: number, strength: number): LocalPattern {
  const points = [P(0, 0)];
  let heading = kind === 'right-angle' ? Math.PI / 4 : 0;
  const line = (length: number) => {
    const start = points.at(-1)!;
    for (let i = 1, n = Math.ceil(length / 4); i <= n; i++)
      points.push(P(start.x + dcos(heading) * length * i / n, start.z + dsin(heading) * length * i / n));
  };
  const arc = (turn: number) => {
    const start = points.at(-1)!, sign = Math.sign(turn), before = heading;
    for (let i = 1, n = Math.ceil(Math.abs(turn) * radius / 4); i <= n; i++) {
      const h = before + turn * i / n;
      points.push(P(start.x + sign * radius * (dsin(h) - dsin(before)),
        start.z + sign * radius * (dcos(before) - dcos(h))));
    }
    heading += turn;
  };
  let start = 0, end = 0, leg = 0;
  if (kind === 'right-angle') { arc(-Math.PI / 2); end = points.length - 1; }
  else if (kind === 'hairpin') {
    // Quarter-turn collars feed two parallel legs into one independent 180° arc.
    arc(Math.PI / 2); leg = radius * (0.65 + 0.8 * strength); line(leg);
    start = points.length - 1; arc(-Math.PI); end = points.length - 1;
    line(leg); arc(Math.PI / 2);
  } else {
    const turn = (20 + 45 * strength) * Math.PI / 180;
    arc(turn); arc(-2 * turn); arc(turn); end = points.length - 1;
  }
  return { points, start, end, leg };
}

function bezier(a: Point, b: Point, da: Point, db: Point): Point[] {
  // Positive forward derivatives keep collars monotone along their chord.
  const span = b.x - a.x;
  const c = P(a.x + span / 3, a.z + da.z / da.x * span / 3);
  const d = P(b.x - span / 3, b.z - db.z / db.x * span / 3);
  const n = Math.max(8, Math.ceil((distance(a, c) + distance(c, d) + distance(d, b)) / 4));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    const u3 = u * u * u, u2 = u * u, t2 = t * t, t3 = t * t * t;
    return P(u3 * a.x + 3 * u2 * t * c.x + 3 * u * t2 * d.x + t3 * b.x,
      u3 * a.z + 3 * u2 * t * c.z + 3 * u * t2 * d.z + t3 * b.z);
  });
}

interface Mark { kind: Exclude<CornerPattern, 'auto'>; start: number; end: number; leg: number }
function splicePatterns(base: ReturnType<typeof resample>, p: Params, rng: () => number, margin: number, attempt: number) {
  const n = base.points.length - 1, result: Point[] = [], marks: Mark[] = [];
  const append = (points: Point[]) => {
    for (const point of points) if (!result.length || distance(result.at(-1)!, point) > 1e-7) result.push(point);
  };
  const window = (0.24 - (attempt % 3) * 0.025) * n;
  const strength = p.cornerStrength / 100, kind = p.cornerPattern as Exclude<CornerPattern, 'auto'>;
  const maxRadius = Math.max(32, margin * (2.4 - 0.8 * strength)) * 1.03;
  const requiredWidth = localPattern(kind, maxRadius, strength).points.at(-1)!.x + margin * 4.4;
  const candidates: { from: number; to: number; score: number }[] = [];
  for (let k = 0; k < 80; k++) {
    const center = n * (k + rng() * 0.5) / 80;
    const from = Math.floor(center - window / 2), to = Math.ceil(center + window / 2);
    if (from < 2 || to >= n - 2) continue;
    const a = base.points[from], b = base.points[to], u = direction(a, b);
    if (distance(a, b) < requiredWidth) continue;
    const entry = direction(base.points[from - 1], base.points[from + 1]);
    const exit = direction(base.points[to - 1], base.points[to + 1]);
    const score = Math.min(entry.x * u.x + entry.z * u.z, exit.x * u.x + exit.z * u.z);
    if (score >= 0.55) candidates.push({ from, to, score: score + rng() * 0.15 });
  }
  // Bounded interval scheduling selects compatible local windows instead of
  // forcing a pattern across a legacy sharp vertex or always trying one phase.
  const memo = new Map<string, { score: number; indices: number[] }>();
  const choose = (index: number, left: number): { score: number; indices: number[] } => {
    if (!left) return { score: 0, indices: [] };
    if (index >= candidates.length) return { score: -Infinity, indices: [] };
    const key = `${index}/${left}`, cached = memo.get(key); if (cached) return cached;
    const skip = choose(index + 1, left), current = candidates[index];
    let next = index + 1;
    while (next < candidates.length && candidates[next].from < current.to + n * 0.025) next++;
    const tail = choose(next, left - 1), score = current.score + tail.score;
    const result = score > skip.score ? { score, indices: [index, ...tail.indices] } : skip;
    memo.set(key, result); return result;
  };
  const selected = choose(0, p.cornerCount).indices.map(i => candidates[i]);
  if (selected.length !== p.cornerCount) throw new Error('Not enough safe pattern connection sections for the road and sidewalk width');
  let cursor = 0;
  for (const { from, to } of selected) {
    const center = (from + to) / 2;
    if (from <= cursor || to >= n - 2) throw new Error('Not enough room to connect the corner');
    const a = base.points[from], b = base.points[to], u = direction(a, b), chord = distance(a, b);
    const middle = base.points[Math.floor(center)];
    let v = P(u.z, -u.x);
    if ((middle.x - (a.x + b.x) / 2) * v.x + (middle.z - (a.z + b.z) / 2) * v.z < 0) v = P(-v.x, -v.z);
    const localDirection = (d: Point) => P(d.x * u.x + d.z * u.z, d.x * v.x + d.z * v.z);
    const entry = localDirection(direction(base.points[from - 1], base.points[from + 1]));
    const exit = localDirection(direction(base.points[to - 1], base.points[to + 1]));
    if (entry.x < 0.35 || exit.x < 0.35) throw new Error('Not enough tangent direction margin at the connection');
    const radius = Math.max(32, margin * (2.4 - 0.8 * strength)) * (1 + rng() * 0.03);
    const pattern = localPattern(kind, radius, strength), width = pattern.points.at(-1)!.x;
    const gap = (chord - width) / 2;
    if (gap < margin * 1.4) throw new Error('Not enough space for the pattern connection given the road and sidewalk width');
    const first = direction(pattern.points[0], pattern.points[1]);
    const last = direction(pattern.points.at(-2)!, pattern.points.at(-1)!);
    const lift = gap * (entry.z / entry.x + first.z / first.x - exit.z / exit.x - last.z / last.x) / 4;
    const local = pattern.points.map(q => P(q.x + gap, q.z + Math.max(0, lift)));
    const world = (q: Point) => P(a.x + u.x * q.x + v.x * q.z, a.z + u.z * q.x + v.z * q.z);
    append(base.points.slice(cursor, from + 1));
    append(bezier(P(0, 0), local[0], entry, first).map(world));
    const start = result.length - 1;
    append(local.map(world));
    marks.push({ kind, start: start + pattern.start, end: start + pattern.end, leg: pattern.leg });
    append(bezier(local.at(-1)!, P(chord, 0), last, exit).map(world));
    cursor = to + 1;
  }
  append(base.points.slice(cursor));
  result[result.length - 1] = { ...result[0] };
  const lengths = cumulative(result), sampled = resample(result);
  const measurements = marks.map(mark => {
    const start = Math.round(lengths[mark.start] / sampled.step), end = Math.round(lengths[mark.end] / sampled.step);
    return measurePattern(sampled.points, mark.kind, start, end, mark.leg / sampled.step);
  });
  return { points: sampled.points, measurements };
}

export function measurePattern(points: Point[], kind: Exclude<CornerPattern, 'auto'>,
  startIndex: number, endIndex: number, legSamples = 0): PatternMeasurement {
  let positive = 0, negative = 0, changes = 0, previousSign = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    const weight = i === startIndex || i === endIndex ? 0.5 : 1;
    const turn = weight * degrees(angle(direction(points[i - 1], points[i]), direction(points[i], points[i + 1])));
    positive += Math.max(0, turn); negative += Math.min(0, turn);
    if (i > startIndex && i < endIndex && Math.abs(turn) > 0.12) {
      const sign = Math.sign(turn); if (previousSign && previousSign !== sign) changes++;
      previousSign = sign;
    }
  }
  const turn = positive + negative;
  let parallelDot: number | undefined;
  if (kind === 'hairpin') {
    const length = Math.max(2, Math.floor(legSamples * 0.7));
    const a = direction(points[Math.max(0, startIndex - length)], points[startIndex]);
    const b = direction(points[endIndex], points[Math.min(points.length - 1, endIndex + length)]);
    parallelDot = a.x * b.x + a.z * b.z;
  }
  const verified = kind === 'right-angle' ? Math.abs(Math.abs(turn) - 90) < 13
    : kind === 'hairpin' ? Math.abs(Math.abs(turn) - 180) < 13 && parallelDot! < -0.97
    : positive > 30 && negative < -30 && changes >= 2;
  return { kind, startIndex, endIndex, turnDegrees: turn, positiveTurnDegrees: positive,
    negativeTurnDegrees: negative, curvatureChanges: changes, parallelDot, verified };
}

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
interface Segment { a: Point; b: Point; ring: number; index: number; minX: number; maxX: number; minZ: number; maxZ: number }
function intersects(a: Segment, b: Segment) {
  if (a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ) return false;
  const ab1 = cross(a.a, a.b, b.a), ab2 = cross(a.a, a.b, b.b);
  const ba1 = cross(b.a, b.b, a.a), ba2 = cross(b.a, b.b, a.b);
  return ab1 * ab2 <= 0 && ba1 * ba2 <= 0;
}

export function validatePatternGeometry(points: Point[], width: number, curb = 2.5, sidewalk = 17): GeometryAudit {
  const n = points.length - 1, margin = width / 2 + curb + sidewalk;
  const closed = n >= 3 && distance(points[0], points[n]) < 1e-8;
  let minRadius = Infinity, maxStepAngle = 0, foldedTriangles = 0;
  const normals = points.map((_, i) => {
    const d = direction(points[(i - 1 + n) % n], points[(i + 1) % n]); return P(-d.z, d.x);
  });
  const offsets = [-margin, -width / 2 - curb, -width / 2, width / 2, width / 2 + curb, margin];
  const rings = offsets.map(offset => points.map((p, i) => P(Math.fround(p.x + normals[i].x * offset),
    Math.fround(p.z + normals[i].z * offset))));
  for (let i = 0; i < n; i++) {
    const before = points[(i - 1 + n) % n], p = points[i], after = points[(i + 1) % n];
    const turn = Math.abs(angle(direction(before, p), direction(p, after)));
    minRadius = Math.min(minRadius, (distance(before, p) + distance(p, after)) / 2 / (turn || 1e-15));
    maxStepAngle = Math.max(maxStepAngle, degrees(turn));
    for (let band = 0; band < rings.length - 1; band++) {
      const a = rings[band][i], b = rings[band][i + 1], c = rings[band + 1][i], d = rings[band + 1][i + 1];
      if (cross(a, b, c) <= 1e-5 || cross(c, b, d) <= 1e-5) foldedTriangles++;
    }
  }
  const reasons: string[] = [];
  if (!closed || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z))) reasons.push('Closure or coordinate check failed');
  if (minRadius < margin * 1.12 || maxStepAngle > 20) reasons.push('Junction or curvature radius is too small for the road and sidewalk width');
  if (foldedTriangles) reasons.push('Folded road, curb or sidewalk triangles detected');
  let selfIntersections = 0, boundaryIntersections = 0;
  const boundariesChecked = reasons.length === 0;
  if (boundariesChecked) {
    // A spatial hash bounds the narrow-phase work instead of comparing every
    // pair of the seven full closed contours (centerline + six band edges).
    const grid = new Map<string, number[]>(), segments: Segment[] = [], cell = Math.max(64, margin * 2);
    outer: for (const [ring, contour] of [points, ...rings].entries()) for (let i = 0; i < n; i++) {
      const a = contour[i], b = contour[i + 1];
      const segment: Segment = { a, b, ring, index: i, minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
        minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) };
      const keys: string[] = [], seen = new Set<number>();
      for (let x = Math.floor(segment.minX / cell); x <= Math.floor(segment.maxX / cell); x++)
        for (let z = Math.floor(segment.minZ / cell); z <= Math.floor(segment.maxZ / cell); z++) keys.push(`${x},${z}`);
      for (const key of keys) for (const id of grid.get(key) ?? []) {
        if (seen.has(id)) continue; seen.add(id);
        const other = segments[id], gap = Math.abs(other.index - i);
        if (other.ring === ring && (gap <= 1 || gap === n - 1)) continue;
        if (intersects(segment, other)) {
          if (ring === 0 && other.ring === 0) selfIntersections++; else boundaryIntersections++;
          if (selfIntersections + boundaryIntersections >= 8) break outer;
        }
      }
      const id = segments.push(segment) - 1;
      for (const key of keys) { const entries = grid.get(key) ?? []; entries.push(id); grid.set(key, entries); }
    }
  }
  if (selfIntersections) reasons.push('Centerline self-intersection detected');
  if (boundaryIntersections) reasons.push('Road, curb and sidewalk boundary overlap detected');
  return { valid: reasons.length === 0, closed, minRadius, maxStepAngle, selfIntersections,
    boundaryIntersections, foldedTriangles, boundariesChecked, reasons };
}

export function applyPatterns(original: Point[], p: Params, rng: () => number, curb: number, sidewalk: number) {
  const reasons: string[] = [], margin = p.width / 2 + curb + sidewalk;
  for (let attempt = 0; attempt < MAX_PATTERN_ATTEMPTS; attempt++) {
    const scale = 1 + attempt * 0.45;
    try {
      const candidate = splicePatterns(smoothBase(original, scale, margin, 2.5 + attempt), p, rng, margin, attempt);
      const geometry = validatePatternGeometry(candidate.points, p.width, curb, sidewalk);
      if (!geometry.valid) throw new Error(geometry.reasons.join(' · '));
      if (!candidate.measurements.every(m => m.verified) || candidate.measurements.length !== p.cornerCount)
        throw new Error('Measured target angle or curvature change check failed for the selected corner');
      const report: PatternReport = { selected: p.cornerPattern, requested: p.cornerCount,
        inserted: candidate.measurements.length, attempts: attempt + 1, scale, patterns: candidate.measurements, geometry };
      return { points: candidate.points, report };
    } catch (error) { reasons.push(error instanceof Error ? error.message : String(error)); }
  }
  throw new PatternGenerationError(MAX_PATTERN_ATTEMPTS, reasons);
}
