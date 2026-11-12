import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// A test-only, intercepted local page: no app route, diagnostic API or dependency added.
async function harness(page) {
  await page.route('**/__quality__', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><body style="margin:0;background:#11171c"><div id="quality-host" style="width:960px;height:640px"></div></body>',
  }));
  await page.goto('/__quality__');
  await page.evaluate(async () => {
    const [{ TrackView }, core, vehicle, { Minimap }, three] = await Promise.all([
      import('/src/view.ts'), import('/src/core.ts'), import('/src/vehicle.ts'),
      import('/src/minimap.ts'), import('/node_modules/.vite/deps/three.js'),
    ]);
    const view = new TrackView(document.getElementById('quality-host'));
    window.qa = { view, core, vehicle, Minimap, three };
  });
}

test('quality: rendered road/curb/sidewalk seams and multi-seed map coordinates', async ({ page }) => {
  await harness(page);
  const result = await page.evaluate(() => {
    const { view, core, vehicle, Minimap, three } = window.qa;
    const canvas = document.createElement('canvas');
    const minimap = new Minimap(canvas);
    let meshes = 0, poses = 0, maxPositionError = 0, maxDirectionError = 0;
    for (const seed of [0, 1, 42, 99999, 2147483647]) {
      for (const curves of [3, 10]) for (const straight of [0, 0.6]) {
        const track = core.generateTrack({ seed, curves, straight, width: 80, height: 200, density: 0 });
        view.setTrack(track); minimap.setTrack(track);
        const ribbons = view.scene.children.flatMap(group => group.children)
          .filter(mesh => ['asphalt', 'curb', 'sidewalk'].includes(mesh.name));
        if (ribbons.length !== 5) throw new Error('Missing road surfaces');
        for (const mesh of ribbons) {
          const position = mesh.geometry.getAttribute('position');
          const normal = mesh.geometry.getAttribute('normal');
          for (let side = 0; side < 2; side++) {
            const last = position.count - 2 + side;
            for (let axis = 0; axis < 3; axis++) {
              if (position.getComponent(side, axis) !== position.getComponent(last, axis)) throw new Error('Open mesh seam');
              if (!Number.isFinite(normal.getComponent(side, axis))) throw new Error('Invalid seam normal');
            }
          }
          if (mesh.geometry.index.count !== curves * 60 * 6) throw new Error('Open topology');
          meshes++;
        }
        for (const i of [0, 1, 59, track.points.length - 2]) for (const offset of [-20, 0, 20]) {
          const p = track.points[i], n = track.normals[i], pose = vehicle.spawnVehicle(track);
          Object.assign(pose, { x: p.x + n.x * offset, y: p.y, z: p.z + n.z * offset, heading: i * 0.37 });
          view.render(pose, 1 / 60); minimap.draw(pose.x, pose.z, pose.heading);
          const expected = core.mapTransform(track, 264, 204, 16).point(view.car.position.x, view.car.position.z);
          maxPositionError = Math.max(maxPositionError, Math.hypot(expected.x - minimap.marker.x, expected.y - minimap.marker.y));
          const forward = new three.Vector3(0, 0, 1).applyQuaternion(view.car.quaternion);
          const mapAngle = Math.atan2(forward.x, forward.z);
          maxDirectionError = Math.max(maxDirectionError,
            Math.abs(Math.atan2(Math.sin(mapAngle - minimap.marker.heading), Math.cos(mapAngle - minimap.marker.heading))));
          poses++;
        }
      }
    }
    view.dispose();
    return { tracks: 20, meshes, poses, maxPositionError, maxDirectionError };
  });
  writeFileSync('test-results/quality-seams-map.json', JSON.stringify(result, null, 2));
  expect(result.maxPositionError).toBeLessThan(1e-8);
  expect(result.maxDirectionError).toBeLessThan(1e-8);
});

