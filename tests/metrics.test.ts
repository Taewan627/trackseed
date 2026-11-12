import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTrack, type Point } from '../src/core.js';
import { readFileSync } from 'node:fs';
import { CURVATURE_BIN_EDGES, CURVATURE_NORM_BIN_EDGES, computeMetrics, curvatureSamples, dlog2 } from '../src/metrics.js';

const close = (actual: number, expected: number, tolerance: number, label = '') =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} vs ${expected} (tolerance ${tolerance})`);

/** Closed regular polygon inscribed in a circle (test helper: Math.sin/cos are fine here). */
function circle(radius: number, count: number, y = 0, direction = 1): Point[] {
  const points = Array.from({ length: count }, (_, i) => {
    const a = direction * i / count * 2 * Math.PI;
    return { x: radius * Math.cos(a), y, z: radius * Math.sin(a) };
  });
  return [...points, { ...points[0] }];
}
/** Stadium: two straights of length `straight` joined by two semicircles of radius `radius`. */
function stadium(straight: number, radius: number, straightSteps = 200, arcSteps = 200): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < straightSteps; i++) pts.push({ x: -straight / 2 + straight * i / straightSteps, y: 0, z: -radius });
  for (let i = 0; i < arcSteps; i++) {
    const a = -Math.PI / 2 + Math.PI * i / arcSteps;
    pts.push({ x: straight / 2 + radius * Math.cos(a), y: 0, z: radius * Math.sin(a) });
  }
  for (let i = 0; i < straightSteps; i++) pts.push({ x: straight / 2 - straight * i / straightSteps, y: 0, z: radius });
  for (let i = 0; i < arcSteps; i++) {
    const a = Math.PI / 2 + Math.PI * i / arcSteps;
    pts.push({ x: -straight / 2 + radius * Math.cos(a), y: 0, z: radius * Math.sin(a) });
  }
  return [...pts, { ...pts[0] }];
}

test('metrics: circle of radius R has length 2 pi R, mean |kappa| 1/R, 360 degrees of turning, zero entropy', () => {
  const R = 400, m = computeMetrics({ points: circle(R, 720) });
  close(m.length, 2 * Math.PI * R, 2 * Math.PI * R * 1e-4, 'length');
  close(m.meanAbsCurvature, 1 / R, 1e-12, 'mean |kappa|');
  close(m.maxAbsCurvature, 1 / R, 1e-12, 'max |kappa|');
  close(m.p95AbsCurvature, 1 / R, 1e-12, 'p95');
  close(m.totalTurningDegrees, 360, 1e-6, 'total turning');
  close(m.boundingBoxArea, (2 * R) * (2 * R), 1e-6 * (2 * R) ** 2, 'bbox');
  assert.equal(m.curvatureEntropyBits, 0);
  assert.equal(m.straightLengthFraction, 0);
  assert.equal(m.turnCount, 0, 'kappa 1/400 is below the turn threshold (1/250)');
  assert.equal(computeMetrics({ points: circle(100, 720) }).turnCount, 1, 'kappa 1/100: one circular run of same-sign curvature');
  assert.equal(m.elevationRange, 0); assert.equal(m.maxAbsSlope, 0); assert.equal(m.meanAbsSlope, 0);
  assert.equal(m.sampleCount, 720); assert.equal(m.curvature.length, 720);
});

test('metrics: curvature sign follows the x/z cross product and flips with direction', () => {
  const a = curvatureSamples(circle(100, 90, 0, 1)), b = curvatureSamples(circle(100, 90, 0, -1));
  assert.ok(a.every(k => k > 0) && b.every(k => k < 0));
  close(a[10], 0.01, 1e-12); close(b[10], -0.01, 1e-12);
});

test('metrics: slope and elevation on a tilted circle', () => {
  const pts = circle(400, 720).map((p, i) => ({ ...p, y: 10 * Math.sin(2 * Math.PI * i / 720) }));
  pts[720] = { ...pts[0] };
  const m = computeMetrics({ points: pts });
  close(m.elevationRange, 20, 1e-3, 'elevation range');
  close(m.maxAbsSlope, 10 * 2 * Math.PI / (2 * Math.PI * 400), 1e-5, 'max slope');
  assert.ok(m.meanAbsSlope > 0 && m.meanAbsSlope < m.maxAbsSlope);
});

test('metrics: straight-heavy shapes have a higher straight-length fraction (by arc length), matching the analytic value', () => {
  const R = 100;
  const short = computeMetrics({ points: stadium(200, R) }), long = computeMetrics({ points: stadium(2000, R) });
  assert.ok(long.straightLengthFraction > short.straightLengthFraction);
  assert.ok(short.straightLengthFraction > 0 && short.straightLengthFraction < 0.5);
  const expected = (L: number) => 2 * L / (2 * L + 2 * Math.PI * R);
  close(short.straightLengthFraction, expected(200), 0.02, 'short stadium'); close(long.straightLengthFraction, expected(2000), 0.02, 'long stadium');
  // 4 curvature transitions (straight/arc) => the two semicircles are two turns
  assert.equal(long.turnCount, 2);
  assert.ok(long.curvatureEntropyBits > 0);
  assert.ok(long.curvatureHistogram.length === CURVATURE_BIN_EDGES.length);
  assert.equal(long.curvatureHistogram.reduce((a, b) => a + b, 0), long.sampleCount);
  // the segment count would say ~50% straight here; arc length says much more
  assert.ok(long.straightLengthFraction > 0.6);
});

test('metrics: dlog2 matches Math.log2 closely and is exact on powers of two', () => {
  for (const e of [-1074, -60, -3, -1, 0, 1, 2, 10, 500, 1023]) assert.equal(dlog2(2 ** e), e);
  let worst = 0;
  for (let i = 1; i <= 2000; i++) { const x = i / 2000 * 0.9999 + 1e-4; worst = Math.max(worst, Math.abs(dlog2(x) - Math.log2(x))); }
  for (const x of [1e-300, 3.14159, 123456.789, 1e300]) worst = Math.max(worst, Math.abs(dlog2(x) - Math.log2(x)) / Math.max(1, Math.abs(Math.log2(x))));
  assert.ok(worst < 1e-12, `worst error ${worst}`);
  assert.equal(dlog2(0), -Infinity); assert.ok(Number.isNaN(dlog2(-1)));
});

test('metrics: entropy equals the Shannon entropy of the documented histogram (Math.log2 reference)', () => {
  const m = computeMetrics({ points: stadium(400, 100, 200, 200) });
  const total = m.curvatureHistogram.reduce((a, b) => a + b, 0);
  assert.equal(total, 800);
  const p = m.curvatureHistogram.filter(c => c > 0).map(c => c / total);
  let h = 0; for (const q of p) h -= q * Math.log2(q);
  close(m.curvatureEntropyBits, h, 1e-12, 'entropy vs Math.log2 reference');
});

test('metrics: deterministic, and finite on generated tracks', () => {
  for (const seed of [1, 2, 3, 42]) {
    const t = generateTrack({ seed });
    const a = computeMetrics(t), b = computeMetrics(generateTrack({ seed }));
    assert.deepEqual(a, b);
    for (const [k, v] of Object.entries(a)) if (typeof v === 'number') assert.ok(Number.isFinite(v), k);
    close(a.length, t.length, 1e-9 * t.length, 'length equals track.length');
    assert.ok(a.straightLengthFraction >= 0 && a.straightLengthFraction <= 1);
    assert.ok(a.curvatureEntropyBits >= 0 && a.curvatureEntropyBits <= 3 + 1e-12);
  }
});

// ---- scale-normalised curvature (WP3b) --------------------------------------------------

const NORM_SCALAR_FIELDS = ['meanAbsCurvatureNorm', 'p95AbsCurvatureNorm', 'maxAbsCurvatureNorm', 'curvatureEntropyBitsNorm',
  'straightLengthFractionNorm'] as const;
/** Relative tolerance for scale invariance (only floating-point rounding of kappa * L under x -> s x). */
const SCALE_REL_TOL = 1e-9;
/** Circle: a regular n-gon has kappaHat = n sin(pi/n) / pi = 1 - O(1/n^2) (about 3.2e-6 at n = 720). */
const CIRCLE_TOL = 1e-5;
const scaled = (pts: Point[], s: number): Point[] => pts.map(p => ({ x: p.x * s, y: p.y * s, z: p.z * s }));

test('metrics (norm): a circle of any radius gives kappaHat = 1 within 1e-5 (n = 720), with stated polygon bias', () => {
  for (const R of [0.5, 7, 400, 12345]) {
    const n = 720, m = computeMetrics({ points: circle(R, n) });
    close(m.meanAbsCurvatureNorm, 1, CIRCLE_TOL, `mean R=${R}`);
    close(m.p95AbsCurvatureNorm, 1, CIRCLE_TOL, `p95 R=${R}`);
    close(m.maxAbsCurvatureNorm, 1, CIRCLE_TOL, `max R=${R}`);
    close(m.meanAbsCurvatureNorm, n * Math.sin(Math.PI / n) / Math.PI, 1e-9, `analytic polygon value R=${R}`);
    assert.equal(m.curvatureEntropyBitsNorm, 0);
    assert.equal(m.curvatureHistogramNorm[2], n, 'all samples in the circle-centred bin [sqrt(1/2), sqrt(2))');
    assert.equal(m.straightLengthFractionNorm, 0);
    assert.equal(m.turnCountNorm, 0, 'circle (kappaHat 1) is not above the turn threshold 2');
  }
  assert.equal(CURVATURE_NORM_BIN_EDGES.length, 8);
});

test('metrics (norm): uniform scaling by 0.5, 2, 10 leaves every normalised field unchanged, old 1/unit fields change', () => {
  const shapes: Array<[string, Point[]]> = [
    ['stadium', stadium(400, 100)], ['seed1', generateTrack({ seed: 1 }).points], ['seed42', generateTrack({ seed: 42 }).points],
    ['hilly circle', circle(300, 360).map((p, i) => ({ ...p, y: 5 * Math.sin(i / 20) }))],
  ];
  shapes[3][1][360] = { ...shapes[3][1][0] };
  for (const [name, pts] of shapes) {
    const base = computeMetrics({ points: pts });
    for (const s of [0.5, 2, 10]) {
      const m = computeMetrics({ points: scaled(pts, s) });
      for (const f of NORM_SCALAR_FIELDS) {
        const a = base[f], b = m[f];
        assert.ok(Math.abs(a - b) <= SCALE_REL_TOL * Math.max(1, Math.abs(a)), `${name} s=${s} ${f}: ${a} vs ${b}`);
      }
      assert.deepEqual(m.curvatureHistogramNorm, base.curvatureHistogramNorm, `${name} s=${s} histogram`);
      assert.equal(m.turnCountNorm, base.turnCountNorm, `${name} s=${s} turns`);
      // legacy fields are scale dependent: kappa ~ 1/s, so the mean scales by 1/s (and the bin counts generally shift)
      close(m.meanAbsCurvature * s, base.meanAbsCurvature, SCALE_REL_TOL * base.meanAbsCurvature, `${name} s=${s} legacy mean`);
      assert.ok(Math.abs(m.meanAbsCurvature - base.meanAbsCurvature) > 0.1 * base.meanAbsCurvature, `${name} s=${s}: legacy mean should differ`);
    }
  }
  // the legacy histogram / turn count do change for at least one shape and scale (the reviewer's point)
  const s1 = generateTrack({ seed: 1 }).points;
  assert.notDeepEqual(computeMetrics({ points: scaled(s1, 10) }).curvatureHistogram, computeMetrics({ points: s1 }).curvatureHistogram);
});

test('metrics (norm): deterministic and well-formed', () => {
  for (const seed of [1, 2, 3, 42]) {
    const a = computeMetrics(generateTrack({ seed })), b = computeMetrics(generateTrack({ seed }));
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.equal(a.curvatureHistogramNorm.reduce((x, y) => x + y, 0), a.sampleCount);
    assert.ok(a.curvatureEntropyBitsNorm >= 0 && a.curvatureEntropyBitsNorm <= 3 + 1e-12);
    assert.ok(a.straightLengthFractionNorm >= 0 && a.straightLengthFractionNorm <= 1);
    assert.ok(a.p95AbsCurvatureNorm <= a.maxAbsCurvatureNorm);
    for (const f of NORM_SCALAR_FIELDS) assert.ok(Number.isFinite(a[f]), f);
  }
  const degenerate = computeMetrics({ points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }] });
  assert.equal(degenerate.meanAbsCurvatureNorm, 0); assert.equal(degenerate.straightLengthFractionNorm, 0);
});

test('metrics (norm): stadium classification is scale free (two turns, straight share by length)', () => {
  const m = computeMetrics({ points: stadium(2000, 100) });
  assert.equal(m.turnCountNorm, 2);
  assert.ok(m.straightLengthFractionNorm > 0.6);
  assert.ok(m.curvatureEntropyBitsNorm > 0);
});

test('metrics: existing fields are bit-identical to the values recorded on master 096a8ea (fixture)', () => {
  const fixture = JSON.parse(readFileSync('tests/fixtures/metrics-master-096a8ea.json', 'utf8')) as
    Record<string, { params: Record<string, number>; metrics: Record<string, unknown> }>;
  const names = Object.keys(fixture);
  assert.equal(names.length, 5);
  for (const name of names) {
    const { params, metrics: old } = fixture[name];
    // the fixture was recorded under v1.0 behaviour: the legacy join is requested explicitly
    const now = computeMetrics(generateTrack({ height: 80, ...params, autoJoin: 'legacy' })) as unknown as Record<string, unknown>;
    for (const key of Object.keys(old)) assert.deepEqual(now[key], old[key], `${name}.${key}`);
    assert.deepEqual(Object.keys(old).sort(), Object.keys(now).filter(k => !k.endsWith('Norm') && !k.endsWith('BitsNorm')).sort(), `${name}: only additive fields`);
  }
});
