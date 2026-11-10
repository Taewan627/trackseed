import test from 'node:test';
import assert from 'node:assert/strict';
import { CAR_RADIUS, CURB, SIDEWALK, DEFAULTS, STEPS, catmull, elevation, generateTrack, mapTransform,
  project, roadContact, roadHeight, sanitize } from '../src/core.js';
import { NO_INPUT, spawnVehicle, updateVehicle, type Controls, type Vehicle } from '../src/vehicle.js';
import { COIN_COUNT, COIN_RADIUS, CoinRun, generateCoins } from '../src/coins.js';

const qualitySeeds = [0, 1, 7, 42, 99999, 2147483647, 17, 131, 4093, 65537, 1000003,
  1199540897, 1367130551, 1580030173, 1860528571, 2038074743];

test('coins: ten deterministic reachable pickups clear asphalt edges, spawn, obstacles and each other', t => {
  let cases = 0;
  for (const seed of qualitySeeds) for (const curves of [3, 10]) for (const width of [20, 80]) {
    for (const straight of [0, 0.6]) for (const height of [0, 200]) {
      const track = generateTrack({ seed, curves, width, straight, height, obstacles: 8, density: 0 });
      const coins = generateCoins(track);
      const spawn = spawnVehicle(track);
      assert.equal(coins.length, COIN_COUNT); assert.equal(new Set(coins.map(c => c.id)).size, COIN_COUNT);
      assert.deepEqual(coins, generateCoins(track));
      for (const [i, coin] of coins.entries()) {
        assert.ok(roadContact(track, coin.x, coin.z).clearance >= CAR_RADIUS + 0.4);
        assert.equal(coin.y, roadHeight(track, coin.x, coin.z));
        assert.ok(Math.hypot(coin.x - track.points[0].x, coin.z - track.points[0].z) >= 40);
        assert.ok(Math.hypot(coin.x - spawn.x, coin.z - spawn.z) >= 40);
        for (const o of track.obstacles) assert.ok(Math.hypot(coin.x - o.x, coin.z - o.z) >=
          CAR_RADIUS + o.radius + COIN_RADIUS + 2);
        for (const other of coins.slice(i + 1)) assert.ok(Math.hypot(coin.x - other.x, coin.z - other.z) >= 28);
      }
      cases++;
    }
  }
  assert.notDeepEqual(generateCoins(generateTrack({ seed: 42 })), generateCoins(generateTrack({ seed: 43 })));
  assert.deepEqual(generateCoins(generateTrack({ density: 0 })), generateCoins(generateTrack({ density: 20 })));
  t.diagnostic(`${cases} seeded extreme layouts with ten safe coins each`);
});

test('coins: repeated contact cannot collect the same coin twice and completion counts exactly ten', () => {
  const run = new CoinRun(generateTrack());
  assert.equal(run.count, 0); assert.equal(run.complete, false);
  assert.deepEqual(run.collect(run.coins[0]), [0]);
  for (let i = 0; i < 100; i++) assert.deepEqual(run.collect(run.coins[0]), []);
  assert.equal(run.count, 1);
  for (const coin of run.coins.slice(1)) assert.deepEqual(run.collect(coin), [coin.id]);
  assert.equal(run.count, 10); assert.equal(run.complete, true);
  for (const coin of run.coins) assert.deepEqual(run.collect(coin), []);
  assert.equal(run.count, 10);
});

test('coins: regeneration resets count and collected IDs for the same Seed and changed parameters', () => {
  const track = generateTrack(), previous = new CoinRun(track);
  for (const coin of previous.coins) previous.collect(coin);
  for (const next of [track, generateTrack({ seed: 131, width: 20, curves: 3, obstacles: 8 })]) {
    const run = new CoinRun(next);
    assert.equal(run.count, 0); assert.equal(run.complete, false); assert.deepEqual(run.collectedIds, []);
    assert.deepEqual(run.coins, generateCoins(next));
    assert.equal(run.collect(run.coins[0]).length, 1); assert.equal(run.count, 1);
  }
});

