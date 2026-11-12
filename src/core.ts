import { dcos, dhypot, datan2, dsin } from './detmath.js';
import { applyPatterns, type CornerPattern, type PatternReport } from './patterns.js';
export interface Point { x: number; y: number; z: number }
export type SceneType = 'nature' | 'city' | 'mixed';
/**
 * How the Auto generator joins a straight segment to its neighbours.
 * 'legacy'  : v1.0.0 construction, a linear segment between two waypoints next to Catmull-Rom arcs (heading jump at the join).
 * 'tangent' : heading-continuous construction (see joinTangents / docs/generator-auto-join.md).
 * A document that has no `autoJoin` key is a 'legacy' document (written by v1.0.0).
 */
export type AutoJoin = 'legacy' | 'tangent';
export const AUTO_JOINS: readonly AutoJoin[] = ['legacy', 'tangent'];
export interface Params {
  curves: number; straight: number; width: number; size: number; height: number;
  obstacles: number; density: number; scene: SceneType; seed: number;
  cornerPattern: CornerPattern; cornerCount: number; cornerStrength: number;
  /** Optional in the type so document params (where legacy = absent) stay assignable; sanitize() always returns it set. */
  autoJoin?: AutoJoin;
}
export const DEFAULTS: Params = {
  curves: 6, straight: 0.25, width: 40, size: 2, height: 20,
  obstacles: 3, density: 10, scene: 'mixed', seed: 42,
  cornerPattern: 'auto', cornerCount: 1, cornerStrength: 60,
  autoJoin: 'tangent',
};
export const LIMITS = {
  curves: [3, 10, 1], straight: [0, 0.6, 0.05], width: [20, 80, 1],
  size: [1, 3, 1], height: [0, 200, 5], obstacles: [0, 8, 1],
  density: [0, 20, 1], seed: [0, 2147483647, 1],
  cornerCount: [0, 3, 1], cornerStrength: [20, 100, 1],
} as const;
export const STEPS = 60;
export const CURB = 2.5;
export const SIDEWALK = 17;
export const CURB_HEIGHT = 1.1;
// Encloses every car part even when pitch rotates its height into the XZ plane
// (largest body corner radius is 7.17u). Independent of yaw and road slope.
export const CAR_RADIUS = 7.2;
export const TAU = Math.PI * 2;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function sanitize(input: Partial<Params>): Params {
  const p = { ...DEFAULTS, ...input };
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const [lo, hi] = LIMITS[key];
    const raw = Number(p[key]);
    p[key] = clamp(Number.isFinite(raw) ? raw : DEFAULTS[key], lo, hi);
    if (key !== 'straight') p[key] = Math.round(p[key]);
  }
  if (!['nature', 'city', 'mixed'].includes(p.scene)) p.scene = DEFAULTS.scene;
  if (!['auto', 'right-angle', 'hairpin', 's-curve'].includes(p.cornerPattern)) p.cornerPattern = 'auto';
  if (!AUTO_JOINS.includes(p.autoJoin as AutoJoin)) p.autoJoin = DEFAULTS.autoJoin;
  // The join only shapes the base circuit; a spliced corner pattern re-smooths that circuit (patterns.ts smoothBase),
  // so there the option is inert and canonicalised to 'legacy': pattern-mode output and documents stay v1.0.0-identical.
  if (p.cornerPattern !== 'auto' && p.cornerCount > 0) p.autoJoin = 'legacy';
  return p;
}

// Explicit PRNG; independent streams keep scenery settings from changing the layout.
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function catmull(a: number, b: number, c: number, d: number, t: number): number {
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t
    + (-a + 3 * b - 3 * c + d) * t * t * t);
}

// Both harmonics are periodic: position AND height derivative match at the seam.
export function elevation(t: number, p: Params): number {
  return (dsin(t * TAU * 2 + p.seed * 0.01)
    + dsin(t * TAU * 4 + p.seed * 0.02) * 0.4) * p.height;
}

/** Fraction of a straight segment (in samples, of STEPS) given to each blended end of the 'tangent' join. */
export const JOIN_BLEND = 0.35;
/** Factor on the Catmull-Rom magnitude of every tangent that the 'tangent' join re-aims at a straight (larger = gentler bend near the join). */
export const JOIN_GAIN = 1.75;
const hermite = (p0: number, p1: number, m0: number, m1: number, s: number) =>
  (2 * s * s * s - 3 * s * s + 1) * p0 + (s * s * s - 2 * s * s + s) * m0
  + (-2 * s * s * s + 3 * s * s) * p1 + (s * s * s - s * s) * m1;

