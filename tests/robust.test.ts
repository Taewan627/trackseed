// WP7a: scale-relative tolerances, large inputs, duplicate vertices, sampling requirement and smooth resampling of the polyline path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateTrack } from '../src/core.js';
import { TOLERANCE_BAND_HI, TOLERANCE_BAND_LO, toleranceScale, validateTrack } from '../src/validate.js';
import { computeMetrics } from '../src/metrics.js';
import { trackFromPolyline, type PolylineOptions } from '../src/polyline.js';

const CLI = join(process.cwd(), 'cli-dist', 'cli.js');
const run = (args: string[]) => { const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); return { code: r.status, out: r.stdout, err: r.stderr }; };
type P = { x: number; y?: number; z: number };
const circle = (n: number, r: number): P[] => Array.from({ length: n }, (_, i) => ({ x: r * Math.cos(2 * Math.PI * i / n), z: r * Math.sin(2 * Math.PI * i / n) }));
const codes = (r: ReturnType<typeof validateTrack>) => [...new Set(r.violations.map(v => v.code))].sort();
const verdict = (pts: P[], width: number, opt: PolylineOptions = {}, vo = {}) => validateTrack(trackFromPolyline({ points: pts, width, closed: true }, opt), vo);
const withSpike = (pts: P[], k: number, d: number): P[] => pts.map((p, i) => { if (i !== k) return { ...p }; const r = Math.hypot(p.x, p.z); return { x: p.x * (r + d) / r, z: p.z * (r + d) / r }; });
/** Rounded rectangle (straights L, corner radius R) with vertex spacing about `s`, as in the second red team's probe. */
function roundedRect(L: number, R: number, s: number): P[] {
  const out: P[] = [], cs = [[L / 2, L / 2], [-L / 2, L / 2], [-L / 2, -L / 2], [L / 2, -L / 2]];
  for (let c = 0; c < 4; c++) {
    const [cx, cz] = cs[c], a0 = c * Math.PI / 2, nArc = Math.max(1, Math.round(Math.PI / 2 * R / s));
    for (let j = 0; j < nArc; j++) { const a = a0 + Math.PI / 2 * j / nArc; out.push({ x: cx + R * Math.cos(a), z: cz + R * Math.sin(a) }); }
    const a1 = a0 + Math.PI / 2, sx = cx + R * Math.cos(a1), sz = cz + R * Math.sin(a1);
    const [nx, nz] = cs[(c + 1) % 4], ex = nx + R * Math.cos(a1), ez = nz + R * Math.sin(a1), nS = Math.max(1, Math.round(L / s));
    for (let j = 0; j < nS; j++) out.push({ x: sx + (ex - sx) * j / nS, z: sz + (ez - sz) * j / nS });
  }
  return out;
}

// ---- 1. scale-relative tolerances -------------------------------------------------------------------------
test('tolerances: toleranceScale is 1 on the band, continuous at its edges, proportional outside', () => {
  const diag = (d: number) => [{ x: 0, y: 0, z: 0 }, { x: d, y: 0, z: 0 }];
  for (const d of [TOLERANCE_BAND_LO, 500, 1400, 4000, TOLERANCE_BAND_HI]) assert.equal(toleranceScale(diag(d) as never), 1, String(d));
  assert.equal(toleranceScale(diag(TOLERANCE_BAND_LO / 100) as never), 0.01);
  assert.equal(toleranceScale(diag(TOLERANCE_BAND_HI * 100) as never), 100);
  assert.equal(toleranceScale([{ x: 1, y: 2, z: 3 }] as never), 1); // zero extent
  assert.equal(toleranceScale([{ x: 0, y: 0, z: 0 }, { x: NaN, y: 0, z: 0 }] as never), 1);
});

test('tolerances: every TrackLab track gives bit-identical reports with and without the scale-relative tolerances', () => {
  for (const seed of [0, 1, 2, 3, 7, 42, 99, 123, 500, 2024]) for (const params of [{}, { size: 1 }, { size: 3, width: 80 }, { cornerPattern: 'hairpin' as const }, { autoJoin: 'legacy' as const, curves: 10, straight: 0.5 }]) {
    const t = generateTrack({ seed, ...params });
    assert.ok(toleranceScale(t.points) === 1);
    const a = validateTrack(t), b = validateTrack(t, { absoluteTolerances: true });
    assert.deepEqual(a, b);
    assert.ok(!a.checks.some(c => 'toleranceScale' in c.stats));
  }
});

