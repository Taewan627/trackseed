import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

async function edit(page, values) {
  await page.locator('#parameters').evaluate((form, values) => {
    for (const [key, value] of Object.entries(values)) {
      const input = form.querySelector(`#${key === 'cornerPattern' || key === 'seed' ? key : key + '-value'}`);
      input.value = String(value);
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }
  }, values);
}

for (const kind of ['right-angle', 'hairpin', 's-curve']) for (const mode of ['overview', 'chase']) {
  test(`v0.4: ${kind} automatically updates 3D/map/boundaries/coins in ${mode}`, async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?test=1'); await expect(page.locator('#status')).toContainText('생성 완료');
    await page.evaluate(() => {
      const s = window.__tracklab, c = s.coins.positions[0];
      Object.assign(s.pose, { x: c.x, y: c.y, z: c.z, speed: 0, vx: 0, vz: 0 });
    });
    await expect(page.locator('#coin-count')).toHaveText('1 / 10');
    await page.locator(`#${mode}`).click();
    const generation = await page.evaluate(() => window.__tracklab.generation);
    const oldMap = await page.locator('#minimap').evaluate(c => c.toDataURL());
    const old3D = await page.locator('#viewport > canvas').screenshot();
    await edit(page, { cornerPattern: kind, cornerCount: 3, cornerStrength: 60 });
    await expect.poll(() => page.evaluate(() => window.__tracklab.generation)).toBe(generation + 1);
    await expect(page.locator('#pattern-status')).toContainText('3 / 3개 적용');
    await expect(page.locator('#pattern-status')).toContainText('도로/보도 검사 통과');
    await expect(page.locator('#pattern-warning')).toBeHidden();
    const state = await page.evaluate(async () => {
      const { roadContact, mapTransform } = await import('/src/core.ts');
      const { generateCoins } = await import('/src/coins.ts');
      const s = window.__tracklab, expected = mapTransform(s.track, 264, 204, 16).point(s.pose.x, s.pose.z);
      return { kind: s.track.params.cornerPattern, report: s.track.patternReport, speed: s.pose.speed, mode: s.mode,
        clearance: roadContact(s.track, s.pose.x, s.pose.z).clearance, coins: s.coins,
        expectedCoins: generateCoins(s.track), mapError: Math.hypot(expected.x - s.marker.x, expected.y - s.marker.y) };
    });
    expect(state.kind).toBe(kind); expect(state.mode).toBe(mode); expect(state.speed).toBe(0);
    expect(state.clearance).toBeGreaterThanOrEqual(7.2); expect(state.mapError).toBeLessThan(1e-8);
    expect(state.report.patterns.every(p => p.verified)).toBe(true); expect(state.report.geometry.valid).toBe(true);
    expect(state.coins.count).toBe(0); expect(state.coins.remaining).toBe(10);
    expect(state.coins.positions).toEqual(state.expectedCoins);
    expect(await page.locator('#minimap').evaluate(c => c.toDataURL())).not.toBe(oldMap);
    expect((await page.locator('#viewport > canvas').screenshot()).equals(old3D)).toBe(false);
    if (mode === 'chase') {
      // Frame the actual inserted corner, rather than only photographing spawn.
      await page.evaluate(() => {
        const s = window.__tracklab, i = s.track.patternReport.patterns[0].startIndex;
        const a = s.track.points[i], b = s.track.points[i + 1];
        Object.assign(s.pose, a, { speed: 0, vx: 0, vz: 0, roadIndex: i,
          heading: Math.atan2(b.x - a.x, b.z - a.z) });
      });
      await page.locator('#chase').click();
    }
    await page.locator('#cornerPattern').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/v04-${kind}-${mode}.png` });
    expect(errors).toEqual([]);
  });
}

test('v0.4: real rejected layout warns, preserves previous scene/coins and recovers with zero count', async ({ page }) => {
  await page.goto('/?test=1'); await expect(page.locator('#status')).toContainText('생성 완료');
  await page.evaluate(() => {
    const s = window.__tracklab, c = s.coins.positions[0];
    Object.assign(s.pose, { x: c.x, y: c.y, z: c.z, speed: 0, vx: 0, vz: 0 });
  });
  await expect(page.locator('#coin-count')).toHaveText('1 / 10');
  const before = await page.evaluate(() => ({ generation: window.__tracklab.generation,
    track: JSON.stringify(window.__tracklab.track), coins: window.__tracklab.coins }));
  await edit(page, { cornerPattern: 'hairpin', cornerCount: 1, curves: 3, width: 80, straight: 0.6,
    size: 1, cornerStrength: 20, seed: 0, height: 200, density: 0, obstacles: 8 });
  await expect(page.locator('#pattern-warning')).toBeVisible();
  await expect(page.locator('#pattern-warning')).toContainText('6회 시도');
  await expect(page.locator('#status')).toHaveText('패턴 적용 실패 · 이전 트랙 유지');
  const after = await page.evaluate(() => ({ generation: window.__tracklab.generation,
    track: JSON.stringify(window.__tracklab.track), coins: window.__tracklab.coins }));
  expect(after).toEqual(before);
  await page.locator('#cornerPattern').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/v04-rejected.png' });
  await edit(page, { cornerCount: 0 });
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.cornerCount)).toBe(0);
  await expect(page.locator('#pattern-warning')).toBeHidden();
  await expect(page.locator('#pattern-status')).toContainText('0개 · 기존 생성');
  await expect(page.locator('#coin-count')).toHaveText('0 / 10');
  expect(await page.evaluate(() => window.__tracklab.track.patternReport.inserted)).toBe(0);
});

async function harness(page) {
  await page.route('**/__patterns__', route => route.fulfill({ contentType: 'text/html',
    body: '<div id="host" style="width:960px;height:640px"></div>' }));
  await page.goto('/__patterns__');
  await page.evaluate(async () => {
    const [{ TrackView }, core, vehicle, three] = await Promise.all([
      import('/src/view.ts'), import('/src/core.ts'), import('/src/vehicle.ts'), import('/node_modules/.vite/deps/three.js'),
    ]);
    window.patternQA = { view: new TrackView(document.querySelector('#host')), core, vehicle, three };
  });
}

test('v0.4: actual road/curb/sidewalk meshes have continuous seams and contain the hull at new corners', async ({ page }) => {
  test.setTimeout(90000); await harness(page);
  const result = await page.evaluate(() => {
    const { view, core, vehicle, three } = window.patternQA;
    const ray = new three.Raycaster(), down = new three.Vector3(0, -1, 0);
    let samples = 0, outside = 0, folded = 0, seamErrors = 0, maxHeightError = 0;
    let example;
    for (const kind of ['right-angle', 'hairpin', 's-curve']) for (const width of [20, 80]) {
      const track = core.generateTrack({ cornerPattern: kind, cornerCount: 3, cornerStrength: 100,
        width, height: 200, density: 0, obstacles: 0 });
      view.setTrack(track);
      const meshes = view.scene.children.flatMap(g => g.children).filter(m => ['asphalt', 'curb', 'sidewalk'].includes(m.name));
      const asphalt = meshes.find(m => m.name === 'asphalt');
      for (const mesh of meshes) {
        const pos = mesh.geometry.attributes.position, index = mesh.geometry.index;
        let sign = 0;
        for (let i = 0; i < index.count; i += 3) {
          const [a, b, c] = [0, 1, 2].map(k => index.getX(i + k));
          const area = (pos.getX(b) - pos.getX(a)) * (pos.getZ(c) - pos.getZ(a)) -
            (pos.getZ(b) - pos.getZ(a)) * (pos.getX(c) - pos.getX(a));
          sign ||= Math.sign(area); if (Math.abs(area) < 1e-5 || Math.sign(area) !== sign) folded++;
        }
        for (let side = 0; side < 2; side++) for (let axis = 0; axis < 3; axis++)
          if (pos.getComponent(side, axis) !== pos.getComponent(pos.count - 2 + side, axis)) seamErrors++;
      }
      const indices = [0, track.points.length - 2, ...track.patternReport.patterns.flatMap(m =>
        [m.startIndex, Math.round((m.startIndex + m.endIndex) / 2), m.endIndex])];
      for (const i of indices) for (const side of [-1, 1]) for (const speed of [-65, 160]) {
        const p = track.points[i], n = track.normals[i], car = vehicle.spawnVehicle(track);
        Object.assign(car, p, { speed, heading: Math.atan2(n.x * side * Math.sign(speed), n.z * side * Math.sign(speed)) });
        for (let step = 0; step < 12; step++) {
          vehicle.updateVehicle(car, { ...vehicle.NO_INPUT, throttle: speed > 0, reverse: speed < 0 }, track, 1 / 30);
          for (let j = -1; j < 16; j++) {
            const r = j < 0 ? 0 : core.CAR_RADIUS;
            ray.set(new three.Vector3(car.x + Math.sin(j * Math.PI / 8) * r, 10000,
              car.z + Math.cos(j * Math.PI / 8) * r), down);
            const hit = ray.intersectObject(asphalt, false)[0];
            if (!hit) { outside++; example ??= { kind, width, i, side, speed, step, j }; }
            if (hit && j < 0) maxHeightError = Math.max(maxHeightError, Math.abs(hit.point.y - car.y));
            samples++;
          }
        }
      }
    }
    view.dispose(); return { tracks: 6, samples, outside, folded, seamErrors, maxHeightError, example };
  });
  writeFileSync('test-results/v04-boundaries.json', JSON.stringify(result, null, 2));
  expect(result.outside, JSON.stringify(result.example)).toBe(0); expect(result.folded).toBe(0);
  expect(result.seamErrors).toBe(0); expect(result.maxHeightError).toBeLessThan(1e-5);
});

test('v0.4: 100 pattern regenerations keep GPU resources and post-GC heap bounded', async ({ page }) => {
  test.setTimeout(90000); await harness(page);
  const client = await page.context().newCDPSession(page);
  const run = count => page.evaluate(count => {
    const { view, core, vehicle } = window.patternQA;
    for (let i = 0; i < count; i++) {
      const track = core.generateTrack({ cornerPattern: ['right-angle', 'hairpin', 's-curve'][i % 3],
        cornerCount: i % 3 + 1, cornerStrength: i % 2 ? 20 : 100, curves: 10, size: 2,
        straight: i % 2 ? 0 : 0.6, width: i % 2 ? 20 : 80, seed: i, height: 200, density: 20 });
      view.setTrack(track); view.render(vehicle.spawnVehicle(track), 1 / 60);
    }
    const final = core.generateTrack({ cornerPattern: 'hairpin', cornerCount: 3, width: 80, density: 20 });
    view.setTrack(final); view.render(vehicle.spawnVehicle(final), 1 / 60);
    return { ...view.renderer.info.memory, programs: view.renderer.info.programs.length,
      calls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles,
      objects: view.scene.children.reduce((n, g) => n + 1 + g.children.length, 0) };
  }, count);
  await run(10);
  const snapshots = [];
  for (const count of [0, 25, 25, 25, 25]) {
    const resources = await run(count); await client.send('HeapProfiler.collectGarbage');
    const heap = await client.send('Runtime.getHeapUsage');
    snapshots.push({ ...resources, heap: heap.usedSize, backing: heap.backingStorageSize });
  }
  const disposed = await page.evaluate(() => {
    const view = window.patternQA.view; view.dispose(); return { ...view.renderer.info.memory };
  });
  writeFileSync('test-results/v04-memory.json', JSON.stringify({ regenerations: 100, snapshots, disposed }, null, 2));
  const { heap, backing, ...base } = snapshots[0];
  for (const s of snapshots.slice(1)) {
    const { heap: used, backing: storage, ...resources } = s;
    expect(resources).toEqual(base); expect(used).toBeLessThan(heap + 4 * 1024 * 1024);
    expect(storage).toBeLessThan(backing + 2 * 1024 * 1024);
  }
  expect(disposed.geometries).toBe(0); expect(disposed.textures).toBe(0);
});
