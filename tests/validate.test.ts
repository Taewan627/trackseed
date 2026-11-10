import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateTrack, type Params, type Point } from '../src/core.js';
import { exportTrack, importTrack, serializeTrack } from '../src/schema.js';
import { DEFAULT_VALIDATE_OPTIONS, validateTrack, type ValidatableTrack } from '../src/validate.js';

/** Build a validator input from a closed centerline, offsetting edges like core.ts (neighbour-difference normals, float32 edges). */
function build(points: Point[], width = 40): ValidatableTrack {
  const n = points.length - 1;
  const normals = points.map((_, i) => {
    const a = points[(i - 1 + n) % n], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    return { x: -dz / len, z: dx / len };
  });
  const edge = (side: number) => points.map((p, i) => ({ x: Math.fround(p.x + normals[i].x * side * width / 2),
    y: Math.fround(p.y), z: Math.fround(p.z + normals[i].z * side * width / 2) }));
  return { params: { width }, points, roadEdges: [edge(-1), edge(1)] };
}
function circle(radius: number, count: number): Point[] {
  const pts = Array.from({ length: count }, (_, i) => ({ x: radius * Math.cos(i / count * 2 * Math.PI), y: 0, z: radius * Math.sin(i / count * 2 * Math.PI) }));
  return [...pts, { ...pts[0] }];
}
const codes = (r: ReturnType<typeof validateTrack>) => [...new Set(r.violations.map(v => v.code))].sort();
const check = (r: ReturnType<typeof validateTrack>, id: string) => r.checks.find(c => c.id === id)!;

test('validator: a circle is ok, every check is reported as passed with counts', () => {
  const r = validateTrack(build(circle(400, 360)));
  assert.equal(r.ok, true); assert.deepEqual(r.violations, []);
  assert.deepEqual(r.checks.map(c => c.id), ['structure', 'finite', 'closure', 'self-intersection', 'edge-fold', 'min-turn-radius', 'max-slope']);
  for (const c of r.checks) { assert.equal(c.passed, true, c.id); assert.equal(c.skipped, false); assert.equal(c.failures, 0); assert.ok(c.checked > 0, c.id); }
  assert.equal(check(r, 'self-intersection').checked, 3 * 360);
  assert.ok(Math.abs(check(r, 'min-turn-radius').stats.minRadius - 400) < 1e-6);
});

test('validator: figure-eight centerline is a self-intersection error', () => {
  const n = 400, pts = Array.from({ length: n }, (_, i) => {
    const t = i / n * 2 * Math.PI;
    return { x: 300 * Math.sin(t), y: 0, z: 150 * Math.sin(2 * t) }; // lemniscate of Gerono: crosses itself at the origin
  });
  const r = validateTrack(build([...pts, { ...pts[0] }], 20));
  assert.equal(r.ok, false);
  assert.ok(codes(r).includes('SELF_INTERSECTION_CENTERLINE'), codes(r).join());
  assert.ok(check(r, 'self-intersection').stats.centerline >= 1);
  assert.equal(check(r, 'self-intersection').passed, false);
  const v = r.violations.find(x => x.code === 'SELF_INTERSECTION_CENTERLINE')!;
  assert.equal(v.severity, 'error'); assert.ok(v.index !== undefined && v.value !== undefined && v.index < v.value);
});

test('validator: an open polyline is a closure error; a broken seam height and tangent are reported separately', () => {
  const open = circle(400, 360).slice(0, 300);
  const r = validateTrack(build(open));
  assert.equal(r.ok, false); assert.ok(codes(r).includes('CLOSURE_POSITION'));
  assert.ok(check(r, 'closure').stats.positionGap > 100);
  const full = circle(400, 360);
  full[360] = { ...full[360], y: 5 };
  const h = validateTrack(build(full));
  assert.ok(codes(h).includes('CLOSURE_POSITION') && codes(h).includes('CLOSURE_HEIGHT'));
  // a corner at the seam: 90 degree turn between the segment entering and leaving point 0
  const square = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 400 }, { x: 0, y: 0, z: 400 }, { x: 0, y: 0, z: 0 }];
  const sq = validateTrack(build(square, 20));
  // v0.5.0 behaviour (closureTangentMode 'absolute'): every 90 degree corner, including the one at the seam, fails
  const abs = { closureTangentMode: 'absolute' as const };
  const sqAbs = validateTrack(build(square, 20), abs);
  assert.ok(codes(sqAbs).includes('CLOSURE_TANGENT')); assert.ok(Math.abs(check(sqAbs, 'closure').stats.tangentDegrees - 90) < 1e-9);
  assert.equal(validateTrack(build(square, 20), { ...abs, tangentToleranceDegrees: 91 }).violations.some(v => v.code === 'CLOSURE_TANGENT'), false);
  // default 'ratio' mode: the seam of a square turns exactly as much as its neighbouring corners, so it is not an outlier
  assert.equal(codes(sq).includes('CLOSURE_TANGENT'), false);
  assert.ok(Math.abs(check(sq, 'closure').stats.tangentRatio - 1) < 1e-9);
});