test('tolerances: a valid track, scaled with its width by 1e-4 .. 1e5, keeps ok and error codes (it was EDGE_FOLD at 1e-4)', () => {
  for (const seed of [42, 5, 17]) {
    const t = generateTrack({ seed }), base = t.points.slice(0, -1).map(p => ({ x: p.x, y: p.y, z: p.z }));
    const ref = verdict(base, t.params.width);
    assert.equal(ref.ok, true);
    for (const s of [1e-4, 1e-3, 1e-2, 1, 1e3, 1e5]) {
      const r = verdict(base.map(p => ({ x: p.x * s, y: p.y * s, z: p.z * s })), t.params.width * s);
      assert.equal(r.ok, ref.ok, `seed ${seed} scale ${s}: ${codes(r)}`);
      assert.deepEqual(codes(r), codes(ref), `seed ${seed} scale ${s}`);
      assert.deepEqual(r.checks.map(c => [c.id, c.failures]), ref.checks.map(c => [c.id, c.failures]), `seed ${seed} scale ${s}`);
    }
  }
  // the old absolute behaviour stays available and shows the defect that was fixed
  const t = generateTrack({ seed: 42 }), pts = t.points.slice(0, -1).map(p => ({ x: p.x * 1e-4, y: p.y * 1e-4, z: p.z * 1e-4 }));
  assert.deepEqual(codes(verdict(pts, t.params.width * 1e-4, {}, { absoluteTolerances: true })), ['EDGE_FOLD']);
});

test('tolerances: invalid tracks give the same error codes at every scale', () => {
  const eight = Array.from({ length: 400 }, (_, i) => ({ x: 300 * Math.sin(2 * Math.PI * i / 400), y: 10 + 10 * Math.cos(2 * Math.PI * i / 400), z: 150 * Math.sin(4 * Math.PI * i / 400) }));
  const spiky = withSpike(circle(360, 500), 100, 20);
  for (const [name, pts, width] of [['figure-eight', eight, 10], ['spike', spiky, 10]] as const) {
    const ref = verdict(pts, width);
    assert.equal(ref.ok, false, name);
    for (const s of [1e-4, 1e-2, 1, 1e3, 1e5]) {
      const r = verdict(pts.map(p => ({ x: p.x * s, y: (p as P).y !== undefined ? (p as P).y! * s : 0, z: p.z * s })), width * s);
      assert.deepEqual(codes(r), codes(ref), `${name} scale ${s}`);
    }
  }
});

test('tolerances: closure and height tolerance follow the scale; explicit values are used literally; stats report the factor only outside the band', () => {
  const sq = (s: number) => [{ x: 0, y: 0, z: 0 }, { x: 100 * s, y: 0, z: 0 }, { x: 100 * s, y: 0, z: 100 * s }, { x: 0, y: 0, z: 100 * s }, { x: 0, y: 0, z: 0 }];
  const build = (s: number, gap: number) => { const q = sq(s); q[4] = { x: gap, y: 0, z: 0 }; return { params: { width: 2 * s }, points: q, roadEdges: [q.map(p => ({ ...p })), q.map(p => ({ ...p, x: p.x + 1e-9 }))] as [typeof q, typeof q] }; };
  // D = 141 * s; at s = 1e-3 the closure limit is 1e-6 * 0.0141 = 1.4e-8, so a gap of 1e-7 fails, whereas the absolute 1e-6 would accept it
  assert.ok(codes(validateTrack(build(1e-3, 1e-7))).includes('CLOSURE_POSITION'));
  assert.ok(!codes(validateTrack(build(1e-3, 1e-7), { absoluteTolerances: true })).includes('CLOSURE_POSITION'));
  assert.ok(!codes(validateTrack(build(1e-3, 1e-7), { closureTolerance: 1e-6 })).includes('CLOSURE_POSITION')); // explicit value: literal
  const small = validateTrack(build(1e-3, 0)), normal = validateTrack(build(1, 0));
  assert.ok(Math.abs(small.checks.find(c => c.id === 'closure')!.stats.toleranceScale - Math.sqrt(2) * 0.1 / TOLERANCE_BAND_LO) < 1e-12);
  assert.ok('toleranceScale' in small.checks.find(c => c.id === 'edge-fold')!.stats);
  assert.ok(!('toleranceScale' in normal.checks.find(c => c.id === 'closure')!.stats));
});