/**
 * Hermite derivative (Catmull-Rom scale) at every waypoint for the 'tangent' join. `plain` marks waypoints that keep the
 * Catmull-Rom tangent (no adjacent straight). Next to exactly one straight the tangent follows that straight's chord;
 * between two straights it is the bisector of both chords (each straight then blends into it over JOIN_BLEND of its length).
 * Magnitude is JOIN_GAIN x the Catmull-Rom magnitude.
 */
function joinTangents(w: Point[], straight: boolean[]) {
  const n = w.length;
  const tangents: { x: number; z: number }[] = [], plain: boolean[] = [];
  const unit = (a: Point, b: Point) => { const l = dhypot(b.x - a.x, b.z - a.z) || 1; return { x: (b.x - a.x) / l, z: (b.z - a.z) / l }; };
  for (let k = 0; k < n; k++) {
    const prev = w[(k - 1 + n) % n], cur = w[k], next = w[(k + 1) % n];
    const cx = (next.x - prev.x) / 2, cz = (next.z - prev.z) / 2, mag = dhypot(cx, cz);
    const before = straight[(k - 1 + n) % n], after = straight[k];
    let d: { x: number; z: number } | null = null;
    if (before && after) {
      const a = unit(prev, cur), b = unit(cur, next), sx = a.x + b.x, sz = a.z + b.z, l = dhypot(sx, sz);
      d = l > 1e-9 ? { x: sx / l, z: sz / l } : null; // exact reversal: keep Catmull-Rom
    } else if (before) d = unit(prev, cur);
    else if (after) d = unit(cur, next);
    plain.push(d === null);
    tangents.push(d === null ? { x: cx, z: cz } : { x: d.x * mag * JOIN_GAIN, z: d.z * mag * JOIN_GAIN });
  }
  return { tangents, plain };
}

/** One segment (STEPS samples, sample 0 = waypoint b) of the 'tangent' join. */
function tangentSegment(i: number, w: Point[], straight: boolean[], joins: ReturnType<typeof joinTangents>, out: { x: number; z: number }[]) {
  const n = w.length;
  const [a, b, c, d] = [-1, 0, 1, 2].map(k => w[(i + k + n) % n]);
  const t0 = joins.tangents[i], t1 = joins.tangents[(i + 1) % n];
  if (!straight[i]) {
    const same = joins.plain[i] && joins.plain[(i + 1) % n];
    for (let j = 0; j < STEPS; j++) {
      const t = j / STEPS;
      out.push(same ? { x: catmull(a.x, b.x, c.x, d.x, t), z: catmull(a.z, b.z, c.z, d.z, t) }
        : { x: hermite(b.x, c.x, t0.x, t1.x, t), z: hermite(b.z, c.z, t0.z, t1.z, t) });
    }
    return;
  }
  // Straight: blended ends only where the neighbour is also straight (there the tangent is not the chord direction).
  const head = straight[(i - 1 + n) % n] ? Math.round(JOIN_BLEND * STEPS) : 0;
  const tail = straight[(i + 1) % n] ? Math.round(JOIN_BLEND * STEPS) : 0;
  const q1 = { x: lerp(b.x, c.x, head / STEPS), z: lerp(b.z, c.z, head / STEPS) };
  const q2 = { x: lerp(b.x, c.x, (STEPS - tail) / STEPS), z: lerp(b.z, c.z, (STEPS - tail) / STEPS) };
  const len = dhypot(c.x - b.x, c.z - b.z) || 1, dx = (c.x - b.x) / len, dz = (c.z - b.z) / len;
  const unitOf = (t: { x: number; z: number }) => { const l = dhypot(t.x, t.z) || 1; return { x: t.x / l, z: t.z / l }; };
  const u0 = unitOf(t0), u1 = unitOf(t1);
  const l0 = dhypot(q1.x - b.x, q1.z - b.z), l1 = dhypot(c.x - q2.x, c.z - q2.z);
  for (let j = 0; j < STEPS; j++) {
    if (j < head) {
      const s = j / head;
      out.push({ x: hermite(b.x, q1.x, u0.x * l0, dx * l0, s), z: hermite(b.z, q1.z, u0.z * l0, dz * l0, s) });
    } else if (j >= STEPS - tail) {
      const s = (j - (STEPS - tail)) / tail;
      out.push({ x: hermite(q2.x, c.x, dx * l1, u1.x * l1, s), z: hermite(q2.z, c.z, dz * l1, u1.z * l1, s) });
    } else {
      const s = (j - head) / (STEPS - head - tail);
      out.push({ x: lerp(q1.x, q2.x, s), z: lerp(q1.z, q2.z, s) });
    }
  }
}

