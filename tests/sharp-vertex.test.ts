// Validator v1.3: absolute per-vertex rule SHARP_VERTEX and sampling diagnostic UNDERSAMPLED (third red team, R2-1 and R2-2).
// Probe classes: coarse regular polygons, uniform sawtooth, paired spikes 2 to 4 vertices apart, zigzag patch; clean generated tracks; options, legacy modes, CLI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateTrack } from '../src/core.js';
import { DEFAULT_VALIDATE_OPTIONS, validateTrack, type ValidateOptions } from '../src/validate.js';
import { trackFromPolyline } from '../src/polyline.js';

const CLI = join(process.cwd(), 'cli-dist', 'cli.js');
const run = (args: string[]) => { const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); return { code: r.status, out: r.stdout, err: r.stderr }; };
type P = { x: number; z: number };
const circle = (n: number, R: number, f: (i: number) => number = () => 0): P[] =>
  Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n, r = R + f(i); return { x: r * Math.cos(a), z: r * Math.sin(a) }; });
const V12: ValidateOptions = { sharpVertexDegrees: Infinity, undersampledCheck: false }; // the v1.2.0 rule set
const verdict = (pts: P[], width: number, o: ValidateOptions = {}) => validateTrack(trackFromPolyline({ points: pts, width, closed: true }), o);
const errors = (r: ReturnType<typeof validateTrack>) => [...new Set(r.violations.filter(v => v.severity === 'error').map(v => v.code))].sort();
const warnings = (r: ReturnType<typeof validateTrack>) => [...new Set(r.violations.filter(v => v.severity === 'warning').map(v => v.code))].sort();
const check = (r: ReturnType<typeof validateTrack>, id: string) => r.checks.find(c => c.id === id)!;
const ids = (r: ReturnType<typeof validateTrack>) => r.checks.map(c => c.id);

test('SHARP_VERTEX: regular 4-, 5-, 6- and 8-gons (R = 500, width 12) were ok in v1.2 and are errors now; UNDERSAMPLED warns', () => {
  for (const n of [4, 5, 6, 8]) {
    const pts = circle(n, 500);
    const before = verdict(pts, 12, V12), after = verdict(pts, 12);
    assert.equal(before.ok, true, `v1.2 accepted the ${n}-gon`); assert.deepEqual(before.violations, []);
    assert.equal(after.ok, false, `${n}-gon`); assert.deepEqual(errors(after), ['SHARP_VERTEX']);
    assert.deepEqual(warnings(after), ['UNDERSAMPLED']);
    assert.equal(check(after, 'sharp-vertex').failures, n);
    const turn = 360 / n; // exact heading change of a regular n-gon
    assert.ok(Math.abs(check(after, 'sharp-vertex').stats.maxTurnDegrees - turn) < 1e-9, `${n}-gon turn`);
    assert.equal(check(after, 'undersampled').stats.share, 1);
  }
});

test('SHARP_VERTEX: the limit is strict and absolute (13-gon 27.7 degrees passes, 11-gon 32.7 degrees fails, at any radius and width)', () => {
  for (const [R, w] of [[500, 12], [50, 4], [5000, 40]]) {
    assert.deepEqual(errors(verdict(circle(13, R), w)), [], `13-gon R=${R}`);
    assert.deepEqual(errors(verdict(circle(11, R), w)), ['SHARP_VERTEX'], `11-gon R=${R}`);
  }
  // 13-gon: no error, but 100 % of its vertices turn by more than 12 degrees: UNDERSAMPLED only
  const r = verdict(circle(13, 500), 12); assert.equal(r.ok, true); assert.deepEqual(warnings(r), ['UNDERSAMPLED']);
});

test('SHARP_VERTEX: uniform sawtooth (2000 vertices, R = 1000, alternating +-h, width 10) is flagged at every vertex for h = 0.5, 2 and 5', () => {
  for (const h of [0.5, 2, 5]) {
    const pts = circle(2000, 1000, i => (i % 2 ? h : -h));
    assert.equal(verdict(pts, 10, V12).ok, true, `v1.2 accepted the sawtooth h=${h}`);
    const r = verdict(pts, 10);
    assert.equal(r.ok, false); assert.ok(errors(r).includes('SHARP_VERTEX'), `h=${h}`);
    assert.equal(check(r, 'sharp-vertex').failures, 2000); // every vertex turns by more than 30 degrees (35.5 for h = 0.5)
    assert.equal(r.violations.filter(v => v.code === 'SHARP_VERTEX').length, DEFAULT_VALIDATE_OPTIONS.maxViolationsPerCheck);
    assert.ok(warnings(r).includes('UNDERSAMPLED'));
  }
});

