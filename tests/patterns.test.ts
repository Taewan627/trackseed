import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CAR_RADIUS, generateTrack, roadContact, sanitize, type Params } from '../src/core.js';
import { generateCoins } from '../src/coins.js';
import { NO_INPUT, spawnVehicle, updateVehicle } from '../src/vehicle.js';
import { MAX_PATTERN_ATTEMPTS, PatternGenerationError, validatePatternGeometry } from '../src/patterns.js';

const kinds = ['right-angle', 'hairpin', 's-curve'] as const;

test('v0.5: Auto and count zero reproduce the golden v0.5 (deterministic-math) geometry, scenery and obstacle hashes', () => {
  // legacy-layouts.json (v0.3 Math.* hashes) is kept untouched as a historical record; the
  // deterministic-math rewrite changes floats at ulp level, so the live assertions use golden-v05.json.
  const fixture = JSON.parse(readFileSync('tests/fixtures/golden-v05.json', 'utf8')) as {
    fields: (keyof ReturnType<typeof generateTrack>)[]; cases: { params: Partial<Params>; sha256: string; coinsSha256: string }[] };
  for (const entry of fixture.cases) for (const cornerPattern of ['auto', ...kinds] as const) {
    // the v0.5 golden is the legacy join (the default is now 'tangent')
    const track = generateTrack({ ...entry.params, autoJoin: 'legacy', cornerPattern, cornerCount: cornerPattern === 'auto' ? 3 : 0, cornerStrength: 100 });
    const hash = createHash('sha256').update(JSON.stringify(Object.fromEntries(fixture.fields.map(k => [k, track[k]])))).digest('hex');
    assert.equal(hash, entry.sha256); assert.equal(track.patternReport.inserted, 0);
    assert.equal(track.patternReport.attempts, 0); assert.equal(track.patternReport.geometry, null);
    assert.equal(createHash('sha256').update(JSON.stringify(generateCoins(track))).digest('hex'), entry.coinsSha256);
  }
});

test('v0.5: right-angle, hairpin and s-curve pattern layouts match the golden v0.5 hashes', () => {
  const fixture = JSON.parse(readFileSync('tests/fixtures/golden-v05.json', 'utf8')) as {
    patternFields: (keyof ReturnType<typeof generateTrack>)[];
    patternCases: { name: string; params: Partial<Params>; sha256: string; coinsSha256: string }[] };
  assert.deepEqual(new Set(fixture.patternCases.map(c => c.params.cornerPattern)), new Set(kinds));
  for (const entry of fixture.patternCases) {
    const track = generateTrack(entry.params);
    assert.ok(track.patternReport.inserted > 0, entry.name);
    const hash = createHash('sha256').update(JSON.stringify(Object.fromEntries(fixture.patternFields.map(k => [k, track[k]])))).digest('hex');
    assert.equal(hash, entry.sha256, entry.name);
    assert.equal(createHash('sha256').update(JSON.stringify(generateCoins(track))).digest('hex'), entry.coinsSha256, entry.name);
  }
});

test('v0.4: sanitize constrains pattern kind, count and strength', () => {
  const p = sanitize({ cornerPattern: 'bad' as never, cornerCount: 9.8, cornerStrength: -1 });
  assert.equal(p.cornerPattern, 'auto'); assert.equal(p.cornerCount, 3); assert.equal(p.cornerStrength, 20);
  assert.equal(sanitize({ cornerCount: NaN, cornerStrength: Infinity }).cornerCount, 1);
  assert.equal(sanitize({ cornerCount: -1, cornerStrength: 101 }).cornerStrength, 100);
});

