import { test, expect } from '@playwright/test';

async function open(page) {
  await page.goto('/?test=1');
  await expect(page.locator('#status')).toContainText('Generated');
  await expect(page.locator('#coin-count')).toHaveText('0 / 10');
}

async function visitCoin(page, index = 0) {
  await page.evaluate(index => {
    const s = window.__trackseed, coin = s.coins.positions[index];
    Object.assign(s.pose, { x: coin.x, y: coin.y, z: coin.z, speed: 0, vx: 0, vz: 0 });
  }, index);
}

async function frames(page, count) {
  await page.evaluate(count => new Promise(resolve => {
    const tick = () => { if (--count <= 0) resolve(null); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), count);
}

for (const mode of ['overview', 'chase']) {
  test(`minimap: only its background is 45% opaque in ${mode}`, async ({ page }) => {
    await open(page); await page.locator(`#${mode}`).click();
    const result = await page.evaluate(() => {
      const panel = document.querySelector('.minimap-panel'), canvas = document.querySelector('#minimap');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
        if (pixels[i] === 255) opaque++;
      }
      return { background: getComputedStyle(panel).backgroundColor, opacity: getComputedStyle(panel).opacity,
        canvasOpacity: getComputedStyle(canvas).opacity,
        textOpacity: getComputedStyle(document.querySelector('.mini-title')).opacity,
        transparent, opaque, total: pixels.length / 4, mode: window.__trackseed.mode };
    });
    expect(result.background).toBe('rgba(22, 33, 39, 0.45)'); expect(result.opacity).toBe('1');
    expect(result.canvasOpacity).toBe('1'); expect(result.textOpacity).toBe('1');
    expect(result.transparent).toBeGreaterThan(result.total * 0.3); expect(result.opaque).toBeGreaterThan(300);
    expect(result.mode).toBe(mode);
    await expect(page.locator('.coin-hud')).toBeInViewport();
    await page.screenshot({ path: `test-results/coins-${mode}.png` });
  });
}

test('coins: collect once, show completion, and manually regenerate a fresh counter and ten visible coins', async ({ page }) => {
  await open(page);
  const initial = await page.evaluate(() => window.__trackseed.coins.positions);
  await visitCoin(page);
  await expect(page.locator('#coin-count')).toHaveText('1 / 10');
  expect(await page.evaluate(() => window.__trackseed.coins.remaining)).toBe(9);
  // Keep the real animation clock: replacing performance.now after startup can
  // invalidate the app's existing frame timestamp on a slow test machine.
  await frames(page, 12);
  await expect(page.locator('#coin-count')).toHaveText('1 / 10');
  expect(await page.evaluate(() => window.__trackseed.coins.collected)).toEqual([0]);
  for (let i = 1; i < 10; i++) {
    await visitCoin(page, i);
    await expect(page.locator('#coin-count')).toHaveText(`${i + 1} / 10`);
  }
  expect(await page.evaluate(() => window.__trackseed.coins.remaining)).toBe(0);
  await expect(page.locator('#coin-complete')).toBeVisible();
  await page.screenshot({ path: 'test-results/coins-complete.png', animations: 'allow' });
  await visitCoin(page); await frames(page, 12);
  await expect(page.locator('#coin-count')).toHaveText('10 / 10');
  await page.locator('button.generate').click();
  await expect(page.locator('#coin-count')).toHaveText('0 / 10');
  await expect(page.locator('#coin-complete')).toBeHidden();
  const reset = await page.evaluate(() => window.__trackseed.coins);
  expect(reset.remaining).toBe(10); expect(reset.collected).toEqual([]); expect(reset.positions).toEqual(initial);
});

test('coins: automatic width and Seed changes reset pickups and match regenerated positions in both modes', async ({ page }) => {
  await open(page);
  for (const [index, mode] of ['overview', 'chase'].entries()) {
    await page.locator(`#${mode}`).click(); await visitCoin(page);
    await expect(page.locator('#coin-count')).toHaveText('1 / 10');
    const before = await page.evaluate(() => window.__trackseed.generation);
    await page.locator('#width-value').fill(String(index ? 80 : 20));
    await page.locator('#seed').fill(String(9900 + index));
    await expect.poll(() => page.evaluate(() => window.__trackseed.generation)).toBeGreaterThan(before);
    await expect.poll(() => page.evaluate(() => window.__trackseed.track.params.seed)).toBe(9900 + index);
    await expect(page.locator('#coin-count')).toHaveText('0 / 10');
    await expect(page.locator('#coin-complete')).toBeHidden();
    const state = await page.evaluate(async () => {
      const { generateCoins } = await import('/src/coins.ts');
      const s = window.__trackseed;
      return { remaining: s.coins.remaining, count: s.coins.count, mode: s.mode, speed: s.pose.speed,
        positions: s.coins.positions, expected: generateCoins(s.track) };
    });
    expect(state.mode).toBe(mode); expect(state.count).toBe(0); expect(state.remaining).toBe(10);
    expect(state.speed).toBe(0); expect(state.positions).toEqual(state.expected);
  }
});

test('coins: real keyboard driving collects the golden pickup ahead of the car', async ({ page }) => {
  await open(page);
  for (const [key, value] of Object.entries({ height: 0, width: 80, obstacles: 0, density: 0 })) {
    await page.locator(`#${key}-value`).fill(String(value));
  }
  await expect.poll(() => page.evaluate(() => {
    const p = window.__trackseed.track.params;
    return p.height === 0 && p.width === 80 && p.obstacles === 0 && p.density === 0;
  })).toBe(true);
  await page.evaluate(async () => {
    const { project, roadHeight } = await import('/src/core.ts');
    const { COIN_PICKUP_RADIUS } = await import('/src/coins.ts');
    const s = window.__trackseed, coin = s.coins.positions[0], hit = project(s.track, coin.x, coin.z);
    const x = coin.x - hit.dx * (COIN_PICKUP_RADIUS + 3), z = coin.z - hit.dz * (COIN_PICKUP_RADIUS + 3);
    Object.assign(s.pose, { x, z, y: roadHeight(s.track, x, z), speed: 0, vx: 0, vz: 0,
      heading: Math.atan2(hit.dx, hit.dz), roadIndex: hit.index });
  });
  await page.locator('#chase').click();
  await expect(page.locator('#coin-count')).toHaveText('0 / 10');
  await page.screenshot({ path: 'test-results/coins-drive-pickup.png' });
  await page.locator('#viewport > canvas').focus(); await page.keyboard.down('ArrowUp');
  await expect(page.locator('#coin-count')).toHaveText('1 / 10');
  await page.keyboard.up('ArrowUp'); await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.__trackseed.pose.speed)).toBe(0);
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__trackseed.coins.collected)).toEqual([0]);
  expect(await page.evaluate(() => window.__trackseed.coins.remaining)).toBe(9);
});