// ---- 2. large inputs ---------------------------------------------------------------------------------------
test('large input: 200,000 vertices (library): no stack overflow, linear-time hash, correct verdicts', () => {
  const N = 200_000, pts = circle(N, 1000);
  const t0 = Date.now();
  const tr = trackFromPolyline({ points: pts, width: 10, closed: true });
  assert.equal(tr.points.length, N + 1); assert.equal(tr.duplicatePointsRemoved, 0);
  assert.ok(Math.abs(tr.bounds.maxX - 1005) < 1e-6 && Math.abs(tr.bounds.minZ + 1005) < 1e-6);
  const v = validateTrack(tr);
  assert.equal(v.ok, true, JSON.stringify(v.violations.slice(0, 3)));
  assert.equal(v.checks.find(c => c.id === 'self-intersection')!.checked, 3 * N);
  assert.equal(computeMetrics(tr).sampleCount, N);
  assert.ok(Date.now() - t0 < 60_000, `took ${Date.now() - t0} ms`);
  // a real defect is still found in a dense input: two swapped far-apart vertices make the centreline cross itself
  const bad = pts.map(p => ({ ...p }));
  [bad[1000], bad[100_000]] = [bad[100_000], bad[1000]];
  const rb = validateTrack(trackFromPolyline({ points: bad, width: 10, closed: true }));
  assert.equal(rb.ok, false); assert.ok(codes(rb).includes('SELF_INTERSECTION_CENTERLINE'));
});