test('v0.4: actual sampled L/Hairpin headings and S signed curvature match their geometric targets', () => {
  for (const cornerPattern of kinds) for (const cornerCount of [1, 2, 3]) {
    const track = generateTrack({ cornerPattern, cornerCount, density: 0, obstacles: 0 });
    assert.equal(track.patternReport.inserted, cornerCount);
    for (const m of track.patternReport.patterns) {
      let positive = 0, negative = 0;
      const heading = (i: number) => Math.atan2(track.points[i + 1].z - track.points[i].z,
        track.points[i + 1].x - track.points[i].x);
      for (let i = m.startIndex; i <= m.endIndex; i++) {
        const delta = Math.atan2(Math.sin(heading(i) - heading(i - 1)), Math.cos(heading(i) - heading(i - 1))) * 180 / Math.PI;
        const weight = i === m.startIndex || i === m.endIndex ? 0.5 : 1;
        positive += Math.max(0, delta * weight); negative += Math.min(0, delta * weight);
      }
      if (cornerPattern === 's-curve') { assert.ok(positive > 30 && negative < -30); assert.ok(m.curvatureChanges >= 2); }
      else assert.ok(Math.abs(Math.abs(positive + negative) - (cornerPattern === 'hairpin' ? 180 : 90)) < 13);
      if (cornerPattern === 'hairpin') assert.ok(m.parallelDot! < -0.97);
      assert.equal(m.verified, true);
    }
    assert.deepEqual(track.points[0], track.points.at(-1));
    assert.deepEqual(track.normals[0], track.normals.at(-1));
    const steps = track.points.slice(1).map((p, i) => Math.hypot(p.x - track.points[i].x, p.z - track.points[i].z));
    assert.ok(Math.max(...steps) / Math.min(...steps) < 1.03, 'collars and closed seam must not teleport');
    assert.equal(track.patternReport.geometry!.valid, true);
  }
});

test('v0.4: strength changes actual curve geometry while keeping the selected pattern verified', () => {
  for (const cornerPattern of kinds) {
    const soft = generateTrack({ cornerPattern, cornerStrength: 20 });
    const sharp = generateTrack({ cornerPattern, cornerStrength: 100 });
    assert.notDeepEqual(soft.points, sharp.points);
    assert.ok(soft.patternReport.patterns.every(m => m.verified));
    assert.ok(sharp.patternReport.patterns.every(m => m.verified));
  }
});

test('v0.4: explicit failure is bounded and deterministic, never a silent normal-track fallback', () => {
  const p = { cornerPattern: 'hairpin' as const, cornerCount: 1, curves: 3, width: 80, straight: 0.6,
    size: 1, cornerStrength: 20, seed: 0 };
  let previous = '';
  for (let i = 0; i < 2; i++) {
    assert.throws(() => generateTrack(p), (error: unknown) => {
      assert.ok(error instanceof PatternGenerationError); assert.equal(error.attempts, MAX_PATTERN_ATTEMPTS);
      assert.equal(error.reasons.length, MAX_PATTERN_ATTEMPTS);
      if (previous) assert.equal(error.message, previous); previous = error.message; return true;
    });
  }
  assert.equal(generateTrack({ ...p, cornerPattern: 'auto' }).patternReport.inserted, 0);
});

test('v0.4: geometry validator rejects open seams, self crossing and folded road/sidewalk ribbons', () => {
  const crossing = Array.from({ length: 721 }, (_, i) => {
    const t = i / 720 * Math.PI * 2; return { x: 1000 * Math.sin(t), y: 0, z: 600 * Math.sin(2 * t) };
  });
  crossing[crossing.length - 1] = { ...crossing[0] };
  const audit = validatePatternGeometry(crossing, 20);
  assert.equal(audit.valid, false); assert.ok(audit.selfIntersections + audit.boundaryIntersections > 0);
  const circle = Array.from({ length: 121 }, (_, i) => ({ x: 15 * Math.cos(i / 120 * Math.PI * 2),
    y: 0, z: 15 * Math.sin(i / 120 * Math.PI * 2) }));
  circle[120] = { ...circle[0] };
  const folded = validatePatternGeometry(circle, 80); assert.equal(folded.valid, false); assert.ok(folded.foldedTriangles > 0);
  circle[120].x += 1; assert.equal(validatePatternGeometry(circle, 20).closed, false);
});