test('quality: chase camera clearance and background line of sight across steep circuits', async ({ page }) => {
  await harness(page);
  const result = await page.evaluate(() => {
    const { view, core, vehicle, three } = window.qa;
    const ray = new three.Raycaster();
    let minimumClearance = Infinity, underground = 0, occludedByRoad = 0, occludedByProps = 0, samples = 0;
    let worst, blocked;
    const presets = [
      { curves: 3, straight: 0, width: 20, height: 200, size: 1 },
      { curves: 3, straight: 0.6, width: 80, height: 200, size: 1 },
      { curves: 10, straight: 0.6, width: 80, height: 200, size: 1 },
      { curves: 6, straight: 0.25, width: 40, height: 80, size: 2 },
    ];
    for (const seed of [0, 1, 7, 42, 99999, 2147483647]) for (const preset of presets) {
      const track = core.generateTrack({ ...preset, seed, density: 20, scene: 'mixed', obstacles: 0 });
      view.setTrack(track);
      const env = view.scene.children.find(group => group !== view.car && group.isGroup);
      const surfaces = env.children.filter(mesh => ['asphalt', 'curb', 'sidewalk'].includes(mesh.name));
      const solids = env.children.filter(mesh => mesh.isMesh);
      const pose = vehicle.spawnVehicle(track);
      view.setMode('chase', pose);
      view.scene.updateMatrixWorld(true);
      for (let lap = 0; lap < 2; lap++) for (let i = 0; i < track.points.length - 1; i++) {
        const p = track.points[i], next = track.points[i + 1];
        Object.assign(pose, p, { heading: Math.atan2(next.x - p.x, next.z - p.z), pitch: 0 });
        const dt = Math.hypot(next.x - p.x, next.z - p.z) / 80;
        // Exercise the exact production smoothing without spending a GPU frame per sample.
        view.follow(pose, 1 - Math.exp(-7 * dt));
        view.camera.updateMatrixWorld(true);
        const origin = view.camera.position.clone(); origin.y = 10000;
        ray.set(origin, new three.Vector3(0, -1, 0));
        const down = ray.intersectObjects(surfaces, false)[0];
        if (down) {
          const clearance = view.camera.position.y - down.point.y;
          if (clearance < minimumClearance) {
            minimumClearance = clearance;
            worst = { params: track.params, pose: { ...pose }, camera: view.camera.position.toArray(),
              target: view.target.toArray(), clearance };
          }
          if (clearance < 0) underground++;
        }
        if (i % 10 !== 0) continue;
        const target = new three.Vector3(pose.x, pose.y + 3.5, pose.z);
        const direction = target.clone().sub(view.camera.position), distance = direction.length();
        ray.set(view.camera.position, direction.normalize()); ray.far = distance - 1;
        const hit = ray.intersectObjects(solids, false)[0]; ray.far = Infinity;
        if (hit) {
          if (surfaces.includes(hit.object) || hit.object.geometry.type === 'BufferGeometry') occludedByRoad++;
          else occludedByProps++;
          blocked ??= { params: track.params, pose: { ...pose }, camera: view.camera.position.toArray(),
            target: view.target.toArray(), geometry: hit.object.geometry.type };
        }
        samples++;
      }
    }
    window.qa.audit = { worst, blocked };
    return { tracks: 24, lineOfSightSamples: samples, minimumClearance, underground,
      occludedByRoad, occludedByProps, worst, blocked };
  });
  writeFileSync('test-results/quality-camera.json', JSON.stringify(result, null, 2));
  for (const key of ['worst', 'blocked']) {
    await page.evaluate(key => {
      const { view, core, three, audit } = window.qa, frame = audit[key];
      if (!frame) return;
      view.setTrack(core.generateTrack(frame.params));
      view.car.position.set(frame.pose.x, frame.pose.y, frame.pose.z);
      view.car.rotation.set(0, frame.pose.heading, 0);
      view.camera.position.fromArray(frame.camera); view.camera.lookAt(new three.Vector3().fromArray(frame.target));
      view.renderer.render(view.scene, view.camera);
    }, key);
    await page.locator('#quality-host > canvas').screenshot({ path: `test-results/quality-camera-${key}.png` });
  }
  await page.evaluate(() => window.qa.view.dispose());
  expect(result.underground, JSON.stringify(result.worst)).toBe(0);
  // Visibility counts are reported separately: this is not full path planning.
  expect(result.occludedByProps).toBe(0);
});

