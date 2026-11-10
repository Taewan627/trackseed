import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

async function freezeClock(page) {
  const time = new Date('2026-11-05T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
}

for (const mode of ['overview', 'chase']) {
  test(`v0.3: real slider input updates 3D and minimap automatically in ${mode}`, async ({ page }) => {
    await page.goto('/?test=1');
    await expect(page.locator('#status')).toContainText('생성 완료');
    await page.locator(`#${mode}`).click();
    const generation = await page.evaluate(() => window.__tracklab.generation);
    const before3D = await page.locator('#viewport > canvas').screenshot();
    const beforeMap = await page.locator('#minimap').evaluate(c => c.toDataURL());
    await page.locator('#width').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#width-value')).toHaveValue('80');
    await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.width)).toBe(80);
    const state = await page.evaluate(() => window.__tracklab);
    expect(state.generation).toBe(generation + 1); expect(state.mode).toBe(mode);
    expect(state.pose.speed).toBe(0);
    expect(await page.locator('#minimap').evaluate(c => c.toDataURL())).not.toBe(beforeMap);
    expect((await page.locator('#viewport > canvas').screenshot()).equals(before3D)).toBe(false);
    await expect(page.locator('#status')).toContainText('차량 안전 재배치 / 속도 0');
    await page.screenshot({ path: `test-results/v03-live-${mode}.png` });
  });
}

test('v0.3: rapid slider inputs debounce once, retain the final value and cancel on manual Generate', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('생성 완료');
  // Virtual timers make the 149/150ms boundary deterministic even on a slow GPU.
  await freezeClock(page);
  const before = await page.evaluate(() => window.__tracklab.generation);
  await page.locator('#width').evaluate(input => {
    for (const value of [20, 23, 41, 55, 80, 37]) {
      input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await expect(page.locator('#width-value')).toHaveValue('37');
  await expect(page.locator('#status')).toContainText('자동 갱신 대기');
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before);
  await page.clock.runFor(149);
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before);
  await page.clock.runFor(1);
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before + 1);
  expect(await page.evaluate(() => window.__tracklab.track.params.width)).toBe(37);
  await page.locator('#width').evaluate(input => {
    input.value = '65'; input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#parameters').requestSubmit();
  });
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before + 2);
  await page.clock.runFor(500);
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before + 2);
  expect(await page.evaluate(() => window.__tracklab.track.params.width)).toBe(65);
});

test('v0.3: numeric, Seed and theme edits share one deterministic track and safely stop Drive', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('생성 완료');
  await page.locator('#chase').click();
  await page.locator('#viewport > canvas').focus(); await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBeGreaterThan(10);
  await page.locator('#curves-value').fill('10');
  await page.keyboard.up('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.curves)).toBe(10);
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBe(0);
  expect(await page.evaluate(() => window.__tracklab.mode)).toBe('chase');
  await page.locator('#seed').fill('');
  const before = await page.evaluate(() => window.__tracklab.generation);
  await expect(page.locator('#status')).toContainText('입력 대기');
  // Prove an unfinished numeric edit cannot accidentally become Seed 0.
  await freezeClock(page); await page.clock.runFor(300);
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(before);
  await page.locator('#seed').fill('123456');
  await page.locator('#scene').selectOption('city');
  await page.locator('#density-value').fill('20');
  await page.clock.runFor(150);
  const result = await page.evaluate(async () => {
    const core = await import('/src/core.ts');
    const { track, pose, marker, mode } = window.__tracklab;
    const expected = core.mapTransform(track, 264, 204, 16).point(pose.x, pose.z);
    return { matches: JSON.stringify(track) === JSON.stringify(core.generateTrack(track.params)),
      params: track.params, speed: pose.speed, mode, input: window.__tracklab.input,
      clearance: core.roadContact(track, pose.x, pose.z).clearance,
      mapError: Math.hypot(expected.x - marker.x, expected.y - marker.y) };
  });
  expect(result.params.seed).toBe(123456); expect(result.params.scene).toBe('city');
  expect(result.matches).toBe(true); expect(result.speed).toBe(0); expect(result.input).toEqual([]);
  expect(result.clearance).toBeGreaterThanOrEqual(7.2); expect(result.mapError).toBeLessThan(1e-8);
});