test('large input: 200,000 vertices through the CLI (validate-polyline, metrics-polyline); absurd resample requests are errors, not crashes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracklab-big-'));
  try {
    const f = join(dir, 'big.json');
    writeFileSync(f, JSON.stringify(circle(200_000, 1000).map(p => [p.x, p.z])));
    const a = run(['validate-polyline', f, '--width', '10']);
    assert.equal(a.code, 0, a.err.slice(0, 300));
    const ra = JSON.parse(a.out); assert.equal(ra.ok, true); assert.equal(ra.input.sampleCount, 200_000); assert.equal(ra.input.duplicatePointsRemoved, 0);
    const m = run(['metrics-polyline', f, '--width', '10']); assert.equal(m.code, 0, m.err.slice(0, 300));
    assert.equal(JSON.parse(m.out).sampleCount, 200_000);
    const huge = run(['validate-polyline', f, '--width', '10', '--resample-spacing', '1e-6']);
    assert.equal(huge.code, 2); assert.match(huge.err, /limit 5000000/);
    const huge2 = run(['validate-polyline', f, '--width', '10', '--resample-smooth', '1e-3']);
    assert.equal(huge2.code, 2); assert.match(huge2.err, /5000000/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---- 3. duplicate vertices ---------------------------------------------------------------------------------
test('duplicates: consecutive duplicate vertices are removed and counted; the verdict is that of the clean polyline', () => {
  const clean = circle(360, 500), dup = [...clean]; dup.splice(50, 0, { ...clean[50] });
  const tr = trackFromPolyline({ points: dup, width: 10, closed: true });
  assert.equal(tr.duplicatePointsRemoved, 1); assert.equal(tr.points.length, 361); assert.equal(tr.inputPointCount, 361);
  assert.deepEqual(tr.points, trackFromPolyline({ points: clean, width: 10, closed: true }).points);
  assert.deepEqual(validateTrack(tr), validateTrack(trackFromPolyline({ points: clean, width: 10, closed: true })));
  assert.equal(validateTrack(tr).ok, true);
  // a spike whose vertex is duplicated is a LOCAL_KINK, not a self-intersection
  const sp = withSpike(clean, 100, 20), spd = [...sp.slice(0, 101), { ...sp[100] }, ...sp.slice(101)];
  assert.deepEqual(codes(verdict(spd, 10)), codes(verdict(sp, 10))); assert.deepEqual(codes(verdict(sp, 10)), ['LOCAL_KINK']);
  // runs, near duplicates (within 1e-9 of the diagonal), the closing copy given twice, last vs first
  const runs = [clean[0], { ...clean[0] }, { ...clean[0] }, ...clean.slice(1, 10), { x: clean[9].x + 1e-8, z: clean[9].z }, ...clean.slice(10), { x: clean[0].x + 1e-8, z: clean[0].z }, { ...clean[0] }];
  const rr = trackFromPolyline({ points: runs, width: 10, closed: true });
  assert.equal(rr.duplicatePointsRemoved, 4); // 2 + 1 + 1; the exact closing copy of the first point is not counted assert.equal(rr.points.length, 361);
  assert.equal(validateTrack(rr).ok, true);
  // a close but distinct vertex (1e-6 of the diagonal) is kept
  const near = [...clean]; near.splice(50, 0, { x: clean[50].x + 1e-3, z: clean[50].z });
  assert.equal(trackFromPolyline({ points: near, width: 10, closed: true }).duplicatePointsRemoved, 0);
  assert.throws(() => trackFromPolyline({ points: [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 1, z: 1 }], width: 4, closed: true }), /fewer than 3 distinct points after removing 1/);
  // non-finite vertices are never "duplicates": they stay and are reported
  const nan = trackFromPolyline({ points: [...circle(20, 50), { x: NaN, z: 0 }, { x: NaN, z: 0 }], width: 4, closed: true });
  assert.equal(nan.duplicatePointsRemoved, 0); assert.ok(codes(validateTrack(nan)).includes('NON_FINITE'));
});

test('duplicates: TrackLab-generated tracks contain none, so the generated-track path and the round trip are unchanged', () => {
  let minSegment = Infinity;
  for (let seed = 0; seed < 150; seed++) for (const p of [{}, { cornerPattern: 'right-angle' as const }, { cornerPattern: 'hairpin' as const }, { cornerPattern: 's-curve' as const }, { autoJoin: 'legacy' as const, straight: 0.5 }]) {
    const t = generateTrack({ seed, ...p }), pl = trackFromPolyline({ points: t.points, width: t.params.width, closed: true });
    assert.equal(pl.duplicatePointsRemoved, 0); assert.deepEqual(pl.points, t.points); assert.deepEqual(pl.roadEdges, t.roadEdges);
    for (let i = 0; i < t.points.length - 1; i++) minSegment = Math.min(minSegment, Math.hypot(t.points[i + 1].x - t.points[i].x, t.points[i + 1].y - t.points[i].y, t.points[i + 1].z - t.points[i].z));
  }
  assert.ok(minSegment > 1e-3, `shortest segment of 750 generated tracks: ${minSegment}`); // far above 1e-9 x diagonal (about 1e-6)
});

test('duplicates: CLI reports the number removed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracklab-dup-'));
  try {
    const clean = circle(120, 300), dup = [...clean.slice(0, 30), { ...clean[29] }, { ...clean[29] }, ...clean.slice(30)], f = join(dir, 'd.json');
    writeFileSync(f, JSON.stringify(dup.map(p => [p.x, p.z])));
    const r = run(['validate-polyline', f, '--width', '10']);
    assert.equal(r.code, 0, r.err); const j = JSON.parse(r.out);
    assert.equal(j.input.pointCount, 122); assert.equal(j.input.duplicatePointsRemoved, 2); assert.equal(j.input.sampleCount, 120);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---- 4. sampling requirement and smooth resampling ----------------------------------------------------------
test('sampling requirement (1): spacing <= 0.2 R_min never gives a LOCAL_KINK on arcs, including the abrupt straight-to-arc entry', () => {
  const R = 30;
  for (const s of [6, 5, 3, 2]) { const r = verdict(roundedRect(300, R, s), 10); assert.equal(r.ok, true, `s=${s}: ${codes(r)}`); assert.equal(r.checks.find(c => c.id === 'local-kink')!.failures, 0); }
  for (const N of [32, 48, 90, 360]) { const r = verdict(circle(N, 500), 10); assert.equal(r.ok, true, `N=${N}`); } // s = 98 .. 8.7 <= 0.2 x 500
});

test('sampling requirement (2): spacing <= min(9 h, 0.07 R) flags a lateral defect of size h', () => {
  const R = 500;
  for (const [N, h] of [[90, 0.2 * 2 * Math.PI * R / 90 / 1.8], [360, 2 * Math.PI * R / 360 / 9], [720, 0.5], [3600, 0.2]] as const) {
    const s = 2 * Math.PI * R / N; assert.ok(s <= 0.07 * R && s <= 9 * h, `N=${N} s=${s} h=${h}`);
    assert.equal(verdict(withSpike(circle(N, R), 5, h), 10).ok, false, `N=${N}, spike ${h}`);
  }
  // outside the requirement the defect can be missed (the second red team's observation): N=24, a spike of 3.8 road widths
  assert.equal(verdict(withSpike(circle(24, R), 5, 30), 10).ok, true);
});

test('smooth resampling: the rounded rectangle of the second red team becomes ok at spacing 20 and 47 once resampled at <= 5', () => {
  for (const s of [20, 47]) {
    const raw = roundedRect(300, 30, s);
    assert.equal(verdict(raw, 10).ok, false, `raw spacing ${s}`);
    for (const target of [5, 2.5, 1]) {
      const tr = trackFromPolyline({ points: raw, width: 10, closed: true }, { resampleSmooth: { spacing: target } });
      const r = validateTrack(tr);
      assert.equal(r.ok, true, `input spacing ${s}, smooth ${target}: ${codes(r)}`);
      assert.equal(tr.resampled, true); assert.equal(tr.resampledSmooth, true);
    }
  }
  // linear resampling of the same input stays as it was: it does not repair the polygon corners
  assert.equal(verdict(roundedRect(300, 30, 20), 10, { resample: { spacing: 2 } }).ok, false);
});

test('smooth resampling: a genuine spike (20 units on a radius-500 circle of 360 vertices) is still flagged; a clean circle stays ok', () => {
  const spike = withSpike(circle(360, 500), 100, 20);
  for (const target of [5, 2.5, 1]) {
    const r = verdict(spike, 10, { resampleSmooth: { spacing: target } });
    assert.equal(r.ok, false, `smooth ${target}`); assert.ok(codes(r).includes('LOCAL_KINK'), codes(r).join());
  }
  for (const [N, target] of [[360, 5], [60, 5], [24, 5]] as const) assert.equal(verdict(circle(N, 500), 10, { resampleSmooth: { spacing: target } }).ok, true, `N=${N}`);
});

test('smooth resampling: deterministic, passes through the input vertices, closed, exclusive with linear resampling, validated arguments', () => {
  const raw = roundedRect(300, 30, 20), opt = { resampleSmooth: { spacing: 4 } };
  const a = trackFromPolyline({ points: raw, width: 10, closed: true }, opt), b = trackFromPolyline({ points: raw, width: 10, closed: true }, opt);
  assert.deepEqual(a, b);
  assert.deepEqual(a.points[a.points.length - 1], a.points[0]); assert.deepEqual(a.points[0], { x: raw[0].x, y: 0, z: raw[0].z });
  // every input vertex lies within 0.25 of the resampled polyline (the spline interpolates them; a 4-unit chord of a curve with radius >= 20 cuts at most 4^2 / (8 x 20) = 0.1)
  const segDist = (p: P, u: P, v: P) => { const dx = v.x - u.x, dz = v.z - u.z, t = Math.max(0, Math.min(1, ((p.x - u.x) * dx + (p.z - u.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(p.x - u.x - t * dx, p.z - u.z - t * dz); };
  for (const p of raw) { let best = Infinity; for (let i = 0; i < a.points.length - 1; i++) best = Math.min(best, segDist(p, a.points[i], a.points[i + 1])); assert.ok(best < 0.25, `distance ${best}`); }
  assert.throws(() => trackFromPolyline({ points: raw, width: 10, closed: true }, { resample: { spacing: 4 }, resampleSmooth: { spacing: 4 } }), RangeError);
  for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => trackFromPolyline({ points: raw, width: 10, closed: true }, { resampleSmooth: { spacing: bad } }), RangeError);
  assert.equal(trackFromPolyline({ points: raw, width: 10, closed: true }).resampledSmooth, false);
});

test('smooth resampling: CLI --resample-smooth, exclusivity with --resample-spacing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracklab-smooth-'));
  try {
    const f = join(dir, 'rr.json');
    writeFileSync(f, JSON.stringify(roundedRect(300, 30, 47).map(p => [p.x, p.z])));
    const raw = run(['validate-polyline', f, '--width', '10']); assert.equal(raw.code, 1);
    const sm = run(['validate-polyline', f, '--width', '10', '--resample-smooth', '5']); assert.equal(sm.code, 0, sm.err);
    const j = JSON.parse(sm.out); assert.equal(j.input.resampleSmoothSpacing, 5); assert.equal(j.input.resampleSpacing, null); assert.ok(j.input.sampleCount > 200);
    assert.equal(run(['validate-polyline', f, '--width', '10', '--resample-smooth', '5', '--resample-spacing', '5']).code, 2);
    assert.equal(run(['validate-polyline', f, '--width', '10', '--resample-smooth', '0']).code, 2);
    assert.equal(run(['metrics-polyline', f, '--width', '10', '--resample-smooth', '5']).code, 0);
    assert.match(run(['validate-polyline', '--help']).out, /Sampling requirement/);
    assert.equal(run(['validate-polyline', f, '--width', '10', '--absolute-tolerances']).code, 1);
    assert.equal(run(['validate-polyline', f, '--width', '10', '--limit', 'absoluteTolerances=1']).code, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
