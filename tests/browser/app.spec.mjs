import { test, expect } from '@playwright/test';

test('P0: real WebGL scene, closed track and live map render without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await expect.poll(() => page.evaluate(() => window.__tracklab?.triangles)).toBeGreaterThan(1000);
  const state = await page.evaluate(() => {
    const s = window.__tracklab;
    return { first: s.track.points[0], last: s.track.points.at(-1), calls: s.calls,
      marker: s.marker, props: s.track.props.length };
  });
  expect(state.first).toEqual(state.last); expect(state.calls).toBeGreaterThan(0);
  expect(state.marker.x).toBeGreaterThan(0); expect(state.props).toBeGreaterThan(0);
  const pixels = await page.locator('#minimap').evaluate(c => {
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return new Set(Array.from({ length: data.length / 4 }, (_, i) => `${data[i * 4]},${data[i * 4 + 1]},${data[i * 4 + 2]}`)).size;
  });
  expect(pixels).toBeGreaterThan(10); expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/overview.png', fullPage: true });
});

async function generate(page, values) {
  for (const [key, value] of Object.entries(values)) {
    if (key === 'scene') await page.locator('#scene').selectOption(String(value));
    else await page.locator(`#${key === 'seed' ? 'seed' : key + '-value'}`).fill(String(value));
  }
  const before = await page.evaluate(() => window.__tracklab.generation);
  await page.locator('button.generate').click();
  // Automatic input may commit during Playwright's click actionability wait.
  await expect.poll(() => page.evaluate(() => window.__tracklab.generation)).toBeGreaterThan(before);
}

test('parameters auto update both views and manual Generate reproduces the same seed', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await page.locator('#curves-value').fill('10');
  await expect.poll(() => page.evaluate(() => window.__tracklab.track.params.curves)).toBe(10);
  await generate(page, { curves: 10, straight: 0.6, width: 80, size: 3, height: 200,
    obstacles: 0, density: 0, seed: 12345 });
  const first = await page.evaluate(() => JSON.stringify(window.__tracklab.track));
  const map = await page.locator('#minimap').evaluate(c => c.toDataURL());
  await generate(page, {});
  expect(await page.evaluate(() => JSON.stringify(window.__tracklab.track))).toBe(first);
  expect(await page.locator('#minimap').evaluate(c => c.toDataURL())).toBe(map);
  expect(await page.evaluate(() => window.__tracklab.track.points.length)).toBe(601);
  expect(await page.evaluate(() => window.__tracklab.track.props.length)).toBe(0);
  expect(await page.evaluate(() => window.__tracklab.track.obstacles.length)).toBe(0);
  await generate(page, { curves: 3, width: 20, size: 1, height: 200, straight: 0, seed: 0 });
  expect(await page.evaluate(() => window.__tracklab.track.points.length)).toBe(181);
  await expect(page.locator('#active-seed')).toHaveText('0');
  await expect(page.locator('#error')).toBeHidden();
});

test('P1: real keyboard drives, steers, brakes, reverses and updates the world-position map', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await generate(page, { height: 0, width: 80, obstacles: 0 });
  await page.locator('#viewport > canvas').focus();
  await page.keyboard.press('c');
  await expect(page.locator('#chase')).toHaveAttribute('aria-pressed', 'true');
  const before = await page.evaluate(() => ({ ...window.__tracklab.pose }));
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBeGreaterThan(20);
  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(h => window.__tracklab.pose.heading - h, before.heading)).toBeGreaterThan(0.15);
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp');
  const after = await page.evaluate(() => ({ ...window.__tracklab.pose }));
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(2);
  expect(after.heading).not.toBe(before.heading);
  const alignment = await page.evaluate(async () => {
    const { mapTransform } = await import('/src/core.ts');
    const s = window.__tracklab, expected = mapTransform(s.track, 264, 204, 16).point(s.pose.x, s.pose.z);
    return { distance: Math.hypot(expected.x - s.marker.x, expected.y - s.marker.y),
      angle: Math.abs(s.pose.heading - s.marker.heading) };
  });
  expect(alignment.distance).toBeLessThan(0.01); expect(alignment.angle).toBeLessThan(0.001);
  await page.screenshot({ path: 'test-results/drive.png' });
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => Math.abs(window.__tracklab.pose.speed))).toBeLessThan(0.1);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBeLessThan(-15);
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('#gear')).toHaveText('R');
  const seed = await page.locator('#active-seed').innerText();
  await page.keyboard.press('r');
  await expect(page.locator('#active-seed')).not.toHaveText(seed);
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBe(0);
});

