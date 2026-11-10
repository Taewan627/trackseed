// Geometric track metrics (headless, pure, deterministic).
//
// Every field is a plain geometric quantity of the centerline (x/z plane for
// planar quantities, y for elevation). Nothing here estimates "fun" or
// "difficulty". Like the generator, this module avoids Math.sin/cos/atan2/hypot/
// exp/log/pow: it uses src/detmath.ts plus +, -, *, /, Math.sqrt and exact
// operations only (including a local deterministic log2 for the entropy).
import { datan2, dhypot } from './detmath.js';
import type { Point } from './core.js';

/** Minimal input: the closed centerline in TrackLab convention (last point repeats the first). */
export interface MetricsInput { points: Point[] }

/** |curvature| (1/unit) below which a segment counts as straight (radius >= 2000 units). */
export const STRAIGHT_KAPPA = 5e-4;
/** |curvature| (1/unit) above which a sample belongs to a turn (radius <= 250 units). */
export const TURN_KAPPA = 4e-3;
/**
 * Lower edges of the fixed |curvature| histogram bins (1/unit). Bin k is
 * [EDGES[k], EDGES[k+1]); the last bin is [EDGES.at(-1), +inf). Log-spaced
 * (factor 2) from radius 2000 down to radius ~31 units, 8 bins in total.
 */
export const CURVATURE_BIN_EDGES: readonly number[] = [0, 5e-4, 1e-3, 2e-3, 4e-3, 8e-3, 1.6e-2, 3.2e-2];

export interface MetricsOptions { straightKappa?: number; turnKappa?: number }

export interface TrackMetrics {
  /** Number of distinct centerline samples (points.length - 1). */
  sampleCount: number;
  /** Closed 3D arc length: sum of Euclidean segment lengths (x, y, z). */
  length: number;
  /** Area of the axis-aligned x/z bounding box of the centerline points (no road margin). */
  boundingBoxArea: number;
  /** Arc length (3D) of straight segments divided by total length, in [0, 1]. */
  straightLengthFraction: number;
  meanAbsCurvature: number;
  maxAbsCurvature: number;
  /** 95th percentile of |curvature| over samples (nearest rank: ceil(0.95 n)-th smallest). */
  p95AbsCurvature: number;
  /** Shannon entropy (bits) of the |curvature| histogram defined by CURVATURE_BIN_EDGES. */
  curvatureEntropyBits: number;
  /** Sample counts per histogram bin (length CURVATURE_BIN_EDGES.length). */
  curvatureHistogram: number[];
  /** Number of maximal runs of consecutive same-sign samples with |curvature| > turnKappa (seam-merged). */
  turnCount: number;
  /** max(y) - min(y) over centerline points. */
  elevationRange: number;
  /** Max |dy| / planar run over segments (segments with zero planar run are skipped). */
  maxAbsSlope: number;
  /** Sum |dy| / sum planar run over segments (run-weighted mean of |slope|). */
  meanAbsSlope: number;
  /** Sum over vertices of the absolute heading change in the x/z plane, in degrees. */
  totalTurningDegrees: number;
  /** Signed discrete curvature per sample (1/unit), length sampleCount. */
  curvature: number[];
}

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Deterministic log2 for x > 0: exponent by exact halving/doubling, mantissa
 * m in [sqrt(1/2), sqrt(2)) via ln(m) = 2 atanh((m-1)/(m+1)) with a fixed
 * 20-term series (truncation error < 1e-19). Only + - * / are used.
 */
export function dlog2(x: number): number {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  let m = x, e = 0;
  while (m >= 1.4142135623730951) { m /= 2; e++; }
  while (m < 0.7071067811865476) { m *= 2; e--; }
  const s = (m - 1) / (m + 1), s2 = s * s;
  let term = s, sum = 0;
  for (let k = 0; k < 20; k++) { sum += term / (2 * k + 1); term *= s2; }
  return e + 2 * sum / 0.6931471805599453;
}