test('coins: spawn, distant positions and another vertical level cannot collect a pickup', () => {
  const track = generateTrack(), run = new CoinRun(track);
  assert.deepEqual(run.collect(spawnVehicle(track)), []);
  const coin = run.coins[0];
  assert.deepEqual(run.collect({ ...coin, y: coin.y + 100 }), []);
  assert.deepEqual(run.collect({ x: 10000, y: 0, z: 10000 }), []);
  assert.equal(run.count, 0);
});

test('v0.3: every extreme spawn fits the conservative hull on asphalt', () => {
  for (const seed of qualitySeeds) for (const curves of [3, 10]) for (const width of [20, 80]) {
    const track = generateTrack({ seed, curves, width, straight: 0.6, height: 200, obstacles: 8 });
    const car = spawnVehicle(track);
    assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS);
    assert.equal(car.speed, 0); assert.equal(car.y, roadHeight(track, car.x, car.z));
    assert.ok(track.obstacles.every(o => Math.hypot(car.x - o.x, car.z - o.z) >= CAR_RADIUS + o.radius));
  }
});

test('v0.3: oblique wall contact clips outward velocity and preserves tangent sliding', () => {
  const track = flat(), i = 30, p = track.points[i], n = track.normals[i];
  for (const side of [-1, 1]) {
    const car = spawnVehicle(track), offset = track.params.width / 2 - CAR_RADIUS - 0.02;
    Object.assign(car, { x: p.x + n.x * side * offset, z: p.z + n.z * side * offset,
      heading: Math.atan2(n.z + n.x * side, -n.x + n.z * side), speed: 100 });
    const start = { ...car };
    updateVehicle(car, NO_INPUT, track, 1 / 120);
    const hit = roadContact(track, car.x, car.z);
    assert.ok(car.collision > 0); assert.ok(car.speed > 50 && car.speed < 90);
    assert.ok(car.vx * hit.nx + car.vz * hit.nz >= -1e-6);
    assert.ok(Math.hypot(car.x - start.x, car.z - start.z) > 0.3);
    simulate(car, track, 0.5);
    assert.ok(car.speed > 30, 'tangent velocity must survive repeated contact');
    assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS);
  }
});

test('v0.3: high-speed steering, both walls and seam stay contained at 10/30/120Hz', t => {
  let samples = 0;
  for (const seed of [0, 42, 2147483647]) for (const curves of [3, 10]) for (const width of [20, 80]) {
    const track = generateTrack({ seed, curves, width, height: 200, straight: 0.6, obstacles: 0, density: 0 });
    for (const index of [0, 59, track.points.length - 2]) for (const direction of [-1, 1]) for (const dt of [0.1, 1 / 30, 1 / 120]) {
      const car = spawnVehicle(track), p = track.points[index], n = track.normals[index];
      Object.assign(car, p, { heading: Math.atan2(n.x * direction, n.z * direction), speed: 160 });
      for (let step = 0; step < 60; step++) {
        updateVehicle(car, { ...NO_INPUT, throttle: true, left: step % 24 < 12, right: step % 24 >= 12 }, track, dt);
        assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS - 1e-6,
          JSON.stringify({ seed, curves, width, index, direction, dt, step }));
        assert.ok(Math.abs(car.y - roadHeight(track, car.x, car.z)) < 1e-6);
        samples++;
      }
    }
  }
  t.diagnostic(`${samples} high-speed wall/curve/seam samples`);
});

test('v0.3: local projection wraps through seam and keeps an adjacent branch hint', () => {
  const track = flat(), last = track.points.length - 2;
  for (const [index, hint] of [[0, last], [last, 0], [59, 60]]) {
    const a = track.points[index], b = track.points[index + 1];
    const hit = project(track, (a.x + b.x) / 2, (a.z + b.z) / 2, hint);
    assert.equal(hit.index, index); assert.ok(hit.distance < 1e-8);
  }
  // Distinct close parallel branches: a tiny global distance advantage must not
  // teleport the car across the intervening track topology.
  const synthetic = { ...track, points: Array.from({ length: 41 }, (_, i) => ({
    x: i <= 20 ? i : 40 - i, y: i <= 20 ? 0 : 100, z: i <= 20 ? 0 : 1,
  })) };
  assert.ok(project(synthetic, 5.5, 0.6).index > 20);
  assert.ok(project(synthetic, 5.5, 0.6, 5).index < 20);
});