test('P2: continuous forward keyboard input reaches the asphalt boundary and remains contained', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await generate(page, { height: 0, curves: 3, straight: 0, width: 20, obstacles: 0, density: 0 });
  await page.locator('#viewport > canvas').focus();
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.collision), { timeout: 20000 }).toBeGreaterThan(0);
  await page.keyboard.up('ArrowUp');
  const boundary = await page.evaluate(async () => {
    const { roadContact, CAR_RADIUS } = await import('/src/core.ts');
    const { pose, track } = window.__tracklab;
    return { distance: -roadContact(track, pose.x, pose.z).clearance,
      limit: -CAR_RADIUS, surface: pose.surface };
  });
  expect(boundary.distance).toBeLessThanOrEqual(boundary.limit + 0.001);
  expect(boundary.surface).toBe('asphalt');
});

test('focus and blur release driving input; editing inputs does not trigger shortcuts', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await page.locator('#seed').focus();
  const generation = await page.evaluate(() => window.__tracklab.generation);
  await page.keyboard.press('c'); await page.keyboard.press('r');
  expect(await page.evaluate(() => window.__tracklab.generation)).toBe(generation);
  expect(await page.evaluate(() => window.__tracklab.mode)).toBe('overview');
  expect(await page.evaluate(() => window.__tracklab.pose.speed)).toBe(0);
  await page.locator('#viewport > canvas').focus(); await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tracklab.pose.speed)).toBeGreaterThan(5);
  await page.locator('#seed').focus();
  expect(await page.evaluate(() => window.__tracklab.input)).toEqual([]);
  await page.keyboard.up('ArrowUp');
  await page.locator('#viewport > canvas').focus(); await page.keyboard.down('ArrowUp');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(() => window.__tracklab.input)).toEqual([]);
  await page.keyboard.up('ArrowUp');
});

test('P3: all environment themes render; repeated regeneration releases GPU geometries', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await generate(page, { density: 20, scene: 'nature' });
  expect(await page.evaluate(() => window.__tracklab.track.props.some(p => p.kind === 'tree'))).toBe(true);
  expect(await page.evaluate(() => window.__tracklab.track.props.some(p => p.kind === 'building'))).toBe(false);
  await generate(page, { scene: 'city' });
  expect(await page.evaluate(() => window.__tracklab.track.props.some(p => p.kind === 'building'))).toBe(true);
  expect(await page.evaluate(() => window.__tracklab.track.props.some(p => p.kind === 'tree'))).toBe(false);
  await generate(page, { scene: 'mixed' });
  const memory = await page.evaluate(() => ({ ...window.__tracklab.memory }));
  for (let i = 0; i < 12; i++) await generate(page, { seed: i + 800 });
  await expect.poll(() => page.evaluate(() => window.__tracklab.memory.geometries)).toBe(memory.geometries);
  expect(await page.evaluate(() => window.__tracklab.memory.textures)).toBe(memory.textures);
  expect(errors).toEqual([]);
});

test('resizing keeps the renderer sized, map visible and Generate accessible', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  for (const [width, height] of [[1024, 768], [1920, 1080], [800, 680]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator('#viewport > canvas').evaluate(c => {
      const host = c.parentElement;
      return Math.abs(c.clientWidth - host.clientWidth) + Math.abs(c.clientHeight - host.clientHeight);
    })).toBe(0);
    await expect(page.locator('button.generate')).toBeInViewport();
    await expect(page.locator('#minimap')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'test-results/compact.png' });
});

test('production dist renders actual WebGL pixels, drives, and makes no external requests', async ({ page }) => {
  const errors = [], remote = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') remote.push(request.url());
  });
  await page.goto('http://127.0.0.1:5174/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  expect(await page.evaluate(() => '__tracklab' in window)).toBe(false);
  const colors = await page.locator('#viewport > canvas').evaluate(canvas => new Promise(resolve => {
    requestAnimationFrame(() => {
      const gl = canvas.getContext('webgl2');
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const unique = new Set();
      for (let i = 0; i < pixels.length; i += 4 * 97) unique.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      resolve(unique.size);
    });
  }));
  expect(colors).toBeGreaterThan(10);
  await page.locator('#viewport > canvas').focus();
  await page.keyboard.press('c'); await page.keyboard.down('ArrowUp');
  await expect.poll(async () => Number(await page.locator('#speed').innerText())).toBeGreaterThan(10);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#chase')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]); expect(remote).toEqual([]);
  await page.screenshot({ path: 'test-results/production.png' });
});

test('WebGL unavailability displays a useful error instead of a silent blank viewport', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl2') return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto('/');
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#error')).toContainText('WebGL 2');
  await expect(page.locator('#status')).toHaveText('Initialization failed');
});