/**
 * Signed discrete (Menger) curvature of the x/z projection at each sample i of
 * the closed loop (neighbours wrap, points[n] == points[0]):
 *   kappa = 2 * cross(b - a, c - b) / (|b - a| |c - b| |c - a|),
 * i.e. 1/R of the circle through three consecutive samples, positive when the
 * x/z cross product is positive. Degenerate (coincident) triples give 0.
 */
export function curvatureSamples(points: Point[]): number[] {
  const n = points.length - 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n], b = points[i], c = points[(i + 1) % n];
    const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z;
    const denom = dhypot(ux, uz) * dhypot(vx, vz) * dhypot(c.x - a.x, c.z - a.z);
    out.push(denom > 0 ? 2 * (ux * vz - uz * vx) / denom : 0);
  }
  return out;
}

/** Heading change (degrees, signed) at vertex i of the closed loop, x/z plane. */
export function headingChangesDegrees(points: Point[]): number[] {
  const n = points.length - 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n], b = points[i], c = points[(i + 1) % n];
    const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z;
    out.push(datan2(ux * vz - uz * vx, ux * vx + uz * vz) * RAD_TO_DEG);
  }
  return out;
}

function countTurns(kappa: number[], threshold: number): number {
  const n = kappa.length;
  const sign = kappa.map(k => Math.abs(k) > threshold ? (k > 0 ? 1 : -1) : 0);
  let runs = 0;
  for (let i = 0; i < n; i++) if (sign[i] !== 0 && sign[i] !== sign[(i - 1 + n) % n]) runs++;
  // Every sample above threshold with one sign: a single circular run has no start.
  if (runs === 0 && n > 0 && sign.every(s => s === sign[0] && s !== 0)) return 1;
  return runs;
}

export function computeMetrics(track: MetricsInput, options: MetricsOptions = {}): TrackMetrics {
  const straightKappa = options.straightKappa ?? STRAIGHT_KAPPA;
  const turnKappa = options.turnKappa ?? TURN_KAPPA;
  const pts = track.points, n = pts.length - 1;
  const kappa = curvatureSamples(pts);
  const abs = kappa.map(Math.abs);

  let length = 0, straight = 0, rise = 0, run = 0, maxSlope = 0;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i <= n; i++) {
    const p = pts[i];
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = dhypot(b.x - a.x, b.y - a.y, b.z - a.z), planar = dhypot(b.x - a.x, b.z - a.z);
    length += seg;
    if (abs[i] < straightKappa && abs[(i + 1) % n] < straightKappa) straight += seg;
    if (planar > 0) {
      const dy = Math.abs(b.y - a.y);
      rise += dy; run += planar; maxSlope = Math.max(maxSlope, dy / planar);
    }
  }

  const histogram = CURVATURE_BIN_EDGES.map(() => 0);
  for (const k of abs) {
    let bin = 0;
    while (bin + 1 < CURVATURE_BIN_EDGES.length && k >= CURVATURE_BIN_EDGES[bin + 1]) bin++;
    histogram[bin]++;
  }
  let entropy = 0;
  for (const count of histogram) if (count > 0) { const p = count / n; entropy -= p * dlog2(p); }

  const sorted = [...abs].sort((a, b) => a - b);
  const p95 = n > 0 ? sorted[Math.ceil(95 * n / 100) - 1] : 0;
  let total = 0, turning = 0;
  for (const k of abs) total += k;
  for (const t of headingChangesDegrees(pts)) turning += Math.abs(t);

  return {
    sampleCount: n, length, boundingBoxArea: (maxX - minX) * (maxZ - minZ),
    straightLengthFraction: length > 0 ? straight / length : 0,
    meanAbsCurvature: n > 0 ? total / n : 0, maxAbsCurvature: n > 0 ? sorted[n - 1] : 0, p95AbsCurvature: p95,
    curvatureEntropyBits: entropy === 0 ? 0 : entropy, curvatureHistogram: histogram,
    turnCount: countTurns(kappa, turnKappa),
    elevationRange: maxY - minY, maxAbsSlope: maxSlope, meanAbsSlope: run > 0 ? rise / run : 0,
    totalTurningDegrees: turning, curvature: kappa,
  };
}