export interface Prop extends Point {
  kind: 'tree' | 'bench' | 'lamp' | 'building'; heading: number; scale: number;
}
export interface Obstacle extends Point { radius: number; heading: number }
export interface Track {
  params: Params; waypoints: Point[]; points: Point[]; normals: { x: number; z: number }[];
  roadEdges: [Point[], Point[]];
  straightSegments: boolean[]; length: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  props: Prop[]; obstacles: Obstacle[];
  patternReport: PatternReport;
}

/** Thrown by strict parameter checking (generateTrack with { strict: true }; the CLI reports it as a usage error). */
export class ParameterError extends Error {
  constructor(message: string) { super(message); this.name = 'ParameterError'; }
}
const PARAM_KEYS = Object.keys(DEFAULTS) as (keyof Params)[];
const isNumericParam = (k: string) => typeof DEFAULTS[k as keyof Params] === 'number';
/**
 * Strict parameter check, shared by the CLI and generateTrack(params, { strict: true }) so that both reject exactly the same input:
 * unknown keys, values of the wrong type (a finite number for numeric parameters, a string for the others), and any value that
 * sanitize() would change (out of range, not an integer where sanitize() rounds, an unknown scene/cornerPattern/autoJoin, or an
 * autoJoin that is inert for the requested corner pattern). Nothing is clamped or rounded. Returns the sanitized parameters.
 * `where` prefixes the message; `hint` is appended inside the parentheses of the out-of-range message.
 */
export function strictParams(raw: unknown, where: string, hint = '; valid ranges are given by LIMITS in src/core.ts'): Params {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new ParameterError(`${where}: parameters must be an object`);
  const input = raw as Record<string, unknown>;
  for (const [k, v] of Object.entries(input)) {
    if (!PARAM_KEYS.includes(k as keyof Params)) throw new ParameterError(`${where}: unknown parameter "${k}" (known: ${PARAM_KEYS.join(', ')})`);
    if (isNumericParam(k) ? typeof v !== 'number' || !Number.isFinite(v) : typeof v !== 'string')
      throw new ParameterError(`${where}: parameter "${k}" must be ${isNumericParam(k) ? 'a finite number' : 'a string'}, got ${JSON.stringify(v)}`);
  }
  const clean = sanitize(input as Partial<Params>);
  for (const [k, v] of Object.entries(input)) {
    if (clean[k as keyof Params] !== v) throw new ParameterError(
      `${where}: parameter "${k}" = ${JSON.stringify(v)} is not valid (sanitized to ${JSON.stringify(clean[k as keyof Params])}${hint})`);
  }
  return clean;
}
export interface GenerateOptions {
  /** Reject (throw ParameterError) instead of clamping/rounding silently; see strictParams(). Default false. */
  strict?: boolean;
}