const flat = () => generateTrack({ height: 0, obstacles: 0, density: 0 });
function simulate(car: Vehicle, track: ReturnType<typeof generateTrack>, seconds: number,
  input: Partial<Controls> = {}, dt = 1 / 120) {
  for (let i = 0; i < Math.round(seconds / dt); i++) updateVehicle(car, { ...NO_INPUT, ...input }, track, dt);
}

test('Catmull–Rom interpolates the two inner waypoints', () => {
  assert.equal(catmull(5, 10, 20, 4, 0), 10);
  assert.equal(catmull(5, 10, 20, 4, 1), 20);
});
test('same parameters and seed reproduce all track, obstacle and scenery data', () => {
  assert.deepEqual(generateTrack(), generateTrack());
  assert.notDeepEqual(generateTrack({ seed: 42 }).points, generateTrack({ seed: 43 }).points);
  assert.deepEqual(generateTrack({ density: 0, obstacles: 0 }).points, generateTrack().points);
});
test('zero density and zero obstacles create no objects', () => {
  const t = generateTrack({ density: 0, obstacles: 0 });
  assert.equal(t.props.length, 0); assert.equal(t.obstacles.length, 0);
});
test('height and derivative are periodic at the closed seam', () => {
  for (const seed of [0, 42, 99999, 2147483647]) {
    const p = { ...DEFAULTS, seed, height: 200 }, h = 0.00001;
    assert.ok(Math.abs(elevation(0, p) - elevation(1, p)) < 1e-5);
    const left = (elevation(1, p) - elevation(1 - h, p)) / h;
    const right = (elevation(h, p) - elevation(0, p)) / h;
    assert.ok(Math.abs(left - right) < 2);
    const t = generateTrack(p);
    assert.deepEqual(t.points[0], t.points.at(-1));
    assert.deepEqual(t.normals[0], t.normals.at(-1));
  }
});
test('minimum/maximum geometry and all-straight-ratio extremes stay finite', () => {
  for (const curves of [3, 10]) for (const straight of [0, 0.6]) for (const width of [20, 80]) {
    const t = generateTrack({ curves, straight, width, height: 200 });
    assert.equal(t.points.length, curves * STEPS + 1);
    assert.equal(t.straightSegments.filter(Boolean).length, Math.round(curves * straight));
    assert.ok(t.length > 0);
    assert.ok(t.points.every(p => Object.values(p).every(Number.isFinite)));
    assert.ok(t.normals.every(p => Math.abs(Math.hypot(p.x, p.z) - 1) < 1e-12));
  }
});
test('parameter validation handles non-finite, fractional and out-of-range values', () => {
  const p = sanitize({ curves: 100, width: -5, density: NaN, height: Infinity,
    obstacles: 2.6, straight: 100, seed: -1, scene: 'bad' as never });
  assert.equal(p.curves, 10); assert.equal(p.width, 20); assert.equal(p.density, DEFAULTS.density);
  assert.equal(p.height, DEFAULTS.height); assert.equal(p.obstacles, 3);
  assert.equal(p.straight, 0.6); assert.equal(p.seed, 0); assert.equal(p.scene, 'mixed');
});
test('minimap fits the complete road, curb and sidewalk at every scale', () => {
  for (const size of [1, 2, 3]) {
    const t = generateTrack({ size, width: 80 });
    const map = mapTransform(t, 264, 204);
    const half = 40 + CURB + SIDEWALK;
    t.points.forEach((p, i) => {
      for (const sign of [-1, 1]) {
        const n = t.normals[i], v = map.point(p.x + n.x * half * sign, p.z + n.z * half * sign);
        assert.ok(v.x >= 17.99 && v.x <= 246.01 && v.y >= 17.99 && v.y <= 186.01);
      }
    });
    assert.ok(map.scale > 0);
  }
});
test('procedural props clear the entire road and the spawn; all four kinds are available', () => {
  const t = generateTrack({ density: 20 });
  assert.deepEqual(new Set(t.props.map(p => p.kind)), new Set(['tree', 'bench', 'lamp', 'building']));
  for (const p of t.props) {
    assert.ok(project(t, p.x, p.z).distance > t.params.width / 2 + CURB);
    assert.ok(Math.hypot(p.x - t.points[0].x, p.z - t.points[0].z) >= 32);
  }
  assert.ok(generateTrack({ scene: 'nature' }).props.every(p => p.kind !== 'building'));
  assert.ok(generateTrack({ scene: 'city' }).props.every(p => p.kind !== 'tree'));
});
test('nearest road projection interpolates heights and includes the closing segment', () => {
  const t = generateTrack();
  for (const i of [0, 51, t.points.length - 2]) {
    const a = t.points[i], b = t.points[i + 1];
    const hit = project(t, (a.x + b.x) / 2, (a.z + b.z) / 2);
    assert.ok(hit.distance < 1e-8); assert.ok(Math.abs(hit.y - (a.y + b.y) / 2) < 1e-8);
  }
});