test('v0.3: repeated high-speed curb attempts keep the hull on rendered asphalt and height on its triangles', async ({ page }) => {
  test.setTimeout(90000);
  await page.route('**/__live_hull__', route => route.fulfill({ contentType: 'text/html',
    body: '<div id="host" style="width:800px;height:600px"></div>' }));
  await page.goto('/__live_hull__');
  const result = await page.evaluate(async () => {
    const [core, vehicle, { TrackView }, three] = await Promise.all([
      import('/src/core.ts'), import('/src/vehicle.ts'), import('/src/view.ts'), import('/node_modules/.vite/deps/three.js'),
    ]);
    const view = new TrackView(document.querySelector('#host'));
    const ray = new three.Raycaster(), down = new three.Vector3(0, -1, 0);
    let samples = 0, outside = 0, maxHeightError = 0, contacts = 0, meshVertexError = 0;
    let example, heightExample;
    for (const seed of [0, 42, 99999, 2147483647]) for (const curves of [3, 10]) for (const width of [20, 80]) {
      const track = core.generateTrack({ seed, curves, width, height: 200, straight: 0.6, density: 0, obstacles: 0 });
      view.setTrack(track);
      const asphalt = view.scene.children.flatMap(group => group.children).find(mesh => mesh.name === 'asphalt');
      const vertices = asphalt.geometry.getAttribute('position');
      track.roadEdges.forEach((edge, side) => edge.forEach((p, i) => {
        meshVertexError = Math.max(meshVertexError, Math.abs(vertices.getX(i * 2 + side) - p.x),
          Math.abs(vertices.getZ(i * 2 + side) - p.z));
      }));
      for (const i of [0, 59, track.points.length - 2]) for (const side of [-1, 1]) for (const speed of [-65, 160]) {
        const p = track.points[i], n = track.normals[i], car = vehicle.spawnVehicle(track);
        Object.assign(car, p, { speed, heading: Math.atan2(n.x * side * Math.sign(speed), n.z * side * Math.sign(speed)) });
        for (let step = 0; step < 36; step++) {
          vehicle.updateVehicle(car, { ...vehicle.NO_INPUT, throttle: speed > 0, reverse: speed < 0 }, track, 1 / 30);
          if (car.collision > 0) contacts++;
          // Independent Three.js raycasts test the actual triangles, not roadContact.
          for (let j = -1; j < 16; j++) {
            const radius = j < 0 ? 0 : core.CAR_RADIUS;
            ray.set(new three.Vector3(car.x + Math.sin(j * Math.PI / 8) * radius, 10000,
              car.z + Math.cos(j * Math.PI / 8) * radius), down);
            const hit = ray.intersectObject(asphalt, false)[0];
            if (!hit) { outside++; example ??= { seed, curves, width, i, side, speed, step, j, car: { ...car } }; }
            if (j < 0 && hit && Math.abs(hit.point.y - car.y) > maxHeightError) {
              maxHeightError = Math.abs(hit.point.y - car.y);
              heightExample = { seed, curves, width, i, side, speed, step, car: { ...car },
                rayHeight: hit.point.y, directHeight: core.roadHeight(track, car.x, car.z), face: hit.faceIndex };
            }
            samples++;
          }
        }
      }
    }
    view.dispose();
    return { tracks: 16, samples, outside, contacts, maxHeightError, meshVertexError, example, heightExample };
  });
  writeFileSync('test-results/v03-hull.json', JSON.stringify(result, null, 2));
  expect(result.outside, JSON.stringify(result.example)).toBe(0);
  expect(result.contacts).toBeGreaterThan(100);
  expect(result.meshVertexError).toBe(0); expect(result.maxHeightError).toBeLessThan(1e-5);
});

test('v0.3: 100 live parameter regenerations retain bounded scene resources and heap', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/?test=1'); await expect(page.locator('#status')).toContainText('생성 완료');
  await freezeClock(page);
  const client = await page.context().newCDPSession(page);
  const snapshots = [];
  const run = async count => {
    for (let i = 0; i < count; i++) {
      await page.locator('#seed').evaluate((input, seed) => {
        input.value = String(seed); input.dispatchEvent(new Event('input', { bubbles: true }));
      }, 80000 + snapshots.length * 25 + i);
      await page.clock.fastForward(160);
    }
    // Compare identical final params and objects, independent of random prop culling.
    await page.locator('#seed').fill('42'); await page.clock.fastForward(160);
    await client.send('HeapProfiler.collectGarbage');
    const heap = await client.send('Runtime.getHeapUsage');
    const state = await page.evaluate(() => {
      const s = window.__tracklab;
      return { memory: s.memory, calls: s.calls, triangles: s.triangles, generation: s.generation };
    });
    snapshots.push({ ...state, usedSize: heap.usedSize, backingStorageSize: heap.backingStorageSize });
  };
  await run(10); // warmup
  for (let i = 0; i < 4; i++) await run(25);
  writeFileSync('test-results/v03-live-memory.json', JSON.stringify({ regenerations: 100, warmup: 10, snapshots }, null, 2));
  for (const snapshot of snapshots.slice(1)) {
    expect(snapshot.memory).toEqual(snapshots[0].memory);
    expect(snapshot.calls).toBe(snapshots[0].calls); expect(snapshot.triangles).toBe(snapshots[0].triangles);
    expect(snapshot.usedSize).toBeLessThan(snapshots[0].usedSize + 4 * 1024 * 1024);
    expect(snapshot.backingStorageSize).toBeLessThan(snapshots[0].backingStorageSize + 2 * 1024 * 1024);
  }
  expect(snapshots.at(-1).generation - snapshots[0].generation).toBeGreaterThanOrEqual(100);
});