test('SHARP_VERTEX: paired spikes 2, 3 and 4 vertices apart mask each other under the relative rule but not here', () => {
  for (const gap of [2, 3, 4]) {
    const sp = new Set([500, 500 + gap]), pts = circle(2000, 1000, i => (sp.has(i) ? 3 : 0));
    const before = verdict(pts, 10, V12), after = verdict(pts, 10);
    assert.ok(!before.violations.some(v => v.code === 'LOCAL_KINK'), `gap ${gap}: the relative rule does not flag the pair`);
    assert.equal(after.ok, false);
    const flagged = after.violations.filter(v => v.code === 'SHARP_VERTEX').map(v => v.index).sort((a, b) => a! - b!);
    // the two spike vertices and their immediate neighbours (a spike bends i-1 and i+1 as well) are flagged, nothing else
    assert.ok(flagged.includes(500) && flagged.includes(500 + gap), `gap ${gap}: ${flagged.join()}`);
    assert.ok(flagged.every(i => i! >= 499 && i! <= 500 + gap + 1), `gap ${gap}: ${flagged.join()}`);
    assert.ok(Math.abs(check(after, 'sharp-vertex').stats.maxTurnDegrees - 87.5) < 1, `gap ${gap} turn`); // about 88 degrees each
    assert.equal(check(after, 'undersampled').passed, true, 'a few bad vertices of 2000 are a defect, not a sampling problem');
  }
});

test('SHARP_VERTEX: a zigzag patch of 20 vertices inside a smooth circle (amplitude 1, 3, 6) is flagged', () => {
  for (const amp of [1, 3, 6]) {
    const pts = circle(2000, 1000, i => (i >= 500 && i < 520 ? (i % 2 ? amp : -amp) : 0));
    const r = verdict(pts, 10);
    assert.equal(r.ok, false); assert.ok(errors(r).includes('SHARP_VERTEX'), `amp ${amp}`);
    const idx = r.violations.filter(v => v.code === 'SHARP_VERTEX').map(v => v.index!);
    assert.ok(idx.length >= 18 && idx.every(i => i >= 499 && i <= 520), `amp ${amp}: ${idx.join()}`);
  }
});

test('SHARP_VERTEX: the seam vertex is tested too (reported as SHARP_VERTEX index 0 next to CLOSURE_TANGENT)', () => {
  const pts = circle(720, 500, i => (i === 0 ? 20 : 0));
  const r = verdict(pts, 12);
  assert.ok(r.violations.some(v => v.code === 'SHARP_VERTEX' && v.index === 0));
  assert.ok(r.violations.some(v => v.code === 'CLOSURE_TANGENT'));
});

test('clean data: generated tracks of every pattern, join and size pass both new checks with margin (max turn well below 30, share of turns above 12 well below 10 %)', () => {
  let maxTurn = 0, maxShare = 0, tracks = 0;
  for (const seed of [0, 1, 2, 3, 7, 42, 100, 1234]) for (const cornerPattern of ['auto', 'right-angle', 'hairpin', 's-curve'] as const)
    for (const [width, size, straight] of [[20, 1, 0], [40, 2, 0.3], [80, 3, 0.3], [40, 2, 0]] as const) {
      let t; try { t = generateTrack({ seed, cornerPattern, width, size, straight, curves: 6, cornerCount: cornerPattern === 'auto' ? 0 : 2 }); } catch { continue; }
      const r = validateTrack(t); tracks++;
      assert.equal(check(r, 'sharp-vertex').passed, true, `${seed} ${cornerPattern} ${width} ${size} ${straight}`);
      assert.equal(check(r, 'undersampled').passed, true, `${seed} ${cornerPattern} ${width} ${size} ${straight}`);
      maxTurn = Math.max(maxTurn, check(r, 'sharp-vertex').stats.maxTurnDegrees); maxShare = Math.max(maxShare, check(r, 'undersampled').stats.share);
    }
  assert.ok(tracks >= 100, `${tracks} tracks`); assert.ok(maxTurn < 20, `max turn ${maxTurn}`); assert.ok(maxShare < 0.05, `max share ${maxShare}`);
});

test('clean data: a densely sampled circle, a 24-gon (15 degrees: undersampled, not sharp) and a 360-gon', () => {
  const dense = verdict(circle(360, 500), 12); assert.equal(dense.ok, true); assert.deepEqual(dense.violations, []);
  const r24 = verdict(circle(24, 500), 12);
  assert.equal(r24.ok, true); assert.deepEqual(errors(r24), []); assert.deepEqual(warnings(r24), ['UNDERSAMPLED']);
  const u = r24.violations.find(v => v.code === 'UNDERSAMPLED')!;
  assert.equal(u.value, 1); assert.equal(u.limit, DEFAULT_VALIDATE_OPTIONS.undersampledShare); assert.match(u.message, /24 of 24 vertices/);
});