test('validator: CLOSURE_TANGENT is a seam-continuity outlier test (v0.5.1)', () => {
  assert.equal(DEFAULT_VALIDATE_OPTIONS.closureTangentMode, 'ratio'); assert.equal(DEFAULT_VALIDATE_OPTIONS.seamRatio, 2);
  // smooth circle sampled coarsely: 12 points, 30 degrees per vertex everywhere. Old rule fails it, new rule passes it.
  const coarse = build(circle(400, 12), 40);
  const r = validateTrack(coarse);
  assert.equal(r.ok, true, codes(r).join());
  assert.ok(Math.abs(check(r, 'closure').stats.tangentDegrees - 30) < 1e-6);
  assert.ok(Math.abs(check(r, 'closure').stats.neighbourhoodMaxDegrees - 30) < 1e-6);
  assert.ok(Math.abs(check(r, 'closure').stats.tangentRatio - 1) < 1e-6);
  assert.ok(codes(validateTrack(coarse, { closureTangentMode: 'absolute' })).includes('CLOSURE_TANGENT'));
  // D shape: a fine 1-degree arc (R = 300) closed by a straight chord. Its only two corners (about 90 degrees each) are the arc ends;
  // starting the loop at one of them puts a heading discontinuity exactly at the seam while the seam's neighbours turn by about 1 degree.
  const R = 300, d: Point[] = [];
  for (let a = -90; a <= 90; a++) d.push({ x: R * Math.cos(a * Math.PI / 180), y: 0, z: R * Math.sin(a * Math.PI / 180) });
  for (let z = R - 8; z > -R + 4; z -= 8) d.push({ x: 0, y: 0, z });
  const kinked = d; // d[0] = (0, -R) is a corner
  const k = validateTrack(build([...kinked, { ...kinked[0] }], 20));
  assert.ok(codes(k).includes('CLOSURE_TANGENT'), codes(k).join());
  const ks = check(k, 'closure').stats;
  assert.ok(ks.tangentDegrees > 85 && ks.neighbourhoodMaxDegrees < 2 && ks.tangentRatio > 40);
  assert.ok(codes(validateTrack(build([...kinked, { ...kinked[0] }], 20), { closureTangentMode: 'absolute' })).includes('CLOSURE_TANGENT'));
  // the same loop started 40 vertices later has a smooth seam (the corners are now interior): no CLOSURE_TANGENT
  const away = [...d.slice(40), ...d.slice(0, 40)];
  const aw = validateTrack(build([...away, { ...away[0] }], 20));
  assert.equal(codes(aw).includes('CLOSURE_TANGENT'), false, codes(aw).join());
  assert.ok(check(aw, 'closure').stats.tangentDegrees < 2);
  // options: a huge seamRatio or tangentToleranceDegrees disables the failure; the limit reported is the effective one
  assert.equal(codes(validateTrack(build([...kinked, { ...kinked[0] }], 20), { seamRatio: 1000, tangentToleranceDegrees: 5 })).includes('CLOSURE_TANGENT'), false);
  const lim = k.violations.find(v => v.code === 'CLOSURE_TANGENT')!;
  assert.ok(Math.abs(lim.limit! - Math.max(5, 2 * ks.neighbourhoodMaxDegrees)) < 1e-9 && lim.value === ks.tangentDegrees);
});

test("validator: 'absolute' mode reproduces the v0.5.0 CLOSURE_TANGENT verdict on a fixed generated case", () => {
  // S3b E2 case (hairpin, curves 3, width 20, seed 42): v0.5.0 reported CLOSURE_TANGENT only if the seam turn exceeded 5 degrees
  const t = generateTrack({ cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80, curves: 3, width: 20, seed: 42 });
  const a = validateTrack(t, { closureTangentMode: 'absolute' }), s = check(a, 'closure').stats;
  assert.equal(codes(a).includes('CLOSURE_TANGENT'), s.tangentDegrees > 5);
  const r = validateTrack(t); // ratio mode never fails where absolute passes
  if (!codes(a).includes('CLOSURE_TANGENT')) assert.equal(codes(r).includes('CLOSURE_TANGENT'), false);
});