export function generateTrack(input: Partial<Params> = {}, options: GenerateOptions = {}): Track {
  const p = options.strict ? strictParams(input, 'generateTrack (strict)') : sanitize(input);
  const rng = random(p.seed);
  const radius = 300 + p.size * 60;
  const waypoints = Array.from({ length: p.curves }, (_, i) => {
    const r = radius * (0.7 + rng() * 0.4);
    const a = i / p.curves * TAU - Math.PI / 2 + (rng() * 0.7 - 0.35) * Math.PI * 0.7 / p.curves;
    return { x: dcos(a) * r, y: 0, z: dsin(a) * r };
  });
  const order = Array.from({ length: p.curves }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const straightSegments = Array<boolean>(p.curves).fill(false);
  order.slice(0, Math.round(p.straight * p.curves)).forEach(i => { straightSegments[i] = true; });
  const points: Point[] = [];
  const joins = p.autoJoin === 'tangent' ? joinTangents(waypoints, straightSegments) : null;
  for (let i = 0; i < p.curves; i++) {
    if (joins) {
      const xz: { x: number; z: number }[] = [];
      tangentSegment(i, waypoints, straightSegments, joins, xz);
      xz.forEach((q, j) => points.push({ x: q.x, z: q.z, y: elevation((i + j / STEPS) / p.curves, p) }));
      continue;
    }
    const [a, b, c, d] = [-1, 0, 1, 2].map(k => waypoints[(i + k + p.curves) % p.curves]);
    for (let j = 0; j < STEPS; j++) {
      const t = j / STEPS;
      points.push({
        x: straightSegments[i] ? lerp(b.x, c.x, t) : catmull(a.x, b.x, c.x, d.x, t),
        z: straightSegments[i] ? lerp(b.z, c.z, t) : catmull(a.z, b.z, c.z, d.z, t),
        y: elevation((i + t) / p.curves, p),
      });
    }
  }
  // The duplicate endpoint also makes mesh/minimap seam topology explicit.
  points.push({ ...points[0] });
  let patternReport: PatternReport = { selected: p.cornerPattern, requested: 0, inserted: 0,
    attempts: 0, scale: 1, patterns: [], geometry: null };
  if (p.cornerPattern !== 'auto' && p.cornerCount > 0) {
    const result = applyPatterns(points, p, random(p.seed ^ 0x3c04a1), CURB, SIDEWALK);
    points.splice(0, points.length, ...result.points);
    // Arc-length resampling gives a periodic height profile across every collar.
    for (let i = 0; i < points.length; i++) points[i].y = elevation(i / (points.length - 1), p);
    points[points.length - 1] = { ...points[0] };
    patternReport = result.report;
  }
  const n = points.length - 1;
  const normals = points.map((_, i) => {
    const a = points[(i - 1 + n) % n], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = dhypot(dx, dz) || 1;
    return { x: -dz / len, z: dx / len };
  });
  const margin = p.width / 2 + CURB + SIDEWALK;
  let length = 0;
  for (let i = 0; i < n; i++) length += dhypot(points[i + 1].x - points[i].x,
    points[i + 1].y - points[i].y, points[i + 1].z - points[i].z);
  const track: Track = {
    params: p, waypoints, points, normals, straightSegments, length, patternReport,
    // These exact float32 vertices are shared with the rendered asphalt ribbon.
    roadEdges: [-1, 1].map(side => points.map((pt, i) => ({
      x: Math.fround(pt.x + normals[i].x * side * p.width / 2),
      y: Math.fround(pt.y), z: Math.fround(pt.z + normals[i].z * side * p.width / 2),
    }))) as [Point[], Point[]],
    bounds: {
      minX: Math.min(...points.map(v => v.x)) - margin, maxX: Math.max(...points.map(v => v.x)) + margin,
      minZ: Math.min(...points.map(v => v.z)) - margin, maxZ: Math.max(...points.map(v => v.z)) + margin,
      minY: Math.min(...points.map(v => v.y)), maxY: Math.max(...points.map(v => v.y)),
    },
    props: [], obstacles: [],
  };
  track.obstacles = makeObstacles(track);
  track.props = makeProps(track);
  return track;
}

export interface Projection extends Point {
  distance: number; index: number; t: number; dx: number; dz: number; slope: number;
}
export function project(track: Track, x: number, z: number, hint?: number): Projection {
  let best = Infinity;
  let result!: Projection;
  const count = track.points.length - 1;
  // A car moves at most 1.34u per substep. Stay on its local branch, wrapping
  // through the seam, rather than selecting a nearby but unrelated segment.
  const local = hint !== undefined && hint >= 0 && hint < count;
  for (let k = 0; k < (local ? 17 : count); k++) {
    const i = local ? (hint! + k - 8 + count) % count : k;
    const a = track.points[i], b = track.points[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (len2 || 1), 0, 1);
    const px = a.x + dx * t, pz = a.z + dz * t;
    const dist2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (dist2 < best) {
      best = dist2;
      const len = Math.sqrt(len2) || 1;
      result = { x: px, y: lerp(a.y, b.y, t), z: pz, t, index: i,
        distance: Math.sqrt(dist2), dx: dx / len, dz: dz / len, slope: (b.y - a.y) / len };
    }
  }
  return result;
}

export interface RoadContact { clearance: number; nx: number; nz: number }
// Signed distance to the actual asphalt edges. Reference membership handles
// concave vertices and the closed seam without trusting a nearest sample normal.
export function roadContact(track: Track, x: number, z: number): RoadContact {
  let result: RoadContact = { clearance: Infinity, nx: 0, nz: 0 };
  const reference = track.points[0];
  for (const edge of track.roadEdges) {
    let inside = false, referenceInside = false, best = Infinity, qx = 0, qz = 0;
    let fallbackX = 0, fallbackZ = 0;
    for (let i = 0; i < edge.length - 1; i++) {
      const a = edge[i], b = edge[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      if ((a.z > z) !== (b.z > z) && x < a.x + dx * (z - a.z) / dz) inside = !inside;
      if ((a.z > reference.z) !== (b.z > reference.z) &&
        reference.x < a.x + dx * (reference.z - a.z) / dz) referenceInside = !referenceInside;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const px = a.x + dx * t, pz = a.z + dz * t, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 < best) {
        best = d2; qx = px; qz = pz;
        const center = track.points[i], length = dhypot(dx, dz) || 1;
        const sign = Math.sign(-dz * (center.x - a.x) + dx * (center.z - a.z));
        fallbackX = -dz / length * sign; fallbackZ = dx / length * sign;
      }
    }
    const distance = Math.sqrt(best), sign = inside === referenceInside ? 1 : -1;
    if (distance * sign < result.clearance) result = { clearance: distance * sign,
      nx: distance > 1e-9 ? (x - qx) / distance * sign : fallbackX,
      nz: distance > 1e-9 ? (z - qz) / distance * sign : fallbackZ };
  }
  return result;
}

// Barycentric height on the same two triangles used by the asphalt mesh.
export function roadHeight(track: Track, x: number, z: number, hit = project(track, x, z)): number {
  const count = track.points.length - 1;
  let height = -Infinity;
  const [left, right] = track.roadEdges;
  // At an abrupt join, a ribbon triangle can extend beyond the nearest few
  // center samples. Check bounds globally, then choose the visible top surface.
  for (let i = 0; i < count; i++) {
    if (x < Math.min(left[i].x, left[i + 1].x, right[i].x, right[i + 1].x) - 1e-6 ||
      x > Math.max(left[i].x, left[i + 1].x, right[i].x, right[i + 1].x) + 1e-6 ||
      z < Math.min(left[i].z, left[i + 1].z, right[i].z, right[i + 1].z) - 1e-6 ||
      z > Math.max(left[i].z, left[i + 1].z, right[i].z, right[i + 1].z) + 1e-6) continue;
    for (const [a, b, c] of [[left[i], left[i + 1], right[i]], [right[i], left[i + 1], right[i + 1]]]) {
      const det = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(det) < 1e-12) continue;
      const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / det;
      const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / det;
      if (u >= 0 && v >= 0 && u + v <= 1) {
        height = Math.max(height, a.y * u + b.y * v + c.y * (1 - u - v));
      }
    }
  }
  return Number.isFinite(height) ? height : hit.y;
}