test('world-coordinate acceleration follows its heading, never the road tangent', () => {
  const t = flat(), car = spawnVehicle(t), start = { ...car };
  simulate(car, t, 1, { throttle: true });
  assert.ok(car.speed > 60); assert.equal(car.heading, start.heading);
  const dx = car.x - start.x, dz = car.z - start.z;
  assert.ok(Math.abs(dx * Math.cos(start.heading) - dz * Math.sin(start.heading)) < 1e-8);
  assert.ok(Math.hypot(dx, dz) > 30);
});
test('steering requires motion; left/right and reverse steering have correct signs', () => {
  const t = flat(), car = spawnVehicle(t), heading = car.heading;
  simulate(car, t, 1, { left: true }); assert.equal(car.heading, heading);
  for (const direction of [1, -1]) for (const left of [true, false]) {
    const c = spawnVehicle(t); c.speed = 40 * direction;
    simulate(c, t, 0.1, { left, right: !left });
    assert.ok((c.heading - heading) * direction * (left ? 1 : -1) > 0);
  }
});
test('natural friction, brake and reverse are independent controls', () => {
  const t = flat(), coast = spawnVehicle(t), brake = spawnVehicle(t), reverse = spawnVehicle(t);
  coast.speed = brake.speed = 70;
  simulate(coast, t, 0.2); simulate(brake, t, 0.2, { brake: true });
  assert.ok(coast.speed > 0 && coast.speed < 70); assert.ok(brake.speed < coast.speed - 30);
  simulate(reverse, t, 1, { reverse: true }); assert.ok(reverse.speed < -35);
});
test('curb and sidewalk positions are corrected onto asphalt with the full hull inside', () => {
  const t = flat(), i = 40, p = t.points[i], n = t.normals[i];
  for (const side of [-1, 1]) for (const offset of [20, 25, 28]) {
    const car = spawnVehicle(t);
    Object.assign(car, { x: p.x + n.x * offset * side, z: p.z + n.z * offset * side });
    updateVehicle(car, NO_INPUT, t, 1 / 120);
    assert.ok(roadContact(t, car.x, car.z).clearance >= CAR_RADIUS);
    assert.equal(car.surface, 'asphalt'); assert.equal(car.speed, 0);
    assert.equal(car.y, roadHeight(t, car.x, car.z));
    assert.ok(car.collision > 0);
  }
});