test('v0.4: 0–3 patterns, extreme parameters, reproducibility, boundaries and coins audit', t => {
  const byPattern = Object.fromEntries(kinds.map(kind => [kind, { attempted: 0, applied: 0, rejected: 0 }]));
  const failures: { params: Partial<Params>; reasons: string[] }[] = [];
  const times: number[] = [], attempts: Record<string, number> = {};
  let disabled = 0, inserted = 0;
  for (const cornerPattern of kinds) for (const cornerCount of [0, 1, 2, 3]) for (const curves of [3, 10]) {
    for (const width of [20, 80]) for (const straight of [0, 0.6]) for (const size of [1, 3]) {
      for (const cornerStrength of [20, 100]) for (const seed of [0, 7, 42, 99999, 2147483647]) {
        const params: Partial<Params> = { cornerPattern, cornerCount, curves, width, straight, size, cornerStrength,
          seed, height: seed % 2 ? 200 : 0, density: 0, obstacles: 8 };
        if (cornerCount) byPattern[cornerPattern].attempted++;
        const start = performance.now();
        let track;
        try { track = generateTrack(params); }
        catch (error) {
          assert.ok(error instanceof PatternGenerationError); assert.equal(error.attempts, MAX_PATTERN_ATTEMPTS);
          assert.equal(error.reasons.length, MAX_PATTERN_ATTEMPTS);
          byPattern[cornerPattern].rejected++; failures.push({ params, reasons: error.reasons }); continue;
        }
        times.push(performance.now() - start);
        assert.deepEqual(track, generateTrack(params));
        if (!cornerCount) { disabled++; assert.equal(track.patternReport.inserted, 0); continue; }
        byPattern[cornerPattern].applied++; inserted += track.patternReport.inserted;
        const r = track.patternReport, audit = r.geometry!;
        attempts[r.attempts] = (attempts[r.attempts] ?? 0) + 1;
        assert.equal(r.inserted, cornerCount); assert.ok(r.attempts <= MAX_PATTERN_ATTEMPTS);
        assert.ok(r.patterns.every(m => m.verified)); assert.equal(audit.valid, true);
        assert.equal(audit.boundariesChecked, true); assert.equal(audit.selfIntersections, 0);
        assert.equal(audit.boundaryIntersections, 0); assert.equal(audit.foldedTriangles, 0);
        assert.ok(audit.minRadius >= (width / 2 + 19.5) * 1.12);
        const car = spawnVehicle(track); assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS);
        assert.equal(generateCoins(track).length, 10);
      }
    }
  }
  times.sort((a, b) => a - b);
  const summary = { disabled, byPattern, inserted, attempts, rejectedCases: failures,
    timingMs: { median: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * 0.95)], max: times.at(-1) } };
  mkdirSync('tmp', { recursive: true });
  writeFileSync('tmp/v04-pattern-audit.json', JSON.stringify(summary, null, 2));
  for (const stats of Object.values(byPattern)) assert.ok(stats.applied / stats.attempted >= 0.98);
  t.diagnostic(JSON.stringify({ disabled, byPattern, inserted, attempts, timingMs: summary.timingMs }));
});

test('v0.4: high-speed approaches remain on asphalt at pattern arcs, collars and closed seam', () => {
  for (const cornerPattern of kinds) for (const width of [20, 80]) {
    const track = generateTrack({ cornerPattern, cornerCount: 3, width, height: 200, obstacles: 0, density: 0 });
    const indices = [0, track.points.length - 2, ...track.patternReport.patterns.flatMap(m =>
      [m.startIndex - 2, m.startIndex, Math.round((m.startIndex + m.endIndex) / 2), m.endIndex + 2])];
    for (const index of indices) for (const side of [-1, 1]) for (const speed of [-65, 160]) {
      const p = track.points[index], n = track.normals[index], car = spawnVehicle(track);
      Object.assign(car, p, { speed, heading: Math.atan2(n.x * side * Math.sign(speed), n.z * side * Math.sign(speed)) });
      for (let step = 0; step < 24; step++) {
        updateVehicle(car, { ...NO_INPUT, throttle: speed > 0, reverse: speed < 0 }, track, 1 / 30);
        assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS - 1e-6);
        assert.ok(Number.isFinite(car.y));
      }
    }
  }
});