test('coins: hidden pickups stop rendering and their shared GPU resources are disposed on regeneration', async ({ page }) => {
  await page.route('**/__coins__', route => route.fulfill({ contentType: 'text/html',
    body: '<div id="host" style="width:960px;height:640px"></div>' }));
  await page.goto('/__coins__');
  const result = await page.evaluate(async () => {
    const [{ TrackView }, { generateTrack }, { spawnVehicle }, { CoinRun }] = await Promise.all([
      import('/src/view.ts'), import('/src/core.ts'), import('/src/vehicle.ts'), import('/src/coins.ts'),
    ]);
    const track = generateTrack({ height: 0 }), run = new CoinRun(track), pose = spawnVehicle(track);
    const view = new TrackView(document.querySelector('#host'));
    view.setTrack(track, run.coins); view.render(pose, 0);
    const before = { ...view.renderer.info.memory }, callsBefore = view.renderer.info.render.calls;
    const container = view.scene.children.flatMap(g => g.children).find(g => g.name === 'coins');
    const primitiveTypes = container.children.flatMap(g => g.children.map(mesh => mesh.geometry.type));
    for (const coin of run.coins) view.hideCoins(run.collect(coin));
    view.render(pose, 0);
    const hidden = container.children.every(g => !g.visible), callsAfter = view.renderer.info.render.calls;
    view.setTrack(track); view.render(pose, 0);
    const after = { ...view.renderer.info.memory }, visible = view.visibleCoinCount;
    view.dispose();
    return { before, after, visible, hidden, primitiveTypes, callsBefore, callsAfter,
      disposed: { ...view.renderer.info.memory } };
  });
  expect(result.hidden).toBe(true); expect(result.callsAfter).toBeLessThan(result.callsBefore);
  expect(new Set(result.primitiveTypes)).toEqual(new Set(['CylinderGeometry', 'TorusGeometry']));
  expect(result.after).toEqual(result.before); expect(result.visible).toBe(10);
  expect(result.disposed.geometries).toBe(0); expect(result.disposed.textures).toBe(0);
});