test('quality: 100 mixed regenerations bound GPU resources and post-GC JavaScript heap', async ({ page }) => {
  await harness(page);
  const client = await page.context().newCDPSession(page);
  const run = async count => page.evaluate(count => {
    const { view, core, vehicle } = window.qa;
    for (let i = 0; i < count; i++) {
      const t = core.generateTrack({ seed: i, curves: i % 2 ? 3 : 10, height: i % 2 ? 0 : 200,
        width: i % 2 ? 20 : 80, density: i % 3 ? 20 : 0, scene: ['nature', 'city', 'mixed'][i % 3], obstacles: i % 9 });
      view.setTrack(t); view.render(vehicle.spawnVehicle(t), 1 / 60);
    }
    // Always compare precisely the same rendered workload after each batch.
    const t = core.generateTrack({ density: 20, curves: 10, width: 80, height: 200 });
    view.setTrack(t); view.render(vehicle.spawnVehicle(t), 1 / 60);
    return { ...view.renderer.info.memory, programs: view.renderer.info.programs.length,
      calls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles,
      objects: view.scene.children.reduce((n, o) => n + 1 + o.children.length, 0) };
  }, count);
  await run(10);
  const snapshots = [];
  for (const count of [0, 25, 25, 25, 25]) {
    const resources = await run(count);
    await client.send('HeapProfiler.collectGarbage');
    const heap = await client.send('Runtime.getHeapUsage');
    snapshots.push({ ...resources, usedSize: heap.usedSize, backingStorageSize: heap.backingStorageSize });
  }
  const disposed = await page.evaluate(() => {
    const { view } = window.qa; view.dispose(); return { ...view.renderer.info.memory };
  });
  const result = { regenerations: 100, warmup: 10, snapshots, disposed };
  writeFileSync('test-results/quality-memory.json', JSON.stringify(result, null, 2));
  const { usedSize: baseline, backingStorageSize: baselineStorage, ...base } = snapshots[0];
  for (const snapshot of snapshots.slice(1)) {
    const { usedSize, backingStorageSize, ...resources } = snapshot;
    expect(resources).toEqual(base);
    expect(usedSize).toBeLessThan(baseline + 4 * 1024 * 1024);
    expect(backingStorageSize).toBeLessThan(baselineStorage + 2 * 1024 * 1024);
  }
  expect(disposed.geometries).toBe(0); expect(disposed.textures).toBe(0);
});

