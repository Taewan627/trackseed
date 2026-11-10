import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTrack, type Point } from '../src/core.js';
import { CURVATURE_BIN_EDGES, computeMetrics, curvatureSamples, dlog2 } from '../src/metrics.js';

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