test('UNDERSAMPLED: share rule (strictly more than undersampledShare of the vertices over undersampledTurnDegrees); a lone sharp vertex is a defect, not a sampling problem', () => {
  // 100 vertices: 10 of them 24-gon-like corners would be 10 %, build with a stadium-free trick: circle of 100 plus k spikes
  const base = circle(1000, 1000), spikes = (k: number) => base.map((p, i) => (i % 100 === 50 && i / 100 < k ? { x: p.x * 1.02, z: p.z * 1.02 } : p));
  const r1 = verdict(spikes(1), 10);
  assert.equal(check(r1, 'undersampled').passed, true); assert.ok(check(r1, 'undersampled').stats.verticesOverTurn >= 1);
  // lower the share limit to 0 and the same polyline is undersampled; raise it to 1 and nothing ever is
  assert.equal(check(verdict(spikes(1), 10, { undersampledShare: 0 }), 'undersampled').passed, false);
  assert.equal(check(verdict(circle(13, 500), 12, { undersampledShare: 1 }), 'undersampled').passed, true);
  // the turn limit is an option too: 13-gon turns 27.7 degrees
  assert.equal(check(verdict(circle(13, 500), 12, { undersampledTurnDegrees: 28 }), 'undersampled').passed, true);
  // stats are reported for batch filtering
  const s = check(verdict(circle(24, 500), 12), 'undersampled').stats;
  assert.deepEqual(Object.keys(s).sort(), ['maxSpacing', 'maxTurnDegrees', 'medianSpacing', 'share', 'turnDegrees', 'verticesOverTurn', 'width']);
  assert.ok(Math.abs(s.medianSpacing - 2 * 500 * Math.sin(Math.PI / 24)) < 1e-6);
});

test('options: both checks can be disabled, a disabled check is not listed, and with both off the report is the v1.2.0 report', () => {
  const t = trackFromPolyline({ points: circle(8, 500), width: 12, closed: true });
  const full = validateTrack(t), noSharp = validateTrack(t, { sharpVertexDegrees: Infinity }), noUnder = validateTrack(t, { undersampledCheck: false }), off = validateTrack(t, V12);
  assert.deepEqual(ids(full), ['structure', 'finite', 'closure', 'local-kink', 'sharp-vertex', 'self-intersection', 'edge-fold', 'min-turn-radius', 'max-slope', 'undersampled']);
  assert.deepEqual(ids(noSharp), ids(full).filter(i => i !== 'sharp-vertex')); assert.equal(noSharp.ok, true); assert.deepEqual(warnings(noSharp), ['UNDERSAMPLED']);
  assert.deepEqual(ids(noUnder), ids(full).filter(i => i !== 'undersampled')); assert.deepEqual(errors(noUnder), ['SHARP_VERTEX']);
  assert.deepEqual(ids(off), ['structure', 'finite', 'closure', 'local-kink', 'self-intersection', 'edge-fold', 'min-turn-radius', 'max-slope']);
  assert.equal(off.ok, true); assert.deepEqual(off.violations, []);
  // a threshold above the polygon's turn accepts it (8-gon: 45 degrees); 180 is the largest possible turn
  assert.equal(validateTrack(t, { sharpVertexDegrees: 45.5 }).ok, true);
  assert.equal(validateTrack(t, { sharpVertexDegrees: 44.5 }).ok, false);
  // generated tracks: with both checks off the report equals the explicit v1.2 pin, and both are free of the new ids
  const g = generateTrack({ seed: 42 });
  assert.deepEqual(validateTrack(g, V12), validateTrack(g, { ...V12, sharpVertexDegrees: Infinity }));
});

test('legacy modes (ratio, absolute) run neither new check, as before', () => {
  const t = trackFromPolyline({ points: circle(4, 500), width: 12, closed: true });
  for (const closureTangentMode of ['ratio', 'absolute'] as const) { const r = validateTrack(t, { closureTangentMode }); assert.equal(r.checks.length, 7); assert.ok(!ids(r).includes('sharp-vertex') && !ids(r).includes('undersampled')); }
});

