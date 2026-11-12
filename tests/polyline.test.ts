import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateTrack } from '../src/core.js';
import { validateTrack } from '../src/validate.js';
import { computeMetrics } from '../src/metrics.js';
import { PolylineParseError, parsePolylineCsv, parsePolylineJson, trackFromPolyline } from '../src/polyline.js';

const CLI = join(process.cwd(), 'cli-dist', 'cli.js');
const run = (args: string[]) => { const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const circle = (n: number, r: number) => Array.from({ length: n }, (_, i) => ({ x: r * Math.cos(2 * Math.PI * i / n), z: r * Math.sin(2 * Math.PI * i / n) }));

test('polyline: a TrackLab track re-entered as a polyline gives identical edges, validation and metrics', () => {
  for (const seed of [1, 7, 42]) for (const cornerPattern of ['auto', 'hairpin'] as const) {
    const t = generateTrack({ seed, cornerPattern, cornerCount: 1 });
    const pl = trackFromPolyline({ points: t.points, width: t.params.width, closed: true });
    assert.equal(pl.inputWasClosed, true);
    assert.deepEqual(pl.points, t.points); assert.deepEqual(pl.normals, t.normals);
    assert.deepEqual(pl.roadEdges, t.roadEdges); assert.equal(pl.length, t.length);
    assert.deepEqual(validateTrack(pl), validateTrack(t));
    assert.deepEqual(computeMetrics(pl), computeMetrics(t));
  }
});

test('polyline: closing point is appended only when missing; y defaults to 0; float32 edges', () => {
  const open = circle(40, 100), pl = trackFromPolyline({ points: open, width: 10, closed: true });
  assert.equal(pl.inputWasClosed, false); assert.equal(pl.points.length, 41); assert.deepEqual(pl.points[40], pl.points[0]);
  assert.ok(pl.points.every(p => p.y === 0)); assert.ok(pl.straightSegments.every(s => s === false));
  for (const e of pl.roadEdges) for (const p of e) { assert.equal(p.x, Math.fround(p.x)); assert.equal(p.z, Math.fround(p.z)); }
  const again = trackFromPolyline({ points: pl.points, width: 10, closed: true });
  assert.equal(again.points.length, 41); assert.deepEqual(again.roadEdges, pl.roadEdges);
  const v = validateTrack(pl); assert.equal(v.ok, true, JSON.stringify(v.violations));
});

test('polyline: defects are reported by the validator, not repaired', () => {
  const bow = trackFromPolyline({ points: [{ x: 0, z: 0 }, { x: 100, z: 100 }, { x: 100, z: 0 }, { x: 0, z: 100 }], width: 4, closed: true });
  const codes = new Set(validateTrack(bow).violations.map(v => v.code));
  assert.ok(codes.has('SELF_INTERSECTION_CENTERLINE'), [...codes].join());
  const nan = trackFromPolyline({ points: [...circle(20, 50), { x: NaN, z: 0 }], width: 4, closed: true });
  assert.ok(validateTrack(nan).violations.some(v => v.code === 'NON_FINITE'));
  assert.throws(() => trackFromPolyline({ points: circle(2, 5), width: 4, closed: true }), RangeError);
  assert.throws(() => trackFromPolyline({ points: circle(5, 5), width: 0, closed: true }), RangeError);
  assert.throws(() => trackFromPolyline({ points: circle(5, 5), width: 4, closed: false as unknown as true }), RangeError);
});

test('polyline: resample is off by default and, when on, gives near-uniform closed samples', () => {
  const pts = circle(7, 100);
  assert.equal(trackFromPolyline({ points: pts, width: 4, closed: true }).resampled, false);
  const r = trackFromPolyline({ points: pts, width: 4, closed: true }, { resample: { spacing: 10 } });
  assert.equal(r.resampled, true); assert.deepEqual(r.points[r.points.length - 1], r.points[0]);
  const polyLen = trackFromPolyline({ points: pts, width: 4, closed: true }).length;
  assert.ok(Math.abs(r.length - polyLen) / polyLen < 1e-9 + 0.01); // sampling a convex polygon never lengthens it; corners cut slightly
  assert.equal(r.points.length - 1, Math.round(polyLen / 10));
});

test('polyline: parsers', () => {
  assert.deepEqual(parsePolylineJson('{"points":[[1,2],{"x":3,"y":4,"z":5}]}'), [{ x: 1, z: 2 }, { x: 3, y: 4, z: 5 }]);
  assert.deepEqual(parsePolylineJson('[[1,2],[3,4]]'), [{ x: 1, z: 2 }, { x: 3, z: 4 }]);
  assert.throws(() => parsePolylineJson('[[1,2,3]]'), PolylineParseError);
  assert.throws(() => parsePolylineJson('{"a":1}'), PolylineParseError);
  assert.deepEqual(parsePolylineCsv('x,z,y\n1,2\n3,4,5\n'.replace('1,2\n', '1,2,0\n')), [{ x: 1, y: 0, z: 2 }, { x: 3, y: 5, z: 4 }]);
  assert.deepEqual(parsePolylineCsv('1,2\r\n3,4\r\n'), [{ x: 1, z: 2 }, { x: 3, z: 4 }]);
  assert.throws(() => parsePolylineCsv('1,2\n3,abc\n'), PolylineParseError);
});

test('cli: validate-polyline / metrics-polyline', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracklab-pl-'));
  try {
    const pts = circle(60, 200), json = join(dir, 'c.json'), csv = join(dir, 'c.csv');
    writeFileSync(json, JSON.stringify({ points: pts.map(p => [p.x, p.z]) }));
    writeFileSync(csv, 'x,z\n' + pts.map(p => `${p.x},${p.z}`).join('\n') + '\n');
    const a = run(['validate-polyline', json, '--width', '12']), b = run(['validate-polyline', csv, '--width', '12']);
    assert.equal(a.code, 0, a.err); assert.equal(b.code, 0, b.err);
    const ra = JSON.parse(a.out), rb = JSON.parse(b.out);
    assert.equal(ra.ok, true); assert.equal(ra.checks.length, 8); assert.equal(ra.input.inputWasClosed, false); assert.equal(ra.input.sampleCount, 60);
    assert.deepEqual({ ...ra, file: 0 }, { ...rb, file: 0 });
    const m = run(['metrics-polyline', json, '--width', '12']); assert.equal(m.code, 0);
    const metrics = JSON.parse(m.out); assert.equal(metrics.sampleCount, 60); assert.equal(metrics.curvature, undefined);
    assert.ok(Math.abs(metrics.totalTurningDegrees - 360) < 1e-6);
    assert.deepEqual(JSON.parse(run(['metrics-polyline', json, '--width', '12', '--samples']).out).curvature.length, 60);
    // violation -> exit 1
    const bow = join(dir, 'bow.json'); writeFileSync(bow, JSON.stringify([[0, 0], [100, 100], [100, 0], [0, 100]]));
    const v = run(['validate-polyline', bow, '--width', '4']); assert.equal(v.code, 1);
    assert.ok(JSON.parse(v.out).violations.some((x: { code: string }) => x.code === 'SELF_INTERSECTION_CENTERLINE'));
    // usage errors -> exit 2
    assert.equal(run(['validate-polyline', json]).code, 2);
    assert.equal(run(['validate-polyline', json, '--width', '-3']).code, 2);
    assert.equal(run(['validate-polyline', join(dir, 'nope.json'), '--width', '3']).code, 2);
    assert.equal(run(['validate-polyline', '--help']).code, 0);
    // resample is opt-in
    const rs = JSON.parse(run(['validate-polyline', json, '--width', '12', '--resample-spacing', '50']).out);
    assert.equal(rs.input.resampleSpacing, 50); assert.equal(rs.input.sampleCount, Math.round(rs.input.sampleCount));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