test('validator: NaN and Infinity are finite errors and dependent checks are skipped, not crashed', () => {
  for (const bad of [NaN, Infinity]) {
    const t = build(circle(400, 360)); t.points[10] = { ...t.points[10], x: bad };
    const r = validateTrack(t);
    assert.equal(r.ok, false); assert.ok(codes(r).includes('NON_FINITE'));
    assert.equal(check(r, 'finite').failures, 1);
    for (const id of ['closure', 'self-intersection', 'edge-fold', 'min-turn-radius', 'max-slope']) {
      assert.equal(check(r, id).skipped, true, id); assert.equal(check(r, id).passed, false, id);
    }
  }
  const t = build(circle(400, 360)); t.roadEdges[1][5] = { ...t.roadEdges[1][5], z: NaN };
  assert.ok(codes(validateTrack(t)).includes('NON_FINITE'));
});

test('validator: structure problems are errors (too few points, mismatched edges)', () => {
  assert.deepEqual(codes(validateTrack(build(circle(400, 360).slice(0, 3)))), ['STRUCTURE']);
  const t = build(circle(400, 360)); t.roadEdges[0] = t.roadEdges[0].slice(1);
  const r = validateTrack(t); assert.equal(r.ok, false); assert.deepEqual(codes(r), ['STRUCTURE']);
});

test('validator: a radius below half the width folds the inner edge (EDGE_FOLD error) and warns on turn radius', () => {
  const r = validateTrack(build(circle(10, 360), 40));
  assert.ok(codes(r).includes('EDGE_FOLD') && codes(r).includes('MIN_TURN_RADIUS'));
  assert.equal(check(r, 'edge-fold').failures, 360);
  assert.equal(r.violations.find(v => v.code === 'MIN_TURN_RADIUS')!.severity, 'warning');
  // warnings alone do not make a track not-ok
  const gentle = build(circle(400, 360), 40); gentle.points.forEach((p, i) => { p.y = 100 * Math.sin(i / 360 * 8 * Math.PI); });
  gentle.points[360] = { ...gentle.points[0] };
  const s = validateTrack(gentle);
  assert.ok(codes(s).includes('MAX_SLOPE')); assert.equal(s.ok, true);
  assert.equal(validateTrack(gentle, { maxSlope: 10 }).violations.length, 0);
  assert.ok(check(s, 'max-slope').stats.maxAbsSlope > DEFAULT_VALIDATE_OPTIONS.maxSlope);
});

test('validator: the violation list is capped per check but check counts are complete', () => {
  const r = validateTrack(build(circle(10, 360), 40), { maxViolationsPerCheck: 3 });
  assert.equal(r.violations.filter(v => v.code === 'EDGE_FOLD').length, 3);
  assert.equal(check(r, 'edge-fold').failures, 360);
});

test('validator: two crossing loops of one edge ring are found with the spatial hash even for very long segments', () => {
  // bow-tie with two very long segments (many hash cells) crossing each other
  const bow = [{ x: -1e5, y: 0, z: -1e5 }, { x: 1e5, y: 0, z: 1e5 }, { x: 1e5, y: 0, z: -1e5 }, { x: -1e5, y: 0, z: 1e5 }, { x: -1e5, y: 0, z: -1e5 }];
  const r = validateTrack(build(bow, 20));
  assert.ok(codes(r).includes('SELF_INTERSECTION_CENTERLINE'));
});

test('validator: golden cases are deterministic, and track == imported regenerated document; violation counts are recorded', t => {
  const fixture = JSON.parse(readFileSync('tests/fixtures/golden-v05.json', 'utf8')) as {
    cases: { name: string; params: Partial<Params> }[]; patternCases: { name: string; params: Partial<Params> }[] };
  const all = [...fixture.cases.map(c => ({ name: c.name, params: { ...c.params, cornerPattern: 'auto' as const } })), ...fixture.patternCases];
  assert.equal(all.length, 10);
  const summary: Record<string, unknown> = {};
  for (const { name, params } of all) {
    const track = generateTrack(params);
    const first = validateTrack(track), second = validateTrack(generateTrack(params));
    assert.deepEqual(first, second, `${name}: deterministic`);
    const imported = importTrack(JSON.parse(serializeTrack(track)), { verify: 'regenerate' });
    assert.deepEqual(validateTrack(imported), first, `${name}: imported regenerated document gives the same result`);
    assert.deepEqual(validateTrack(importTrack(exportTrack(track))), first);
    summary[name] = { ok: first.ok, failures: Object.fromEntries(first.checks.filter(c => c.failures > 0).map(c => [c.id, c.failures])) };
  }
  // Recorded, deliberately not asserted to be zero: Auto mode can produce overlaps (see README).
  t.diagnostic(`golden violation counts: ${JSON.stringify(summary)}`);
});