test('structure or finiteness failures skip the new checks (they are listed as skipped, error severity fails ok)', () => {
  const t = trackFromPolyline({ points: circle(60, 500), width: 12, closed: true });
  const nan = { ...t, points: t.points.map((p, i) => (i === 5 ? { ...p, x: NaN } : p)) };
  const r = validateTrack(nan);
  assert.equal(r.ok, false); assert.equal(check(r, 'sharp-vertex').skipped, true); assert.equal(check(r, 'undersampled').skipped, true);
  const broken = validateTrack({ ...t, roadEdges: [t.roadEdges[0], []] as never });
  assert.equal(check(broken, 'sharp-vertex').skipped, true); assert.equal(check(broken, 'undersampled').skipped, true);
  assert.equal(validateTrack({ ...t, roadEdges: [t.roadEdges[0], []] as never }, V12).checks.some(c => c.id === 'sharp-vertex' || c.id === 'undersampled'), false);
});

test('cli: validate-polyline reports SHARP_VERTEX and UNDERSAMPLED for a square; --no-sharp-vertex, --no-undersampled-check and --limit select', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ts-sharp-'));
  try {
    const sq = join(dir, 'square.csv');
    writeFileSync(sq, 'x,z\n0,0\n100,0\n100,100\n0,100\n');
    const r = run(['validate-polyline', sq, '--width', '4']);
    assert.equal(r.code, 1); const rep = JSON.parse(r.out);
    assert.equal(rep.ok, false); assert.equal(rep.checks.length, 10);
    assert.deepEqual([...new Set(rep.violations.map((v: { code: string }) => v.code))].sort(), ['SHARP_VERTEX', 'UNDERSAMPLED']);
    const both = run(['validate-polyline', sq, '--width', '4', '--no-sharp-vertex', '--no-undersampled-check']);
    assert.equal(both.code, 0); assert.equal(JSON.parse(both.out).checks.length, 8); assert.deepEqual(JSON.parse(both.out).violations, []);
    const onlyUnder = run(['validate-polyline', sq, '--width', '4', '--no-sharp-vertex']);
    assert.equal(onlyUnder.code, 0); assert.deepEqual(JSON.parse(onlyUnder.out).violations.map((v: { code: string }) => v.code), ['UNDERSAMPLED']);
    assert.equal(run(['validate-polyline', sq, '--width', '4', '--no-sharp-vertex', '--strict']).code, 1); // --strict: the warning counts
    const lim = run(['validate-polyline', sq, '--width', '4', '--limit', 'sharpVertexDegrees=91', '--no-undersampled-check']);
    assert.equal(lim.code, 0, 'a limit above the 90 degree corner accepts the square');
    assert.equal(run(['validate-polyline', sq, '--width', '4', '--limit', 'sharpVertexDegrees=180', '--no-undersampled-check']).code, 0);
    assert.equal(run(['validate-polyline', sq, '--width', '4', '--limit', 'undersampledShare=1', '--no-sharp-vertex']).out.includes('UNDERSAMPLED'), false);
    // misuse
    assert.equal(run(['validate-polyline', sq, '--width', '4', '--limit', 'undersampledCheck=0']).code, 2);
    assert.equal(run(['validate-polyline', sq, '--width', '4', '--no-sharp-vertex', '--limit', 'sharpVertexDegrees=40']).code, 2);
    assert.equal(run(['validate-polyline', sq, '--width', '4', '--no-sharp-vertex=1']).code, 2);
    // metrics-polyline: stdout (the metrics) is identical with and without the flag; the warning goes to stderr
    const m = run(['metrics-polyline', sq, '--width', '4']), m0 = run(['metrics-polyline', sq, '--width', '4', '--no-undersampled-check']);
    assert.equal(m.code, 0); assert.equal(m.out, m0.out); assert.match(m.err, /warning UNDERSAMPLED: 4 of 4 vertices/); assert.equal(m0.err, '');
    // a clean generated document: validate and batch accept the flags and report 10 checks by default
    const doc = join(dir, 't.json');
    assert.equal(run(['generate', '--seed', '42', '--out', doc]).code, 0);
    const v = run(['validate', doc, '--verify', 'regenerate']); assert.equal(v.code, 0); assert.equal(JSON.parse(v.out).checks.length, 10);
    const v0 = run(['validate', doc, '--no-sharp-vertex', '--no-undersampled-check']); assert.equal(v0.code, 0); assert.equal(JSON.parse(v0.out).checks.length, 8);
    const grid = join(dir, 'g.json'); writeFileSync(grid, JSON.stringify({ seeds: [1, 2], params: { cornerPattern: 'hairpin' } }));
    const b = run(['batch', '--grid', grid, '--out', join(dir, 'o'), '--jsonl', join(dir, 'o.jsonl'), '--no-timing', '--no-sharp-vertex', '--no-undersampled-check']);
    assert.equal(b.code, 0, b.err);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