test('quality: off-axis camera occlusion and rendered boundary audit', async ({ page }) => {
  await harness(page);
  const result = await page.evaluate(() => {
    const { view, core, vehicle, three } = window.qa;
    const ray = new three.Raycaster(), down = new three.Vector3(0, -1, 0);
    let poses = 0, roadOcclusions = 0, propOcclusions = 0, centersOutside = 0, footprintOutside = 0, hullSamples = 0;
    let propExample, footprintExample;
    for (const seed of [0, 42, 99999, 2147483647]) for (const curves of [3, 10]) for (const width of [20, 80]) {
      const track = core.generateTrack({ seed, curves, width, straight: 0.6, height: 200, density: 20, obstacles: 0 });
      view.setTrack(track);
      const env = view.scene.children.find(group => group !== view.car && group.isGroup);
      const surfaces = env.children.filter(mesh => ['asphalt', 'curb', 'sidewalk'].includes(mesh.name));
      const solids = env.children.filter(mesh => mesh.isMesh);
      const limit = width / 2 - core.CAR_RADIUS;
      for (const i of [0, 59, Math.floor((track.points.length - 1) / 2), track.points.length - 2]) {
        const p = track.points[i], n = track.normals[i], next = track.points[i + 1];
        for (const offset of [-limit, 0, limit]) {
          const pose = vehicle.spawnVehicle(track);
          Object.assign(pose, { x: p.x + n.x * offset, y: p.y, z: p.z + n.z * offset });
          vehicle.updateVehicle(pose, vehicle.NO_INPUT, track, 1 / 120);
          for (let angle = -1; angle < 8; angle++) {
            const radius = angle === -1 ? 0 : core.CAR_RADIUS;
            const x = pose.x + Math.sin(angle * Math.PI / 4) * radius;
            const z = pose.z + Math.cos(angle * Math.PI / 4) * radius;
            ray.set(new three.Vector3(x, 10000, z), down); ray.far = Infinity;
            if (!ray.intersectObjects(surfaces.filter(mesh => mesh.name === 'asphalt'), false).length) {
              if (angle === -1) centersOutside++;
              else footprintOutside++;
              footprintExample ??= { seed, curves, width, index: i, offset, angle };
            }
            hullSamples++;
          }
          for (const turn of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
            pose.heading = Math.atan2(next.x - p.x, next.z - p.z) + turn;
            view.setMode('chase', pose); view.camera.updateMatrixWorld(true);
            const focus = new three.Vector3(pose.x, pose.y + 3.5, pose.z);
            const direction = focus.clone().sub(view.camera.position), distance = direction.length();
            ray.set(view.camera.position, direction.normalize()); ray.far = distance - 1;
            const hit = ray.intersectObjects(solids, false)[0]; ray.far = Infinity;
            if (hit) {
              if (surfaces.includes(hit.object) || hit.object.geometry.type === 'BufferGeometry') roadOcclusions++;
              else {
                propOcclusions++;
                propExample ??= { params: track.params, pose: { ...pose }, camera: view.camera.position.toArray(),
                  target: view.target.toArray(), geometry: hit.object.geometry.type };
              }
            }
            poses++;
          }
        }
      }
    }
    window.qa.propExample = propExample;
    return { tracks: 16, poses, roadOcclusions, propOcclusions, centersOutside, footprintOutside,
      hullSamples, footprintExample, propExample };
  });
  writeFileSync('test-results/quality-occlusion-boundary.json', JSON.stringify(result, null, 2));
  if (result.propExample) {
    await page.evaluate(() => {
      const { view, core, three, propExample: frame } = window.qa;
      view.setTrack(core.generateTrack(frame.params));
      view.car.position.set(frame.pose.x, frame.pose.y, frame.pose.z);
      view.car.rotation.set(0, frame.pose.heading, 0);
      view.camera.position.fromArray(frame.camera); view.camera.lookAt(new three.Vector3().fromArray(frame.target));
      view.renderer.render(view.scene, view.camera);
    });
    await page.locator('#quality-host > canvas').screenshot({ path: 'test-results/quality-prop-occlusion.png' });
  }
  await page.evaluate(() => window.qa.view.dispose());
  expect(result.poses).toBe(768);
  expect(result.centersOutside, JSON.stringify(result.footprintExample)).toBe(0);
  expect(result.footprintOutside, JSON.stringify(result.footprintExample)).toBe(0);
});

test('quality: real left/right key input has bounded yaw and keeps map position synchronized', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  for (const [key, value] of Object.entries({ height: 0, width: 80, obstacles: 0 })) {
    await page.locator(`#${key}-value`).fill(String(value));
  }
  await page.locator('button.generate').click();
  await page.locator('#viewport > canvas').focus(); await page.keyboard.press('c');
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__trackseed.pose.speed)).toBeGreaterThan(25);
  const traces = [];
  for (const key of ['ArrowRight', 'ArrowLeft']) {
    await page.keyboard.down(key);
    const frames = await page.evaluate(() => new Promise(resolve => {
      const frames = [];
      const sample = () => {
        const { pose, marker } = window.__trackseed;
        frames.push({ x: pose.x, z: pose.z, heading: pose.heading, speed: pose.speed,
          mapX: marker.x, mapY: marker.y, mapHeading: marker.heading });
        if (frames.length === 12) resolve(frames);
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }));
    await page.keyboard.up(key);
    let totalYaw = 0;
    for (let i = 1; i < frames.length; i++) {
      const delta = Math.atan2(Math.sin(frames[i].heading - frames[i - 1].heading),
        Math.cos(frames[i].heading - frames[i - 1].heading));
      expect(Math.abs(delta)).toBeLessThan(0.2);
      expect(frames[i].mapHeading).toBe(frames[i].heading);
      totalYaw += delta;
    }
    expect(Math.sign(totalYaw)).toBe(key === 'ArrowRight' ? -1 : 1);
    traces.push({ key, totalYaw, frames });
  }
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.__trackseed.pose.speed)).toBe(0);
  await page.keyboard.up('Space');
  writeFileSync('test-results/quality-keyboard.json', JSON.stringify(traces, null, 2));
  await page.screenshot({ path: 'test-results/quality-driving.png' });
});