function makeObstacles(track: Track): Obstacle[] {
  const rng = random(track.params.seed ^ 0x185f);
  const n = track.points.length - 1;
  return Array.from({ length: track.params.obstacles }, (_, i) => {
    // Keep a generous start zone free, including the wrap-around side.
    const idx = Math.floor(n * (0.09 + (i + rng() * 0.5) / Math.max(1, track.params.obstacles) * 0.8));
    const pt = track.points[idx], normal = track.normals[idx];
    const offset = (rng() - 0.5) * track.params.width * 0.5;
    return { x: pt.x + normal.x * offset, y: pt.y, z: pt.z + normal.z * offset,
      radius: 4, heading: datan2(normal.z, -normal.x) };
  });
}

function makeProps(track: Track): Prop[] {
  const { params: p, points, normals } = track;
  const count = p.density * 8;
  if (count === 0) return [];
  const rng = random(p.seed ^ 0x3af197);
  const props: Prop[] = [];
  const n = points.length - 1;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(((i + 0.2 + rng() * 0.6) / count) * n) % n;
    const pt = points[idx], normal = normals[idx], side = i % 2 ? -1 : 1;
    const choices: Prop['kind'][] = p.scene === 'nature' ? ['tree', 'tree', 'bench', 'lamp']
      : p.scene === 'city' ? ['building', 'building', 'bench', 'lamp'] : ['tree', 'building', 'bench', 'lamp'];
    const kind = choices[i % choices.length];
    const scale = 0.75 + rng() * 0.5;
    const dist = p.width / 2 + CURB + (kind === 'building' ? SIDEWALK + 18 + rng() * 24 : 8 + rng() * 3);
    const x = pt.x + normal.x * side * dist, z = pt.z + normal.z * side * dist;
    // Check the whole track, so props cannot invade a nearby corner or start zone.
    const clearance = kind === 'building' ? 13 * scale : 5 * scale;
    if (project(track, x, z).distance < p.width / 2 + CURB + clearance) continue;
    if (dhypot(x - points[0].x, z - points[0].z) < 32) continue;
    props.push({ x, y: pt.y + (kind === 'building' ? 0 : CURB_HEIGHT), z, kind, scale,
      heading: datan2(normal.z, -normal.x) });
  }
  return props;
}

export function mapTransform(track: Track, width: number, height: number, padding = 18) {
  const b = track.bounds;
  const scale = Math.min((width - padding * 2) / (b.maxX - b.minX),
    (height - padding * 2) / (b.maxZ - b.minZ));
  const cx = (b.maxX + b.minX) / 2, cz = (b.maxZ + b.minZ) / 2;
  return { scale, point: (x: number, z: number) => ({ x: width / 2 + (x - cx) * scale,
    y: height / 2 + (z - cz) * scale }) };
}