test('asphalt boundary contains high-speed outward driving', () => {
  for (const curves of [3, 10]) for (const height of [0, 200]) {
    const t = generateTrack({ curves, height, width: 20, obstacles: 0 });
    const car = spawnVehicle(t), n = t.normals[0];
    car.heading = Math.atan2(n.x, n.z); car.speed = 160;
    let contact = false;
    for (let i = 0; i < 900; i++) {
      updateVehicle(car, { ...NO_INPUT, throttle: true }, t, 1 / 60);
      contact ||= car.collision > 0;
      assert.ok(project(t, car.x, car.z).distance <= 10 - CAR_RADIUS + 0.1);
    }
    assert.ok(contact); assert.ok(car.speed < 80);
  }
});
test('car height follows high elevation and seam without non-finite state', () => {
  const t = generateTrack({ height: 200, obstacles: 0 });
  for (const i of [0, 45, 180, t.points.length - 2]) {
    const car = spawnVehicle(t); Object.assign(car, t.points[i]); car.speed = 10;
    car.heading = Math.atan2(t.points[i + 1].x - car.x, t.points[i + 1].z - car.z);
    simulate(car, t, 0.05);
    assert.ok(Math.abs(car.y - roadHeight(t, car.x, car.z)) < 1e-6);
    assert.ok([car.x, car.y, car.z, car.heading, car.pitch, car.speed].every(Number.isFinite));
  }
});
test('substeps avoid tunnelling and make different frame rates agree', () => {
  const t = flat(), a = spawnVehicle(t), b = spawnVehicle(t);
  simulate(a, t, 1, { throttle: true }, 1 / 120); simulate(b, t, 1, { throttle: true }, 1 / 30);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-8);
  const obstacleTrack = generateTrack({ height: 0, obstacles: 1 });
  const c = spawnVehicle(obstacleTrack), o = obstacleTrack.obstacles[0];
  c.x = o.x; c.z = o.z - 10; c.heading = 0; c.speed = 160;
  updateVehicle(c, NO_INPUT, obstacleTrack, 0.1);
  assert.ok(c.collision > 0); assert.ok(Math.hypot(c.x - o.x, c.z - o.z) >= CAR_RADIUS + o.radius - 1e-6);
  assert.ok(c.speed < 80);
});

test('quality: 512 seeded extreme combinations preserve deterministic finite closed geometry', t => {
  let cases = 0;
  for (const seed of qualitySeeds) for (let bits = 0; bits < 32; bits++) {
    const params = { seed, curves: bits & 1 ? 3 : 10, straight: bits & 2 ? 0.6 : 0,
      width: bits & 4 ? 20 : 80, size: bits & 8 ? 1 : 3, height: bits & 16 ? 200 : 0,
      obstacles: bits % 2 ? 8 : 0, density: bits % 3 ? 20 : 0,
      scene: (['nature', 'city', 'mixed'] as const)[bits % 3] };
    const track = generateTrack(params);
    assert.deepEqual(track, generateTrack(params), `seed=${seed}, bits=${bits}`);
    assert.deepEqual(track.points[0], track.points.at(-1));
    assert.deepEqual(track.normals[0], track.normals.at(-1));
    assert.ok(track.points.every(p => Object.values(p).every(Number.isFinite)));
    for (const p of track.obstacles) assert.ok(project(track, p.x, p.z).distance <= params.width / 2);
    cases++;
  }
  t.diagnostic(`${cases} complete geometry/scenery reproductions across ${qualitySeeds.length} seeds`);
});

test('quality: acceleration, coasting, braking and opposite steering remain continuous', () => {
  const track = flat();
  // Isolate control response from wall contact without changing production parameters.
  track.points = track.points.map(p => ({ x: p.x * 1000, y: 0, z: p.z * 1000 }));
  track.roadEdges = [-1, 1].map(side => track.points.map((p, i) => ({
    x: p.x + track.normals[i].x * side * track.params.width / 2,
    y: p.y, z: p.z + track.normals[i].z * side * track.params.width / 2,
  }))) as typeof track.roadEdges;
  const car = spawnVehicle(track);
  for (let i = 0; i < 360; i++) {
    const speed = car.speed;
    updateVehicle(car, { ...NO_INPUT, throttle: true }, track, 1 / 120);
    assert.ok(car.speed >= speed && car.speed - speed <= 95 / 120 + 1e-8);
    assert.equal(car.collision, 0);
  }
  assert.ok(car.speed > 150);
  for (let i = 0; i < 120; i++) {
    const speed = car.speed; updateVehicle(car, NO_INPUT, track, 1 / 120);
    assert.ok(car.speed >= 0 && car.speed < speed);
  }
  for (let i = 0; i < 120; i++) updateVehicle(car, { ...NO_INPUT, brake: true }, track, 1 / 120);
  assert.equal(car.speed, 0);
  for (const speed of [15, 80, 160, -15, -65]) {
    const left = spawnVehicle(track), right = spawnVehicle(track);
    left.speed = right.speed = speed;
    const h = left.heading;
    for (let i = 0; i < 12; i++) {
      const previous = left.heading;
      updateVehicle(left, { ...NO_INPUT, left: true }, track, 1 / 120);
      updateVehicle(right, { ...NO_INPUT, right: true }, track, 1 / 120);
      const delta = Math.atan2(Math.sin(left.heading - previous), Math.cos(left.heading - previous));
      assert.ok(Math.abs(delta) < 0.03);
    }
    const l = Math.atan2(Math.sin(left.heading - h), Math.cos(left.heading - h));
    const r = Math.atan2(Math.sin(right.heading - h), Math.cos(right.heading - h));
    assert.ok(Math.abs(l + r) < 1e-10);
  }
});

test('quality: both sides of curved and seam boundaries contain forward/reverse approaches', t => {
  let approaches = 0;
  for (const seed of qualitySeeds) for (const curves of [3, 10]) for (const width of [20, 80]) {
    const track = generateTrack({ seed, curves, width, straight: 0.6, height: 200, obstacles: 0, density: 0 });
    const limit = width / 2 - CAR_RADIUS;
    for (const i of [0, 1, 59, track.points.length - 2]) for (const side of [-1, 1]) for (const speed of [-65, 160]) {
      const car = spawnVehicle(track), p = track.points[i], n = track.normals[i];
      Object.assign(car, { x: p.x + n.x * side * (limit - 0.1), y: p.y,
        z: p.z + n.z * side * (limit - 0.1), speed,
        heading: Math.atan2(n.x * side * Math.sign(speed), n.z * side * Math.sign(speed)) });
      for (let step = 0; step < 12; step++) {
        updateVehicle(car, NO_INPUT, track, 1 / 120);
        assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS - 1e-6,
          `boundary escape: seed=${seed}, curves=${curves}, index=${i}`);
        assert.ok(Math.abs(car.speed) <= Math.abs(speed) + 2);
        assert.ok([car.x, car.y, car.z, car.speed].every(Number.isFinite));
      }
      approaches++;
    }
  }
  t.diagnostic(`${approaches} outward approaches, both road sides, forward/reverse, including seam`);
});

test('quality: curb contact at inner/outer curves does not instantly stop or bounce', () => {
  for (const seed of qualitySeeds) {
    const track = generateTrack({ seed, curves: 10, straight: 0, width: 40, height: 200, obstacles: 0, density: 0 });
    for (const i of [0, 60, 127, 599]) for (const side of [-1, 1]) {
      const p = track.points[i], n = track.normals[i], next = track.points[i + 1];
      for (const offset of [20 - CAR_RADIUS - 0.01, 20 - CAR_RADIUS + 0.01, 20, 22.6]) {
        const car = spawnVehicle(track);
        Object.assign(car, { x: p.x + n.x * offset * side, y: p.y, z: p.z + n.z * offset * side,
          heading: Math.atan2(next.x - p.x, next.z - p.z), speed: 80 });
        updateVehicle(car, NO_INPUT, track, 1 / 120);
        assert.ok(car.speed > 75 && car.speed < 82);
        assert.ok(roadContact(track, car.x, car.z).clearance >= CAR_RADIUS - 1e-6);
        assert.equal(car.surface, 'asphalt');
      }
    }
  }
});

test('quality: start/end crossings match mesh height and keep direction and travel continuous', () => {
  for (const seed of qualitySeeds) for (const curves of [3, 10]) {
    const track = generateTrack({ seed, curves, straight: 0.6, height: 200, width: 80, obstacles: 0, density: 0 });
    const car = spawnVehicle(track), a = track.points.at(-2)!, b = track.points[0];
    Object.assign(car, a, { heading: Math.atan2(b.x - a.x, b.z - a.z), speed: 80 });
    const heading = car.heading;
    for (let step = 0; step < 30; step++) {
      const previous = { ...car };
      updateVehicle(car, NO_INPUT, track, 1 / 120);
      const hit = project(track, car.x, car.z);
      assert.ok(Math.abs(car.y - roadHeight(track, car.x, car.z, hit)) < 1e-6);
      assert.ok(Math.hypot(car.x - previous.x, car.z - previous.z) < 1);
      // The original sharp straight/curve join can overlap at different heights.
      // Verify the actual visible mesh surface instead of the old centerline approximation.
      assert.ok(Number.isFinite(car.y));
      assert.ok(Math.abs(car.heading - heading) < 1e-12);
      assert.equal(car.collision, 0);
    }
  }
});
